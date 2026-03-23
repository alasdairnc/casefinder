// src/lib/civilLawData.js
// Federal statutes relevant to Canadian criminal law scenarios.
// Sources: justice.gc.ca, laws-lois.justice.gc.ca
// Used by api/verify.js to validate AI-suggested civil_law citations.

// ── Base URLs ─────────────────────────────────────────────────────────────────
const CDSA_BASE    = "https://laws-lois.justice.gc.ca/eng/acts/c-38.8";
const YCJA_BASE    = "https://laws-lois.justice.gc.ca/eng/acts/y-1.5";
const CHRA_BASE    = "https://laws-lois.justice.gc.ca/eng/acts/h-6";
const CC_BASE      = "https://laws-lois.justice.gc.ca/eng/acts/c-46";
const CCRA_BASE    = "https://laws-lois.justice.gc.ca/eng/acts/c-44.6";
const EVIDENCE_BASE = "https://laws-lois.justice.gc.ca/eng/acts/c-5";

// ── CDSA ──────────────────────────────────────────────────────────────────────
const CDSA_SECTIONS = new Map([
  ["2", {
    statute: "Controlled Drugs and Substances Act",
    shortName: "CDSA",
    title: "Definitions",
    summary: "Definitions for the purposes of this Act, including 'substance', 'traffic', 'produce', and the Schedule classifications.",
    relevance: "drug charges, substance classification, Schedule I-V, trafficking definition",
    url: `${CDSA_BASE}/section-2.html`,
  }],
  ["4", {
    statute: "Controlled Drugs and Substances Act",
    shortName: "CDSA",
    title: "Possession of substance",
    summary: "No person shall possess a substance included in Schedule I, II, III, IV or V except as authorized under the regulations. Penalties vary by schedule: Schedule I — up to 7 years on indictment; Schedule II — up to 5 years; Schedule III — up to 3 years.",
    relevance: "drug possession, constructive possession, knowledge, Schedule I-V substances, cannabis, cocaine, heroin, fentanyl",
    url: `${CDSA_BASE}/section-4.html`,
  }],
  ["5", {
    statute: "Controlled Drugs and Substances Act",
    shortName: "CDSA",
    title: "Trafficking in substance",
    summary: "No person shall traffic in a substance included in Schedule I, II, III, IV or V or in any substance represented or held out by that person to be such a substance. Penalties: Schedule I — up to life imprisonment; Schedule II — up to life; Schedule III — up to 10 years.",
    relevance: "drug trafficking, selling drugs, distributing controlled substances, Schedule I penalties",
    url: `${CDSA_BASE}/section-5.html`,
  }],
  ["6", {
    statute: "Controlled Drugs and Substances Act",
    shortName: "CDSA",
    title: "Importing and exporting",
    summary: "No person shall import into Canada or export from Canada a substance included in Schedule I, II, III, IV, V or VI. Penalties: Schedule I or II — minimum 1 year if involving organized crime or involving youth, maximum life; otherwise maximum 10 years.",
    relevance: "drug importation, drug exportation, border smuggling, Schedule I-II",
    url: `${CDSA_BASE}/section-6.html`,
  }],
  ["7", {
    statute: "Controlled Drugs and Substances Act",
    shortName: "CDSA",
    title: "Production of substance",
    summary: "No person shall produce a substance included in Schedule I, II, III or IV. Penalties for Schedule I or II: minimum 2 years if involving residential property or near a school, maximum life; otherwise minimum 18 months, maximum life.",
    relevance: "drug production, grow op, manufacturing narcotics, lab, methamphetamine production",
    url: `${CDSA_BASE}/section-7.html`,
  }],
  ["10", {
    statute: "Controlled Drugs and Substances Act",
    shortName: "CDSA",
    title: "Principles regarding sentencing",
    summary: "Principles that the court must take into account when sentencing under this Act, including whether the offence involved organized crime, whether violence was used, and whether a firearm was used.",
    relevance: "CDSA sentencing principles, aggravating factors, organized crime, weapons",
    url: `${CDSA_BASE}/section-10.html`,
  }],
]);

