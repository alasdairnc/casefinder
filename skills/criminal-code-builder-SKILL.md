---
name: criminal-code-builder
description: Build and expand Criminal Code JSON database systematically. Use this skill whenever the user needs to create Criminal Code sections, add new sections, validate the JSON structure, expand from 50 to 800 sections, or batch-process sections. Provides priority list of 50 high-frequency crimes, JSON templates, extraction guide from Justice Canada, validation checklists, and common mistakes to avoid.
---

# Criminal Code Database Builder

## What This Skill Does

- Provides a **priority list of 50 high-frequency criminal sections** (best starting point)
- Gives you a **JSON template** for each section with required fields
- Shows how to **extract definitions** from Justice Canada official source
- Includes a **validation checklist** to catch mistakes
- Explains how to **batch-process multiple sections**
- Lists **common mistakes to avoid** (truncated definitions, wrong penalties, etc.)

---

## The 50 Priority Criminal Code Sections

### Offences Against the Person (s. 265-298)

1. **s. 265** - Assault (highest frequency)
2. **s. 266** - Assault with weapon
3. **s. 268** - Aggravated assault
4. **s. 271** - Sexual assault (very high frequency)
5. **s. 272** - Sexual assault with weapon
6. **s. 273** - Aggravated sexual assault
7. **s. 279** - Unlawful confinement
8. **s. 287** - Abortion (Charter landmark)
9. **s. 289** - Causing bodily harm by criminal negligence
10. **s. 292** - Failure to provide necessaries

### Homicide (s. 222-236)

11. **s. 222** - Manslaughter (high frequency)
12. **s. 229** - Murder (high frequency)
13. **s. 230** - Constructive murder
14. **s. 231** - First/second degree murder
15. **s. 234** - Infanticide

### Sexual Abuse of Children (s. 151-173)

16. **s. 151** - Sexual abuse of child under 16
17. **s. 152** - Incest
18. **s. 153** - Sexual exploitation of person in authority
19. **s. 160** - Bestiality
20. **s. 163** - Obscene material

### Theft & Property Crimes (s. 322-345)

21. **s. 322** - Theft (high frequency)
22. **s. 323** - Theft by person in special relationship
23. **s. 334** - Theft of telecommunications service
24. **s. 338** - Obtaining execution of valuable security by deception
25. **s. 343** - Robbery
26. **s. 344** - Robbery with aggravation
27. **s. 345** - Stopping mail with intent to rob
28. **s. 348** - Break and enter (high frequency)
29. **s. 349** - Being in dwelling house with intent

### Fraud & Forgery (s. 362-380)

30. **s. 362** - Theft from mail
31. **s. 375** - False pretence
32. **s. 380** - Fraud (high frequency)
33. **s. 382** - Obtaining carriage by fraud
34. **s. 395** - Possession of counterfeit money

### Weapons & Explosives (s. 84-92, 100-104)

35. **s. 84** - Possession of firearm (high frequency)
36. **s. 86** - Careless use of firearm
37. **s. 87** - Points firearm
38. **s. 88** - Threatening with weapon
39. **s. 90** - Carrying concealed weapon
40. **s. 91** - Unauthorized possession in vehicle
41. **s. 100** - Possession for dangerous purpose

### Drug Offences (CDSA s. 4, 5, 6)

42. **s. 4 (CDSA)** - Possession of controlled substance (high frequency)
43. **s. 5 (CDSA)** - Trafficking
44. **s. 6 (CDSA)** - Possession for purpose of trafficking
45. **s. 7 (CDSA)** - Production

### Impaired Driving (s. 320.14-320.23)

46. **s. 320.14** - Impaired operation (high frequency)
47. **s. 320.15** - Care and control
48. **s. 320.16** - Failure to provide sample

### Self-Defence & Defences (s. 34, 35, 36, 37)

49. **s. 34** - Self-defence (landmark cases)
50. **s. 35** - Defence of person / defence of property

---

## JSON Template

Use this exact structure for each section:

