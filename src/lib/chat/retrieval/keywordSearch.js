/**
 * Keyword extraction and scoring for simple RAG retrieval.
 * Designed so it can later be swapped for vector embeddings.
 */

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
  'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his',
  'their', 'what', 'which', 'who', 'whom', 'how', 'when', 'where', 'why',
  'about', 'with', 'from', 'into', 'over', 'after', 'before', 'between',
  'tell', 'me', 'please', 'explain', 'describe', 'give', 'show', 'list',
  'some', 'any', 'more', 'also', 'just', 'like', 'than', 'then', 'there',
  'here', 'very', 'much', 'many', 'most', 'other', 'such', 'only', 'own'
]);

/** Normalize Arabic-script honorifics and common Latin variants. */
function normalizeToken(token) {
  return token
    .toLowerCase()
    .replace(/[ﷺ]/g, '')
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9\u0600-\u06FF-]/g, '')
    .trim();
}

/**
 * Extract meaningful keywords from a user question.
 */
function extractKeywords(text) {
  if (!text || typeof text !== 'string') return [];

  const raw = text
    .toLowerCase()
    .replace(/[?!.,;:()[\]{}""]/g, ' ')
    .split(/\s+/)
    .map(normalizeToken)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));

  // Keep order but unique
  const seen = new Set();
  const keywords = [];
  for (const token of raw) {
    if (!seen.has(token)) {
      seen.add(token);
      keywords.push(token);
    }
  }
  return keywords;
}

/**
 * Score how well an entry matches the query keywords.
 * Higher = more relevant.
 */
function scoreEntry(entry, keywords) {
  if (!entry || !keywords.length) return 0;

  const haystackParts = [
    entry.id,
    entry.title,
    entry.period,
    entry.category,
    entry.summary,
    entry.detailed_information,
    entry.historical_significance,
    entry.location,
    ...(entry.keywords || []),
    ...(entry.important_people || []),
    ...(entry.topics || [])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let score = 0;
  const title = (entry.title || '').toLowerCase();
  const id = (entry.id || '').toLowerCase();
  const entryKeywords = (entry.keywords || []).map((k) => String(k).toLowerCase());

  for (const keyword of keywords) {
    if (title.includes(keyword)) score += 8;
    if (id.includes(keyword)) score += 6;
    if (entryKeywords.some((k) => k.includes(keyword) || keyword.includes(k))) score += 5;
    if (haystackParts.includes(keyword)) score += 2;

    // Partial / plural soft match
    if (keyword.length >= 4) {
      const stem = keyword.slice(0, Math.max(4, keyword.length - 1));
      if (title.includes(stem)) score += 3;
    }
  }

  // Boost disputed entries slightly less so established facts rank first when tied
  if (entry.certainty === 'disputed') score -= 0.5;

  return score;
}

/**
 * Rank entries and return the top N with positive scores.
 */
function rankEntries(entries, keywords, limit = 5) {
  return entries
    .map((entry) => ({ entry, score: scoreEntry(entry, keywords) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export {
  extractKeywords,
  scoreEntry,
  rankEntries,
  normalizeToken
};
