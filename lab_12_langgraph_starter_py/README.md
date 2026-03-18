# Lab 12: LangGraph – LLM Tool-Calling Agent (Python)

## Run the lab using venv

1. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate   # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set your OpenRouter API key:
   ```bash
   cp .env.example .env
   # Edit .env and set OPENROUTER_API_KEY=sk-or-v1-your-key-here
   ```

4. Run the lab:
   ```bash
   python main.py
   ```
   With a custom message:
   ```bash
   python main.py "Get 25 users and show me age and gender breakdown"
   ```
