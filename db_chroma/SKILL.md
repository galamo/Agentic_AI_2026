# Skill: Video Arrival Multi-Agent Pipeline

## When to use
- Use this skill when a backend must process an uploaded video and return transcript text.
- Use this for LangGraph workflows with OpenRouter-based speech-to-text and LLM refinement.

## Inputs expected
- `video_file` from an HTTP upload endpoint.
- Environment variables:
  - `OPENROUTER_API_KEY`
  - `OPENROUTER_BASE_URL` (default `https://openrouter.ai/api/v1`)
  - `OPENROUTER_STT_MODEL`
  - `OPENROUTER_TEXT_MODEL`

## Steps
1. Validate upload:
   - Accept only `video/*` MIME type.
   - Reject empty or invalid payloads.
2. Intake agent:
   - Save original video into `uploads/`.
   - Generate deterministic unique filename.
3. Audio extraction agent:
   - Extract audio from the saved video.
   - Save audio artifact into `audio/`.
4. Speech-to-text agent:
   - Send extracted audio to OpenRouter transcription model.
   - Store raw transcript in graph state.
5. Transcript refinement agent:
   - Use OpenRouter chat model to clean transcript without summarizing.
6. Writer agent:
   - Save final transcript to `transcripts/<generated>.txt`.
   - Put the full text in `OUTPUT`.
7. API response:
   - Return JSON with `OUTPUT` and transcript file metadata/path.

## Output format
- API response JSON:
  - `OUTPUT`: full transcript text
  - `transcript_file_path`: server path to saved text file

## Guardrails
- Do not delete source video/audio artifacts unless retention policy says otherwise.
- Do not return partial transcript as final `OUTPUT` when refinement fails; fallback to raw transcript.
- Do not summarize transcript unless explicitly requested.
- Always persist transcript to disk before returning success response.