// ── YCJA ──────────────────────────────────────────────────────────────────────
const YCJA_SECTIONS = new Map([
  ["2", {
    statute: "Youth Criminal Justice Act",
    shortName: "YCJA",
    title: "Definitions — young person",
    summary: "Definitions including 'young person' (a person aged 12 or over and under 18 years at the time of the alleged offence), 'youth justice court', 'adult sentence', and 'youth sentence'.",
    relevance: "youth criminal liability, age of criminal responsibility, 12-17 years old, young person definition",
    url: `${YCJA_BASE}/section-2.html`,
  }],
  ["3", {
    statute: "Youth Criminal Justice Act",
    shortName: "YCJA",
    title: "Declaration of principle",
    summary: "The youth criminal justice system is intended to protect the public by holding young persons accountable through measures that are proportionate to the seriousness of the offence, emphasizing rehabilitation and reintegration, addressing the needs of young persons, and respecting gender, ethnic, cultural, and linguistic differences.",
    relevance: "youth sentencing principles, rehabilitation, accountability, proportionality, Indigenous youth",
    url: `${YCJA_BASE}/section-3.html`,
  }],
  ["38", {
    statute: "Youth Criminal Justice Act",
    shortName: "YCJA",
    title: "Purpose — youth sentences",
    summary: "The purpose of sentencing under this Act is to hold a young person accountable for an offence through the imposition of just sanctions that have meaningful consequences for the young person and that promote his or her rehabilitation and reintegration into society, thereby contributing to the long-term protection of the public.",
    relevance: "youth sentence purpose, rehabilitation, reintegration, just sanctions, meaningful consequences",
    url: `${YCJA_BASE}/section-38.html`,
  }],
  ["39", {
    statute: "Youth Criminal Justice Act",
    shortName: "YCJA",
    title: "Committal to custody",
    summary: "A youth justice court shall not commit a young person to custody unless the young person has committed a violent offence, has failed to comply with non-custodial sentences, or the exceptional circumstances of the case warrant custody. Custody is a last resort for young persons.",
    relevance: "youth custody, youth incarceration, last resort principle, youth violent offence",
    url: `${YCJA_BASE}/section-39.html`,
  }],
  ["40", {
    statute: "Youth Criminal Justice Act",
    shortName: "YCJA",
    title: "Pre-sentence report",
    summary: "Before imposing a youth sentence, a youth justice court shall require a youth worker to prepare, or cause to be prepared, a pre-sentence report for the purpose of assisting the court.",
    relevance: "youth pre-sentence report, youth worker, mitigating factors, youth background",
    url: `${YCJA_BASE}/section-40.html`,
  }],
  ["61", {
    statute: "Youth Criminal Justice Act",
    shortName: "YCJA",
    title: "Adult sentences",
    summary: "The youth justice court shall order that an adult sentence be imposed if the young person has been found guilty of an offence for which an adult is liable to imprisonment for more than two years, and the court considers a youth sentence would not be of sufficient length to hold the young person accountable.",
    relevance: "adult sentence for youth, youth tried as adult, serious offence, life sentence youth",
    url: `${YCJA_BASE}/section-61.html`,
  }],
  ["110", {
    statute: "Youth Criminal Justice Act",
    shortName: "YCJA",
    title: "Identity of offender not to be published",
    summary: "No person shall publish the name of a young person, or any other information related to a young person, if it would identify the young person as a young person dealt with under this Act.",
    relevance: "youth publication ban, identity protection, media reporting, young offender privacy",
    url: `${YCJA_BASE}/section-110.html`,
  }],
]);

// ── Canadian Human Rights Act ─────────────────────────────────────────────────
const CHRA_SECTIONS = new Map([
  ["2", {
    statute: "Canadian Human Rights Act",
    shortName: "CHRA",
    title: "Purpose",
    summary: "The purpose of this Act is to extend the laws in Canada to give effect, within the purview of matters coming within the legislative authority of Parliament, to the principle that all individuals should have an opportunity equal with other individuals to make for themselves the lives that they are able and wish to have and to have their needs accommodated.",
    relevance: "human rights purpose, equal opportunity, accommodation, federal jurisdiction",
    url: `${CHRA_BASE}/section-2.html`,
  }],
  ["3", {
    statute: "Canadian Human Rights Act",
    shortName: "CHRA",
    title: "Prohibited grounds of discrimination",
    summary: "Prohibited grounds of discrimination are race, national or ethnic origin, colour, religion, age, sex, sexual orientation, gender identity or expression, marital status, family status, genetic characteristics, disability and conviction for an offence for which a pardon has been granted.",
    relevance: "discrimination grounds, race, sex, religion, disability, sexual orientation, gender identity, hate crimes",
    url: `${CHRA_BASE}/section-3.html`,
  }],
  ["13", {
    statute: "Canadian Human Rights Act",
    shortName: "CHRA",
    title: "Hate messages",
    summary: "It is a discriminatory practice to communicate or cause to be communicated, before the public, by means of a telecommunication undertaking within the legislative authority of Parliament, any matter that is likely to expose a person or persons to hatred or contempt by reason of the fact that that person or those persons are identifiable on the basis of a prohibited ground of discrimination.",
    relevance: "hate speech online, hate messages, internet hate, discrimination complaints",
    url: `${CHRA_BASE}/section-13.html`,
  }],
]);

