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
    summary: "Except as authorized under the regulations, no person shall possess a substance included in Schedule I, II or III.",
    relevance: "drug possession, constructive possession, knowledge, Schedule I-III substances, cannabis, cocaine, heroin, fentanyl",
    url: `${CDSA_BASE}/section-4.html`,
  }],
  ["5", {
    statute: "Controlled Drugs and Substances Act",
    shortName: "CDSA",
    title: "Trafficking in substance",
    summary: "No person shall traffic in a substance included in Schedule I, II, III, IV or V or in any substance represented or held out by that person to be such a substance.",
    relevance: "drug trafficking, selling drugs, distributing controlled substances, Schedule I penalties",
    url: `${CDSA_BASE}/section-5.html`,
  }],
  ["6", {
    statute: "Controlled Drugs and Substances Act",
    shortName: "CDSA",
    title: "Importing and exporting",
    summary: "Except as authorized under the regulations, no person shall import into Canada or export from Canada a substance included in Schedule I, II, III, IV, V or VI.",
    relevance: "drug importation, drug exportation, border smuggling, Schedule I-VI",
    url: `${CDSA_BASE}/section-6.html`,
  }],
  ["7", {
    statute: "Controlled Drugs and Substances Act",
    shortName: "CDSA",
    title: "Production of substance",
    summary: "Except as authorized under the regulations, no person shall produce a substance included in Schedule I, II, III, IV or V.",
    relevance: "drug production, grow op, manufacturing narcotics, lab, methamphetamine production",
    url: `${CDSA_BASE}/section-7.html`,
  }],
  ["10", {
    statute: "Controlled Drugs and Substances Act",
    shortName: "CDSA",
    title: "Purpose of sentencing",
    summary: "Without restricting the generality of the Criminal Code, the fundamental purpose of any sentence for an offence under this Part is to contribute to the respect for the law and the maintenance of a just, peaceful and safe society while encouraging rehabilitation, and treatment in appropriate circumstances, of offenders and acknowledging the harm done to victims and to the community.",
    relevance: "CDSA sentencing principles, aggravating factors, rehabilitation, drug treatment court",
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
    summary: "The following principles apply in this Act: (a) the youth criminal justice system is intended to protect the public by (i) holding young persons accountable through measures that are proportionate to the seriousness of the offence and the degree of responsibility of the young person, (ii) promoting the rehabilitation and reintegration of young persons who have committed offences, and (iii) supporting the prevention of crime by referring young persons to programs or agencies in the community to address the circumstances underlying their offending behaviour; (b) the criminal justice system for young persons must be separate from that of adults, must be based on the principle of diminished moral blameworthiness or culpability and must emphasize the following: (i) rehabilitation and reintegration, (ii) fair and proportionate accountability that is consistent with the greater dependency of young persons and their reduced level of maturity, (iii) enhanced procedural protection to ensure that young persons are treated fairly and that their rights, including their right to privacy, are protected, (iv) timely intervention that reinforces the link between the offending behaviour and its consequences, and (v) the promptness and speed with which persons responsible for enforcing this Act must act, given young persons\u2019 perception of time.",
    relevance: "youth sentencing principles, rehabilitation, accountability, proportionality, Indigenous youth",
    url: `${YCJA_BASE}/section-3.html`,
  }],
  ["38", {
    statute: "Youth Criminal Justice Act",
    shortName: "YCJA",
    title: "Purpose of sentencing",
    summary: "The purpose of the youth sentencing provisions is to hold a young person accountable for an offence through the imposition of just sanctions that have meaningful consequences for the young person and that promote his or her rehabilitation and reintegration into society, thereby contributing to the long-term protection of the public.",
    relevance: "youth sentence purpose, rehabilitation, reintegration, just sanctions, meaningful consequences",
    url: `${YCJA_BASE}/section-38.html`,
  }],
  ["39", {
    statute: "Youth Criminal Justice Act",
    shortName: "YCJA",
    title: "Committal to custody",
    summary: "A youth justice court shall not commit a young person to custody under section 42 unless (a) the young person has committed a violent offence; (b) the young person has failed to comply with non-custodial sentences; (c) the young person has committed an indictable offence for which an adult would be liable to imprisonment for a term of more than two years and has a history that indicates a pattern of either extrajudicial sanctions or of findings of guilt or of both; or (d) in exceptional cases where the young person has committed an indictable offence, the aggravating circumstances of the offence are such that the imposition of a non-custodial sentence would be inconsistent with the purpose and principles set out in section 38.",
    relevance: "youth custody, youth incarceration, last resort principle, youth violent offence",
    url: `${YCJA_BASE}/section-39.html`,
  }],
  ["40", {
    statute: "Youth Criminal Justice Act",
    shortName: "YCJA",
    title: "Pre-sentence report",
    summary: "A youth justice court shall, before imposing a youth sentence, consider a pre-sentence report. A youth justice court may, before imposing a youth sentence, require the provincial director to cause to be prepared a pre-sentence report in respect of the young person and to submit the report to the court.",
    relevance: "youth pre-sentence report, youth worker, mitigating factors, youth background",
    url: `${YCJA_BASE}/section-40.html`,
  }],
  // s. 61 — Repealed, 2012, c. 1, s. 175
  ["110", {
    statute: "Youth Criminal Justice Act",
    shortName: "YCJA",
    title: "Identity of offender not to be published",
    summary: "Subject to this section, no person shall publish the name of a young person, or any other information related to a young person, if it would identify the young person as a young person dealt with under this Act.",
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
    summary: "The purpose of this Act is to extend the laws in Canada to give effect, within the purview of matters coming within the legislative authority of Parliament, to the principle that all individuals should have an opportunity equal with other individuals to make for themselves the lives that they are able and wish to have and to have their needs accommodated, consistent with their duties and obligations as members of society, without being hindered in or prevented from doing so by discriminatory practices based on race, national or ethnic origin, colour, religion, age, sex, sexual orientation, gender identity or expression, marital status, family status, genetic characteristics, disability or conviction for an offence for which a pardon has been granted or in respect of which a record suspension has been ordered.",
    relevance: "human rights purpose, equal opportunity, accommodation, federal jurisdiction",
    url: `${CHRA_BASE}/section-2.html`,
  }],
  ["3", {
    statute: "Canadian Human Rights Act",
    shortName: "CHRA",
    title: "Prohibited grounds of discrimination",
    summary: "For all purposes of this Act, the prohibited grounds of discrimination are race, national or ethnic origin, colour, religion, age, sex, sexual orientation, gender identity or expression, marital status, family status, genetic characteristics, disability and conviction for an offence for which a pardon has been granted or in respect of which a record suspension has been ordered.",
    relevance: "discrimination grounds, race, sex, religion, disability, sexual orientation, gender identity, hate crimes",
    url: `${CHRA_BASE}/section-3.html`,
  }],
  // s. 13 — Repealed, 2013, c. 37, s. 2
]);

