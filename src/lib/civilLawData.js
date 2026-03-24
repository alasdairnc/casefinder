// src/lib/civilLawData.js
// Federal and Provincial statutes relevant to Canadian criminal law scenarios.
// Sources: justice.gc.ca, laws-lois.justice.gc.ca, ontario.ca/laws, bclaws.gov.bc.ca, alberta.ca/alberta-king-s-printer
// Used by api/verify.js to validate AI-suggested civil_law citations.

// ── Base URLs ─────────────────────────────────────────────────────────────────
const CDSA_BASE    = "https://laws-lois.justice.gc.ca/eng/acts/c-38.8";
const YCJA_BASE    = "https://laws-lois.justice.gc.ca/eng/acts/y-1.5";
const CHRA_BASE    = "https://laws-lois.justice.gc.ca/eng/acts/h-6";
const CC_BASE      = "https://laws-lois.justice.gc.ca/eng/acts/c-46";
const CCRA_BASE    = "https://laws-lois.justice.gc.ca/eng/acts/c-44.6";
const EVIDENCE_BASE = "https://laws-lois.justice.gc.ca/eng/acts/c-5";
const ON_HTA_BASE   = "https://www.ontario.ca/laws/statute/90h08";
const ON_RTA_BASE   = "https://www.ontario.ca/laws/statute/06r17";
const BC_MVA_BASE   = "https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/96318_00";
const BC_RTA_BASE   = "https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/02078_01";
const AB_TSA_BASE   = "https://www.alberta.ca/traffic-safety-act";
const AB_RTA_BASE   = "https://www.alberta.ca/residential-tenancies-act";
const AB_HRA_BASE   = "https://www.alberta.ca/alberta-human-rights-act";

// ── Federal: CDSA ─────────────────────────────────────────────────────────────
const CDSA_SECTIONS = new Map([
  ["2", {
    jurisdiction: "Federal",
    statute: "Controlled Drugs and Substances Act",
    shortName: "CDSA",
    title: "Definitions",
    summary: "Definitions for the purposes of this Act, including 'substance', 'traffic', 'produce', and the Schedule classifications.",
    relevance: "drug charges, substance classification, Schedule I-V, trafficking definition",
    url: `${CDSA_BASE}/section-2.html`,
  }],
  ["4", {
    jurisdiction: "Federal",
    statute: "Controlled Drugs and Substances Act",
    shortName: "CDSA",
    title: "Possession of substance",
    summary: "Except as authorized under the regulations, no person shall possess a substance included in Schedule I, II or III.",
    relevance: "drug possession, constructive possession, knowledge, Schedule I-III substances, cannabis, cocaine, heroin, fentanyl",
    url: `${CDSA_BASE}/section-4.html`,
  }],
  ["5", {
    jurisdiction: "Federal",
    statute: "Controlled Drugs and Substances Act",
    shortName: "CDSA",
    title: "Trafficking in substance",
    summary: "No person shall traffic in a substance included in Schedule I, II, III, IV or V or in any substance represented or held out by that person to be such a substance.",
    relevance: "drug trafficking, selling drugs, distributing controlled substances, Schedule I penalties",
    url: `${CDSA_BASE}/section-5.html`,
  }],
  ["6", {
    jurisdiction: "Federal",
    statute: "Controlled Drugs and Substances Act",
    shortName: "CDSA",
    title: "Importing and exporting",
    summary: "Except as authorized under the regulations, no person shall import into Canada or export from Canada a substance included in Schedule I, II, III, IV, V or VI.",
    relevance: "drug importation, drug exportation, border smuggling, Schedule I-VI",
    url: `${CDSA_BASE}/section-6.html`,
  }],
  ["7", {
    jurisdiction: "Federal",
    statute: "Controlled Drugs and Substances Act",
    shortName: "CDSA",
    title: "Production of substance",
    summary: "Except as authorized under the regulations, no person shall produce a substance included in Schedule I, II, III, IV or V.",
    relevance: "drug production, grow op, manufacturing narcotics, lab, methamphetamine production",
    url: `${CDSA_BASE}/section-7.html`,
  }],
  ["10", {
    jurisdiction: "Federal",
    statute: "Controlled Drugs and Substances Act",
    shortName: "CDSA",
    title: "Purpose of sentencing",
    summary: "Without restricting the generality of the Criminal Code, the fundamental purpose of any sentence for an offence under this Part is to contribute to the respect for the law and the maintenance of a just, peaceful and safe society while encouraging rehabilitation, and treatment in appropriate circumstances, of offenders and acknowledging the harm done to victims and to the community.",
    relevance: "CDSA sentencing principles, aggravating factors, rehabilitation, drug treatment court",
    url: `${CDSA_BASE}/section-10.html`,
  }],
]);

