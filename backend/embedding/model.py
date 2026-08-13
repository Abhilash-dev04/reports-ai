"""
Production embedding module for Reports AI.

Uses a local all-MiniLM-L6-v2 ONNX model and Hugging Face tokenizer
to generate normalized 384-dimensional embeddings.
"""

import logging
import os
import threading
from pathlib import Path
from typing import List, Tuple

import numpy as np
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

EXPECTED_EMBEDDING_DIMENSION = 384
MAX_TOKEN_LENGTH = 256

_session = None
_tokenizer = None
_model_lock = threading.Lock()


class EmbeddingModelError(RuntimeError):
    """Raised when the embedding model cannot be loaded or used."""


def _get_project_root() -> Path:
    """Return the repository root directory."""

    return Path(__file__).resolve().parent.parent.parent


def _get_model_path() -> Path:
    """Return the configured ONNX model path."""

    configured_path = os.environ.get(
        "MODEL_PATH",
        "./models/all-MiniLM-L6-v2.onnx",
    ).strip()

    model_path = Path(configured_path)

    if not model_path.is_absolute():
        model_path = _get_project_root() / model_path

    return model_path.resolve()


def _get_tokenizer_path(model_path: Path) -> Path:
    """Return the directory containing the tokenizer files."""

    return model_path.parent


def _validate_model_files(model_path: Path, tokenizer_path: Path) -> None:
    """Validate that the local model and tokenizer files exist."""

    if not model_path.is_file():
        raise EmbeddingModelError(
            f"ONNX model file was not found: {model_path}"
        )

    tokenizer_json = tokenizer_path / "tokenizer.json"
    vocab_file = tokenizer_path / "vocab.txt"

    if not tokenizer_json.is_file() and not vocab_file.is_file():
        raise EmbeddingModelError(
            "Neither tokenizer.json nor vocab.txt was found in "
            f"{tokenizer_path}"
        )


def _validate_session(session) -> None:
    """Validate the ONNX model input and output structure."""

    input_names = {model_input.name for model_input in session.get_inputs()}
    required_inputs = {"input_ids", "attention_mask"}
    missing_inputs = required_inputs - input_names

    if missing_inputs:
        raise EmbeddingModelError(
            "ONNX model is missing required inputs: "
            + ", ".join(sorted(missing_inputs))
        )

    if not session.get_outputs():
        raise EmbeddingModelError("ONNX model does not define any outputs")


def load_model() -> Tuple[object, object]:
    """
    Load and cache the local ONNX model and tokenizer.

    Runtime downloads and hash-based fallback embeddings are intentionally
    disabled so all stored and query embeddings use the same model.
    """

    global _session
    global _tokenizer

    if _session is not None and _tokenizer is not None:
        return _session, _tokenizer

    with _model_lock:
        if _session is not None and _tokenizer is not None:
            return _session, _tokenizer

        model_path = _get_model_path()
        tokenizer_path = _get_tokenizer_path(model_path)
        _validate_model_files(model_path, tokenizer_path)

        try:
            import onnxruntime as ort
            from transformers import BertTokenizerFast

            session_options = ort.SessionOptions()
            session_options.graph_optimization_level = (
                ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            )

            available_providers = ort.get_available_providers()
            providers = []

            if "CUDAExecutionProvider" in available_providers:
                providers.append("CUDAExecutionProvider")

            providers.append("CPUExecutionProvider")

            session = ort.InferenceSession(
                str(model_path),
                sess_options=session_options,
                providers=providers,
            )

            vocab_file = tokenizer_path / "vocab.txt"

            if not vocab_file.is_file():
                raise EmbeddingModelError(
                    f"Tokenizer vocabulary was not found: {vocab_file}"
                )

            # Load from vocab.txt only. The existing tokenizer.json was
            # generated with an incomplete WordPiece configuration and is
            # intentionally ignored.
            tokenizer = BertTokenizerFast(
                vocab_file=str(vocab_file),
                do_lower_case=True,
                unk_token="[UNK]",
                sep_token="[SEP]",
                pad_token="[PAD]",
                cls_token="[CLS]",
                mask_token="[MASK]",
            )

            _validate_session(session)

            _session = session
            _tokenizer = tokenizer

            logger.info("Embedding model loaded from %s", model_path)
            return _session, _tokenizer

        except EmbeddingModelError:
            raise
        except Exception as exc:
            _session = None
            _tokenizer = None
            raise EmbeddingModelError(
                "Failed to load the embedding model or tokenizer"
            ) from exc