// ── Criminal Code — Sentencing Principles (Part XXIII) ────────────────────────
const CC_SENTENCING = new Map([
  ["718", {
    statute: "Criminal Code",
    shortName: "CC",
    title: "Purpose of sentencing",
    summary: "The fundamental purpose of sentencing is to protect society and to contribute, along with crime prevention initiatives, to respect for the law and the maintenance of a just, peaceful and safe society by imposing just sanctions that have one or more of the following objectives: (a) to denounce unlawful conduct and the harm done to victims or to the community that is caused by unlawful conduct; (b) to deter the offender and other persons from committing offences; (c) to separate offenders from society, where necessary; (d) to assist in rehabilitating offenders; (e) to provide reparations for harm done to victims or to the community; and (f) to promote a sense of responsibility in offenders, and acknowledgment of the harm done to victims or to the community.",
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
    summary: "A court that imposes a sentence shall also take into consideration the following principles: (a) a sentence should be increased or reduced to account for any relevant aggravating or mitigating circumstances relating to the offence or the offender; (b) a sentence should be similar to sentences imposed on similar offenders for similar offences committed in similar circumstances; (c) where consecutive sentences are imposed, the combined sentence should not be unduly long or harsh; (d) an offender should not be deprived of liberty, if less restrictive sanctions may be appropriate in the circumstances; and (e) all available sanctions, other than imprisonment, that are reasonable in the circumstances and consistent with the harm done to victims or to the community should be considered for all offenders, with particular attention to the circumstances of Aboriginal offenders.",
    relevance: "aggravating factors, mitigating factors, hate crime sentencing, Gladue principles, Aboriginal offenders, domestic violence sentencing, IPV, elder abuse, youth victim",
    url: `${CC_BASE}/section-718.2.html`,
  }],
  ["719", {
    statute: "Criminal Code",
    shortName: "CC",
    title: "Commencement of sentence",
    summary: "A sentence commences when it is imposed, except where a relevant enactment otherwise provides.",
    relevance: "sentence start date, pre-sentence custody credit, remand credit, 1.5x credit",
    url: `${CC_BASE}/section-719.html`,
  }],
  ["720", {
    statute: "Criminal Code",
    shortName: "CC",
    title: "Sentencing proceedings",
    summary: "A court shall, as soon as practicable after an offender has been found guilty, conduct proceedings to determine the appropriate sentence to be imposed. The court may, with the consent of the Attorney General and the offender and after considering the interests of justice and of any victim of the offence, delay sentencing to enable the offender to attend a treatment program approved by the province under the supervision of the court, such as an addiction treatment program or a domestic violence counselling program.",
    relevance: "sentencing hearing, timing of sentencing proceedings",
    url: `${CC_BASE}/section-720.html`,
  }],
  ["722", {
    statute: "Criminal Code",
    shortName: "CC",
    title: "Victim impact statement",
    summary: "When determining the sentence to be imposed on an offender or determining whether the offender should be discharged under section 730 in respect of any offence, the court shall consider any statement of a victim prepared in accordance with this section and filed with the court describing the physical or emotional harm, property damage or economic loss suffered by the victim as the result of the commission of the offence and the impact of the offence on the victim.",
    relevance: "victim impact statement, victim's rights, harm, loss, sentencing",
    url: `${CC_BASE}/section-722.html`,
  }],
  ["724", {
    statute: "Criminal Code",
    shortName: "CC",
    title: "Information accepted",
    summary: "In determining a sentence, a court may accept as proved any information disclosed at the trial or at the sentencing proceedings and any facts agreed on by the prosecutor and the offender.",
    relevance: "sentencing evidence, admissibility at sentencing, agreed statement of facts",
    url: `${CC_BASE}/section-724.html`,
  }],
  ["726", {
    statute: "Criminal Code",
    shortName: "CC",
    title: "Submissions regarding sentence",
    summary: "Before determining the sentence to be imposed, the court shall ask whether the offender, if present, has anything to say.",
    relevance: "allocution, right to speak at sentencing, offender submissions",
    url: `${CC_BASE}/section-726.html`,
  }],
  ["730", {
    statute: "Criminal Code",
    shortName: "CC",
    title: "Absolute and conditional discharges",
    summary: "Where an accused, other than an organization, pleads guilty to or is found guilty of an offence, other than an offence for which a minimum punishment is prescribed by law or an offence punishable by imprisonment for fourteen years or for life, the court before which the accused appears may, if it considers it to be in the best interests of the accused and not contrary to the public interest, instead of convicting the accused, by order direct that the accused be discharged absolutely or on the conditions prescribed in a probation order made under subsection 731(2).",
    relevance: "discharge, conditional discharge, absolute discharge, no conviction, first offence",
    url: `${CC_BASE}/section-730.html`,
  }],
  ["731", {
    statute: "Criminal Code",
    shortName: "CC",
    title: "Probation",
    summary: "Where a person is convicted of an offence, a court may, having regard to the age and character of the offender, the nature of the offence and the circumstances surrounding its commission, (a) if no minimum punishment is prescribed by law, suspend the passing of sentence and direct that the offender be released on the conditions prescribed in a probation order; or (b) in addition to fining or sentencing the offender to imprisonment for a term not exceeding two years, direct that the offender comply with the conditions prescribed in a probation order.",
    relevance: "probation order, suspended sentence, community supervision, conditions",
    url: `${CC_BASE}/section-731.html`,
  }],
  ["732.1", {
    statute: "Criminal Code",
    shortName: "CC",
    title: "Probation order — conditions",
    summary: "The court shall prescribe, as conditions of a probation order, that the offender do all of the following: (a) keep the peace and be of good behaviour; (b) appear before the court when required to do so by the court; and (c) notify the court or the probation officer in advance of any change of name or address, and promptly notify the court or the probation officer of any change of employment or occupation.",
    relevance: "probation conditions, no-contact order, reporting to probation, good behaviour",
    url: `${CC_BASE}/section-732.1.html`,
  }],
  ["742.1", {
    statute: "Criminal Code",
    shortName: "CC",
    title: "Conditional sentence of imprisonment",
    summary: "If a person is convicted of an offence and the court imposes a sentence of imprisonment of less than two years, the court may, for the purpose of supervising the offender's behaviour in the community, order that the offender serve the sentence in the community, subject to the conditions imposed under section 742.3, if (a) the court is satisfied that the service of the sentence in the community would not endanger the safety of the community and would be consistent with the fundamental purpose and principles of sentencing set out in sections 718 to 718.2; (b) the offence is not an offence punishable by a minimum term of imprisonment; (c) the offence is not an offence under any of the following provisions: (i) section 239 (attempt to commit murder), (ii) section 269.1 (torture), or (iii) section 318 (advocating genocide); and (d) the offence is not a terrorism offence, or a criminal organization offence, prosecuted by way of indictment, for which the maximum term of imprisonment is 10 years or more.",
    relevance: "conditional sentence, house arrest, sentence served in community, two year less a day",
    url: `${CC_BASE}/section-742.1.html`,
  }],
]);

