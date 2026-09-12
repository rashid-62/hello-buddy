/**
 * Groq AI provider (primary).
 *
 * Exports two functions:
 *  - generateWithGroqCompound  — uses groq/compound (live web search, cites sources)
 *  - generateWithGroq          — plain llama-3.3-70b-versatile (no web search, fast fallback)
 */



const GROQ_API_URL     = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL       = 'llama-3.3-70b-versatile';
const GROQ_COMPOUND    = 'groq/compound';

/* ── Shared fetch helper ── */
async function groqPost(apiKey, payload) {
  const response = await fetch(GROQ_API_URL, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(
      data?.error?.message || `Groq request failed with status ${response.status}`
    );
    err.status   = response.status;
    err.code     = response.status === 429 ? 'RATE_LIMIT' : 'PROVIDER_ERROR';
    err.provider = 'groq';
    throw err;
  }

  return data;
}

/* ── Extract web citations from executed_tools ── */
function extractWebSources(data) {
  const tools = data?.choices?.[0]?.message?.executed_tools;
  if (!Array.isArray(tools)) return [];

  const sources = [];
  const seen    = new Set();

  for (const tool of tools) {
    const results = tool?.search_results;
    if (!Array.isArray(results)) continue;

    for (const r of results) {
      const url   = r?.url   || '';
      const title = r?.title || url;
      if (!url || seen.has(url)) continue;
      seen.add(url);
      sources.push({ title, url });
    }
  }

  return sources;
}

/**
 * Primary call: groq/compound — autonomous web search + citation extraction.
 * Returns { text, provider, model, webSources }
 */
async function generateWithGroqCompound({ systemPrompt, messages }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes('your_groq')) {
    const err = new Error('GROQ_API_KEY is not configured.');
    err.code = 'MISSING_KEY';
    throw err;
  }

  const data = await groqPost(apiKey, {
    model:      GROQ_COMPOUND,
    temperature: 0.4,
    max_tokens:  1800,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ]
  });

  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    const err = new Error('groq/compound returned an empty response.');
    err.code = 'EMPTY_RESPONSE';
    err.provider = 'groq-compound';
    throw err;
  }

  return {
    text:       text.trim(),
    provider:   'groq',
    model:      GROQ_COMPOUND,
    webSources: extractWebSources(data)
  };
}

/**
 * Fallback call: plain llama-3.3-70b-versatile — no web search, fastest.
 * Returns { text, provider, model, webSources: [] }
 */
async function generateWithGroq({ systemPrompt, messages }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes('your_groq')) {
    const err = new Error('GROQ_API_KEY is not configured.');
    err.code = 'MISSING_KEY';
    throw err;
  }

  const data = await groqPost(apiKey, {
    model:       GROQ_MODEL,
    temperature: 0.4,
    max_tokens:  1800,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ]
  });

  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    const err = new Error('Groq returned an empty response.');
    err.code = 'EMPTY_RESPONSE';
    err.provider = 'groq';
    throw err;
  }

  return {
    text:       text.trim(),
    provider:   'groq',
    model:      GROQ_MODEL,
    webSources: []
  };
}

export {
  generateWithGroqCompound,
  generateWithGroq,
  GROQ_MODEL,
  GROQ_COMPOUND
};
