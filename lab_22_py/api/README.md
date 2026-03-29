# Run the API

From the **lab root** (`lab_22_py`), not from this `api` folder—the Python package name is `api`, so imports and `uvicorn` need that working directory.

1. **Create a virtual environment and install dependencies**

   ```bash
   cd lab_22_py
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Install the Playwright browser** (first time only)

   ```bash
   python -m playwright install chromium
   ```

3. **Configure environment variables**  
   Put a `.env` file in `lab_22_py` (or export variables in your shell) with the keys this lab expects—at minimum LLM settings (Ollama or OpenRouter) and any booking/Playwright variables you use. See the parent `lab_22_py/README.md` for the full list.

4. **Start the server**

   ```bash
   uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
   ```

   Optional: set `PORT` and run via Python instead:

   ```bash
   export PORT=8000
   python -m api.main
   ```

The API listens on `http://0.0.0.0:8000` by default (`PORT` defaults to `8000` when using `python -m api.main`).