// ── Canada Evidence Act ───────────────────────────────────────────────────────
const EVIDENCE_SECTIONS = new Map([
  ["16", {
    statute: "Canada Evidence Act",
    shortName: "CEA",
    title: "Witness whose capacity is in question",
    summary: "If a proposed witness is a person of fourteen years of age or older whose mental capacity is challenged, the court shall, before permitting the person to give evidence, conduct an inquiry to determine (a) whether the person understands the nature of an oath or a solemn affirmation; and (b) whether the person is able to communicate the evidence.",
    relevance: "competency of witness, mental disability, understanding oath, ability to communicate",
    url: `${EVIDENCE_BASE}/section-16.html`,
  }],
  ["16.1", {
    statute: "Canada Evidence Act",
    shortName: "CEA",
    title: "Person under fourteen years of age",
    summary: "A person under fourteen years of age is presumed to have the capacity to testify. The evidence of a proposed witness under fourteen years of age shall be received if they are able to understand and respond to questions. For greater certainty, if the evidence of a witness under fourteen years of age is received by the court, it shall have the same effect as if it were taken under oath.",
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
    summary: "The principles that shall guide the Board and the provincial parole boards in achieving the purpose of conditional release are (a) that the Board take into consideration all relevant available information, including the stated reasons and recommendations of the sentencing judge and any other information from the trial or the sentencing hearing, and assessments provided by correctional authorities; (b) that the Board enhance its effectiveness and openness through the timely exchange of relevant information with victims, offenders and other components of the criminal justice system; (c) that the Board make the least restrictive determinations that are consistent with the protection of society; (d) that the Board adopt and be guided by appropriate policies and that the Board be provided with the training necessary to implement those policies; and (e) that offenders receive relevant information, reasons for decisions and access to the review of decisions in order to ensure a fair and understandable conditional release process.",
    relevance: "parole board principles, public protection, parole decision, risk assessment, least restrictive determination",
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
