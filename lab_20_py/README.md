## Lab 20 — OCR (TrOCR via Transformers)

This lab adds a minimal, runnable OCR script in Python using Hugging Face Transformers:
`pipeline("image-to-text", model="microsoft/trocr-base-printed")`.

### Run it

1. Create venv + install deps:

```bash
cd lab_20_py
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Run OCR on an image:

```bash
python3 ocr.py --image your_image.png
```

The first run will download the model and can take a while.

### Options

- `--model` (default: `microsoft/trocr-base-printed`) to use a different TrOCR model.