// ── Federal: YCJA ─────────────────────────────────────────────────────────────
const YCJA_SECTIONS = new Map([
  ["2", {
    jurisdiction: "Federal",
    statute: "Youth Criminal Justice Act",
    shortName: "YCJA",
    title: "Definitions — young person",
    summary: "Definitions including 'young person' (a person aged 12 or over and under 18 years at the time of the alleged offence), 'youth justice court', 'adult sentence', and 'youth sentence'.",
    relevance: "youth criminal liability, age of criminal responsibility, 12-17 years old, young person definition",
    url: `${YCJA_BASE}/section-2.html`,
  }],
  ["3", {
    jurisdiction: "Federal",
    statute: "Youth Criminal Justice Act",
    shortName: "YCJA",
    title: "Declaration of principle",
    summary: "The principles of the youth criminal justice system, including protecting the public, holding young persons accountable proportionately, and promoting rehabilitation and reintegration.",
    relevance: "youth sentencing principles, rehabilitation, accountability, proportionality, Indigenous youth",
    url: `${YCJA_BASE}/section-3.html`,
  }],
  ["38", {
    jurisdiction: "Federal",
    statute: "Youth Criminal Justice Act",
    shortName: "YCJA",
    title: "Purpose of sentencing",
    summary: "The purpose of the youth sentencing provisions is to hold a young person accountable for an offence through the imposition of just sanctions that have meaningful consequences.",
    relevance: "youth sentence purpose, rehabilitation, reintegration, just sanctions, meaningful consequences",
    url: `${YCJA_BASE}/section-38.html`,
  }],
  ["39", {
    jurisdiction: "Federal",
    statute: "Youth Criminal Justice Act",
    shortName: "YCJA",
    title: "Committal to custody",
    summary: "A youth justice court shall not commit a young person to custody under section 42 unless specific criteria are met, such as committing a violent offence or failing to comply with non-custodial sentences.",
    relevance: "youth custody, youth incarceration, last resort principle, youth violent offence",
    url: `${YCJA_BASE}/section-39.html`,
  }],
  ["40", {
    jurisdiction: "Federal",
    statute: "Youth Criminal Justice Act",
    shortName: "YCJA",
    title: "Pre-sentence report",
    summary: "A youth justice court shall, before imposing a youth sentence, consider a pre-sentence report.",
    relevance: "youth pre-sentence report, youth worker, mitigating factors, youth background",
    url: `${YCJA_BASE}/section-40.html`,
  }],
  ["110", {
    jurisdiction: "Federal",
    statute: "Youth Criminal Justice Act",
    shortName: "YCJA",
    title: "Identity of offender not to be published",
    summary: "Subject to this section, no person shall publish the name of a young person, or any other information related to a young person, if it would identify them as being dealt with under this Act.",
    relevance: "youth publication ban, identity protection, media reporting, young offender privacy",
    url: `${YCJA_BASE}/section-110.html`,
  }],
]);

