---
name: civil-law-database-builder
description: Build civil law database with federal statutes and provincial structure. Use this skill whenever creating the civil law database, adding federal statutes, structuring for provincial expansion, validating civil law JSON, or mapping statute relevance. Provides federal statutes checklist, JSON template, provincial structure, relevance mapping, and validation guide.
---

# Civil Law Database Builder

## What This Skill Does

- Provides **federal statutes checklist** (what to include in MVP)
- Gives **JSON template** matching Criminal Code structure
- Shows **provincial structure template** (ready for future expansion)
- Explains **relevance mapping** (which statutes apply to which crimes)
- Includes **validation checklist** for civil law JSON
- Lists **data sources** (Justice Canada, CanLII)

---

## Federal Statutes Checklist (MVP)

These are the federal statutes relevant to criminal law scenarios. Add these to `civil-law.json`:

### Charter & Human Rights

- [ ] Canadian Charter of Rights and Freedoms, s. 1-35 (all sections)
- [ ] Canadian Human Rights Act, s. 1-15
- [ ] Bill of Rights, 1960

### Criminal Procedure & Evidence

- [ ] Criminal Code, Part I (General) — select sections
- [ ] Evidence Act (Canada)

### Drug & Substance Law

- [ ] Controlled Drugs and Substances Act (CDSA), s. 1-60
- [ ] Food and Drug Act (relevant sections)

### Youth & Family

- [ ] Youth Criminal Justice Act (YCJA), s. 1-150
- [ ] Criminal Code — Part IV (Youth)

### Sentencing & Procedure

- [ ] Criminal Code, Part XXIII (Sentencing)
- [ ] Criminal Code, Part XXVIII (Miscellaneous)

### Other Federal Statutes

- [ ] Privacy Act (federal)
- [ ] Access to Information Act
- [ ] Corrections and Conditional Release Act (CCRA)

---

## JSON Template

Match the Criminal Code database structure:

```json
{
  "federal": [
    {
      "statute": "Canadian Charter of Rights and Freedoms, s. 7",
      "title": "Life, liberty, security of person",
      "relevance": "Self-defence, bodily autonomy, proportionality of punishment",
      "summary": "Everyone has the right to life, liberty and security of the person.",
      "section": "s. 7"
    },
    {
      "statute": "Canadian Charter of Rights and Freedoms, s. 15",
      "title": "Equality rights",
      "relevance": "Discrimination in prosecution, sentencing",
      "summary": "Every individual is equal before and under the law and has the right to the equal protection and equal benefit of the law without discrimination...",
      "section": "s. 15"
    },
    {
      "statute": "Canadian Human Rights Act, s. 2",
      "title": "Prohibited grounds of discrimination",
      "relevance": "Protecting against discriminatory violence or treatment",
      "summary": "It is a purpose of this Act to give effect in Canada to the principle that all individuals should have an opportunity equal with other individuals...",
      "section": "s. 2"
    },
    {
      "statute": "Controlled Drugs and Substances Act, s. 4",
      "title": "Possession of controlled substance",
      "relevance": "Drug possession charges, elements of possession",
      "summary": "No person shall possess a substance included in Schedule I, II, III or IV unless authorized by this Part or the regulations.",
      "section": "s. 4"
    }
  ],
  "provincial": {
    "ON": [],
    "BC": [],
    "AB": [],
    "MB": [],
    "SK": [],
    "NS": [],
    "NB": [],
    "PE": [],
    "NL": [],
    "QC": [],
    "YT": [],
    "NT": [],
    "NU": []
  }
}
```

### Required Fields

| Field       | Description                                | Example                                           |
| ----------- | ------------------------------------------ | ------------------------------------------------- |
| `statute`   | Full statute citation                      | `"Canadian Charter of Rights and Freedoms, s. 7"` |
| `title`     | Short title of the statute section         | `"Life, liberty, security of person"`             |
| `relevance` | How this applies to criminal law scenarios | `"Self-defence, bodily autonomy"`                 |
| `summary`   | Text or summary of the statute section     | `"Everyone has the right to..."`                  |
| `section`   | Section number                             | `"s. 7"`                                          |

