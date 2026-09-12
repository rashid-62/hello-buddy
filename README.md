# Islamic History AI

**Explore the Story of Islamic Civilization.**

A specialized, knowledge-grounded AI chatbot for exploring Islamic history — built as a polished college arts-fest competition project.

This is **not** a general-purpose ChatGPT clone. It is designed to behave like a digital historian focused on prophets, the Seerah of Prophet Muhammad ﷺ, caliphates, empires, scholars, culture, and major historical events.

---

## 1. Project overview

Islamic History AI combines:

- A premium responsive web interface (HTML / CSS / Vanilla JavaScript)
- Netlify serverless backend (`/api/chat`)
- Simple Retrieval-Augmented Generation (RAG) over curated JSON knowledge files
- Groq as the primary AI provider
- Google Gemini as automatic fallback
- Browser `localStorage` for conversation history (no database required for v1)

The AI is instructed to stay inside Islamic history. Unrelated questions (cooking, coding, general trivia) are politely redirected.

---

## 2. Features

- Specialized Islamic history assistant (domain lock)
- Knowledge retrieval before answering (not “training” claims)
- Response modes: Quick, Detailed, Timeline, Key Points, Academic
- Related follow-up questions after answers
- Historical sources indicator (only when curated sources exist)
- Uncertainty badge when retrieved material is disputed / traditional
- Conversation memory within the current chat
- Sidebar topic explorer + conversation history
- Welcome screen with suggested questions
- Mobile-friendly collapsing sidebar
- Groq → Gemini automatic fallback
- Basic rate limiting and input validation
- Netlify-ready deployment

---

## 3. Technology stack

| Layer | Tech |
|------|------|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend | Node.js serverless functions (Netlify) |
| Hosting | Netlify |
| Primary AI | Groq API |
| Backup AI | Google Gemini API |
| Knowledge | Structured JSON files + keyword retrieval |
| Storage (v1) | `localStorage` |

No React. No heavy frontend frameworks.

---

## 4. Folder structure

```
islamic-history-ai/
├── index.html
├── styles.css
├── script.js
├── package.json
├── netlify.toml
├── .env.example
├── .gitignore
├── README.md
├── data/
│   └── sample-knowledge-schema.json
├── knowledge/
│   ├── prophets.json
│   ├── prophet-muhammad.json
│   ├── rashidun.json
│   ├── umayyads.json
│   ├── abbasids.json
│   ├── andalus.json
│   ├── fatimids.json
│   ├── seljuks.json
│   ├── ayyubids.json
│   ├── mamluks.json
│   ├── ottomans.json
│   ├── mughals.json
│   ├── islamic-science.json
│   ├── islamic-culture.json
│   ├── important-scholars.json
│   ├── important-events.json
│   ├── timeline.json
│   └── sources.json
├── lib/
│   ├── chatHandler.js
│   ├── ai/
│   │   ├── groq.js
│   │   ├── gemini.js
│   │   └── provider.js
│   ├── prompts/
│   │   └── systemPrompt.js
│   ├── retrieval/
│   │   ├── retriever.js
│   │   └── keywordSearch.js
│   └── utils/
│       ├── sanitize.js
│       └── rateLimit.js
├── netlify/
│   └── functions/
│       └── chat.js
└── scripts/
    └── local-server.js
```

---

## 5. How to install

### Requirements

- Node.js 18 or newer
- A Groq API key
- A Gemini API key (recommended for fallback)

### Steps

```bash
cd islamic-history-ai
npm install
copy .env.example .env
```

On macOS/Linux:

```bash
cp .env.example .env
```

Then edit `.env` and insert your real keys (see sections 7–9).

---

## 6. How to run locally

```bash
npm start
```