// ── Federal: CHRA ─────────────────────────────────────────────────────────────
const CHRA_SECTIONS = new Map([
  ["2", {
    jurisdiction: "Federal",
    statute: "Canadian Human Rights Act",
    shortName: "CHRA",
    title: "Purpose",
    summary: "The purpose of this Act is to give effect to the principle that all individuals should have an equal opportunity to make for themselves the lives that they are able and wish to have.",
    relevance: "human rights purpose, equal opportunity, accommodation, federal jurisdiction",
    url: `${CHRA_BASE}/section-2.html`,
  }],
  ["3", {
    jurisdiction: "Federal",
    statute: "Canadian Human Rights Act",
    shortName: "CHRA",
    title: "Prohibited grounds of discrimination",
    summary: "The prohibited grounds of discrimination are race, national or ethnic origin, colour, religion, age, sex, sexual orientation, gender identity or expression, marital status, family status, genetic characteristics, disability and conviction for an offence for which a pardon has been granted.",
    relevance: "discrimination grounds, race, sex, religion, disability, sexual orientation, gender identity, hate crimes",
    url: `${CHRA_BASE}/section-3.html`,
  }],
]);

// ── Federal: Criminal Code (Sentencing) ──────────────────────────────────────
const CC_SENTENCING = new Map([
  ["718", {
    jurisdiction: "Federal",
    statute: "Criminal Code",
    shortName: "CC",
    title: "Purpose of sentencing",
    summary: "The fundamental purpose of sentencing is to protect society and to contribute to respect for the law and the maintenance of a just, peaceful and safe society.",
    relevance: "sentencing purpose, denunciation, deterrence, rehabilitation, reparation, sentencing principles",
    url: `${CC_BASE}/section-718.html`,
  }],
  ["718.1", {
    jurisdiction: "Federal",
    statute: "Criminal Code",
    shortName: "CC",
    title: "Fundamental principle of sentencing",
    summary: "A sentence must be proportionate to the gravity of the offence and the degree of responsibility of the offender.",
    relevance: "proportionality in sentencing, gravity of offence, moral blameworthiness",
    url: `${CC_BASE}/section-718.1.html`,
  }],
  ["718.2", {
    jurisdiction: "Federal",
    statute: "Criminal Code",
    shortName: "CC",
    title: "Other sentencing principles",
    summary: "Aggravating and mitigating circumstances, parity, totality, restraint, and specific attention to Aboriginal offenders (Gladue principles).",
    relevance: "aggravating factors, mitigating factors, hate crime sentencing, Gladue principles, Aboriginal offenders",
    url: `${CC_BASE}/section-718.2.html`,
  }],
  ["719", {
    jurisdiction: "Federal",
    statute: "Criminal Code",
    shortName: "CC",
    title: "Commencement of sentence",
    summary: "A sentence commences when it is imposed, except where a relevant enactment otherwise provides.",
    relevance: "sentence start date, pre-sentence custody credit, remand credit, 1.5x credit",
    url: `${CC_BASE}/section-719.html`,
  }],
  ["722", {
    jurisdiction: "Federal",
    statute: "Criminal Code",
    shortName: "CC",
    title: "Victim impact statement",
    summary: "When determining the sentence, the court shall consider any statement of a victim describing the physical or emotional harm result of the offence.",
    relevance: "victim impact statement, victim's rights, harm, loss, sentencing",
    url: `${CC_BASE}/section-722.html`,
  }],
  ["730", {
    jurisdiction: "Federal",
    statute: "Criminal Code",
    shortName: "CC",
    title: "Absolute and conditional discharges",
    summary: "Where an accused pleads guilty to or is found guilty of an offence, the court may direct that the accused be discharged absolutely or conditionally.",
    relevance: "discharge, conditional discharge, absolute discharge, no conviction, first offence",
    url: `${CC_BASE}/section-730.html`,
  }],
  ["731", {
    jurisdiction: "Federal",
    statute: "Criminal Code",
    shortName: "CC",
    title: "Probation",
    summary: "Where a person is convicted of an offence, a court may suspend the passing of sentence and direct that the offender be released on probation.",
    relevance: "probation order, suspended sentence, community supervision, conditions",
    url: `${CC_BASE}/section-731.html`,
  }],
]);

