# AI Code Explainer

Simple web-based tool that accepts Python or JavaScript code and returns a short plain-English explanation using an LLM.

## Architecture
- Backend: Node.js + Express in `backend/` — exposes `/api/explain` and `/api/optimize`.
- Frontend: React + Vite in `frontend/` (replaces prior static frontend).

### Key decisions
- Use OpenAI SDK (`openai` package) to call a chat-completion model for concise explanations and optional optimizations.
- Add simple syntax parsing: `acorn` for JavaScript AST parsing to extract function/declaration annotations; lightweight heuristics for Python `def`/`class` lines.

## How to run (local)
1. Create a `.env` in `backend/` with `OPENAI_API_KEY=your_key` (or set env var).
2. Install backend and frontend dependencies:

```bash
# backend
cd backend
npm install

# frontend
cd ../frontend
npm install
```

3. Start the backend and the frontend (separate terminals):

Backend:
```bash
cd backend
npm run dev
```

Frontend (Vite dev server):
```bash
cd frontend
npm run dev
```

Open the Vite URL (usually http://localhost:5173) to use the UI.

If you plan to deploy the backend, copy the `backend/` directory to your server and ensure `OPENAI_API_KEY` is set in environment or a `.env` file; then run the Node server with `npm run dev` or deploy via a process manager.

## Notes on hallucinations and accuracy
- Prompts ask the model to avoid hallucination and to say when uncertain; the backend also attaches AST-derived annotations so the model can reference concrete structure instead of inventing facts.
- For production, add verification steps: run static code analyzers, test generated optimizations, and include guardrails to prevent code execution.

## Bonus / Future
- Add a diff view with `diff`/`jsdiff` to show changes between original and optimized code.
- Improve Python AST parsing by invoking a lightweight Python service or using tree-sitter for robust parsing.

**Summary**

- **System Architecture:**
	- **Frontend (`frontend/`)**: React + Vite single-page app. Client performs lightweight syntax parsing/annotation (using `acorn` for JavaScript and heuristics for Python), posts snippets to the backend, and renders explanations, optimized suggestions, annotated code regions and a unified diff view. UI enhancements include Markdown rendering and syntax highlighting (Prism), and a small smoke-test/examples harness under `examples/` and `scripts/smoke_test.js`.
	- **Backend (Node) (`backend/`)**: Express server exposing `/api/explain`, `/api/optimize`, and `/api/health`. `llmClient.js` wraps calls to the selected LLM (currently OpenAI) and includes a fetch fallback to the REST API for resilience. `annotate.js` provides server-side AST extraction for JavaScript and simple heuristics for Python.
	- **Flow:** Frontend sends `{ code, language }` to backend; backend augments the request with AST annotations, calls the LLM for a short explanation or an optimized rewrite, and returns `{ explanation, optimized, annotations }` for display.

- **Technical decisions & trade-offs:**
	- **React + Vite** for quick developer feedback and small bundle size; easy to ship a static frontend or host separately.
	- **Client-side AST parsing** (acorn) keeps the UI responsive and reduces backend load; server-side annotation exists as a complement for stronger guarantees.
	- **OpenAI SDK + fetch fallback** increases robustness in environments where the SDK may fail or require different auth handling.
	- **Low temperature prompts** (0.2 for explanations) are used to produce concise, deterministic summaries; a slightly higher temperature (0.3) is used for code rewriting to allow readable variation.
	- **No code execution**: the system does not execute user code — only static analysis and LLM inference — to avoid security risks.

- **AI tool(s) selected and reasoning:**
	- **Primary:** OpenAI (chat/completions) — chosen for high-quality natural-language explanations, a conversational prompt interface, broad language support, and simple SDKs for Node and PHP. The project uses a compact chat model (`gpt-4o-mini` in code) to balance cost and explanation quality; this can be swapped to other LLMs (Claude, Mistral) by editing `backend/src/llmClient.js`.
	- **Prompt strategy:** Attach concrete AST-derived annotations to prompts so the model can ground its summary in explicit code structure (reducing hallucination). Prompts explicitly instruct the model to avoid inventing behavior and to admit uncertainty when code is ambiguous.

- **Hallucination & accuracy handling:**
	- Attaching AST annotations helps the model reference concrete identifiers and line ranges rather than inventing facts.
	- Use low temperature, explicit instructions, and small answers (2–4 sentences) to reduce risk of long, speculative outputs.
	- For production, add automated verification: run static analyzers, unit tests for suggested optimizations, and human review workflows before accepting model-suggested code.

See `frontend/`, `backend/` for implementation details and deployment options.
