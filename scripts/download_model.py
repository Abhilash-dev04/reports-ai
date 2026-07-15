#!/usr/bin/env python3
"""Download/check ONNX model files."""
import os
from pathlib import Path

def download_model():
    """Check if ONNX model exists."""
    model_dir = Path("./models")
    onnx_file = model_dir / "all-MiniLM-L6-v2.onnx"
    tokenizer_file = model_dir / "tokenizer.json"

    if onnx_file.exists() and tokenizer_file.exists():
        print(f"ONNX model ready at {onnx_file}")
        print(f"Tokenizer ready at {tokenizer_file}")
        return

    print("ERROR: ONNX model files not found!")
    print("Run 'python scripts/convert_model.py' on your laptop first.")
    print("Then copy the 'models/' folder to this project.")
    raise FileNotFoundError("ONNX model missing")

if __name__ == "__main__":
    download_model()