// ── Federal: Canada Evidence Act ─────────────────────────────────────────────
const EVIDENCE_SECTIONS = new Map([
  ["16", {
    jurisdiction: "Federal",
    statute: "Canada Evidence Act",
    shortName: "CEA",
    title: "Witness whose capacity is in question",
    summary: "Procedures for witnesses whose mental capacity is challenged, including the requirement to understand the nature of an oath.",
    relevance: "competency of witness, mental disability, understanding oath, ability to communicate",
    url: `${EVIDENCE_BASE}/section-16.html`,
  }],
  ["16.1", {
    jurisdiction: "Federal",
    statute: "Canada Evidence Act",
    shortName: "CEA",
    title: "Person under fourteen years of age",
    summary: "A person under fourteen years of age is presumed to have the capacity to testify.",
    relevance: "child witness, testimony of minors, promise to tell the truth, child evidence",
    url: `${EVIDENCE_BASE}/section-16.1.html`,
  }],
]);

// ── Federal: CCRA ─────────────────────────────────────────────────────────────
const CCRA_SECTIONS = new Map([
  ["100", {
    jurisdiction: "Federal",
    statute: "Corrections and Conditional Release Act",
    shortName: "CCRA",
    title: "Purpose of conditional release",
    summary: "Conditional release facilitates rehabilitation and reintegration into the community as law-abiding citizens.",
    relevance: "parole, statutory release, conditional release purpose, rehabilitation, reintegration",
    url: `${CCRA_BASE}/section-100.html`,
  }],
  ["101", {
    jurisdiction: "Federal",
    statute: "Corrections and Conditional Release Act",
    shortName: "CCRA",
    title: "Principles guiding the Board",
    summary: "The principles that shall guide the Board and the provincial parole boards in achieving the purpose of conditional release.",
    relevance: "parole board principles, public protection, parole decision, risk assessment",
    url: `${CCRA_BASE}/section-101.html`,
  }],
]);

// ── Ontario: Highway Traffic Act ─────────────────────────────────────────────
const ON_HTA_SECTIONS = new Map([
  ["53", {
    jurisdiction: "Ontario",
    statute: "Highway Traffic Act",
    shortName: "HTA",
    title: "Driving while licence suspended",
    summary: "Every person who drives a motor vehicle on a highway while his or her driver’s licence is suspended is guilty of an offence.",
    relevance: "driving while suspended, provincial traffic offences",
    url: `${ON_HTA_BASE}`,
  }],
  ["128", {
    jurisdiction: "Ontario",
    statute: "Highway Traffic Act",
    shortName: "HTA",
    title: "Rate of speed",
    summary: "Statutory limits on speed for various highway types.",
    relevance: "speeding, traffic safety",
    url: `${ON_HTA_BASE}`,
  }],
  ["130", {
    jurisdiction: "Ontario",
    statute: "Highway Traffic Act",
    shortName: "HTA",
    title: "Careless driving",
    summary: "Driving without due care and attention or without reasonable consideration for other persons.",
    relevance: "careless driving, provincial driving offence",
    url: `${ON_HTA_BASE}`,
  }],
]);

// ── Ontario: Residential Tenancies Act ───────────────────────────────────────
const ON_RTA_SECTIONS = new Map([
  ["20", {
    jurisdiction: "Ontario",
    statute: "Residential Tenancies Act, 2006",
    shortName: "RTA",
    title: "Landlord's responsibility to repair",
    summary: "A landlord is responsible for providing and maintaining a residential complex and the rental units in a good state of repair.",
    relevance: "tenancy disputes, maintenance, habitability",
    url: `${ON_RTA_BASE}`,
  }],
]);

