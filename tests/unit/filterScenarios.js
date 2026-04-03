/**
 * Comprehensive test scenarios for filter tuning.
 * Each scenario has expected outcomes that filters should produce.
 * 
 * This file is separated from vitest tests to allow clean imports in non-test code.
 */

export const TEST_SCENARIOS = [
  // ── Impaired Driving / RIDE ───────────────────────────────────────────────
  {
    id: "impaired_01",
    scenario: "I was pulled over at a RIDE checkpoint and asked to provide a breath sample. What are my rights?",
    expectedPrimary: "impaired_driving",
    shouldInclude: ["R v Grant", "Charter", "detention", "breath"],
    shouldExclude: ["theft", "homicide", "robbery"],
    expectedKeywords: ["charter", "s. 9", "detention", "search", "reasonable"],
    minResults: 2,
    maxResults: 5,
  },
  {
    id: "impaired_02",
    scenario: "Drunk driving conviction. I refused the breathalyzer. What defences exist?",
    expectedPrimary: "impaired_driving",
    shouldInclude: ["refusal", "breath", "Charter", "s. 10"],
    shouldExclude: ["assault", "theft"],
    expectedKeywords: ["breath", "refusal", "s. 10", "demand"],
    minResults: 1,
    maxResults: 4,
  },
  {
    id: "impaired_03",
    scenario: "Roadside stop at a checkpoint, officer demanded a breath test and held me there. What Charter issues apply?",
    expectedPrimary: "impaired_driving",
    shouldInclude: ["Charter", "detention", "breath"],
    shouldExclude: ["theft", "sexual assault"],
    expectedKeywords: ["detention", "breath", "s. 9", "reasonable"],
    minResults: 1,
    maxResults: 5,
  },
  
  // ── Assault with Bodily Harm ──────────────────────────────────────────────
  {
    id: "assault_bodily_01",
    scenario: "I punched someone in the face during an argument. They had minor injuries. Am I facing criminal charges?",
    expectedPrimary: "assault_bodily_harm",
    shouldInclude: ["bodily harm", "s. 267", "intent"],
    shouldExclude: ["sexual assault", "drug trafficking", "robbery"],
    expectedKeywords: ["bodily harm", "s. 267", "assault", "intent"],
    minResults: 1,
    maxResults: 4,
  },
  {
    id: "assault_bodily_02",
    scenario: "I was in a fight at a bar and broke someone's arm. Self-defence is my claim.",
    expectedPrimary: "assault_bodily_harm",
    shouldInclude: ["self-defence", "bodily harm", "proportionality"],
    shouldExclude: ["sexual assault", "manslaughter"],
    expectedKeywords: ["self-defence", "bodily harm", "s. 34"],
    minResults: 1,
    maxResults: 4,
  },

  // ── Assault with Weapon ───────────────────────────────────────────────────
  {
    id: "assault_weapon_01",
    scenario: "I stabbed someone with a knife during a confrontation. What's the crime?",
    expectedPrimary: "assault_weapon",
    shouldInclude: ["weapon", "s. 267", "intent", "dangerous"],
    shouldExclude: ["petty theft", "drug possession"],
    expectedKeywords: ["weapon", "s. 267", "intent", "stab"],
    minResults: 1,
    maxResults: 4,
  },

  // ── Sexual Assault ────────────────────────────────────────────────────────
  {
    id: "sexual_assault_01",
    scenario: "I'm accused of sexual assault. The complainant says consent wasn't given. What's my legal position?",
    expectedPrimary: "sexual_assault",
    shouldInclude: ["consent", "s. 271", "Charter"],
    shouldExclude: ["theft", "drug trafficking"],
    expectedKeywords: ["consent", "s. 271", "credibility", "communications"],
    minResults: 1,
    maxResults: 4,
  },

  // ── Drug Trafficking ──────────────────────────────────────────────────────
  {
    id: "drug_trafficking_01",
    scenario: "Police found 50 grams of cocaine in my car. They're charging me with trafficking. I was only possessing for personal use.",
    expectedPrimary: "drug_trafficking",
    shouldInclude: ["cdsa", "s. 5", "trafficking", "possession"],
    shouldExclude: ["assault", "theft"],
    expectedKeywords: ["trafficking", "s. 5", "possession", "intent"],
    minResults: 1,
    maxResults: 4,
  },
  {
    id: "drug_trafficking_02",
    scenario: "Found with fentanyl pills. Police say it's for trafficking. What's the legal standard?",
    expectedPrimary: "drug_trafficking",
    shouldInclude: ["trafficking", "fentanyl", "CDSA"],
    shouldExclude: ["homicide", "robbery"],
    expectedKeywords: ["trafficking", "CDSA", "fentanyl", "possession"],
    minResults: 1,
    maxResults: 4,
  },

  // ── Charter Section 9 – Arbitrary Detention ───────────────────────────────
  {
    id: "charter_s9_01",
    scenario: "Police arrested me without a warrant and without explaining why. Is this a Charter violation?",
    expectedPrimary: "charter_detention",
    shouldInclude: ["s. 9", "arbitrary", "detention", "Grant"],
    shouldExclude: ["theft", "fraud"],
    expectedKeywords: ["s. 9", "arbitrary", "detention"],
    minResults: 1,
    maxResults: 4,
  },
  {
    id: "charter_s9_02",
    scenario: "I was detained on the street with no clear grounds and not told why. Is that arbitrary detention under section 9?",
    expectedPrimary: "charter_detention",
    shouldInclude: ["s. 9", "detention", "arbitrary"],
    shouldExclude: ["theft", "fraud"],
    expectedKeywords: ["s. 9", "detention", "arbitrary", "grant"],
    minResults: 1,
    maxResults: 4,
  },

  // ── Charter Section 10(b) – Right to Counsel ──────────────────────────────
  {
    id: "charter_10b_01",
    scenario: "I was arrested and detained, but police didn't let me call a lawyer for hours. What rights did I have?",
    expectedPrimary: "charter_counsel",
    shouldInclude: ["s. 10", "counsel", "informational duty"],
    shouldExclude: ["fraud", "mischief"],
    expectedKeywords: ["s. 10", "counsel", "informational"],
    minResults: 1,
    maxResults: 4,
  },
  {
    id: "charter_10b_02",
    scenario: "After arrest, officers questioned me and delayed my chance to contact counsel. Does section 10(b) apply right away?",
    expectedPrimary: "charter_counsel",
    shouldInclude: ["s. 10", "counsel", "detention"],
    shouldExclude: ["fraud", "mischief"],
    expectedKeywords: ["s. 10", "counsel", "informational", "detention"],
    minResults: 1,
    maxResults: 4,
  },

  // ── Robbery ───────────────────────────────────────────────────────────────
  {
    id: "robbery_01",
    scenario: "I was involved in a store robbery. I didn't use a weapon, but I was there and the store owner was scared.",
    expectedPrimary: "robbery",
    shouldInclude: ["robbery", "s. 343", "force", "threat"],
    shouldExclude: ["petty theft", "drug trafficking"],
    expectedKeywords: ["robbery", "s. 343", "violence"],
    minResults: 1,
    maxResults: 4,
  },

  // ── Theft ─────────────────────────────────────────────────────────────────
  {
    id: "theft_01",
    scenario: "I took merchandise from a store without paying. The value was $150. Am I facing jail time?",
    expectedPrimary: "theft",
    shouldInclude: ["theft", "s. 322", "dishonesty"],
    shouldExclude: ["robbery", "sexual assault"],
    expectedKeywords: ["theft", "s. 322"],
    minResults: 1,
    maxResults: 4,
  },

  // ── Edge Cases & Mixed Issues ─────────────────────────────────────────────
  {
    id: "mixed_01",
    scenario: "I got into a heated argument with my spouse, there was physical contact, and they're saying I'm harassing them. What charges could I face?",
    expectedPrimary: "assault_bodily_harm",
    shouldInclude: ["assault", "domestic"],
    shouldExclude: ["robbery", "theft"],
    expectedKeywords: ["assault", "bodily", "domestic"],
    minResults: 1,
    maxResults: 4,
  },
  {
    id: "edge_01",
    scenario: "Very brief scenario with minimal detail.",
    expectedPrimary: "general_criminal",
    shouldInclude: [],
    shouldExclude: [],
    expectedKeywords: [],
    minResults: 0,
    maxResults: 3,
  },
  {
    id: "edge_02_noncriminal_copyright",
    scenario: "I need advice on copyright royalties and digital music licensing terms.",
    expectedPrimary: "general_criminal",
    shouldInclude: [],
    shouldExclude: ["robbery", "theft", "assault", "charter"],
    expectedKeywords: [],
    minResults: 0,
    maxResults: 2,
  },
  {
    id: "edge_03_noncriminal_admin",
    scenario: "I am appealing an administrative tribunal decision on professional licensing fairness.",
    expectedPrimary: "general_criminal",
    shouldInclude: [],
    shouldExclude: ["robbery", "theft", "assault", "charter"],
    expectedKeywords: [],
    minResults: 0,
    maxResults: 2,
  },
];
