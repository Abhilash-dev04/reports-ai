"""
Fixed ONNX Model Conversion for Reports AI
Properly saves tokenizer.json for ONNX Runtime
"""
import os
import sys
import json
from pathlib import Path

def convert_model():
    print("=" * 60)
    print("ONNX Model Conversion for Reports AI")
    print("=" * 60)

    models_dir = Path("models")
    models_dir.mkdir(exist_ok=True)

    onnx_path = models_dir / "all-MiniLM-L6-v2.onnx"
    tokenizer_path = models_dir / "tokenizer.json"

    if onnx_path.exists() and onnx_path.stat().st_size > 1000000:
        print(f"\n✅ ONNX model already exists at: {onnx_path}")
        print(f"   Size: {onnx_path.stat().st_size / (1024*1024):.1f} MB")

        # Check if tokenizer.json is valid
        if tokenizer_path.exists():
            try:
                with open(tokenizer_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                print(f"   Tokenizer valid: {len(data)} entries")
                print(f"\n   No conversion needed.")
                return True
            except:
                print(f"   Tokenizer corrupted, will regenerate...")
        else:
            print(f"   Tokenizer missing, will generate...")

    print("\n📥 Downloading model from HuggingFace...")
    print("   Model: sentence-transformers/all-MiniLM-L6-v2")
    print()

    try:
        from transformers import AutoTokenizer, AutoModel
        import torch

        model_name = "sentence-transformers/all-MiniLM-L6-v2"

        # Download tokenizer
        print("   Step 1/3: Downloading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(model_name)

        # Save tokenizer properly - save the vocabulary as tokenizer.json
        print("   Saving tokenizer vocabulary...")
        vocab = tokenizer.get_vocab()
        tokenizer_data = {
            "version": "1.0",
            "truncation": None,
            "padding": None,
            "added_tokens": [],
            "normalizer": None,
            "pre_tokenizer": None,
            "post_processor": None,
            "decoder": None,
            "model": {
                "type": "WordPiece",
                "vocab": vocab,
                "unk_token": "[UNK]",
                "continuing_subword_prefix": "##"
            }
        }

        with open(tokenizer_path, 'w', encoding='utf-8') as f:
            json.dump(tokenizer_data, f, ensure_ascii=False, indent=2)

        print(f"   Tokenizer saved: {len(vocab)} tokens")

        # Download and convert model
        print("   Step 2/3: Downloading PyTorch model...")
        model = AutoModel.from_pretrained(model_name)
        model.eval()

        print("   Step 3/3: Converting to ONNX...")

        dummy_input = tokenizer(
            "This is a sample sentence for ONNX conversion",
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=128
        )

        torch.onnx.export(
            model,
            (dummy_input['input_ids'], dummy_input['attention_mask']),
            str(onnx_path),
            input_names=['input_ids', 'attention_mask'],
            output_names=['last_hidden_state'],
            dynamic_axes={
                'input_ids': {0: 'batch_size', 1: 'sequence'},
                'attention_mask': {0: 'batch_size', 1: 'sequence'},
                'last_hidden_state': {0: 'batch_size', 1: 'sequence'}
            },
            opset_version=14,
            do_constant_folding=True
        )

        print(f"\n✅ Conversion successful!")
        print(f"   ONNX model: {onnx_path} ({onnx_path.stat().st_size / (1024*1024):.1f} MB)")
        print(f"   Tokenizer: {tokenizer_path}")
        return True

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = convert_model()
    sys.exit(0 if success else 1)