Open: [http://localhost:8888](http://localhost:8888)

This local server:

1. Serves `index.html`, `styles.css`, and `script.js`
2. Handles `POST /api/chat` with the same logic as Netlify

Optional Netlify CLI workflow:

```bash
npx netlify dev
```

---

## 7. How to create Groq API credentials

1. Go to [https://console.groq.com](https://console.groq.com)
2. Create / sign in to an account
3. Open **API Keys**
4. Create a key
5. Copy it into your `.env` file:

```env
GROQ_API_KEY=paste_your_real_groq_key_here
```

Never put this key in HTML, CSS, or frontend JavaScript.

---

## 8. How to create Gemini API credentials

1. Go to [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Sign in with a Google account
3. Create an API key
4. Copy it into your `.env` file:

```env
GEMINI_API_KEY=paste_your_real_gemini_key_here
```

---

## 9. How to configure environment variables

### Local

Create `.env` in the project root:

```env
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# Optional overrides
# GROQ_MODEL=llama-3.3-70b-versatile
# GEMINI_MODEL=gemini-2.0-flash
# PORT=8888
# DATABASE_URL=
```

`.env` is gitignored. Do **not** commit it.

### Netlify

In Netlify Dashboard:

**Site configuration → Environment variables**

Add:

- `GROQ_API_KEY`
- `GEMINI_API_KEY`

Optional:

- `GROQ_MODEL`
- `GEMINI_MODEL`

---

## 10. How the AI fallback system works

```
User question
   ↓
Retrieval (JSON knowledge)
   ↓
System prompt + context
   ↓
Try Groq (primary)
   ↓ (rate limit / outage / error)
Try Gemini (fallback)
   ↓
Structured JSON response to frontend
```

Implementation files:

- `lib/ai/groq.js` — Groq provider
- `lib/ai/gemini.js` — Gemini provider
- `lib/ai/provider.js` — fallback orchestration

The UI continues working if one provider fails, as long as the other succeeds.

---

## 11. How the knowledge retrieval system works

This project uses a **simple beginner-friendly RAG** design:

1. Extract keywords from the question
2. Choose likely knowledge JSON files (category map)
3. Score entries by title / keywords / content matches
4. Rank and keep the top matches
5. Send **only that context** to the AI (not the entire knowledge base)

Core files:

- `lib/retrieval/keywordSearch.js`
- `lib/retrieval/retriever.js`

### Upgrade path (future)

The architecture is intentionally clean so you can later replace keyword search with:

- Embeddings
- Supabase / PostgreSQL + `pgvector`
- Pinecone
- Chroma

without rewriting the whole app.

---

## 12. How to add historical knowledge

1. Open the matching file in `/knowledge` (or create a new one)
2. Copy the template from `data/sample-knowledge-schema.json`
3. Fill in accurate fields
4. Add strong `keywords`
5. Set `certainty` honestly (`established_traditional`, `traditional_account`, `disputed`, `sectarian_difference`)
6. Add `sources` only if real; otherwise mark `needs_verification`
7. If you create a **new file**, register it in `lib/retrieval/retriever.js` (`ALL_KNOWLEDGE_FILES` and optionally `CATEGORY_FILE_MAP`)

Example entry shape:

```json
{
  "id": "battle-badr",
  "title": "Battle of Badr",
  "period": "Medinan Period",
  "year_hijri": "2 AH",
  "year_ce": "624 CE",
  "category": "battle",
  "certainty": "established_traditional",
  "keywords": ["Badr", "battle", "Quraysh", "Medina"],
  "summary": "...",
  "detailed_information": "...",
  "important_people": [],
  "location": "",
  "historical_significance": "",
  "related_questions": [],
  "sources": []
}
```

---

## 13. How to deploy to Netlify

1. Push this project to GitHub (without `.env`)
2. Log in to [Netlify](https://www.netlify.com)
3. **Add new site → Import an existing project**
4. Build settings:
   - Build command: leave empty (or `echo "static site"`)
   - Publish directory: `.` (project root)
5. Add environment variables (`GROQ_API_KEY`, `GEMINI_API_KEY`)
6. Deploy

`netlify.toml` already maps:

```
/api/*  →  /.netlify/functions/:splat
```

So the frontend call to `/api/chat` works in production.

---

## 14. Security notes

- API keys exist **only** in environment variables / serverless runtime
- Frontend never receives provider keys
- Requests are validated and sanitized (`lib/utils/sanitize.js`)
- Message length is capped
- Basic per-IP rate limiting is applied
- Safe error messages are returned (no stack traces to clients)
- Do not commit `.env`
- Do not use `eval`

This is suitable hardening for a student competition project, not a full enterprise auth system.

---

## 15. Historical accuracy warning

Islamic history includes:

- Different scholarly interpretations
- Differences between historical sources
- Differences between Sunni and Shia historical traditions
- Disputed dates, numbers, and narrations

This chatbot is instructed to:

- Avoid presenting disputed matters as absolute fact
- Say when sources differ
- Stay respectful and non-sectarian
- Prefer honesty over hallucination

**Important:** AI-generated or quickly compiled historical notes in `/knowledge` must be reviewed by qualified human researchers before being treated as authoritative for academic or production use.

Do **not** describe this app as “trained on Islamic history” unless real model training was performed. It is a **knowledge-grounded** system.

---

## 16. Future improvements

- Vector embeddings + semantic search
- Supabase PostgreSQL conversation storage
- Verified citation workflow with human review queue
- Multilingual UI (Arabic / Urdu / English)
- Rich interactive timeline visualization
- User accounts (optional)
- Streaming responses
- Admin panel for knowledge editing

---

## API contract

### `POST /api/chat`

Request:

```json
{
  "message": "Explain the Hijrah.",
  "conversation": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "responseMode": "detailed"
}
```

Response (success):

```json
{
  "success": true,
  "answer": "...",
  "sources": [],
  "relatedQuestions": [],
  "historicalUncertainty": false,
  "provider": "groq"
}
```

---

## Where to insert API keys

| Place | What to do |
|------|------------|
| Local development | Put keys in `.env` (copy from `.env.example`) |
| Netlify production | Site settings → Environment variables |
| Frontend files | **Never** put keys here |

---

## License

MIT — built for educational / competition use.
