from pathlib import Path

from moviepy import VideoFileClip


def extract_audio_from_video(video_path: Path, audio_output_path: Path) -> Path:
    """Extract audio track from a video file into WAV format."""
    with VideoFileClip(str(video_path)) as clip:
        if clip.audio is None:
            raise ValueError("The uploaded video does not contain an audio track.")
        clip.audio.write_audiofile(str(audio_output_path), codec="pcm_s16le", logger=None)
    return audio_output_path
