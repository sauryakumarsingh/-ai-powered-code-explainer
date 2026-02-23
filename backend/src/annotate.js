import { parse } from "acorn";

export function annotateCode({ code, language }) {
  const annotations = [];

  try {
    if (language === "JavaScript") {
      const ast = parse(code, { ecmaVersion: 2020, sourceType: "module", locations: true });
      walkNodes(ast, (node) => {
        if (node.type === "FunctionDeclaration") {
          annotations.push({
            type: "function",
            name: node.id ? node.id.name : "(anonymous)",
            startLine: node.loc.start.line,
            endLine: node.loc.end.line,
            snippet: extractLines(code, node.loc.start.line, node.loc.end.line),
          });
        }
        if (node.type === "VariableDeclaration") {
          // capture top-level const/let/var declarations
          const names = node.declarations.map((d) => d.id && d.id.name).filter(Boolean);
          if (names.length) {
            annotations.push({
              type: "declaration",
              name: names.join(", "),
              startLine: node.loc.start.line,
              endLine: node.loc.end.line,
              snippet: extractLines(code, node.loc.start.line, node.loc.end.line),
            });
          }
        }
      });
    } else if (language === "Python") {
      // simple heuristic: find def and class lines
      const lines = code.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("def ") || line.startsWith("class ")) {
          const nameMatch = line.match(/^(def|class)\s+([A-Za-z0-9_]+)/);
          const name = (nameMatch && nameMatch[2]) || "(unknown)";
          annotations.push({
            type: line.startsWith("def ") ? "function" : "class",
            name,
            startLine: i + 1,
            endLine: i + 1,
            snippet: lines[i],
          });
        }
      }
    }
  } catch (e) {
    // if parsing fails, return empty annotations but don't crash
  }

  return annotations;
}

function walkNodes(node, cb) {
  cb(node);
  for (const key in node) {
    if (!Object.prototype.hasOwnProperty.call(node, key)) continue;
    const child = node[key];
    if (Array.isArray(child)) {
      child.forEach((c) => c && typeof c.type === "string" && walkNodes(c, cb));
    } else if (child && typeof child.type === "string") {
      walkNodes(child, cb);
    }
  }
}

function extractLines(code, start, end) {
  const lines = code.split(/\r?\n/).slice(start - 1, end);
  return lines.join("\n");
}
