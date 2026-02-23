const BACKEND_BASE = import.meta.env.VITE_BACKEND_URL || (typeof window !== 'undefined' && window.REACT_APP_BACKEND_URL) || "http://localhost:4000";
console.log('BACKEND_BASE', BACKEND_BASE);

export async function explainAPI({ code, language, annotations }) {
  const res = await fetch(`${BACKEND_BASE}/api/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, language, annotations }),
  });
  return res.json();
}

export async function optimizeAPI({ code, language, annotations }) {
  const res = await fetch(`${BACKEND_BASE}/api/optimize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, language, annotations }),
  });
  return res.json();
}

export async function annotateCodeInBrowser({ code, language }) {
  const annotations = [];
  try {
    if (language === "JavaScript") {
      const acorn = await import('acorn');
      const parse = acorn.parse;
      const ast = parse(code, { ecmaVersion: 2020, sourceType: "module", locations: true });
      walkNodes(ast, (node) => {
        if (node.type === "FunctionDeclaration") {
          annotations.push({ type: "function", name: node.id ? node.id.name : "(anonymous)", startLine: node.loc.start.line, endLine: node.loc.end.line, snippet: extractLines(code, node.loc.start.line, node.loc.end.line) });
        }
        if (node.type === "VariableDeclaration") {
          const names = node.declarations.map((d) => d.id && d.id.name).filter(Boolean);
          if (names.length) annotations.push({ type: "declaration", name: names.join(", "), startLine: node.loc.start.line, endLine: node.loc.end.line, snippet: extractLines(code, node.loc.start.line, node.loc.end.line) });
        }
      });
    } else if (language === "Python") {
      const lines = code.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("def ") || line.startsWith("class ")) {
          const m = line.match(/^(def|class)\s+([A-Za-z0-9_]+)/);
          annotations.push({ type: line.startsWith("def ") ? "function" : "class", name: (m && m[2]) || "(unknown)", startLine: i + 1, endLine: i + 1, snippet: lines[i] });
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return annotations;
}

function walkNodes(node, cb) {
  cb(node);
  for (const key in node) {
    if (!Object.prototype.hasOwnProperty.call(node, key)) continue;
    const child = node[key];
    if (Array.isArray(child)) child.forEach((c) => c && typeof c.type === "string" && walkNodes(c, cb));
    else if (child && typeof child.type === "string") walkNodes(child, cb);
  }
}

function extractLines(code, start, end) {
  return code.split(/\r?\n/).slice(start - 1, end).join("\n");
}
