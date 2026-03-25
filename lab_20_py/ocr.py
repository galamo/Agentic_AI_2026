import argparse
from pathlib import Path

import torch
from PIL import Image
from transformers import pipeline


def _pick_device():
    # Transformers `pipeline` accepts `device=-1` for CPU. For Apple Silicon we try `mps`,
    # and otherwise fall back to CPU.
    if torch.cuda.is_available():
        return 0  # cuda:0
    # MPS support depends on torch build; if unavailable, this will be caught below.
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return torch.device("mps")
    return -1  # CPU


def ocr_image(image_path: str, model_name: str) -> str:
    device = _pick_device()
    try:
        ocr = pipeline("image-to-text", model=model_name, device=device)
    except Exception:
        # If the pipeline doesn't accept the selected device, retry on CPU.
        ocr = pipeline("image-to-text", model=model_name, device=-1)

    image = Image.open(image_path).convert("RGB")
    result = ocr(image)

    if not result:
        return ""
    if isinstance(result, list):
        return (result[0].get("generated_text") or "").strip()
    return str(result).strip()


def main():
    parser = argparse.ArgumentParser(description="Run OCR with TrOCR (printed text).")
    parser.add_argument("--image", required=True, help="Path to an input image (png/jpg/etc).")
    parser.add_argument(
        "--model",
        default="microsoft/trocr-base-printed",
        help="Hugging Face model id to use for OCR.",
    )
    args = parser.parse_args()

    image_path = Path(args.image)
    if not image_path.exists():
        raise SystemExit(f"Image not found: {image_path}")

    text = ocr_image(str(image_path), args.model)
    print(text)


if __name__ == "__main__":
    main()