```json
{
  "section": "s. 265",
  "title": "Assault",
  "definition": "A person commits an assault when, with intent to apply force to another person or with reckless disregard whether force is so applied, he applies force to that person, attempts or threatens, by any gesture, to apply force to another person, or accosts or impedes another person or begs.",
  "maxPenalty": {
    "summary": "Imprisonment for 6 months or a fine of $2,000, or both",
    "indictable": "Imprisonment for 10 years"
  },
  "severity": "Hybrid (Summary or Indictable)",
  "relatedSections": ["s. 266", "s. 268", "s. 269"],
  "defences": ["Consent (s. 265(3))", "Self-defence (s. 34)"],
  "topicsTagged": ["violence", "bodily harm", "intent", "consent"],
  "partOf": "Part VIII - Offences Against the Person and Reputation",
  "jurisdictionalNotes": {}
}
```

### Required Fields Explained

| Field                   | What It Is                                   | Example                                     |
| ----------------------- | -------------------------------------------- | ------------------------------------------- |
| `section`               | Criminal Code section number                 | `"s. 265"`                                  |
| `title`                 | Official short title                         | `"Assault"`                                 |
| `definition`            | Full legal definition from the Code          | `"A person commits an assault when..."`     |
| `maxPenalty.summary`    | Punishment for summary conviction            | `"6 months or $2,000 fine"`                 |
| `maxPenalty.indictable` | Punishment for indictable conviction         | `"10 years imprisonment"`                   |
| `severity`              | Hybrid, Summary Only, or Indictable Only     | `"Hybrid"`                                  |
| `relatedSections`       | Array of other relevant sections             | `["s. 266", "s. 268"]`                      |
| `defences`              | Valid defences that apply                    | `["Consent", "Self-defence"]`               |
| `topicsTagged`          | Keywords for AI matching                     | `["violence", "bodily harm"]`               |
| `partOf`                | Which Part of the Code                       | `"Part VIII - Offences Against the Person"` |
| `jurisdictionalNotes`   | Placeholder for future provincial variations | `{}`                                        |

---

## How to Extract Definitions

### Step 1: Find the Definition

