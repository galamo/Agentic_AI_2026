# Lab 31 Backend (Python + LangGraph Multi-Agent)

This backend receives a video, processes it through a LangGraph multi-agent flow, and returns:

- `OUTPUT`: the full transcript text
- `transcript_file_path`: path of the saved text file

## Flow

1. Upload endpoint receives video.
2. Agent 1 saves video to server and extracts audio.
3. Agent 2 transcribes speech to text via OpenRouter speech model.
4. Agent 3 refines text via OpenRouter chat model and writes it to `transcripts/`.
5. API returns `OUTPUT` with the full text.

## Requirements

- Python 3.11+
- `ffmpeg` installed on your machine
- OpenRouter API key

## Setup

```bash
cd lab_31/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Environment variables

Create `.env` (or export in shell):

```bash
export OPENROUTER_API_KEY="your_openrouter_key"
export OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
export OPENROUTER_TEXT_MODEL="openai/gpt-4o-mini"
export OPENROUTER_STT_MODEL="openai/whisper-1"
```

## How to launch (lunch)

```bash
cd lab_31/backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Then test:

- Health: `http://localhost:8000/health`
- Upload endpoint: `POST http://localhost:8000/upload-video` with `form-data` field name `video`
