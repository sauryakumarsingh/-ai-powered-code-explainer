# AI Code Explainer

Simple web-based tool that accepts Python or JavaScript snippets and returns a short plain-English explanation using an LLM.

## Architecture
- Backend: Node.js + Express in `backend/` — exposes `/api/explain` and `/api/optimize`.
- Frontend: React + Vite in `frontend/` (replaces prior static frontend).
  
This repo also includes a PHP backend option in `backend_php/` that exposes `/api/explain` and `/api/optimize`.

### Key decisions
- Use OpenAI SDK (`openai` package) to call a chat-completion model for concise explanations and optional optimizations.
- Add simple syntax parsing: `acorn` for JavaScript AST parsing to extract function/declaration annotations; lightweight heuristics for Python `def`/`class` lines.

## How to run (local)
1. Create a `.env` in `backend_php/` with `OPENAI_API_KEY=your_key` (or set env var).
2. Install frontend deps and run the React dev server.

```bash
cd frontend
npm install
npm run dev
```

3. Run the PHP backend (separate terminal):

```bash
cd backend_php
php -S localhost:4000
```

Open `http://localhost:5173` (Vite will print the exact URL) to use the UI.

If you plan to drop the PHP backend into an Apache `htdocs` folder, copy the entire `backend_php/` directory into your `htdocs` (for example `htdocs/code-explainer/`) and ensure the `.env` file is present with `OPENAI_API_KEY` set. The included `.htaccess` will route API requests to `index.php` so `/your-subdir/api/explain` will work.

## Notes on hallucinations and accuracy
- Prompts ask the model to avoid hallucination and to say when uncertain; the backend also attaches AST-derived annotations so the model can reference concrete structure instead of inventing facts.
- For production, add verification steps: run static code analyzers, test generated optimizations, and include guardrails to prevent code execution.

## Bonus / Future
- Add a diff view with `diff`/`jsdiff` to show changes between original and optimized code.
- Improve Python AST parsing by invoking a lightweight Python service or using tree-sitter for robust parsing.