---

## Provincial Structure Template

This is the template for future provincial expansion. Don't fill in values yet (Phase 2), just understand the structure:

```json
{
  "provincial": {
    "ON": {
      "name": "Ontario",
      "statutes": [
        {
          "statute": "Human Rights Code, R.S.O. 1990, c. H.19",
          "title": "Freedom from discrimination",
          "relevance": "Protection from discriminatory violence",
          "summary": "[Ontario statute text]",
          "section": "s. 1"
        }
      ]
    },
    "BC": {
      "name": "British Columbia",
      "statutes": [] // Empty until Phase 2
    },
    "AB": {
      "name": "Alberta",
      "statutes": []
    }
    // ... other provinces
  }
}
```

---

## Federal Statutes to Add (With Descriptions)

### 1. Canadian Charter of Rights and Freedoms

**Sections to include:**

- s. 1: Rights and freedoms in Canada
- s. 2: Fundamental freedoms (conscience, expression, assembly)
- s. 3-5: Democratic rights
- s. 6: Mobility rights
- s. 7: Life, liberty, security of person (KEY for self-defence, punishment)
- s. 8: Unreasonable search/seizure
- s. 9: Arbitrary detention/imprisonment
- s. 10: Legal rights (counsel, trial)
- s. 12: Cruel and unusual punishment
- s. 15: Equality rights

**Why relevant:** Charter protections apply to all criminal charges. Self-defence invokes s. 7. Sentencing proportionality invokes s. 12.

### 2. Controlled Drugs and Substances Act (CDSA)

**Sections to include:**

- s. 2: Definitions
- s. 4: Possession (KEY)
- s. 5: Trafficking
- s. 6: Possession for purpose of trafficking
- s. 7: Production
- Schedule I-V: Lists of controlled substances

**Why relevant:** Drug possession scenarios require CDSA reference, not just Criminal Code.

### 3. Youth Criminal Justice Act (YCJA)

**Sections to include:**

- s. 1: Purpose (rehabilitation focus, different from adult)
- s. 2: Key principles
- s. 10-15: Age jurisdiction (applies to youth under 18)
- s. 38-40: Sentencing principles (different from adult)

**Why relevant:** If scenario involves youth (under 18), YCJA applies, not Criminal Code adult provisions.

### 4. Canadian Human Rights Act

**Sections to include:**

- s. 2: Purpose (freedom from discrimination)
- s. 3: Prohibited grounds (race, sex, disability, etc.)
- s. 5-14: Prohibited conduct

**Why relevant:** Discrimination-based violence scenarios may involve Charter or Human Rights Act.

### 5. Criminal Code — Part XXIII (Sentencing)

**Sections to include:**

- s. 718: Principles of sentencing
- s. 718.1: Fundamental purpose (denunciation, rehabilitation)
- s. 718.2: Aggravating/mitigating factors
- s. 719-728: Sentencing ranges for specific offences

**Why relevant:** Sentencing scenarios need reference to applicable ranges and principles.

---

## Relevance Mapping

When you add a statute, explain HOW it applies to criminal scenarios:

### Example 1: Charter s. 7 (Life, liberty, security of person)

**Applies to:**

- Self-defence scenarios (protects bodily autonomy)
- Sentencing (proportionality of punishment)
- Arrest/detention (security of person)

**Example usage:**

```
User: "Can I be punished for defending myself?"
Result: Suggest Charter s. 7 — explains that security of person is protected
```

### Example 2: CDSA s. 4 (Possession)

**Applies to:**

- Drug possession charges
- Constructive possession (control without ownership)
- Mens rea requirements (knowledge + intent)

**Example usage:**

```
User: "I was arrested with drugs in my bag. Am I guilty?"
Result: Suggest CDSA s. 4 — explains elements: knowledge, intent, possession
```

### Example 3: YCJA s. 38-40 (Youth sentencing)

**Applies to:**

