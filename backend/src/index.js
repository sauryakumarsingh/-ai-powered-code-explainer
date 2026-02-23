import "dotenv/config";
import express from "express";
import cors from "cors";
import { explainCode, optimizeCode } from "./llmClient.js";
import { annotateCode } from "./annotate.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  const mock = ["1", "true", "yes"].includes(String(process.env.MOCK_OPENAI_RESPONSES || "").toLowerCase());
  const hasKey = !!process.env.OPENAI_API_KEY;
  res.json({ ok: true, mock, hasKey });
});

function detectLanguage(code) {
  if (code.includes("def ") || code.includes("import ") || code.includes("self")) return "Python";
  if (code.includes("function ") || code.includes("=>") || code.includes("console.log")) return "JavaScript";
  return "Unknown";
}

app.post("/api/explain", async (req, res) => {
  try {
    const { code, language: userLang } = req.body;
    const language = userLang || detectLanguage(code);
    const annotations = annotateCode({ code, language });
    const explanation = await explainCode({ code, language, annotations });
    res.json({ explanation, language, annotations });
  } catch (e) {
    console.error('explain error:', e);
    res.status(500).json({ error: e?.message || String(e) || "Failed to explain code" });
  }
});

app.post("/api/optimize", async (req, res) => {
  try {
    const { code, language: userLang } = req.body;
    const language = userLang || detectLanguage(code);
    const annotations = annotateCode({ code, language });
    const optimized = await optimizeCode({ code, language, annotations });
    res.json({ optimized, language, annotations });
  } catch (e) {
    console.error('optimize error:', e);
    res.status(500).json({ error: e?.message || String(e) || "Failed to optimize code" });
  }
});

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
