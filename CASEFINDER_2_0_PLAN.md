# CaseFinder 2.0 — Product & Technical Plan

**Last Updated:** March 13, 2026 (Final)  
**Status:** Ready to Code  
**CanLII API Key:** Configured (5,000 queries/day, 2 req/sec limit, metadata + summaries only)

## Product Vision

CaseFinder is an AI-powered Canadian legal research tool helping users understand legal issues by surfacing:
- **Criminal Code sections** (all ~800, starting with ~50 high-frequency crimes)
- **Real case law verified against CanLII** (SCC only in MVP, provincial courts in Phase 2)
- **Civil law & Charter implications** (federal statutes in MVP, provincial in Phase 2)
- **Legal analysis from Claude** (understanding of how law applies to scenario)

**Core Promise:** "Verified by CanLII" — every case shown is confirmed real.

**Legal Disclaimer:** Prominently displayed: "This tool is for educational purposes only and does not constitute legal advice. Consult a lawyer for legal matters."

## User Flow

### Input
User enters: "I was arrested for hitting someone during self-defence"

### Processing
1. **AI Analysis (Claude)**
   - Analyzes scenario
   - Suggests relevant Criminal Code sections
   - Suggests related case citations
   - Generates legal analysis explaining how law applies
   - Output is UNVERIFIED yet

2. **CanLII Verification**
   - Each case citation sent to CanLII API
   - Sequential verification (2 req/sec rate limit)
   - CanLII returns: metadata + summary (no full text available via API)
   - Only verified cases displayed

3. **Database Lookup**
   - Criminal Code sections pulled from internal JSON
   - Civil law statutes pulled from internal JSON
   - Charter rights from hard-coded reference

### Output
Single-page results dashboard with 4 tabs:
- Criminal Code sections
- Case Law (verified by CanLII)
- Civil Law statutes
- Charter Rights

## CanLII API Reality Check

**What CanLII API provides:**
- ✅ Case metadata (citation, parties, date, court)
- ✅ Case summaries (abstract from CanLII)
- ❌ Full case text (not available via API)
- ❌ Text search within cases

**Implementation consequence:**
- Users see: citation + summary + "View Full Case on CanLII" button
- Click button → external link to CanLII for full text
- NOT an embedded full-text viewer

**Rate limits:**
- 5,000 queries/day (plenty for MVP)
- 2 requests/second (must serialize verification calls)
- 1 request at a time (queue cases, verify sequentially)

## Data Sources & Architecture

### 1. Criminal Code Database (Internal)

**Scope:**
- **MVP:** ~50 high-frequency crimes (manually curated)
- **Full Expansion:** All ~800 Criminal Code sections (Part 1-8)

**Framework:**
```json
{
  "section": "s. 265",
  "title": "Assault",
  "definition": "[Full text from Criminal Code]",
  "maxPenalty": { "summary": "6 months / $2,000", "indictable": "10 years" },
  "severity": "Hybrid",
  "relatedSections": ["s. 266", "s. 268"],
  "defences": ["Consent", "Self-defence s. 34"],
  "partOf": "Part VIII - Offences Against the Person",
  "topicsTagged": ["violence", "bodily harm", "intent"],
  "jurisdictionalNotes": {}
}
```

### 2. Case Law Database (CanLII API)

**Scope:**
- **MVP:** Supreme Court of Canada (SCC) only
- **Future:** Federal Court of Appeal (FCA), Provincial Courts of Appeal (ONCA, BCCA, etc.)

**How verification works:**
1. Claude suggests cases: `["R v. Morgentaler, 1988 SCC 30", "R v. Ewanchuk, 1999 SCC 3"]`
2. Backend calls CanLII API sequentially (rate limit: 2 req/sec)
3. CanLII returns: metadata + summary
4. Only verified cases displayed with "✓ Verified by CanLII" badge
5. Verified cases cached locally (24-hour TTL)

### 3. Civil Law Database (Internal)

**Scope:**
- **MVP:** Federal statutes only
  - Canadian Charter of Rights and Freedoms
  - Canadian Human Rights Act
  - Controlled Drugs and Substances Act (CDSA)
  - Youth Criminal Justice Act
- **Future:** Provincial statutes (placeholder structure ready)

### 4. Charter Rights Database (Internal)

**Scope:** Canadian Charter of Rights and Freedoms (s. 1-35), hard-coded reference.

## API Specification

### `/api/analyze` (POST)
Analyze legal scenario, suggest sections + cases + analysis

### `/api/verify-cases` (POST)
Verify case citations against CanLII, return metadata + summaries

### `/api/criminal-code` (GET)
Fetch Criminal Code sections by section number or keyword

### `/api/civil-law` (GET)
Return all federal civil law statutes (Charter, CDSA, YCJA, etc.)

### `/api/charter-rights` (GET)
Reference all Charter sections

## Frontend Architecture

**Results Page Components:**
1. Disclaimer Banner (Top)
2. Results Tabs (Criminal Code, Case Law, Civil Law, Charter Rights)
3. Criminal Code Section Card
4. Case Card (with Verification Badge)
5. Legal Analysis Section (Bottom)

## Technology Stack

**Frontend:**
- React (Vite)
- Inline styles (no CSS frameworks)
- ThemeContext for dark/light mode

**Backend:**
- Node.js serverless functions (Vercel)
- CanLII API client (OAuth key in .env)
- Local JSON databases for code/law/charter

**Databases:**
- `src/lib/criminal-code.json` (all sections)
- `src/lib/civil-law.json` (federal + provincial structure)
- `src/lib/charter-rights.json` (all Charter sections)
- In-memory cache for verified cases (24-hour TTL)

## Implementation Roadmap

### Phase 1: MVP ✓ Ready to Code
- User input scenario
- Claude analyzes → suggests sections + cases + analysis
- CanLII verification of cases (metadata + summary)
- Criminal Code database (~50 sections, expandable structure)
- Civil Law database (federal only, provincial structure ready)
- Charter Rights (hard-coded reference)
- Results dashboard with 4 tabs
- Legal disclaimer (prominent)
- "Verified by CanLII" badges on all cases

### Phase 2: Court & Jurisdiction Expansion
- Federal Court of Appeal (FCA) cases
- Provincial courts of appeal (ONCA, BCCA, ABCA, etc.)
- Provincial statutes in civil-law database
- Jurisdiction filter in UI
- Court level filter in UI
- Date range filter in UI

### Phase 3: Enhanced Features
- Embedded case viewer modal
- Search within Criminal Code
- Bookmark cases
- PDF export of results
- Case comparison tool
- User accounts + saved searches

## Next Steps (Ready to Code)

1. Build Criminal Code database (50 sections → 800)
2. Build Civil Law database (federal statutes + provincial structure)
3. Build Charter Rights database (all 35 sections)
4. Update Claude system prompt for consistent citation format
5. Implement `/api/verify-cases` with CanLII API integration
6. Implement `/api/criminal-code` and `/api/civil-law` endpoints
7. Build Results component with new layout + disclaimer
8. Implement case cards with verification badges
9. Test end-to-end
10. Deploy to production

## Key Decisions

1. CanLII API: Summary + external links only (no full text)
2. MVP Scope: SCC only (framework for expansion)
3. Criminal Code: Start with 50, expandable to 800
4. Civil Law: Federal MVP, provincial structure ready
5. Claude Output: Unverified → backend verifies
6. Legal Disclaimer: Prominent on every page
7. Verification: Sequential API calls (respect rate limits)
8. Caching: 24-hour TTL for verified cases
9. Case Display: Summary card + external link