- Scenarios involving youth (under 18)
- Sentencing that differs from adult Criminal Code
- Rehabilitation-focused approach

**Example usage:**

```
User: "My 16-year-old was arrested for assault. What sentence?"
Result: Suggest YCJA s. 38-40 — different sentencing principles than adult
```

---

## Data Entry Process

### Step 1: Choose a Federal Statute

Pick from the checklist above (e.g., Charter s. 7)

### Step 2: Extract the Text

1. Go to **justice.gc.ca** or **canlii.org**
2. Search for the statute and section
3. Copy the **exact text** of the statute

Example for Charter s. 7:

```
"Everyone has the right to life, liberty and security of the person."
```

### Step 3: Identify Relevance

Ask: "How does this statute apply to criminal law scenarios?"

Example for Charter s. 7:

```
"Self-defence, bodily autonomy, proportionality of punishment"
```

### Step 4: Fill the JSON Template

```json
{
  "statute": "Canadian Charter of Rights and Freedoms, s. 7",
  "title": "Life, liberty, security of person",
  "relevance": "Self-defence, bodily autonomy, proportionality of punishment",
  "summary": "Everyone has the right to life, liberty and security of the person.",
  "section": "s. 7"
}
```

### Step 5: Validate

- [ ] Statute citation is correct
- [ ] Text is exact (not paraphrased)
- [ ] Relevance explains why users should see this
- [ ] JSON is valid
- [ ] All 5 fields present

---

## Validation Checklist

Before adding to `civil-law.json`:

### Structure

- [ ] Statute citation format is correct (e.g., "Canadian Charter of Rights and Freedoms, s. 7")
- [ ] All 5 required fields are present
- [ ] `provincial` object structure is correct (even if empty)

### Content

- [ ] Statute text is exact (not paraphrased)
- [ ] Title is accurate and concise
- [ ] Relevance explains how this applies to criminal scenarios
- [ ] Summary is complete (not truncated)
- [ ] Section number matches the statute

### JSON

- [ ] All strings use double quotes `"`
- [ ] No trailing commas
- [ ] JSON is valid (test at jsonlint.com)
- [ ] Array/object syntax is correct

### Completeness

- [ ] Statute exists (verify on justice.gc.ca)
- [ ] Text matches official version
- [ ] No typos in statute names
- [ ] Relevance keywords are lowercase and separated by commas

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Paraphrased Text

**Wrong:**

```json
"summary": "You have the right to freedom and personal liberty"
```

**Right:**

```json
"summary": "Everyone has the right to life, liberty and security of the person."
```

### ❌ Mistake 2: Wrong Citation Format

**Wrong:**

```json
"statute": "Charter Section 7"
```

**Right:**

```json
"statute": "Canadian Charter of Rights and Freedoms, s. 7"
```

### ❌ Mistake 3: Unclear Relevance

**Wrong:**

```json
"relevance": "Important law"
```

**Right:**

```json
"relevance": "Self-defence, bodily autonomy, proportionality of punishment"
```

### ❌ Mistake 4: Missing Provincial Structure

**Wrong:**

```json
{
  "federal": [...]
  // Missing "provincial" key
}
```

**Right:**

```json
{
  "federal": [...],
  "provincial": {
    "ON": [],
    "BC": [],
    // ... etc
  }
}
```

---

## Next Steps

**Phase 1 (MVP):**

1. Add 20-30 federal statutes from the checklist
2. Focus on Charter sections (s. 1, 2, 7, 8, 9, 10, 12, 15)
3. Add CDSA sections (s. 2, 4, 5, 6, 7)
4. Add YCJA sections (s. 1, 38-40)
5. Save to `src/lib/civil-law.json`

**Phase 2 (Provincial Expansion):**

1. Fill in Ontario, BC, Alberta statutes
2. Add Human Rights Code sections per province
3. Add provincial Evidence Acts
4. Test with provincial scenarios

**Phase 3+:**

1. Add remaining provinces
2. Add specialized statutes (Labour law, family law, etc.)