// ── British Columbia: Motor Vehicle Act ──────────────────────────────────────
const BC_MVA_SECTIONS = new Map([
  ["144", {
    jurisdiction: "British Columbia",
    statute: "Motor Vehicle Act",
    shortName: "MVA",
    title: "Careless driving prohibited",
    summary: "A person must not drive a motor vehicle on a highway without due care and attention or without reasonable consideration for other persons.",
    relevance: "careless driving, BC traffic law",
    url: `${BC_MVA_BASE}`,
  }],
  ["214.2", {
    jurisdiction: "British Columbia",
    statute: "Motor Vehicle Act",
    shortName: "MVA",
    title: "Use of electronic devices while driving",
    summary: "A person must not use an electronic device while driving or operating a motor vehicle on a highway.",
    relevance: "distracted driving, distracted driving BC",
    url: `${BC_MVA_BASE}`,
  }],
]);

// ── British Columbia: Residential Tenancy Act ────────────────────────────────
const BC_RTA_SECTIONS = new Map([
  ["32", {
    jurisdiction: "British Columbia",
    statute: "Residential Tenancy Act",
    shortName: "RTA",
    title: "Landlord and tenant obligations to repair and maintain",
    summary: "A landlord must provide and maintain residential property in a state of decoration and repair that complies with health, safety and housing standards.",
    relevance: "BC tenancy disputes, maintenance",
    url: `${BC_RTA_BASE}`,
  }],
]);

// ── Alberta: Traffic Safety Act ──────────────────────────────────────────────
const AB_TSA_SECTIONS = new Map([
  ["115", {
    jurisdiction: "Alberta",
    statute: "Traffic Safety Act",
    shortName: "TSA",
    title: "Careless driving",
    summary: "No person shall drive a vehicle on a highway in a careless manner or without reasonable consideration for others.",
    relevance: "Alberta traffic safety, careless driving",
    url: `${AB_TSA_BASE}`,
  }],
  ["94", {
    jurisdiction: "Alberta",
    statute: "Traffic Safety Act",
    shortName: "TSA",
    title: "Driving while unauthorized",
    summary: "Prohibits driving while a person's operator's license is suspended or cancelled.",
    relevance: "driving while suspended, Alberta traffic law",
    url: `${AB_TSA_BASE}`,
  }],
]);

// ── Alberta: Residential Tenancies Act ───────────────────────────────────────
const AB_RTA_SECTIONS = new Map([
  ["16", {
    jurisdiction: "Alberta",
    statute: "Residential Tenancies Act",
    shortName: "RTA",
    title: "Landlord's covenants",
    summary: "The landlord covenants that the premises will be available for occupation by the tenant at the beginning of the term.",
    relevance: "Alberta tenancy law, landlord obligations",
    url: `${AB_RTA_BASE}`,
  }],
]);

// ── Alberta: Human Rights Act ────────────────────────────────────────────────
const AB_HRA_SECTIONS = new Map([
  ["7", {
    jurisdiction: "Alberta",
    statute: "Alberta Human Rights Act",
    shortName: "AHRA",
    title: "Discrimination in employment",
    summary: "Prohibits discrimination in employment based on protected grounds including race, religious beliefs, colour, gender, etc.",
    relevance: "Alberta human rights, employment discrimination",
    url: `${AB_HRA_BASE}`,
  }],
]);

// ── Master index ──────────────────────────────────────────────────────────────
export const CIVIL_LAW_INDEX = new Map([
  ...Array.from(CDSA_SECTIONS.entries()).map(([k, v]) => [`CDSA s. ${k}`, v]),
  ...Array.from(YCJA_SECTIONS.entries()).map(([k, v]) => [`YCJA s. ${k}`, v]),
  ...Array.from(CHRA_SECTIONS.entries()).map(([k, v]) => [`CHRA s. ${k}`, v]),
  ...Array.from(CC_SENTENCING.entries()).map(([k, v]) => [`CC s. ${k}`, v]),
  ...Array.from(EVIDENCE_SECTIONS.entries()).map(([k, v]) => [`CEA s. ${k}`, v]),
  ...Array.from(CCRA_SECTIONS.entries()).map(([k, v]) => [`CCRA s. ${k}`, v]),
  ...Array.from(ON_HTA_SECTIONS.entries()).map(([k, v]) => [`HTA s. ${k}`, v]),
  ...Array.from(ON_RTA_SECTIONS.entries()).map(([k, v]) => [`ON RTA s. ${k}`, v]),
  ...Array.from(BC_MVA_SECTIONS.entries()).map(([k, v]) => [`MVA s. ${k}`, v]),
  ...Array.from(BC_RTA_SECTIONS.entries()).map(([k, v]) => [`BC RTA s. ${k}`, v]),
  ...Array.from(AB_TSA_SECTIONS.entries()).map(([k, v]) => [`TSA s. ${k}`, v]),
  ...Array.from(AB_RTA_SECTIONS.entries()).map(([k, v]) => [`AB RTA s. ${k}`, v]),
  ...Array.from(AB_HRA_SECTIONS.entries()).map(([k, v]) => [`AHRA s. ${k}`, v]),
]);

