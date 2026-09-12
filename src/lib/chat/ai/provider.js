/**
 * AI provider abstraction.
 *
 * Fallback chain:
 *   1. groq/compound  — web search + citations (primary)
 *   2. llama-3.3-70b  — plain Groq, no web search (if compound fails)
 *   3. Gemini          — final fallback (if both Groq calls fail)
 *
 * All paths return: { text, provider, model, webSources, fallbackUsed }
 */



import { generateWithGroqCompound, generateWithGroq } from "./groq.js";
import { generateWithGemini } from "./gemini.js";

async function generateResponse({ systemPrompt, messages, preferredProvider }) {
  // Explicit Gemini override
  if (preferredProvider === 'gemini') {
    const result = await generateWithGemini({ systemPrompt, messages });
    return { ...result, webSources: [], fallbackUsed: false };
  }

  // Explicit plain-Groq override (skip compound and Gemini)
  if (preferredProvider === 'groq') {
    const result = await generateWithGroq({ systemPrompt, messages });
    return { ...result, fallbackUsed: false };
  }

  // ── Auto: 3-tier chain ──────────────────────────────────────────────────

  // 1. groq/compound (live web search)
  try {
    const result = await generateWithGroqCompound({ systemPrompt, messages });
    return { ...result, fallbackUsed: false };
  } catch (compoundErr) {
    console.warn('[AI] groq/compound failed, trying plain Groq:', compoundErr.message);

    // 2. Plain Groq — llama-3.3-70b (no web search)
    try {
      const result = await generateWithGroq({ systemPrompt, messages });
      return { ...result, fallbackUsed: true, webSources: [] };
    } catch (groqErr) {
      console.warn('[AI] Plain Groq also failed, trying Gemini:', groqErr.message);

      // 3. Gemini final fallback
      try {
        const result = await generateWithGemini({ systemPrompt, messages });
        return { ...result, webSources: [], fallbackUsed: true, primaryError: compoundErr.message };
      } catch (geminiErr) {
        console.error('[AI] All providers failed. Groq compound:', compoundErr.message,
                      '| Groq plain:', groqErr.message,
                      '| Gemini:', geminiErr.message);

        const err = new Error(
          'Both AI providers are currently unavailable. Please try again shortly.'
        );
        err.code   = 'ALL_PROVIDERS_FAILED';
        err.status =
          compoundErr.status === 429 || groqErr.status === 429 || geminiErr.status === 429
            ? 429 : 503;
        err.details = {
          compound: compoundErr.message,
          groq:     groqErr.message,
          gemini:   geminiErr.message
        };
        throw err;
      }
    }
  }
}

export { generateResponse };
