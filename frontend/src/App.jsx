import React, { useState, useEffect } from "react";
import { annotateCodeInBrowser, explainAPI, optimizeAPI } from "./api";
import { healthAPI } from "./health";
import { marked } from 'marked';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';

export default function App() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("JavaScript");
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backendMock, setBackendMock] = useState(false);
  const [backendHasKey, setBackendHasKey] = useState(false);
  const [quotaError, setQuotaError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const h = await healthAPI();
        setBackendMock(!!h.mock);
        setBackendHasKey(!!h.hasKey);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    // highlight code blocks after submissions update
    try {
      Prism.highlightAll();
    } catch (e) {
      // ignore
    }
  }, [submissions]);

  async function handleExplain(e) {
    e && e.preventDefault();
    if (!code.trim()) return alert("Paste some code first.");
    setLoading(true);
    const annotations = await annotateCodeInBrowser({ code, language });
    const resp = await explainAPI({ code, language, annotations });
    if (resp?.error && /quota|insufficient_quota|429/i.test(String(resp.error))) {
      setQuotaError(String(resp.error));
    }
    setSubmissions((s) => [{ code, language, explanation: resp.explanation, annotations: resp.annotations, error: resp.error }, ...s]);
    setLoading(false);
  }

  async function handleOptimize() {
    if (!code.trim()) return alert("Paste some code first.");
    setLoading(true);
    const annotations = await annotateCodeInBrowser({ code, language });
    const resp = await optimizeAPI({ code, language, annotations });
    if (resp?.error && /quota|insufficient_quota|429/i.test(String(resp.error))) {
      setQuotaError(String(resp.error));
    }
    setSubmissions((s) => [{ code, language, optimized: resp.optimized, annotations: resp.annotations, error: resp.error }, ...s]);
    setLoading(false);
  }

  return (
    <div className="container">
      {backendMock && (
        <div style={{background:'#fff4e5', padding:8, borderRadius:6, marginBottom:12}}>
          <strong>Notice:</strong> Backend responses are mocked (MOCK_OPENAI_RESPONSES=true). Replace with real OpenAI key to get live results.
        </div>
      )}
      {quotaError && (
        <div style={{background:'#ffecec', padding:8, borderRadius:6, marginBottom:12}}>
          <strong>Quota/Billing:</strong> {String(quotaError)}
        </div>
      )}
      <h1>AI Code Explainer</h1>
      <form onSubmit={handleExplain}>
        <label>Language</label>
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option>JavaScript</option>
          <option>Python</option>
        </select>

        <label>Code</label>
        <textarea value={code} onChange={(e) => setCode(e.target.value)} rows={12} />

        <div className="buttons">
          <button type="submit" disabled={loading}>Explain</button>
          <button type="button" onClick={handleOptimize} disabled={loading}>Optimize</button>
        </div>
      </form>

      <h2>Submissions</h2>
      <div id="results">
        {submissions.map((s, i) => (
          <div className="card" key={i}>
            <div className="meta">{s.language} snippet #{submissions.length - i}</div>
            <pre className="code">{s.code}</pre>
            {s.explanation && (
              <div className="explanation" dangerouslySetInnerHTML={{__html: marked(s.explanation)}} />
            )}
            {s.optimized && (
              <div>
                <h4>Optimized suggestion:</h4>
                <pre className="optimized"><code className="language-javascript">{s.optimized}</code></pre>
                <h4>Diff (original → optimized)</h4>
                <pre className="diff"><code>{createDiff(s.code, s.optimized)}</code></pre>
              </div>
            )}
            <div className="annotations">
              {s.annotations && s.annotations.map((a, idx) => (
                <div className="annotation" key={idx}>
                  <strong>{a.type}</strong>: {a.name} (lines {a.startLine}-{a.endLine})
                  <pre><code className="language-javascript">{a.snippet}</code></pre>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function createDiff(a, b) {
  // simple line-based unified diff (not exhaustive but useful for short snippets)
  const aLines = (a || '').split(/\r?\n/);
  const bLines = (b || '').split(/\r?\n/);
  const out = [];
  const maxLen = Math.max(aLines.length, bLines.length);
  for (let i = 0; i < maxLen; i++) {
    const al = aLines[i];
    const bl = bLines[i];
    if (al === bl) {
      out.push('  ' + (al === undefined ? '' : al));
    } else {
      if (al !== undefined) out.push('- ' + al);
      if (bl !== undefined) out.push('+ ' + bl);
    }
  }
  return out.join('\n');
}

 
