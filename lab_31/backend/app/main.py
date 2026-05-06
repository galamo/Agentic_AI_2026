from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .graph import build_video_pipeline

app = FastAPI(title="Lab 31 Video Processing API")
pipeline = build_video_pipeline()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/upload-video")
async def upload_video(video: UploadFile = File(...)):
    if not video.content_type or not video.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="Please upload a valid video file.")

    payload = {
        "original_filename": video.filename or "uploaded_video.mp4",
        "video_bytes": await video.read(),
        "video_path": "",
        "audio_path": "",
        "raw_transcript": "",
        "final_transcript": "",
        "transcript_file_path": "",
        "output": "",
    }

    try:
        result = pipeline.invoke(payload)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "OUTPUT": result.get("output", ""),
        "transcript_file_path": result.get("transcript_file_path", ""),
    }
