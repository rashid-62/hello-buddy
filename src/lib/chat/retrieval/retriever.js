/**
 * Simple RAG retriever over JSON knowledge files.
 *
 * Upgrade path later:
 *   keywordSearch → embeddings + pgvector / Pinecone / Chroma
 */

import { KNOWLEDGE_FILES } from "./knowledgeData.js";
import { extractKeywords, rankEntries } from "./keywordSearch.js";


/** Map query themes → preferred knowledge files */
const CATEGORY_FILE_MAP = {
  prophet: ['prophets.json', 'prophet-muhammad.json'],
  prophets: ['prophets.json'],
  ibrahim: ['prophets.json'],
  musa: ['prophets.json'],
  isa: ['prophets.json'],
  nuh: ['prophets.json'],
  muhammad: ['prophet-muhammad.json', 'timeline.json'],
  seerah: ['prophet-muhammad.json', 'timeline.json'],
  makkah: ['prophet-muhammad.json'],
  madinah: ['prophet-muhammad.json'],
  medina: ['prophet-muhammad.json'],
  hijrah: ['prophet-muhammad.json', 'timeline.json', 'important-events.json'],
  badr: ['prophet-muhammad.json', 'important-events.json'],
  uhud: ['prophet-muhammad.json', 'important-events.json'],
  khandaq: ['prophet-muhammad.json'],
  hudaybiyyah: ['prophet-muhammad.json', 'important-events.json'],
  rashidun: ['rashidun.json', 'timeline.json'],
  abu: ['rashidun.json', 'prophet-muhammad.json'],
  bakr: ['rashidun.json'],
  umar: ['rashidun.json'],
  uthman: ['rashidun.json'],
  ali: ['rashidun.json'],
  caliph: ['rashidun.json', 'umayyads.json', 'abbasids.json', 'fatimids.json'],
  caliphate: ['rashidun.json', 'umayyads.json', 'abbasids.json', 'ottomans.json'],
  umayyad: ['umayyads.json', 'andalus.json'],
  umayyads: ['umayyads.json'],
  abbasid: ['abbasids.json', 'islamic-science.json', 'islamic-culture.json'],
  abbasids: ['abbasids.json'],
  baghdad: ['abbasids.json', 'islamic-science.json'],
  andalus: ['andalus.json'],
  spain: ['andalus.json'],
  cordoba: ['andalus.json'],
  granada: ['andalus.json'],
  fatimid: ['fatimids.json'],
  fatimids: ['fatimids.json'],
  cairo: ['fatimids.json', 'mamluks.json'],
  seljuk: ['seljuks.json'],
  seljuks: ['seljuks.json'],
  ayyubid: ['ayyubids.json'],
  ayyubids: ['ayyubids.json'],
  salahuddin: ['ayyubids.json', 'important-events.json'],
  saladin: ['ayyubids.json'],
  mamluk: ['mamluks.json'],
  mamluks: ['mamluks.json'],
  ottoman: ['ottomans.json', 'timeline.json'],
  ottomans: ['ottomans.json'],
  istanbul: ['ottomans.json'],
  mughal: ['mughals.json'],
  mughals: ['mughals.json'],
  akbar: ['mughals.json'],
  science: ['islamic-science.json', 'islamic-culture.json'],
  astronomy: ['islamic-science.json'],
  medicine: ['islamic-science.json'],
  algebra: ['islamic-science.json'],
  scholar: ['important-scholars.json', 'islamic-science.json'],
  scholars: ['important-scholars.json'],
  ibn: ['important-scholars.json', 'islamic-science.json'],
  culture: ['islamic-culture.json'],
  architecture: ['islamic-culture.json'],
  golden: ['islamic-science.json', 'abbasids.json', 'islamic-culture.json'],
  event: ['important-events.json', 'timeline.json'],
  events: ['important-events.json', 'timeline.json'],
  timeline: ['timeline.json'],
  crusade: ['ayyubids.json', 'important-events.json', 'seljuks.json'],
  battle: ['important-events.json', 'prophet-muhammad.json', 'ayyubids.json']
};

const ALL_KNOWLEDGE_FILES = [
  'prophets.json',
  'prophet-muhammad.json',
  'rashidun.json',
  'umayyads.json',
  'abbasids.json',
  'andalus.json',
  'fatimids.json',
  'seljuks.json',
  'ayyubids.json',
  'mamluks.json',
  'ottomans.json',
  'mughals.json',
  'islamic-science.json',
  'islamic-culture.json',
  'important-scholars.json',
  'important-events.json',
  'timeline.json',
  'sources.json'
];

let knowledgeCache = null;

function loadKnowledgeFile(filename) {
  const parsed = KNOWLEDGE_FILES[filename];
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.entries)) return parsed.entries;
  return [];
}

function getAllKnowledge() {
  if (knowledgeCache) return knowledgeCache;

  const byFile = {};
  for (const file of ALL_KNOWLEDGE_FILES) {
    byFile[file] = loadKnowledgeFile(file);
  }
  knowledgeCache = byFile;
  return knowledgeCache;
}

/**
 * Pick which knowledge files are most likely relevant.
 */
