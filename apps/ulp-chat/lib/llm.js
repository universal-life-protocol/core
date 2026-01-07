const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1";

function buildPrompt({ userText, contextSerialized, contextHash }) {
  return [
    "You are operating under a constrained execution system.",
    "",
    `Context hash: ${contextHash}`,
    "Context:",
    contextSerialized,
    "",
    "Rules:",
    "- Return JSON only (no markdown).",
    "- JSON must include: assistant_text (string), memory_claims (array), redactions (array).",
    "- memory_claims entries must include: type, value, cite, confidence.",
    "- Do not summarize context as memory.",
    "",
    "User message:",
    userText
  ].join("\n");
}

export async function callLLM({ userText, contextSerialized, contextHash }) {
  const prompt = buildPrompt({ userText, contextSerialized, contextHash });

  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "ollama_error");
  }

  const payload = await res.json();
  const raw = String(payload.response || "").trim();

  try {
    const parsed = JSON.parse(raw);
    return {
      assistant_text: parsed.assistant_text || "",
      memory_claims: Array.isArray(parsed.memory_claims) ? parsed.memory_claims : [],
      redactions: Array.isArray(parsed.redactions) ? parsed.redactions : []
    };
  } catch (err) {
    return {
      assistant_text: raw || "Unable to parse model output.",
      memory_claims: [],
      redactions: []
    };
  }
}
