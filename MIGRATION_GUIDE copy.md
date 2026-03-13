# CaseFinder — Migration & Setup Guide

## What This Is
CaseFinder is an AI-powered Canadian criminal case research tool. A user describes a criminal scenario and gets: likely charges with Criminal Code sections, relevant Canadian case law, sentencing info, and legal analysis.

Built by Alasdair NC as a portfolio piece (Justice Studies student, University of Guelph-Humber).

## Tech Stack
- **Frontend:** React 18 + Vite
- **Styling:** Inline styles with theme context (editorial design — cream/serif light mode, dark mode toggle)
- **AI:** Anthropic Claude API (claude-sonnet-4-20250514)
- **Future:** CanLII API integration for real case law, Justice Laws scraping for statute text
- **Deployment:** Vercel (recommended) or Netlify

## Project Structure

```
casefinder/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Header.jsx          # App header + dark mode toggle
│   │   ├── FiltersPanel.jsx    # Jurisdiction, court level, date range filters
│   │   ├── SearchArea.jsx      # Scenario input textarea + submit
│   │   ├── StagedLoading.jsx   # Multi-stage loading animation
│   │   ├── Results.jsx         # Full results display (summary, charges, cases, analysis)
│   │   ├── ChargeCard.jsx      # Individual charge display
│   │   ├── CaseCard.jsx        # Individual case display
│   │   ├── ErrorMessage.jsx    # Error state with retry
│   │   └── Select.jsx          # Styled select dropdown
│   ├── lib/
│   │   ├── themes.js           # Light/dark theme objects
│   │   ├── constants.js        # Filter options, example scenarios
│   │   └── prompts.js          # System prompt builder
│   ├── api/
│   │   └── analyze.js          # Vercel serverless function (Claude API call)
│   ├── hooks/
│   │   └── useTypewriter.js    # Typewriter animation hook
│   ├── App.jsx                 # Main app component
│   ├── main.jsx                # Entry point
│   └── index.css               # Minimal global styles
├── .env.example                # Environment variables template
├── .gitignore
├── package.json
├── vite.config.js
├── vercel.json                 # Vercel serverless config
└── README.md
```

## Setup Steps

### 1. Initialize project
```bash
npm create vite@latest casefinder -- --template react
cd casefinder
npm install
```

### 2. Environment variables
Create `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
CANLII_API_KEY=           # leave blank until you get access
```

### 3. Move API call server-side
**This is critical.** The prototype calls Claude's API directly from the browser. In production, the API key must stay server-side.

Create `api/analyze.js` as a Vercel serverless function:
```javascript
// /api/analyze.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { scenario, filters } = req.body;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: buildSystemPrompt(filters),
      messages: [{ role: 'user', content: scenario }],
    }),
  });

  const data = await response.json();
  res.status(200).json(data);
}
```

Then update the frontend to call `/api/analyze` instead of the Anthropic API directly.

### 4. Split the monolith
The prototype is a single JSX file. Split it into the component structure above. Each component receives theme via `useContext(ThemeContext)`.

### 5. Deploy
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set env vars
vercel env add ANTHROPIC_API_KEY
```

## Feature Roadmap (in order of priority)

### Phase 1 — Done (prototype)
- [x] Editorial design (light + dark mode)
- [x] AI scenario analysis (charges, cases, analysis)
- [x] Filters (jurisdiction, court level, date range)
- [x] Staged loading animation
- [x] Mobile responsive
- [x] CanLII search term links
- [x] Example scenarios

### Phase 2 — Next (after migration)
- [ ] Server-side API route (move API key off client)
- [ ] CanLII API integration (real case law data)
- [ ] Justice Laws integration (actual Criminal Code section text)
- [ ] Search history (persist in-session, show past queries)
- [ ] Export to PDF

### Phase 3 — Polish
- [ ] Rate limiting / usage caps
- [ ] SEO + Open Graph meta tags
- [ ] "How it works" explainer section
- [ ] Analytics (Plausible or Vercel Analytics)
- [ ] Custom domain

## Design Tokens

### Light Theme
- Background: `#FAF7F2`
- Text: `#2c2825`
- Accent: `#d4a040` (amber)
- Red: `#8a3020`
- Green: `#3a6a4a`
- Border: `#d8d0c4`

### Dark Theme
- Background: `#1a1814`
- Text: `#e8e0d0`
- Accent: `#d4a040`
- Red: `#d4654a`
- Green: `#6aaa7a`
- Border: `#3a3530`

### Typography
- Headlines: Times New Roman (serif)
- Body/UI: Helvetica Neue (sans-serif)
- Code/sections: Courier New (monospace)
- Labels: Helvetica Neue, 10px, uppercase, letter-spacing 3.5px

## CanLII API Notes
- Apply at: https://www.canlii.org/en/tools/api.html
- Free for non-commercial / educational use
- Returns: case metadata, full text, citations
- Endpoint: `https://api.canlii.org/v1/`
- Key endpoints:
  - `caseBrowse/{databaseId}` — list cases in a database
  - `caseCitator/{databaseId}/{caseId}` — get cases that cite a given case
  - Search: `search/?text={query}&databaseId={db}`
- Database IDs: `onca` (Ontario Court of Appeal), `onsc` (Ontario Superior Court), `scc-csc` (Supreme Court of Canada), etc.

## Notes for Claude Code
- The full working prototype is in `casefinder-v2.jsx` — use it as the source of truth for all component logic
- Keep the editorial aesthetic exactly as-is
- Don't install a CSS framework — the inline style system with theme context works well and is intentional
- The system prompt in `prompts.js` should accept filter parameters and build the prompt dynamically (already implemented in prototype)
- When wiring CanLII, cross-reference AI-suggested citations against CanLII search results to verify they're real
