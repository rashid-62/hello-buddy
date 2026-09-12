/**
 * Simple in-memory rate limiter for serverless/local use.
 * Note: On Netlify, each isolate has its own memory — this is a basic protection, not a global quota.
 */

const buckets = new Map();

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 20;

function getClientId(event) {
  const headers = event.headers || {};
  return (
    headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    headers['client-ip'] ||
    headers['x-nf-client-connection-ip'] ||
    'local'
  );
}

/**
 * @returns {{ allowed: boolean, retryAfterSec?: number }}
 */
function checkRateLimit(clientId) {
  const now = Date.now();
  let bucket = buckets.get(clientId);

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    bucket = { windowStart: now, count: 0 };
    buckets.set(clientId, bucket);
  }

  bucket.count += 1;

  if (bucket.count > MAX_REQUESTS) {
    const retryAfterSec = Math.ceil((WINDOW_MS - (now - bucket.windowStart)) / 1000);
    return { allowed: false, retryAfterSec };
  }

  return { allowed: true };
}

module.exports = {
  getClientId,
  checkRateLimit,
  MAX_REQUESTS,
  WINDOW_MS
};