// ── Criminal Code — Sentencing Principles (Part XXIII) ────────────────────────
const CC_SENTENCING = new Map([
  ["718", {
    statute: "Criminal Code",
    shortName: "CC",
    title: "Purpose and principles of sentencing",
    summary: "The fundamental purpose of sentencing is to protect society and to contribute, along with crime prevention initiatives, to respect for the law and the maintenance of a just, peaceful and safe society by imposing just sanctions that have one or more of the following objectives: denunciation; deterrence; separation; rehabilitation; reparation; and promoting responsibility.",
    relevance: "sentencing purpose, denunciation, deterrence, rehabilitation, reparation, sentencing principles",
    url: `${CC_BASE}/section-718.html`,
  }],
  ["718.1", {
    statute: "Criminal Code",
    shortName: "CC",
    title: "Fundamental principle of sentencing",
    summary: "A sentence must be proportionate to the gravity of the offence and the degree of responsibility of the offender.",
    relevance: "proportionality in sentencing, gravity of offence, moral blameworthiness",
    url: `${CC_BASE}/section-718.1.html`,
  }],
  ["718.2", {
    statute: "Criminal Code",
    shortName: "CC",
    title: "Other sentencing principles",
    summary: "A court that imposes a sentence shall also take into consideration the following principles: a sentence should be increased or reduced to account for any relevant aggravating or mitigating circumstances. Aggravating factors include: evidence the offence was motivated by bias or prejudice; abuse of a position of trust; domestic violence; offence against a vulnerable person. A court shall also consider all available sanctions, other than imprisonment, that are reasonable in the circumstances — and should give particular attention to the circumstances of Aboriginal offenders.",
    relevance: "aggravating factors, mitigating factors, hate crime sentencing, Gladue principles, Aboriginal offenders, domestic violence sentencing, IPV, elder abuse, youth victim",
    url: `${CC_BASE}/section-718.2.html`,
  }],
  ["719", {
    statute: "Criminal Code",
    shortName: "CC",
    title: "Commencement of sentence",
    summary: "A sentence commences when it is imposed, except where a relevant enactment otherwise provides. In calculating the term of a sentence, a court may take into account any time spent in custody.",
    relevance: "sentence start date, pre-sentence custody credit, remand credit, 1.5x credit",
    url: `${CC_BASE}/section-719.html`,
  }],
  ["720", {
    statute: "Criminal Code",
    shortName: "CC",
    title: "Sentencing proceedings",
    summary: "A court shall, as soon as practicable after an offender has been found guilty, conduct proceedings to determine the appropriate sentence to be imposed.",
    relevance: "sentencing hearing, timing of sentencing proceedings",
    url: `${CC_BASE}/section-720.html`,
  }],
  ["722", {
    statute: "Criminal Code",
    shortName: "CC",
    title: "Victim impact statement",
    summary: "For the purpose of determining the sentence to be imposed on an offender or whether the offender should be discharged under section 730 in respect of any offence, the court shall consider any statement that was prepared in accordance with this section by a victim of the offence describing the harm done to, or loss suffered by, the victim arising from the commission of the offence.",
    relevance: "victim impact statement, victim's rights, harm, loss, sentencing",
    url: `${CC_BASE}/section-722.html`,
  }],
  ["724", {
    statute: "Criminal Code",
    shortName: "CC",
    title: "Information accepted",
    summary: "In determining a sentence, a court may accept as proved any information disclosed at the trial or submitted at the sentencing hearing, whether or not that information would be admissible as evidence at trial.",
    relevance: "sentencing evidence, admissibility at sentencing, agreed statement of facts",
    url: `${CC_BASE}/section-724.html`,
  }],
  ["726", {
    statute: "Criminal Code",
    shortName: "CC",
    title: "Submissions regarding sentence",
    summary: "Before imposing sentence, the court shall ask whether the offender, if present, has anything to say.",
    relevance: "allocution, right to speak at sentencing, offender submissions",
    url: `${CC_BASE}/section-726.html`,
  }],
  ["730", {
    statute: "Criminal Code",
    shortName: "CC",
    title: "Absolute and conditional discharges",
    summary: "Where an accused, other than an organization, pleads guilty to or is found guilty of an offence, the court may, if it considers it to be in the best interests of the accused and not contrary to the public interest, instead of convicting the accused, discharge the accused absolutely or on the conditions prescribed in a probation order.",
    relevance: "discharge, conditional discharge, absolute discharge, no conviction, first offence",
    url: `${CC_BASE}/section-730.html`,
  }],
  ["731", {
    statute: "Criminal Code",
    shortName: "CC",
    title: "Probation",
    summary: "Where an offender is convicted of an offence, a court may, having regard to the age and character of the offender, the nature of the offence and the circumstances surrounding its commission, suspend the passing of sentence and direct that the offender be released on the conditions prescribed in a probation order.",
    relevance: "probation order, suspended sentence, community supervision, conditions",
    url: `${CC_BASE}/section-731.html`,
  }],
  ["732.1", {
    statute: "Criminal Code",
    shortName: "CC",
    title: "Probation order — conditions",
    summary: "The court shall prescribe as conditions of a probation order that the offender keep the peace and be of good behaviour and appear before the court when required to do so. Optional conditions include: report to probation officer; remain within jurisdiction; abstain from drugs/alcohol; reside at approved address; avoid contact with specified persons.",
    relevance: "probation conditions, no-contact order, reporting to probation, good behaviour",
    url: `${CC_BASE}/section-732.1.html`,
  }],
  ["742.1", {
    statute: "Criminal Code",
    shortName: "CC",
    title: "Conditional sentence of imprisonment",
    summary: "If a person is convicted of an offence and the court imposes a sentence of imprisonment of less than two years, the court may, for the purpose of supervising the offender's behaviour in the community, order that the offender serve the sentence in the community, subject to conditions, if the court is satisfied that the service of the sentence in the community would not endanger the safety of the community.",
    relevance: "conditional sentence, house arrest, sentence served in community, two year less a day",
    url: `${CC_BASE}/section-742.1.html`,
  }],
]);