function selectRelevantFiles(keywords) {
  const selected = new Set();

  for (const keyword of keywords) {
    if (CATEGORY_FILE_MAP[keyword]) {
      CATEGORY_FILE_MAP[keyword].forEach((f) => selected.add(f));
    }
    // Soft match map keys
    for (const [key, files] of Object.entries(CATEGORY_FILE_MAP)) {
      if (keyword.includes(key) || key.includes(keyword)) {
        files.forEach((f) => selected.add(f));
      }
    }
  }

  // Always include timeline for chronological questions
  if (keywords.some((k) => ['timeline', 'when', 'year', 'chronology', 'history'].includes(k))) {
    selected.add('timeline.json');
  }

  // Fallback: search a broad but limited set (not every file dumped to the model)
  if (selected.size === 0) {
    [
      'prophet-muhammad.json',
      'rashidun.json',
      'abbasids.json',
      'ottomans.json',
      'important-events.json',
      'important-scholars.json',
      'islamic-science.json',
      'timeline.json'
    ].forEach((f) => selected.add(f));
  }

  return Array.from(selected);
}

/**
 * Format selected entries into a context string for the AI model.
 */
function formatContext(rankedItems) {
  return rankedItems
    .map(({ entry, score }, index) => {
      return [
        `### Context ${index + 1} (relevance ${score.toFixed(1)})`,
        `ID: ${entry.id || 'n/a'}`,
        `Title: ${entry.title || 'n/a'}`,
        `Period: ${entry.period || 'n/a'}`,
        `Years: ${[entry.year_hijri, entry.year_ce].filter(Boolean).join(' / ') || 'n/a'}`,
        `Category: ${entry.category || 'n/a'}`,
        `Certainty: ${entry.certainty || 'established_traditional'}`,
        `Summary: ${entry.summary || ''}`,
        `Details: ${entry.detailed_information || ''}`,
        `Significance: ${entry.historical_significance || ''}`,
        `People: ${(entry.important_people || []).join(', ')}`,
        `Location: ${entry.location || 'n/a'}`,
        `Source: ${entry.source || 'Historical Text'}`,
        entry.disputed_notes ? `Disputed notes: ${entry.disputed_notes}` : ''
      ].filter(Boolean).join('\n');
    })
    .join('\n\n');
}

/**
 * Collect unique sources from ranked entries (only if present).
 */
function collectSources(rankedItems) {
  const collected = [];
  const seen = new Set();

  for (const { entry } of rankedItems) {
    if (!Array.isArray(entry.sources)) continue;
    for (const source of entry.sources) {
      if (!source) continue;
      if (typeof source === 'object' && source.verification_status === 'needs_verification') {
        continue; // do not show unverified citations in UI
      }
      const key =
        typeof source === 'string'
          ? source
          : `${source.author || ''}|${source.work || ''}`;
      if (seen.has(key) || !key.replace(/\|/g, '')) continue;
      seen.add(key);
      collected.push(
        typeof source === 'string'
          ? { work: source, type: 'reference' }
          : {
              author: source.author || '',
              work: source.work || '',
              type: source.type || 'historical source'
            }
      );
    }
  }
  return collected.slice(0, 6);
}

function detectUncertainty(rankedItems) {
  return rankedItems.some(({ entry }) => {
    const certainty = (entry.certainty || '').toLowerCase();
    return (
      certainty === 'disputed' ||
      certainty === 'sectarian_difference' ||
      certainty === 'traditional_account' ||
      Boolean(entry.disputed_notes)
    );
  });
}

/**
 * Build simple related follow-up questions from retrieved entries.
 */
function buildRelatedQuestions(rankedItems, userMessage) {
  const questions = [];
  for (const { entry } of rankedItems) {
    if (Array.isArray(entry.related_questions)) {
      for (const q of entry.related_questions) {
        if (q && !questions.includes(q)) questions.push(q);
      }
    }
    if (entry.title && questions.length < 6) {
      const title = entry.title;
      const candidates = [
        `What is the historical significance of ${title}?`,
        `Who were the key figures connected to ${title}?`,
        `What happened after ${title}?`
      ];
      for (const c of candidates) {
        if (!questions.includes(c) && !userMessage.toLowerCase().includes(title.toLowerCase())) {
          questions.push(c);
        }
      }
    }
  }
  return questions.slice(0, 3);
}

/**
 * Main retrieval entry point.
 */
function retrieveKnowledge(userMessage, options = {}) {
  const limit = options.limit || 5;
  const keywords = extractKeywords(userMessage);
  const knowledge = getAllKnowledge();
  const files = selectRelevantFiles(keywords);

  const pool = [];
  for (const file of files) {
    const entries = knowledge[file] || [];
    for (const entry of entries) {
      pool.push(entry);
    }
  }

  const ranked = rankEntries(pool, keywords, limit);

  return {
    keywords,
    filesSearched: files,
    contextText: formatContext(ranked),
    sources: collectSources(ranked),
    historicalUncertainty: detectUncertainty(ranked),
    relatedQuestions: buildRelatedQuestions(ranked, userMessage),
    matchCount: ranked.length,
    entries: ranked.map(({ entry: e, score }) => ({
      id: e.id,
      title: e.title,
      period: e.period || e.category || null,
      source: e.source,
      score,
      certainty: e.certainty || null
    }))
  };
}

/** Clear cache (useful in local/dev hot reload) */
function clearKnowledgeCache() {
  knowledgeCache = null;
}

export {
  retrieveKnowledge,
  clearKnowledgeCache,
  selectRelevantFiles,
  ALL_KNOWLEDGE_FILES
};
