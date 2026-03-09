# CaseFinder

AI-powered Canadian criminal case research tool. Describe any criminal scenario and receive likely charges, Criminal Code sections, relevant case law, and legal analysis.

Built as a portfolio project by Alasdair NC — Justice Studies (BASc), University of Guelph-Humber.

## Features

- **Scenario Analysis** — Describe a criminal scenario in plain language and get structured legal analysis
- **Criminal Code Mapping** — Identifies applicable Criminal Code sections with severity classifications and maximum penalties
- **Case Law Research** — Surfaces relevant Canadian case citations with outcomes
- **Filters** — Narrow results by jurisdiction, court level, and date range
- **CanLII Integration** — Direct search links to verify citations on CanLII
- **Dark Mode** — Full light/dark theme with editorial design

## Tech Stack

- React 18 + Vite
- Anthropic Claude API (server-side via Vercel Functions)
- CanLII API (planned)
- Deployed on Vercel

## Getting Started

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/casefinder.git
cd casefinder

# Install
npm install

# Set up environment
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

# Run dev server
npm run dev
```

## Disclaimer

CaseFinder is an educational research tool and does not constitute legal advice. Case citations should be verified through CanLII or other official legal databases. Always consult a qualified legal professional.

## License

MIT