// ── Canada Evidence Act ───────────────────────────────────────────────────────
const EVIDENCE_SECTIONS = new Map([
  ["16", {
    statute: "Canada Evidence Act",
    shortName: "CEA",
    title: "Witness with mental disability",
    summary: "Where a proposed witness is a person of fourteen years of age or more whose mental capacity is challenged, the court shall, before permitting the person to give evidence, conduct an inquiry to determine whether the person understands the nature of an oath or a solemn affirmation.",
    relevance: "competency of witness, mental disability, understanding oath",
    url: `${EVIDENCE_BASE}/section-16.html`,
  }],
  ["16.1", {
    statute: "Canada Evidence Act",
    shortName: "CEA",
    title: "Child witness under 14",
    summary: "A person under fourteen years of age is presumed to have the capacity to testify. A child under 14 who does not understand the nature of an oath or solemn affirmation may nonetheless testify on promising to tell the truth.",
    relevance: "child witness, testimony of minors, promise to tell the truth, child evidence",
    url: `${EVIDENCE_BASE}/section-16.1.html`,
  }],
]);

// ── Corrections and Conditional Release Act ───────────────────────────────────
const CCRA_SECTIONS = new Map([
  ["100", {
    statute: "Corrections and Conditional Release Act",
    shortName: "CCRA",
    title: "Purpose of conditional release",
    summary: "The purpose of conditional release is to contribute to the maintenance of a just, peaceful and safe society by means of decisions on the timing and conditions of release that will best facilitate the rehabilitation of offenders and their reintegration into the community as law-abiding citizens.",
    relevance: "parole, statutory release, conditional release purpose, rehabilitation, reintegration",
    url: `${CCRA_BASE}/section-100.html`,
  }],
  ["101", {
    statute: "Corrections and Conditional Release Act",
    shortName: "CCRA",
    title: "Principles guiding the Board",
    summary: "The paramount consideration for the Board is the protection of society. The Board shall take into consideration whether the offender's release will contribute to the protection of society by facilitating the timely reintegration of the offender into society as a law-abiding citizen.",
    relevance: "parole board principles, public protection, parole decision, risk assessment",
    url: `${CCRA_BASE}/section-101.html`,
  }],
]);

