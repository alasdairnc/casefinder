# CaseDive Skills Strategy

## Planned Skills (In Priority Order)

### 1. `criminal-code-builder` ⭐ HIGH PRIORITY

**Purpose:** Build and expand Criminal Code JSON database systematically

**Triggers:**

- "Build the criminal code database"
- "Add sections to criminal code"
- "Expand criminal code to all 800"

**Includes:**

- Priority list of 50 high-frequency sections
- JSON template with all required fields
- Definition source guide (Justice Canada format)
- Validation checklist
- Common mistakes to avoid
- Batch processing workflow

**Build time:** 20 min | **Saves:** 4 hrs

### 2. `canlii-case-verification` ⭐ HIGH PRIORITY

**Purpose:** Verify cases against CanLII API, handle rate limits, manage caching

**Triggers:**

- "Test CanLII API integration"
- "Verify case citations"
- "Debug CanLII verification"

**Includes:**

- CanLII API call patterns (endpoint format)
- Rate limit handling (2 req/sec, queue management)
- Response parsing (extract metadata + summary)
- Error handling (case not found, API errors)
- Cache strategy (24-hour TTL)
- Test cases (real SCC citations)
- Debugging checklist

**Build time:** 25 min | **Saves:** 2 hrs

### 3. `canlii-prompt-engineering` MEDIUM PRIORITY

**Purpose:** Optimize Claude system prompt for consistent case citation format

**Triggers:**

- "Update Claude prompt for cases"
- "Fix case citation inconsistencies"
- "Test Claude output format"

**Includes:**

- System prompt template
- Citation format requirements (neutral citation style)
- Example outputs (self-defence, sexual assault, drugs)
- Prompt testing workflow
- Evaluation criteria
- Common prompt mistakes
- Iteration guide

**Build time:** 15 min | **Saves:** 1 hr

### 4. `civil-law-database-builder` MEDIUM PRIORITY

**Purpose:** Build civil law database with federal statutes and provincial structure

**Triggers:**

- "Build civil law database"
- "Add federal statutes"
- "Expand to provincial law"

**Includes:**

- Federal statutes checklist (Charter, CDSA, YCJA, etc.)
- JSON template (matching Criminal Code structure)
- Provincial structure template (ON, BC, AB, etc.)
- Relevance mapping (which statutes apply to which crimes)
- Validation checklist
- Data entry workflow

**Build time:** 15 min | **Saves:** 2 hrs

### 5. `casedive-testing-framework` MEDIUM PRIORITY

**Purpose:** End-to-end testing (input → Claude → verification → display)

**Triggers:**

- "Test CaseDive end-to-end"
- "Verify search results"
- "Debug API responses"

**Includes:**

- Test scenario library
- Expected results for each scenario
- API endpoint tests
- UI rendering checks
- Common failure points
- Debugging checklist

**Build time:** 20 min | **Saves:** 3 hrs

### 6. `charter-rights-database-builder` LOW PRIORITY

**Purpose:** Build Charter Rights hard-coded reference

**Triggers:**

- "Build Charter database"
- "Add Charter sections"

**Includes:**

- All 35 Charter sections
- JSON template
- Common applications
- Validation

**Build time:** 10 min | **Saves:** 30 min

### 7. `casedive-deployment-guide` LOW PRIORITY

**Purpose:** Deploy to Vercel, manage environment variables, debug production

**Triggers:**

- "Deploy CaseDive"
- "Fix production issue"
- "Update API key"

**Includes:**

- Deployment checklist
- Environment variable setup
- Vercel configuration
- Troubleshooting
- Rollback procedures

**Build time:** 15 min | **Saves:** 1 hr

### 8. `casedive-phase-2-expansion` LOW PRIORITY

**Purpose:** Guide adding provincial courts (ONCA, BCCA, FCA, etc.)

**Triggers:**

- "Expand to provincial courts"
- "Add ONCA cases"
- "Add FCA cases"

**Includes:**

- Court database IDs (FCA, ONCA, BCCA, etc.)
- Scope planning
- Database structure updates
- API endpoint modifications

**Build time:** 20 min | **Saves:** Time for Phase 2

## Summary Table

| Skill                           | Priority | Build Time | Saves  | Create On           |
| ------------------------------- | -------- | ---------- | ------ | ------------------- |
| criminal-code-builder           | HIGH     | 20 min     | 4 hrs  | Sunday              |
| canlii-case-verification        | HIGH     | 25 min     | 2 hrs  | Sunday              |
| canlii-prompt-engineering       | MEDIUM   | 15 min     | 1 hr   | Sunday              |
| civil-law-database-builder      | MEDIUM   | 15 min     | 2 hrs  | Sunday              |
| casedive-testing-framework      | MEDIUM   | 20 min     | 3 hrs  | After Phase 1       |
| charter-rights-database-builder | LOW      | 10 min     | 30 min | After Criminal Code |
| casedive-deployment-guide       | LOW      | 15 min     | 1 hr   | Before deploy       |
| casedive-phase-2-expansion      | LOW      | 20 min     | -      | Phase 2             |

## Recommended Sunday Prep

1. **criminal-code-builder** (20 min)
2. **canlii-case-verification** (25 min)
3. **canlii-prompt-engineering** (15 min)
4. **civil-law-database-builder** (15 min)

**Total prep time:** 75 minutes  
**Total time saved during coding:** 9 hours

## What Makes a Good Skill

Skills are best for:

- Repeatable processes (building sections, verifying cases)
- Common mistakes (validation, edge cases)
- Knowledge you'll reuse (CanLII API quirks, prompt engineering)
- Things teams need to know (deployment, testing)

Skills are NOT for:

- One-time tasks
- Simple utilities
- Things that won't repeat
- Complex logic that changes per project
