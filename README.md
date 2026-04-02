# CaseDive Skills Collection

## Quality Guardrails

- Local pre-PR check: run `npm run test:guardrails`
- What it runs:
    - `tests/unit/resultCardSanitizer.test.js`
    - `npm run test:filter`
- CI workflow: `.github/workflows/quality-guardrails.yml` runs on pull requests and pushes to `main`

Use this gate before merging to prevent regressions in matched-text sanitization and retrieval quality.

**Ready to use on Sunday!** All 4 skills are drafted and ready to go.

## What You Have

### 1. criminal-code-builder-SKILL.md (316 lines)
- 50 priority Criminal Code sections (organized by category)
- JSON template for each section
- How to extract definitions from justice.gc.ca
- Validation checklist (make sure everything is correct before saving)
- Common mistakes to avoid
- Batch processing workflow for adding multiple sections at once

**Use when:** Building the 50 Criminal Code sections or expanding to full 800

### 2. canlii-case-verification-SKILL.md (452 lines)
- CanLII API endpoint patterns (database IDs for each court)
- Response parsing (how to extract metadata + summary from API)
- Rate limiting implementation (500ms between requests)
- Caching strategy (24-hour TTL, how to store & retrieve)
- Test cases (real SCC citations you can verify against)
- Error handling (what to do when API fails)
- Citation format normalization (handles bracket format, reporter format, etc.)
- Debugging checklist

**Use when:** Implementing CanLII API integration, testing case verification, debugging API issues

### 3. canlii-prompt-engineering-SKILL.md (408 lines)
- System prompt template (what Claude should follow)
- Citation format requirements (neutral citation format: YYYY COURT #)
- Example outputs (self-defence, sexual assault, drug possession scenarios)
- Prompt testing workflow (how to iterate and improve)
- Evaluation criteria (checklist for when it's working)
- Common prompt mistakes
- Real test cases to validate prompt quality

**Use when:** Updating Claude system prompt, fixing citation format issues, testing output quality

### 4. civil-law-database-builder-SKILL.md (415 lines)
- Federal statutes checklist (which ones to include in MVP)
- JSON template (matching Criminal Code structure)
- Provincial structure template (for Phase 2 expansion)
- Relevance mapping (which statutes apply to which scenarios)
- Federal statutes to add (Charter, CDSA, YCJA, Human Rights Act, etc.)
- Data entry process (how to extract and add statutes)
- Validation checklist
- Common mistakes

**Use when:** Building civil law database, adding statutes, structuring for provincial expansion

---

## How to Use These on Sunday

### Prep (5 minutes)
1. Create folder: `/mnt/skills/user/`
2. Create 4 subfolders:
   - `criminal-code-builder/`
   - `canlii-case-verification/`
   - `canlii-prompt-engineering/`
   - `civil-law-database-builder/`

### Installation (2 minutes each skill)
For each skill:
1. Copy the SKILL.md file into its subfolder
2. Rename it to just `SKILL.md` (remove the skill-name prefix)
3. That's it!

### Example
```
/mnt/skills/user/
├── criminal-code-builder/
│   └── SKILL.md              (copy criminal-code-builder-SKILL.md here)
├── canlii-case-verification/
│   └── SKILL.md              (copy canlii-case-verification-SKILL.md here)
├── canlii-prompt-engineering/
│   └── SKILL.md              (copy canlii-prompt-engineering-SKILL.md here)
└── civil-law-database-builder/
    └── SKILL.md              (copy civil-law-database-builder-SKILL.md here)
```

### Using Them
Once installed, just ask me:
```
"Build the criminal code database"
→ I'll use the criminal-code-builder skill

"I need to verify cases against CanLII"
→ I'll use the canlii-case-verification skill

"Let's test the Claude prompt"
→ I'll use the canlii-prompt-engineering skill

"Add civil law statutes"
→ I'll use the civil-law-database-builder skill
```

---

## Total Lines of Documentation

- **criminal-code-builder:** 316 lines
- **canlii-case-verification:** 452 lines
- **canlii-prompt-engineering:** 408 lines
- **civil-law-database-builder:** 415 lines
- **Total:** 1,591 lines of step-by-step guidance

---

## What These Skills Will Save You

| Task | Without Skill | With Skill | Saved |
|------|---------------|-----------|-------|
| Adding 50 Criminal Code sections | Manual + error-prone | Template + checklist | ~4 hours |
| Implementing CanLII verification | Debugging API | API patterns + test cases | ~2 hours |
| Fixing Claude prompt | Trial & error | Testing workflow | ~1 hour |
| Building civil law database | Starting from scratch | Checklist + template | ~2 hours |
| **Total** | | | **~9 hours** |

---

## Ready to Go!

All 4 skills are fully written, reviewed, and ready to deploy Sunday morning.

Just copy the .md files into the folder structure and start asking me to use them!

