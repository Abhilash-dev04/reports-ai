"""
Fixed Embedding Module for Reports AI
Uses transformers AutoTokenizer + onnxruntime for reliable embeddings
"""
import os
import sys
import numpy as np
from pathlib import Path

# Global cache
_session = None
_tokenizer = None

def load_model():
    """Load ONNX model and tokenizer"""
    global _session, _tokenizer

    if _session is not None and _tokenizer is not None:
        return _session, _tokenizer

    models_dir = Path(__file__).parent.parent.parent / "models"
    onnx_path = models_dir / "all-MiniLM-L6-v2.onnx"

    # Load ONNX
    try:
        import onnxruntime as ort
        _session = ort.InferenceSession(str(onnx_path))
        print(f"✅ ONNX loaded: {onnx_path.name}")
    except Exception as e:
        print(f"⚠️ ONNX failed: {e}")
        _session = None

    # Load tokenizer using transformers (most reliable method)
    try:
        from transformers import AutoTokenizer
        # Try local first
        if (models_dir / "tokenizer_config.json").exists():
            _tokenizer = AutoTokenizer.from_pretrained(str(models_dir))
            print(f"✅ Tokenizer loaded from {models_dir}")
        else:
            # Download from HuggingFace (cached)
            _tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2", cache_dir=str(models_dir / "cache"))
            print("✅ Tokenizer loaded from HuggingFace")
    except Exception as e:
        print(f"❌ Tokenizer failed: {e}")
        _tokenizer = None

    return _session, _tokenizer

def encode_text(text: str) -> list:
    """Get 384-dim embedding vector for text (main API used by upload script)"""
    session, tokenizer = load_model()

    if session is None or tokenizer is None:
        print("⚠️ Using fallback embedding")
        return _fallback_embedding(text)

    # Tokenize
    inputs = tokenizer(
        text,
        return_tensors="np",
        padding=True,
        truncation=True,
        max_length=128
    )

    # Run ONNX inference
    input_ids = inputs['input_ids'].astype(np.int64)
    attention_mask = inputs['attention_mask'].astype(np.int64)

    outputs = session.run(
        None,
        {'input_ids': input_ids, 'attention_mask': attention_mask}
    )

    # Mean pooling with attention mask
    last_hidden = outputs[0]  # [batch, seq_len, hidden_dim]
    mask = np.expand_dims(attention_mask, axis=-1).astype(np.float32)
    masked = last_hidden * mask
    summed = masked.sum(axis=1)
    counts = mask.sum(axis=1)
    embedding = summed / np.maximum(counts, 1e-9)

    # L2 normalize
    norm = np.linalg.norm(embedding, axis=1, keepdims=True)
    embedding = embedding / np.maximum(norm, 1e-9)

    return embedding[0].tolist()

def get_embedding(text: str) -> list:
    """Alias for encode_text"""
    return encode_text(text)

def _fallback_embedding(text: str) -> list:
    """Simple hash-based fallback when ONNX unavailable"""
    import hashlib
    vec = [0.0] * 384
    words = text.lower().split()
    for word in words:
        h = hashlib.md5(word.encode()).hexdigest()
        for i in range(384):
            idx = int(h[i % 32], 16)
            vec[i] += (idx - 7.5) / 100.0

    norm = sum(x*x for x in vec) ** 0.5
    if norm > 0:
        vec = [x / norm for x in vec]
    return vec

if __name__ == "__main__":
    emb = encode_text("daily claims report")
    print(f"\nEmbedding shape: {len(emb)}")
    print(f"First 5 values: {[round(x, 4) for x in emb[:5]]}")
