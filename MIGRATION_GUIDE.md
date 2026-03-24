# CaseDive — Architecture & Development Guide

## What This Is
CaseDive is an AI-powered Canadian legal research tool. A user describes a legal scenario in plain language and gets: Criminal Code charges, case law, civil law, Charter rights analysis, sentencing info, and CanLII-verified citations.

Built by Alasdair NC as a portfolio piece (Justice Studies, University of Guelph-Humber).  
Live at [casedive.ca](https://casedive.ca) · Repo: `alasdairnc/casefinder`

## Tech Stack
- **Frontend:** React 18 + Vite
- **Styling:** Inline styles with ThemeContext (editorial design — no CSS framework, intentional)
- **AI:** Anthropic Claude API (`claude-sonnet-4-20250514`), server-side only
- **Legal data:** CanLII API for citation verification
- **Rate limiting:** Upstash Redis (in-memory fallback for dev)
- **Monetization:** Google AdSense (4 slots), Buy Me a Coffee
- **Deployment:** Vercel with auto-deploy from `main`
- **Domain:** casedive.ca (Namecheap → Vercel nameservers)

## Project Structure

```
casedive/
├── api/
│   ├── _rateLimit.js           # Sliding-window rate limiter (Upstash Redis + fallback)
│   ├── analyze.js              # POST /api/analyze — main AI handler with JSON retry
│   ├── verify.js               # POST /api/verify — batch citation check (max 10)
│   └── verify-citations.js     # POST /api/verify-citations — extended check (max 20)
├── public/
│   ├── favicon.svg
│   ├── robots.txt
│   └── sitemap.xml
├── src/
│   ├── components/
│   │   ├── Header.jsx          # App header, dark mode toggle, Buy Me a Coffee
│   │   ├── FiltersPanel.jsx    # Jurisdiction, court level, date range, law type checkboxes
│   │   ├── SearchArea.jsx      # Scenario textarea + submit
│   │   ├── StagedLoading.jsx   # Multi-stage loading animation
│   │   ├── Results.jsx         # Grouped results by law type (criminal_code, case_law, civil_law, charter)
│   │   ├── ResultCard.jsx      # Citation card with VerificationBadge, "Why It Matched"
│   │   ├── SearchHistory.jsx   # Bottom-sheet history modal with re-run support
│   │   ├── ErrorMessage.jsx    # Error state with retry button
│   │   └── Select.jsx          # Styled select dropdown
│   ├── hooks/
│   │   ├── useSearchHistory.js # localStorage, 20 entries max, 7-day TTL
│   │   └── useTypewriter.js    # Typewriter animation for analysis section
│   ├── lib/
│   │   ├── ThemeContext.jsx     # ThemeProvider, useTheme(), useThemeActions()
│   │   ├── themes.js           # Light/dark theme token objects
│   │   ├── constants.js        # Filter options, example scenarios, defaultLawTypes
│   │   ├── prompts.js          # System prompt builder (jurisdiction, court, date, lawTypes)
│   │   └── canlii.js           # Citation parser (~35 courts), URL builders, CanLII lookup
│   ├── App.jsx                 # Main app component
│   ├── main.jsx                # Entry point
│   └── index.css               # Minimal reset only
├── index.html                  # SEO meta, OG tags, Twitter Card, AdSense loader
├── .env.example
├── vercel.json
├── vite.config.js
└── README.md
```

## Setup

### Local Development
```bash
git clone https://github.com/alasdairnc/casefinder.git
cd casefinder
npm install
cp .env.example .env
# Add ANTHROPIC_API_KEY to .env (required)
# Add CANLII_API_KEY to .env (optional — verification degrades gracefully)
npm run dev
```

### Environment Variables
```
ANTHROPIC_API_KEY=sk-ant-...          # Required — Claude API
CANLII_API_KEY=...                     # Optional — citation verification
UPSTASH_REDIS_REST_URL=...            # Optional — persistent rate limiting
UPSTASH_REDIS_REST_TOKEN=...          # Optional — required with UPSTASH_REDIS_REST_URL
```

### Deploy
```bash
npx vercel
npx vercel env add ANTHROPIC_API_KEY
npx vercel --prod
```

## API Response Format

The AI returns JSON with these top-level keys. This is the **current** format — not the legacy `charges`/`cases` format.

```json
{
  "summary": "One-sentence scenario summary",
  "criminal_code": [
    {
      "citation": "s. 348(1)(b)",
      "summary": "Break and enter with intent to commit an indictable offence",
      "matched_section": "Why this section applies to the scenario"
    }
  ],
  "case_law": [
    {
      "citation": "R v Smith, 2020 ONCA 123",
      "court": "Ontario Court of Appeal",
      "year": "2020",
      "summary": "Brief case summary",
      "matched_content": "Why this case is relevant"
    }
  ],
  "civil_law": [...],
  "charter": [...],
  "analysis": "2-3 sentence legal analysis",
  "searchTerms": ["array", "of", "CanLII", "search", "terms"]
}
```

## Verification Pipeline

1. Claude generates response with citations
2. `App.jsx` extracts citations from `criminal_code` and `case_law` arrays
3. Background POST to `/api/verify` sends citations for CanLII lookup
4. `Results.jsx` also independently verifies via `/api/verify-citations` on mount
5. `ResultCard` renders `VerificationBadge` per citation:
   - ✓ **Verified** (green) — found on CanLII, links directly
   - ⚠ **Not found** (red) — not on CanLII, links to search
   - → **Search CanLII** (neutral) — unverified/no API key, links to search
6. Degrades gracefully when `CANLII_API_KEY` is absent

## Security

- API keys server-side only via Vercel serverless functions
- Rate limiting: 10 req/hour per IP (analyze), 30/min (verify-citations)
- Filter values whitelisted server-side to prevent prompt injection
- Security headers on all API responses: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
- CORS restricted to `casedive.ca` and Vercel preview URLs
- Input validation: type checks, length limits, array caps on all endpoints
- `analyze.js` has 25s timeout (Vercel limit is 30s) with `AbortSignal.timeout`
- No user data stored server-side — search history is localStorage only

## Design Tokens

### Light Theme
| Token | Value |
|-------|-------|
| Background | `#FAF7F2` |
| Text | `#2c2825` |
| Accent | `#d4a040` (amber) |
| Red | `#8a3020` |
| Green | `#3a6a4a` |
| Border | `#d8d0c4` |

### Dark Theme
| Token | Value |
|-------|-------|
| Background | `#1a1814` |
| Text | `#e8e0d0` |
| Accent | `#d4a040` |
| Red | `#d4654a` |
| Green | `#6aaa7a` |
| Border | `#3a3530` |

### Typography
| Usage | Font | Notes |
|-------|------|-------|
| Headlines | Times New Roman | serif |
| Body/UI | Helvetica Neue | sans-serif |
| Code/sections | Courier New | monospace |
| Labels | Helvetica Neue | 10px, uppercase, letter-spacing 3.5px |

## CanLII API Reference
- Endpoint: `https://api.canlii.org/v1/`
- Free for non-commercial/educational use
- Key endpoints:
  - `caseBrowse/en/{databaseId}/{caseId}/` — single case lookup
  - `caseCitator/{databaseId}/{caseId}` — cases that cite a given case
  - `search/?text={query}&databaseId={db}` — full-text search
- Database IDs: `csc-scc` (SCC), `onca` (Ontario CA), `onsc` (Ontario SC), `bcca` (BC CA), etc.
- Full court → database ID mapping in `src/lib/canlii.js` (35+ courts)

## Feature Status

### Done
- [x] Editorial design (light + dark mode with full theme tokens)
- [x] AI scenario analysis with structured JSON response
- [x] Law type filtering (Criminal Code, Case Law, Civil Law, Charter Rights)
- [x] Jurisdiction, court level, date range filters
- [x] Staged loading animation
- [x] Mobile responsive (clamp() fonts, flex-wrap layouts)
- [x] Server-side API route (API key never exposed to client)
- [x] CanLII API integration with citation verification badges
- [x] Citation parser covering ~35 Canadian courts
- [x] Search history (localStorage, 20 entries, 7-day TTL, re-run support)
- [x] Example scenarios for first-time users
- [x] Rate limiting with Upstash Redis (in-memory fallback)
- [x] SEO + Open Graph + Twitter Card meta tags
- [x] Security headers, CORS, input validation
- [x] Google AdSense integration (4 ad slots, responsive)
- [x] Buy Me a Coffee link
- [x] Legal disclaimer (inline banner + footer)
- [x] Custom domain (casedive.ca)
- [x] JSON parse retry logic in analyze endpoint
- [x] Old format detection + migration notice in Results

### Next Up
- [ ] PDF export of results
- [ ] Case bookmarking / save for later
- [ ] Citation export in legal formats (McGill Guide)
- [ ] Vercel Analytics integration
- [ ] "How it works" explainer section
- [ ] Related charges explorer
- [ ] Sentencing panel display

### Future
- [ ] Justice Laws integration (actual Criminal Code section text)
- [ ] B2B outreach to law schools and legal aid organizations
- [ ] Freemium tier

## Notes for AI Assistants
- The app name is **casedive** (lowercase) — "CaseFinder" is the legacy name
- Response JSON uses `criminal_code`/`case_law`/`civil_law`/`charter` — NOT `charges`/`cases`
- Never install Tailwind, shadcn, or any CSS framework — inline styles are intentional
- All API calls through `/api/` serverless functions — never client-side
- Every new endpoint needs rate limiting
- Commit separately per feature/fix with clear messages
- Never commit `.env` or API keys
- The system prompt in `prompts.js` dynamically builds from filters including `lawTypes`
- `Results.jsx` has backward-compat detection for old `charges`/`cases` format