def _prepare_model_inputs(session, tokenizer_output) -> dict:
    """Create the ONNX input dictionary for the loaded model."""

    session_input_names = {
        model_input.name for model_input in session.get_inputs()
    }
    model_inputs = {}

    for input_name in session_input_names:
        if input_name in tokenizer_output:
            model_inputs[input_name] = tokenizer_output[input_name].astype(
                np.int64
            )
        elif input_name == "token_type_ids":
            model_inputs[input_name] = np.zeros_like(
                tokenizer_output["input_ids"],
                dtype=np.int64,
            )
        else:
            raise EmbeddingModelError(
                f"Tokenizer did not produce required input: {input_name}"
            )

    return model_inputs


def _mean_pool(
    last_hidden_state: np.ndarray,
    attention_mask: np.ndarray,
) -> np.ndarray:
    """Apply attention-mask-aware mean pooling."""

    expanded_mask = np.expand_dims(attention_mask, axis=-1).astype(np.float32)
    masked_embeddings = last_hidden_state * expanded_mask
    summed_embeddings = masked_embeddings.sum(axis=1)
    token_counts = np.maximum(expanded_mask.sum(axis=1), 1e-9)
    return summed_embeddings / token_counts


def _normalize_embedding(embedding: np.ndarray) -> np.ndarray:
    """Apply L2 normalization."""

    norm = np.maximum(
        np.linalg.norm(embedding, axis=1, keepdims=True),
        1e-12,
    )
    return embedding / norm


def encode_text(text: str) -> List[float]:
    """
    Generate one normalized 384-dimensional embedding.

    Raises:
        ValueError: If the input is empty or is not a string.
        EmbeddingModelError: If model loading or inference fails.
    """

    if not isinstance(text, str):
        raise ValueError("Embedding input must be a string")

    normalized_text = " ".join(text.split())

    if not normalized_text:
        raise ValueError("Embedding input cannot be empty")

    session, tokenizer = load_model()

    try:
        tokenizer_output = tokenizer(
            normalized_text,
            return_tensors="np",
            padding=True,
            truncation=True,
            max_length=MAX_TOKEN_LENGTH,
        )

        model_inputs = _prepare_model_inputs(session, tokenizer_output)
        model_outputs = session.run(None, model_inputs)

        if not model_outputs:
            raise EmbeddingModelError("ONNX inference returned no outputs")

        last_hidden_state = np.asarray(
            model_outputs[0],
            dtype=np.float32,
        )

        if last_hidden_state.ndim != 3:
            raise EmbeddingModelError(
                "Unexpected ONNX output shape: "
                f"{last_hidden_state.shape}"
            )

        attention_mask = tokenizer_output["attention_mask"].astype(np.int64)
        pooled_embedding = _mean_pool(
            last_hidden_state,
            attention_mask,
        )
        normalized_embedding = _normalize_embedding(pooled_embedding)
        embedding = normalized_embedding[0]

        if embedding.shape[0] != EXPECTED_EMBEDDING_DIMENSION:
            raise EmbeddingModelError(
                "Embedding model returned "
                f"{embedding.shape[0]} dimensions; expected "
                f"{EXPECTED_EMBEDDING_DIMENSION}"
            )

        if not np.all(np.isfinite(embedding)):
            raise EmbeddingModelError(
                "Embedding contains invalid numeric values"
            )

        return [float(value) for value in embedding.tolist()]

    except EmbeddingModelError:
        raise
    except Exception as exc:
        raise EmbeddingModelError("Embedding inference failed") from exc


def get_embedding(text: str) -> List[float]:
    """Backward-compatible alias for encode_text."""

    return encode_text(text)


def model_health_check() -> dict:
    """Load and test the embedding model."""

    test_embedding = encode_text("Reports AI embedding health check")

    return {
        "status": "healthy",
        "model_path": str(_get_model_path()),
        "embedding_dimension": len(test_embedding),
        "expected_dimension": EXPECTED_EMBEDDING_DIMENSION,
        "normalized": bool(
            np.isclose(
                np.linalg.norm(test_embedding),
                1.0,
                atol=1e-5,
            )
        ),
    }


if __name__ == "__main__":
    print(model_health_check())