// ── Master index ──────────────────────────────────────────────────────────────
// All sections combined with statute prefix for lookup.
// Key format: "CDSA s. 4", "YCJA s. 38", "CC s. 718.2", "CHRA s. 3", etc.
export const CIVIL_LAW_INDEX = new Map([
  ...Array.from(CDSA_SECTIONS.entries()).map(([k, v]) => [`CDSA s. ${k}`, v]),
  ...Array.from(YCJA_SECTIONS.entries()).map(([k, v]) => [`YCJA s. ${k}`, v]),
  ...Array.from(CHRA_SECTIONS.entries()).map(([k, v]) => [`CHRA s. ${k}`, v]),
  ...Array.from(CC_SENTENCING.entries()).map(([k, v]) => [`CC s. ${k}`, v]),
  ...Array.from(EVIDENCE_SECTIONS.entries()).map(([k, v]) => [`CEA s. ${k}`, v]),
  ...Array.from(CCRA_SECTIONS.entries()).map(([k, v]) => [`CCRA s. ${k}`, v]),
]);

// Also export by statute for direct access
export { CDSA_SECTIONS, YCJA_SECTIONS, CHRA_SECTIONS, CC_SENTENCING, EVIDENCE_SECTIONS, CCRA_SECTIONS };

// ── Lookup helpers ────────────────────────────────────────────────────────────

// Patterns to recognize civil law citations:
// "Controlled Drugs and Substances Act, s. 4"
// "CDSA, s. 4" / "CDSA s. 4"
// "Youth Criminal Justice Act, s. 38"
// "YCJA s. 38"
// "Canadian Human Rights Act, s. 3"
// "Criminal Code, s. 718.2" (sentencing sections)
// "Canada Evidence Act, s. 16"
// "Corrections and Conditional Release Act, s. 100"

const STATUTE_ALIASES = [
  { pattern: /controlled drugs and substances act/i, prefix: "CDSA", map: CDSA_SECTIONS },
  { pattern: /\bCDSA\b/i,                            prefix: "CDSA", map: CDSA_SECTIONS },
  { pattern: /youth criminal justice act/i,           prefix: "YCJA", map: YCJA_SECTIONS },
  { pattern: /\bYCJA\b/i,                            prefix: "YCJA", map: YCJA_SECTIONS },
  { pattern: /canadian human rights act/i,            prefix: "CHRA", map: CHRA_SECTIONS },
  { pattern: /\bCHRA\b/i,                            prefix: "CHRA", map: CHRA_SECTIONS },
  { pattern: /canada evidence act/i,                  prefix: "CEA",  map: EVIDENCE_SECTIONS },
  { pattern: /\bCEA\b/i,                             prefix: "CEA",  map: EVIDENCE_SECTIONS },
  { pattern: /corrections and conditional release act/i, prefix: "CCRA", map: CCRA_SECTIONS },
  { pattern: /\bCCRA\b/i,                            prefix: "CCRA", map: CCRA_SECTIONS },
  // CC sentencing: recognize "Criminal Code, s. 718" pattern
  { pattern: /criminal code/i,                        prefix: "CC",   map: CC_SENTENCING },
];

// Extract section number from a citation string.
// e.g. "CDSA, s. 4" → "4", "s. 718.2" → "718.2", "section 38(1)" → "38"
function extractSectionNumber(citation) {
  const m = citation.match(/s\.\s*([\d.]+(?:\(\w+\))?)/i)
    || citation.match(/section\s+([\d.]+)/i)
    || citation.match(/,\s*([\d.]+(?:\(\w+\))?)\s*$/);
  return m ? m[1].trim() : null;
}

// Look up a civil law citation string.
// Returns { entry, prefix } or null.
export function lookupCivilLawSection(citation) {
  if (!citation || typeof citation !== "string") return null;
  const trimmed = citation.trim();

  for (const { pattern, prefix, map } of STATUTE_ALIASES) {
    if (pattern.test(trimmed)) {
      const sectionNum = extractSectionNumber(trimmed);
      if (!sectionNum) continue;
      const entry = map.get(sectionNum);
      if (entry) return { entry, prefix };
    }
  }
  return null;
}