1. Go to **https://justice.gc.ca/eng/cj-jp/ccr-cpp/**
2. Search for the section number (e.g., "s. 265")
3. Copy the **exact text** starting from "A person commits..."
4. Include the **entire definition** (don't truncate mid-sentence)

### Step 2: Find Max Penalties

1. In the same section, look for text like "Every person who commits an assault is guilty of..."
2. Copy the **summary conviction** penalty (e.g., "guilty of an offence punishable on summary conviction by...")
3. Copy the **indictable** penalty (e.g., "or is guilty of an indictable offence and liable to...")
4. **Match exact wording** from the Criminal Code, not paraphrased

### Step 3: Find Related Sections

1. Look for cross-references in the section (e.g., "See also s. 266, s. 268")
2. Check the **definitional flow** — what sections define terms used in this section?
3. For example, s. 265 uses "force" — check if s. 2 defines "force"
4. Add only **directly related sections** (not every section that mentions "assault")

### Step 4: Identify Defences

1. Search for defences in the Code (e.g., s. 34 for self-defence)
2. Look for subsections that say "it is a defence" or "not guilty if..."
3. For example, s. 265(3) says consent is a defence
4. Add the **specific section number** for each defence (e.g., "Consent (s. 265(3))")

---

## Validation Checklist

Before adding a section to the database, check ALL of these:

### Structure

- [ ] Section number matches Criminal Code (s. XXX format)
- [ ] Title is the official short title from the Code
- [ ] All 8 required fields are present (no fields missing)
- [ ] `jurisdictionalNotes` is an empty object `{}`

### Definitions & Text

- [ ] Definition starts at the beginning of the offense (e.g., "A person commits...")
- [ ] Definition is **complete** (not cut off mid-sentence)
- [ ] Definition matches **exact wording** from Criminal Code
- [ ] No paraphrasing or simplification in definition

### Penalties

- [ ] Summary penalty matches Criminal Code exactly
- [ ] Indictable penalty matches Criminal Code exactly
- [ ] Both "years" and "months" are spelled out (not abbreviated)
- [ ] Numbers match the Code (e.g., "10 years" not "10")
- [ ] Severity field is correct (Hybrid/Summary Only/Indictable Only)

### Related Data

- [ ] All related sections start with "s. " and are real sections
- [ ] No typos in section numbers (e.g., "s. 265" not "s265" or "265")
- [ ] Defences list only **valid defences** (not every section mentioned)
- [ ] Each defence has section number (e.g., "Consent (s. 265(3))")

### JSON & Formatting

- [ ] JSON is valid (no syntax errors)
- [ ] All strings use double quotes `"`, not single quotes
- [ ] Arrays use square brackets `[]` and objects use curly braces `{}`
- [ ] No trailing commas (`,` at end of last item)
- [ ] Topics are lowercase and hyphenated (e.g., "bodily-harm" not "Bodily Harm")

---

## Common Mistakes to Avoid

### ❌ Truncated Definitions

**Wrong:**

```json
"definition": "A person commits an assault when, with intent to apply force..."
```

**Right:**

```json
"definition": "A person commits an assault when, with intent to apply force to another person or with reckless disregard whether force is so applied, he applies force to that person, attempts or threatens, by any gesture, to apply force to another person, or accosts or impedes another person or begs."
```

### ❌ Wrong Section Numbers in relatedSections

**Wrong:**

```json
"relatedSections": ["s. 200", "s. 999"]
```

**Right:**

```json
"relatedSections": ["s. 266", "s. 268", "s. 269"]
```

### ❌ Paraphrased Definitions

**Wrong:**

```json
"definition": "An assault happens when you intentionally touch someone without permission."
```

**Right:**

```json
"definition": "A person commits an assault when, with intent to apply force to another person or with reckless disregard whether force is so applied, he applies force to that person, attempts or threatens, by any gesture, to apply force to another person, or accosts or impedes another person or begs."
```

### ❌ Inaccurate Penalties

**Wrong:**

```json
"maxPenalty": {
  "summary": "6 months or $2,000",
  "indictable": "10 years"
}
```

**Right:**

```json
"maxPenalty": {
  "summary": "Imprisonment for 6 months or a fine of $2,000, or both",
  "indictable": "Imprisonment for 10 years"
}
```

### ❌ Missing Defences

**Wrong:**

```json
"defences": ["Consent"]
```

**Right:**

```json
"defences": ["Consent (s. 265(3))", "Self-defence (s. 34)"]
```

### ❌ Invalid JSON Syntax

**Wrong:**

```json
{
  "section": "s. 265",
  "title": "Assault", // Single quotes — invalid
  "defences": ["Consent"] // Trailing comma — invalid
}
```

**Right:**

```json
{
  "section": "s. 265",
  "title": "Assault",
  "defences": ["Consent"]
}
```

---

## Batch Processing Workflow

### To Add Multiple Sections in One Go:

1. **Pick your 5-10 sections** from the priority list
2. **Extract definitions** for each from Justice Canada (opens new tabs)
3. **Fill the JSON template** for each section
4. **Run validation** on each entry against the checklist
5. **Combine into one JSON file**:
   ```json
   {
     "sections": [
       { section 1 },
       { section 2 },
       { section 3 }
     ]
   }
   ```
6. **Test JSON validity** (use jsonlint.com or `node -e "console.log(JSON.parse(require('fs').readFileSync('file.json'))))"`)
7. **Add to `src/lib/criminal-code.json`**

---

## Tips for Speed

- **Open 3 tabs:** One for Criminal Code search, one for definition source, one for this guide
- **Copy-paste definitions directly** — don't retype (avoid transcription errors)
- **Do penalties second** — easier to cross-check after definition is correct
- **Related sections can be found by searching the Code** for cross-references
- **Use a JSON formatter** — paste raw JSON into a formatter to catch syntax errors

---

## Next Steps

Once you've created 50 sections:

1. Save to `src/lib/criminal-code.json`
2. Test with `npm run dev` (check for JSON errors)
3. Ready to integrate with `/api/criminal-code` endpoint

For expanding to all 800 sections later, just repeat this process. The structure stays the same.
