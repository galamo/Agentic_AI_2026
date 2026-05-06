# Lab 31 - Video Upload + LangGraph Multi-Agent Transcription

## Structure

- `client/`: React app with one option: upload a video
- `backend/`: Python FastAPI + LangGraph multi-agent pipeline

## Backend process

1. Save video to server folder
2. Extract only audio from video
3. Transcribe speech to text
4. Write transcript into dedicated `transcripts/` folder
5. Return `OUTPUT` text to the client

## Run backend

See `backend/README.md`.

## Run client

```bash
cd lab_31/client
npm install
npm run dev
```

Client runs on `http://localhost:5173` and calls backend at `http://localhost:8000/upload-video`.
