/**
 * Google Gemini AI provider (backup / fallback).
 */

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

function buildGeminiUrl(apiKey) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

/**
 * Convert OpenAI-style messages to Gemini contents.
 * System instruction is passed separately.
 */
function toGeminiContents(messages) {
  return messages.map((msg) => {
    const parts = [{ text: msg.content }];
    
    if (msg.attachments && Array.isArray(msg.attachments)) {
      msg.attachments.forEach(att => {
        if (att.data && att.data.includes('base64,')) {
          parts.push({
            inlineData: {
              mimeType: att.type,
              data: att.data.split('base64,')[1]
            }
          });
        }
      });
    }

    return {
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts
    };
  });
}

/**
 * @param {object} params
 * @param {string} params.systemPrompt
 * @param {Array<{role:string,content:string}>} params.messages
 * @returns {Promise<{ text: string, provider: string, model: string }>}
 */
async function generateWithGemini({ systemPrompt, messages }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('your_gemini')) {
    const err = new Error('GEMINI_API_KEY is not configured.');
    err.code = 'MISSING_KEY';
    throw err;
  }

  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: toGeminiContents(messages),
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 1800
    }
  };

  const response = await fetch(buildGeminiUrl(apiKey), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(
      data?.error?.message || `Gemini request failed with status ${response.status}`
    );
    err.status = response.status;
    err.code = response.status === 429 ? 'RATE_LIMIT' : 'PROVIDER_ERROR';
    err.provider = 'gemini';
    throw err;
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text || '')
    .join('')
    .trim();

  if (!text) {
    const blocked = data?.candidates?.[0]?.finishReason;
    const err = new Error(
      blocked
        ? `Gemini did not return content (${blocked}).`
        : 'Gemini returned an empty response.'
    );
    err.code = 'EMPTY_RESPONSE';
    err.provider = 'gemini';
    throw err;
  }

  return {
    text,
    provider: 'gemini',
    model: GEMINI_MODEL
  };
}

export {
  generateWithGemini,
  GEMINI_MODEL
};
