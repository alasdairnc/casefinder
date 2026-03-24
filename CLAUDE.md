# CaseDive — Claude Context File

## About
Built by Alasdair NC, Justice Studies student at University of Guelph-Humber. Toronto-based.  
Live at [casedive.ca](https://casedive.ca) · Repo: `alasdairnc/casefinder`

## What This Is
AI-powered Canadian legal research tool. User describes a legal scenario in plain language → gets Criminal Code charges, case law, civil law, Charter rights analysis, sentencing info, and CanLII-verified citations.

## Tech Stack
- **Frontend:** React 18 + Vite, inline styles with ThemeContext (no CSS framework — intentional)
- **Backend:** Vercel serverless functions (`/api/`)
- **AI:** Anthropic Claude API (`claude-sonnet-4-20250514`), server-side only
- **Legal data:** CanLII API for citation verification (metadata + summaries, no full text)
- **Rate limiting:** Upstash Redis (falls back to in-memory in dev)
- **Monetization:** Google AdSense (`ca-pub-5931276184603899`, 4 ad slots), Buy Me a Coffee
- **Domain:** casedive.ca via Namecheap → Vercel

## Project Structure
```
casedive/
├── api/
│   ├── _rateLimit.js           # Sliding-window rate limiter (Upstash Redis + in-memory fallback)
│   ├── analyze.js              # POST /api/analyze — main AI handler with retry logic
│   ├── verify.js               # POST /api/verify — batch CanLII citation check (10 max)
│   └── verify-citations.js     # POST /api/verify-citations — extended verification (20 max)
├── public/
│   ├── favicon.svg
│   ├── robots.txt
│   └── sitemap.xml
├── src/
│   ├── components/
│   │   ├── Header.jsx          # App header, dark mode toggle, Buy Me a Coffee link
│   │   ├── FiltersPanel.jsx    # Jurisdiction, court level, date range, law type checkboxes
│   │   ├── SearchArea.jsx      # Scenario textarea + submit
│   │   ├── StagedLoading.jsx   # Multi-stage loading animation
│   │   ├── Results.jsx         # Grouped results by law type with count badges + typewriter analysis
│   │   ├── ResultCard.jsx      # Individual result card with VerificationBadge + "Why It Matched"
│   │   ├── SearchHistory.jsx   # Bottom-sheet history modal
│   │   ├── ErrorMessage.jsx    # Error state with retry
│   │   └── Select.jsx          # Styled select dropdown
│   ├── hooks/
│   │   ├── useSearchHistory.js # localStorage history, 20 entries, 7-day TTL
│   │   └── useTypewriter.js    # Typewriter animation for analysis text
│   ├── lib/
│   │   ├── ThemeContext.jsx     # Theme provider, useTheme(), useThemeActions()
│   │   ├── themes.js           # Light/dark theme token objects
│   │   ├── constants.js        # Filter options, example scenarios, defaultLawTypes
│   │   ├── prompts.js          # System prompt builder (supports lawTypes filter)
│   │   └── canlii.js           # Citation parser, URL builders, CanLII API lookup (~35 courts)
│   ├── App.jsx                 # Main app — search, history, ads, verification orchestration
│   ├── main.jsx                # Entry point
│   └── index.css               # Minimal reset (no Tailwind/shadcn)
├── index.html                  # SEO meta, Open Graph, Twitter Card, AdSense script
├── .env.example
├── vercel.json
├── vite.config.js
└── README.md
```

## Key Architecture Decisions

### Response Format
The AI returns JSON with these top-level keys: `summary`, `criminal_code`, `case_law`, `civil_law`, `charter`, `analysis`, `searchTerms`. Each law type array contains objects with `citation`, `summary`, `matched_section`/`matched_content`, and type-specific fields. This is NOT the old `charges`/`cases` format — that's legacy.

### Verification Pipeline
1. Claude suggests citations in its response
2. App extracts all citations from `criminal_code` and `case_law` arrays
3. Background POST to `/api/verify` (or `/api/verify-citations`) checks each against CanLII API
4. `ResultCard` shows `VerificationBadge`: green "Verified on CanLII", red "Not found — search CanLII", or neutral "Search CanLII"
5. Degrades gracefully when `CANLII_API_KEY` is missing (shows "unverified" with best-guess URL)

### Law Type Filtering
FiltersPanel has checkboxes for: Criminal Code, Case Law, Civil Law, Charter Rights. These are passed through to `buildSystemPrompt()` which tells Claude which types to include/exclude. The `defaultLawTypes` object is exported from `constants.js`.

### Search History
`useSearchHistory` hook stores up to 20 entries in localStorage with 7-day TTL. Each entry saves `{ query, filters, result, timestamp }`. History modal supports re-running past queries with their original filters.

## Environment Variables
```
ANTHROPIC_API_KEY=sk-ant-...          # Required
CANLII_API_KEY=...                     # Optional — verification degrades gracefully without it
UPSTASH_REDIS_REST_URL=...            # Optional — falls back to in-memory rate limiting
UPSTASH_REDIS_REST_TOKEN=...          # Optional — required if UPSTASH_REDIS_REST_URL is set
```

## Design System
- **Headlines:** Times New Roman (serif)
- **Body/UI:** Helvetica Neue (sans-serif)
- **Code/sections:** Courier New (monospace)
- **Labels:** Helvetica Neue, 10px, uppercase, letter-spacing 3.5px
- **Light:** `#FAF7F2` bg, `#2c2825` text, `#d4a040` accent
- **Dark:** `#1a1814` bg, `#e8e0d0` text, `#d4a040` accent
- All styling is inline via ThemeContext — no CSS framework, this is intentional

## Security
- API keys server-side only (Vercel serverless functions)
- Rate limiting: 10 requests/hour per IP (analyze), 30/min (verify-citations)
- Filter values whitelisted server-side (prompt injection prevention)
- Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- CORS restricted to casedive.ca
- Input validation on all endpoints (length, type, array caps)
- No user data stored server-side — history is localStorage only

## Rules for AI Assistants
- Never install a CSS framework — the inline style system works and is intentional
- All API calls go through `/api/` serverless functions, never client-side
- Every new endpoint needs rate limiting (use existing `_rateLimit.js` or similar)
- Use real Criminal Code sections, not invented ones
- Case citations must use Canadian neutral citation format: `R v Name, YYYY COURTCODE Number`
- The app name is "casedive" (lowercase), not "CaseFinder" (legacy name)
- The response JSON uses `criminal_code`/`case_law`/`civil_law`/`charter` — not `charges`/`cases`
- Legal disclaimer must remain in the UI
- Commit messages: separate commits per feature/fix, clear messages
- Never commit `.env` or API keys
