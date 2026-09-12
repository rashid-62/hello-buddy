/**
 * Input validation and sanitization for chat requests.
 * Never trust frontend data.
 */

const MAX_MESSAGE_LENGTH = 2000;
const MAX_CONVERSATION_MESSAGES = 12;
const MAX_CONVERSATION_CONTENT = 800;



/**
 * Strip control characters and normalize whitespace edges.
 */
function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

/**
 * Validate and normalize an incoming chat request body.
 * @returns {{ ok: true, data: object } | { ok: false, error: string, status: number }}
 */
function validateChatRequest(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid request body.', status: 400 };
  }

  const message = sanitizeText(body.message);
  if (!message) {
    return { ok: false, error: 'Please enter a message.', status: 400 };
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: `Message is too long. Please keep it under ${MAX_MESSAGE_LENGTH} characters.`,
      status: 400
    };
  }

  const conversation = Array.isArray(body.conversation)
    ? body.conversation
        .slice(-MAX_CONVERSATION_MESSAGES)
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const role = item.role === 'assistant' ? 'assistant' : 'user';
          const content = sanitizeText(item.content).slice(0, MAX_CONVERSATION_CONTENT);
          if (!content) return null;
          return { role, content };
        })
        .filter(Boolean)
    : [];

  const attachments = Array.isArray(body.attachments)
    ? body.attachments
        .filter(a => a && a.type && a.data && typeof a.data === 'string')
        .slice(0, 5) // max 5 attachments
        .map(a => ({ type: a.type, data: a.data }))
    : [];

  return {
    ok: true,
    data: {
      message,
      conversation,
      attachments
    }
  };
}

export {
  MAX_MESSAGE_LENGTH,
  sanitizeText,
  validateChatRequest
};
