---
name: canlii-prompt-engineering
description: Optimize Claude system prompt for consistent case citation format and output structure. Use this skill whenever updating the Claude system prompt, fixing case citation inconsistencies, improving AI case suggestions, testing Claude output format, or iterating on prompt quality. Provides prompt template, citation format requirements, example outputs, testing workflow, and evaluation criteria.
---

# CanLII Prompt Engineering

## What This Skill Does

- Provides a **system prompt template** for Claude to follow
- Defines **citation format requirements** (neutral citation style)
- Shows **example outputs** (what you want Claude to generate)
- Includes **prompt testing workflow** (how to iterate)
- Covers **evaluation criteria** (when it's working)
- Lists **common prompt mistakes** to avoid

---

## Current System Prompt Template

This is what Claude should follow when analyzing legal scenarios:

```
You are CaseDive, an AI-powered Canadian legal research tool.

YOUR TASK:
Analyze the user's legal scenario and provide:
1. A summary of the scenario
2. Relevant Criminal Code sections
3. Related case law citations
4. Legal analysis explaining how the law applies

ANALYSIS REQUIREMENTS:
- Only suggest REAL Canadian cases (no hallucinated cases)
- Use NEUTRAL CITATION FORMAT for all cases: YYYY COURT #
  Examples: "1988 SCC 30", "1999 SCC 3", "2012 SCC 60"
- Focus on Supreme Court of Canada cases only
- Provide accurate, sourced legal analysis
- Do NOT include case names or parties — only neutral citations
- Suggest 3-5 most relevant cases maximum

OUTPUT FORMAT:
Return valid JSON only, no preamble:

{
  "summary": "Brief description of the scenario",
  "suggestedSections": ["s. 265", "s. 266"],
  "suggestedCases": ["1988 SCC 30", "1999 SCC 3"],
  "analysis": "Legal analysis of how the law applies to this scenario",
  "relatedTopics": ["violence", "consent"]
}

CRITICAL:
- ONLY suggest real, verified cases from Supreme Court of Canada
- Use ONLY neutral citation format (YYYY COURT #)
- Do NOT include case parties or bracket format
- If unsure about a case, omit it
- Analysis must be accurate and educational
- This tool is for learning only, not legal advice
```

---

## Citation Format Requirements

### ✅ Correct Format (Neutral Citation)

```
1988 SCC 30
1999 SCC 3
2012 SCC 60
2021 SCC 27
1990 SCC 48
```

### ❌ Wrong Formats (These Confuse The API)

```
R v. Morgentaler, 1988 SCC 30         ← Has parties (remove them)
[1988] 1 S.C.R. 30                    ← Bracket format (use neutral)
R. v. Morgentaler (1975), 20 C.C.C.   ← Reporter format (use neutral)
1988-SCC-30                           ← Wrong separators (use spaces)
SCC 30 1988                           ← Wrong order (use YYYY COURT #)
```

### Why Neutral Citation Matters

- **Neutral citation format** is recognized by CanLII API
- **Matches the database IDs** exactly
- **No ambiguity** — one format, one meaning
- **Easy to verify** — API knows exactly what case you're asking for
- **Consistent** — all Canadian courts use this format

---

## Example Outputs

### Example 1: Self-Defence Scenario

**User Input:**

```
"I was arrested for hitting someone during an argument.
Can I be charged even if I was protecting myself?"
```

**Expected Output:**

```json
{
  "summary": "User was arrested for assault but claims self-defence. Need to determine if self-defence is available.",
  "suggestedSections": ["s. 265", "s. 34", "s. 222"],
  "suggestedCases": ["2012 SCC 60", "1994 SCC 74", "1990 SCC 22"],
  "analysis": "Self-defence is a complete defence under s. 34 of the Criminal Code. To establish self-defence, you must show: (1) a reasonable belief that force was necessary, (2) proportional response to the threat. The landmark case 2012 SCC 60 established the current test. If self-defence is proven, you are not guilty despite applying force.",
  "relatedTopics": ["self-defence", "assault", "proportionality"]
}
```

### Example 2: Sexual Assault Scenario

**User Input:**

```
"What does consent mean in Canadian law for sexual assault?"
```

**Expected Output:**

```json
{
  "summary": "User asks about the legal definition of consent in sexual assault law.",
  "suggestedSections": ["s. 271", "s. 273", "s. 265"],
  "suggestedCases": ["1999 SCC 3", "1992 SCC 38", "1994 SCC 24"],
  "analysis": "Consent is a complete defence to sexual assault under s. 271. The landmark case 1999 SCC 3 established that consent must be: (1) continuing (not assumed), (2) cannot be inferred from silence, (3) must be actual agreement, not just lack of resistance. The test focuses on the subjective perception of the complainant.",
  "relatedTopics": ["consent", "sexual assault", "communication"]
}
```

---

## Prompt Testing Workflow

### Step 1: Test With a Known Scenario

```
Input: "I hit someone during self-defence"

Expected output:
- summary: mentions self-defence
- suggestedSections: includes s. 34, s. 265
- suggestedCases: includes 2012 SCC 60
- analysis: explains self-defence test
```

### Step 2: Check Citation Format

```
✅ Good: ["2012 SCC 60", "1994 SCC 74", "1990 SCC 22"]
❌ Bad:  ["R v. Jilani, 2012 SCC 60", "[2012] 1 S.C.R. 60"]
```

### Step 3: Verify Case Count

```
✅ Good: 3-5 cases suggested
❌ Bad:  10+ cases (too many) or 1 case (too few)
```

### Step 4: Check JSON Format

```
✅ Good: Valid JSON, all required fields
❌ Bad:  Malformed JSON, missing fields
```

### Step 5: Test Error Handling

```
Input: "Something that's not a legal scenario"

Expected: Graceful handling (explain that input isn't clear)
❌ Bad: Hallucinate cases or crash
```

---

## Evaluation Criteria

### ✅ Prompt Is Working If:

- [ ] **Citation format:** All cases use neutral format (YYYY COURT #)
- [ ] **Case count:** 3-5 cases per scenario (not too many, not too few)
- [ ] **Real cases only:** Suggested cases actually exist on CanLII
- [ ] **No parties:** Case citations don't include "R v. Name"
- [ ] **JSON valid:** Output is always valid JSON
- [ ] **Relevant:** Cases relate to the scenario
- [ ] **Consistent:** Same scenario always produces same format
- [ ] **Analysis quality:** Explanations are accurate and educational

### ❌ Prompt Needs Fixing If:

- [ ] Citations have parties (e.g., "R v. Morgentaler, 1988 SCC 30")
- [ ] Citations in bracket format (e.g., "[1988] 1 S.C.R. 30")
- [ ] Mixing citation formats in one response
- [ ] Suggesting fake/hallucinated cases
- [ ] JSON is malformed or missing fields
- [ ] Cases don't relate to the scenario
- [ ] Output format varies between requests
- [ ] Analysis contains hallucinations or inaccurate law

---

## Common Prompt Mistakes

### ❌ Mistake 1: Asking for Case Names

**Wrong:**

```
"Suggest relevant cases including the case name and citation"
```

**Result:** Claude includes "R v. Morgentaler, 1988 SCC 30" (too long for API)

**Fix:**

```
"Suggest only neutral citations: YYYY COURT #.
Do NOT include case names."
```

---

### ❌ Mistake 2: Inconsistent Format Specification

**Wrong:**

```
"Suggest cases in format: Name (Year) Court Number"
```

**Result:** Claude sometimes uses [1988] 1 S.C.R. 30, sometimes 1988 SCC 30

**Fix:**

```
"Use ONLY neutral citation format: YYYY COURT #
Examples: 1988 SCC 30, 1999 SCC 3, 2012 SCC 60
Never use bracket format or reporter format."
```

---

### ❌ Mistake 3: Allowing Too Many Cases

**Wrong:**

```
"Suggest all relevant cases"
```

**Result:** Claude suggests 20+ cases, API verification becomes expensive

**Fix:**

```
"Suggest 3-5 most relevant cases maximum.
Focus on landmark cases, not every tangential case."
```

---

### ❌ Mistake 4: Unclear JSON Requirements

**Wrong:**

```
"Return the results in JSON"
```

**Result:** Claude might return JSON with extra explanation text before/after

**Fix:**

```
"Return ONLY valid JSON, no preamble or explanation.
Start with { and end with }
Use this exact structure:
{
  "summary": "...",
  "suggestedSections": [...],
  "suggestedCases": [...],
  "analysis": "...",
  "relatedTopics": [...]
}"
```

---

## Iterating on the Prompt

### Process

1. **Create new version** of the prompt (keep old one as backup)
2. **Test with 3-5 scenarios** (self-defence, theft, sexual assault, etc.)
3. **Check output** against evaluation criteria
4. **Identify issues** (format, hallucination, etc.)
5. **Update prompt** to fix issues
6. **Retest** to confirm fix worked
7. **Repeat** until all criteria met

### Example Iteration

```
Iteration 1:
- Test: "self-defence scenario"
- Result: Citations include parties "R v. Jilani, 2012 SCC 60"
- Issue: Parties should be omitted
- Fix: Add to prompt "Do NOT include case names"

Iteration 2:
- Test: "self-defence scenario"
- Result: Citations now correct: "2012 SCC 60"
- Issue: Cases aren't real (hallucinated "2020 SCC 88")
- Fix: Add reminder "Only suggest REAL Supreme Court of Canada cases"

Iteration 3:
- Test: "self-defence scenario"
- Result: Citations are real and correct
- Check: All criteria met ✅
```

---

## Testing Checklist

Before deploying a new prompt, test all of these:

### Citation Format Tests

- [ ] Test self-defence scenario → Check citations are "YYYY SCC #"
- [ ] Test sexual assault scenario → Check no parties in citations
- [ ] Test theft scenario → Check no bracket format
- [ ] Test mixed scenario → Confirm all citations same format

### Case Reality Tests

- [ ] Verify all suggested cases exist on CanLII
- [ ] Check cases relate to the scenario (not random)
- [ ] Confirm no hallucinated cases
- [ ] Test with unfamiliar scenario (watch for hallucination)

### Format Tests

- [ ] Verify JSON is valid (paste into jsonlint.com)
- [ ] Check all required fields present
- [ ] Confirm no extra explanation text before/after JSON
- [ ] Test with edge cases (empty scenario, long scenario)

### Quality Tests

- [ ] Analysis is accurate (no legal hallucinations)
- [ ] Cases are landmark/relevant (not obscure)
- [ ] Suggestions are consistent (same input = same format)
- [ ] Tone is educational (not legal advice)

---

## Real Test Cases to Use

### Test 1: Self-Defence

```
Input: "I was arrested for hitting someone who attacked me first.
Can I use self-defence as a defense?"

Expected:
- Sections: s. 34, s. 265
- Cases: Should include 2012 SCC 60
- Analysis: Should explain self-defence test
```

### Test 2: Sexual Assault

```
Input: "What does consent mean in sexual assault law?"

Expected:
- Sections: s. 271, s. 273
- Cases: Should include 1999 SCC 3
- Analysis: Should explain consent definition
```

### Test 3: Drug Possession

```
Input: "I was found with drugs. What charges could I face?"

Expected:
- Sections: CDSA s. 4 (possession)
- Cases: Should include relevant possession cases
- Analysis: Should explain elements of possession
```

---

## Next Steps

1. **Implement the template prompt** above
2. **Test with 5 scenarios** from the test cases
3. **Evaluate against criteria**
4. **Iterate** until all ✅ criteria met
5. **Deploy** to production
6. **Monitor** for hallucinations in production
