/**
 * Netlify Serverless Function: POST /.netlify/functions/chat
 * Redirected from /api/chat via netlify.toml
 */

const { handleChat } = require('../../lib/chatHandler');
const { getClientId, checkRateLimit } = require('../../lib/utils/rateLimit');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, error: 'Method not allowed. Use POST.' })
    };
  }

  const clientId = getClientId(event);
  const rate = checkRateLimit(clientId);
  if (!rate.allowed) {
    return {
      statusCode: 429,
      headers: {
        ...CORS_HEADERS,
        'Retry-After': String(rate.retryAfterSec || 60)
      },
      body: JSON.stringify({
        success: false,
        error: 'Too many requests. Please wait a moment and try again.'
      })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, error: 'Invalid JSON body.' })
    };
  }

  const result = await handleChat(body);

  return {
    statusCode: result.statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(result.payload)
  };
};
