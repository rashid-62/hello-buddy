# Project Progress

## 2026-09-07 (Session 4)

**Markdown Rendering**
- **What**: Added `marked.js` library to properly render the bot's markdown responses (bold text, headers, lists) into HTML inside the chat bubbles. Added corresponding CSS for typography and spacing.
- **Why**: Fixes the issue where markdown syntax like asterisks were displayed as raw text, significantly improving readability. User messages intentionally remain raw text.

**Authentication Fixes**
- **What**: Added a "show password" eye icon toggle that dynamically injects into the Netlify Identity widget iframe.
- **Why**: Enhances user experience by allowing them to see their typed passwords during signup and login.

**Brand Identity: Turath**
- **What**: Replaced "Islamic History AI" header title with the new "Turath" identity.
- **Why**: User requested a specific geometric logo (circle + 8-point star squares) and new typography (Turath in display font, Arabic text, and motto). Also updated the favicon.

**Loading Animation**
- **What**: Replaced the CSS typing dots with a spinning square animation utilizing the new geometric logo.
- **Why**: Creates a smoother, thematic waiting experience.

**Authentication UI Integration**
- **What**: Integrated Netlify Identity widget and added a "Sign In" button to the topbar.
- **Why**: Allows users to create accounts and log in (configured specifically for email-only authentication on the backend per user request).

**Color Palette Update**
- **What**: Updated the global CSS theme variables for both dark and light themes without changing layout.
- **Why**: Applied a deep forest-green/jade aesthetic (`#0D1F1A`, `#14332B`, `#4E9E82`) and a complementary warm parchment light theme per user request.

## 2026-09-07 (Session 3)

**Response Credibility & Sources Enhancement**
- **What**: Added specific historical sources to all `knowledge.json` entries via an automated script. Merged Knowledge Base citations and Web Citations into a single "Historical sources" UI element.
- **Why**: To provide granular traceability for historical claims.

**Prompt Upgrades for Scholarship & Structure**
- **What**: Updated the system prompt to require structured headers (Overview, Key Events, etc.) for biographies and events. Explicitly instructed the model to distinguish between "Islamic tradition" and "academic scholarship", and to acknowledge disagreements.
- **Why**: Enhances academic rigor and readability.

**About Modal Added**
- **What**: Added an "About" link to the footer that opens a disclaimer modal explaining data sources, web search fallbacks, and AI hallucination risks.

## 2026-09-07 (Session 2)

**Removed "Response Mode" Dropdown**
- **What**: Removed the UI dropdown that let users choose "Quick Answer", "Detailed", "Timeline", etc. Modified the system prompt and payload logic.
- **Why**: Per user request, the AI should dynamically figure out how to structure its response based on what the user says in their prompt, rather than forcing a specific mode.

## 2026-09-07 (Session 1)

**Git Repositories Initialized**
- **What**: Initialized local git repositories for both `islamic-history-ai` and `chat-widget`, configured user details, and made initial commits.
- **Why**: To track changes and prepare the projects to be pushed to GitHub.

## 2026-09-06

**Added live web search grounding via Groq**
- **What**: Integrated `groq/compound` to autonomously perform web searches when knowledge context is insufficient.
- **Why**: To provide up-to-date and comprehensive answers for queries outside the static `knowledge.json`.

**Visual Redesign & Dark/Light Mode**
- **What**: Changed all caps headers to sentence case. Added a manuscript illumination color palette (ink-navy, parchment, gold). Added a light/dark mode toggle (top-right sun/moon icon) persisting via localStorage.
- **Why**: To make the UI feel more like an authentic, historical Islamic manuscript while giving users reading preferences.

**Removed "Explore further" suggestions**
- **What**: Dropped the generated related questions appearing after responses.
- **Why**: Per user request, streamlining the UI.
