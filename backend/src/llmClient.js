import OpenAI from "openai";
import fetch from "node-fetch";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function callOpenAIWithSDK(prompt, temperature = 0.2) {
  try {
    return await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature
    });
  } catch (sdkErr) {
    // rethrow to allow fallback
    throw sdkErr;
  }
}

async function callOpenAIWithFetch(prompt, temperature = 0.2) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], temperature })
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`OpenAI fetch error: ${resp.status} ${text}`);
  }
  return resp.json();
}

export async function explainCode({ code, language }) {
  const prompt = `
Explain the following ${language} code in 2–4 clear sentences.
Do not hallucinate. If something is unclear, say so.

Code:
"""
${code}
"""
`;
  try {
    const response = await callOpenAIWithSDK(prompt, 0.2);
    return response.choices[0].message.content.trim();
  } catch (e) {
    // SDK failed; try fetch fallback
    try {
      const response = await callOpenAIWithFetch(prompt, 0.2);
      return response.choices[0].message.content.trim();
    } catch (fetchErr) {
      // throw combined error
      const combined = new Error(`SDK error: ${e.message}; Fetch error: ${fetchErr.message}`);
      combined.stack = e.stack + "\n---fetch---\n" + fetchErr.stack;
      throw combined;
    }
  }
}

export async function optimizeCode({ code, language }) {
  const prompt = `
Rewrite this ${language} code to be more readable and idiomatic.
Do not change behavior.

Code:
"""
${code}
"""
`;
  try {
    const response = await callOpenAIWithSDK(prompt, 0.3);
    return response.choices[0].message.content.trim();
  } catch (e) {
    try {
      const response = await callOpenAIWithFetch(prompt, 0.3);
      return response.choices[0].message.content.trim();
    } catch (fetchErr) {
      const combined = new Error(`SDK error: ${e.message}; Fetch error: ${fetchErr.message}`);
      combined.stack = e.stack + "\n---fetch---\n" + fetchErr.stack;
      throw combined;
    }
  }
}
