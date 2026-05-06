# Lab 32 - Build a Video-to-Transcript App with a Multi-Agent Backend

## Goal

Build a full-stack application where a user uploads a video from a web client, and a backend pipeline processes it to return a transcript.

---

## What you need to build

Create a project with two parts:

- `client/`: a React app with a simple UI for video upload
- `backend/`: a FastAPI service that runs a multi-step processing pipeline

---

## Required workflow

Your backend must execute the following flow in order:

1. Receive a video file from the client
2. Save the uploaded video on disk
3. Extract audio from the video
4. Transcribe speech from the extracted audio
5. Save transcript text into a dedicated folder
6. Return a response containing the transcript text

---

## Backend requirements

- Use Python + FastAPI
- Provide one endpoint to upload a video file (for example: `POST /upload-video`)
- Organize output using folders such as:
  - `uploads/` for input videos
  - `audio/` for extracted audio files
  - `transcripts/` for generated text
- Split logic into reusable modules (config, media/audio utils, graph/pipeline logic, API layer)
- Keep environment variables in `.env`

---

## Multi-agent requirement

Implement the processing as a graph-style pipeline with clear agent responsibilities, such as:

- `VideoIngestionAgent`: validate and store upload
- `AudioExtractionAgent`: convert video to audio
- `TranscriptionAgent`: produce transcript text
- `OutputAgent`: write transcript file and prepare API output

The graph should pass state between steps and produce a final output object for the API response.

---

## Frontend requirements

- Use React (Vite is acceptable)
- Provide:
  - a file picker that accepts video files
  - an upload button
  - loading/error/success states
  - transcript display after processing
- Send upload request to backend endpoint and render returned transcript

---

## Suggested deliverables

- `README.md` with run instructions
- Working backend and frontend
- Clear folder structure
- Example request/response format in docs

---

## Run checklist

- [ ] Backend starts successfully
- [ ] Frontend starts successfully
- [ ] Video upload reaches backend
- [ ] Audio extraction runs without crash
- [ ] Transcript file is created
- [ ] Transcript text is displayed in UI

---

## Bonus (optional)

- Add progress updates per pipeline step
- Add basic file-size/type validation
- Add retry/failure handling for transcription
- Add simple tests for API endpoint and pipeline functions