export { 
  CDSA_SECTIONS, YCJA_SECTIONS, CHRA_SECTIONS, CC_SENTENCING, EVIDENCE_SECTIONS, CCRA_SECTIONS,
  ON_HTA_SECTIONS, ON_RTA_SECTIONS, BC_MVA_SECTIONS, BC_RTA_SECTIONS,
  AB_TSA_SECTIONS, AB_RTA_SECTIONS, AB_HRA_SECTIONS
};

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
  { pattern: /criminal code/i,                        prefix: "CC",   map: CC_SENTENCING },
  { pattern: /\bCC\b/i,                              prefix: "CC",   map: CC_SENTENCING },
  { pattern: /highway traffic act\s*\(on\)/i,         prefix: "HTA",  map: ON_HTA_SECTIONS },
  { pattern: /\bHTA\b/i,                             prefix: "HTA",  map: ON_HTA_SECTIONS },
  { pattern: /residential tenancies act\s*,?\s*2006/i, prefix: "ON RTA", map: ON_RTA_SECTIONS },
  { pattern: /residential tenancies act\s*\(on\)/i,  prefix: "ON RTA", map: ON_RTA_SECTIONS },
  { pattern: /motor vehicle act\s*\(bc\)/i,           prefix: "MVA",  map: BC_MVA_SECTIONS },
  { pattern: /\bMVA\b/i,                             prefix: "MVA",  map: BC_MVA_SECTIONS },
  { pattern: /residential tenancy act\s*\(bc\)/i,    prefix: "BC RTA", map: BC_RTA_SECTIONS },
  { pattern: /traffic safety act\s*\(ab\)/i,          prefix: "TSA",  map: AB_TSA_SECTIONS },
  { pattern: /\bTSA\b/i,                             prefix: "TSA",  map: AB_TSA_SECTIONS },
  { pattern: /residential tenancies act\s*\(ab\)/i,  prefix: "AB RTA", map: AB_RTA_SECTIONS },
  { pattern: /alberta human rights act/i,             prefix: "AHRA", map: AB_HRA_SECTIONS },
  { pattern: /\bAHRA\b/i,                            prefix: "AHRA", map: AB_HRA_SECTIONS },
];

function extractSectionNumber(citation) {
  const m = citation.match(/s\.\s*([\d.]+(?:\(\w+\))?)/i)
    || citation.match(/section\s+([\d.]+)/i)
    || citation.match(/,\s*([\d.]+(?:\(\w+\))?)\s*$/);
  return m ? m[1].trim() : null;
}

export function lookupCivilLawSection(citation) {
  if (!citation || typeof citation !== "string") return null;
  const trimmed = citation.trim();

  for (const { pattern, prefix, map } of STATUTE_ALIASES) {
    if (pattern.test(trimmed)) {
      const sectionNum = extractSectionNumber(trimmed);
      if (!sectionNum) continue;
      
      let entry = map.get(sectionNum);
      if (!entry) {
        // Fallback: try base section number (e.g., "4(1)" -> "4")
        const baseNum = sectionNum.split("(")[0];
        if (baseNum !== sectionNum) {
          entry = map.get(baseNum);
        }
      }
      
      if (entry) return { entry, prefix };
    }
  }
  return null;
}
