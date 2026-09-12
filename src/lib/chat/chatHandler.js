/**
 * Shared chat orchestration used by Netlify function and local server.
 */

import { validateChatRequest } from "./utils/sanitize.js";
import { retrieveKnowledge } from "./retrieval/retriever.js";
import { buildSystemPrompt } from "./prompts/systemPrompt.js";
import { generateResponse } from "./ai/provider.js";

/**
 * Process a chat request body and return a structured API result.
 */
async function handleChat(body) {
  const validation = validateChatRequest(body);
  if (!validation.ok) {
    return {
      statusCode: validation.status,
      payload: {
        success: false,
        error: validation.error
      }
    };
  }

  const { message, conversation, attachments } = validation.data;
  
  let preferredProvider = ['groq', 'gemini'].includes(body.preferredProvider) ? body.preferredProvider : null;
  // If there are attachments, force Gemini because Groq text models don't support vision/files
  if (attachments && attachments.length > 0) {
    preferredProvider = 'gemini';
  }
  
  const researchLevel = body.researchLevel === 'scholar' ? 'scholar' : 'student';
  const language = body.language || 'en';

  const retrieval = retrieveKnowledge(message, { limit: researchLevel === 'scholar' ? 10 : 3 });

  const systemPrompt = buildSystemPrompt({
    knowledgeContext: retrieval.contextText,
    historicalUncertainty: retrieval.historicalUncertainty,
    researchLevel,
    language
  });

  const messages = [
    ...conversation.map((m) => ({
      role: m.role,
      content: m.content
    })),
    { role: 'user', content: message, attachments }
  ];

  try {
    const ai = await generateResponse({ systemPrompt, messages, preferredProvider });

    // Prefer knowledge-derived related questions; if empty, provide safe defaults
    const relatedQuestions =
      retrieval.relatedQuestions.length > 0
        ? retrieval.relatedQuestions
        : [
            'Who was Prophet Ibrahim?',
            'Explain the Hijrah to Madinah.',
            'What was the Islamic Golden Age?'
          ];

    return {
      statusCode: 200,
      payload: {
        success: true,
        answer: ai.text,
        sources: retrieval.sources,
        webSources: ai.webSources || [],
        matchedTopics: retrieval.entries
          .filter((e) => e.title)
          .map((e) => ({ title: e.title, period: e.period || null, source: e.source || null })),
        relatedQuestions,
        historicalUncertainty: retrieval.historicalUncertainty,
        provider: ai.provider,
        fallbackUsed: Boolean(ai.fallbackUsed),
        matchCount: retrieval.matchCount
      }
    };
  } catch (err) {
    const status = err.status || 503;
    const safeMessage =
      err.code === 'ALL_PROVIDERS_FAILED'
        ? err.message
        : err.code === 'MISSING_KEY'
          ? 'AI service is not configured. Please set GROQ_API_KEY and GEMINI_API_KEY.'
          : 'Unable to generate a response right now. Please try again.';

    return {
      statusCode: status === 429 ? 429 : status >= 400 && status < 600 ? status : 503,
      payload: {
        success: false,
        error: safeMessage,
        historicalUncertainty: false,
        sources: [],
        relatedQuestions: []
      }
    };
  }
}

export {
  handleChat
};
