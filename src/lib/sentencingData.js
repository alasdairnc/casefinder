// Criminal Code sentencing data
// Keys are base section numbers (strip subsection for lookup)

const sentencingData = {
  // === Offences Against the Person ===
  "265": {
    title: "Assault (General)",
    severity: "Hybrid",
    minPenalty: "None (summary)",
    maxPenalty: "5 years (indictable)",
    commonRange: "Conditional discharge – 18 months",
    notes: "Base assault provision. Covers intentional application of force without consent.",
  },
  "266": {
    title: "Assault",
    severity: "Hybrid",
    minPenalty: "None (summary conviction)",
    maxPenalty: "5 years (indictable)",
    commonRange: "Conditional discharge – 18 months",
    notes: "Most common assault charge for minor physical altercations without a weapon.",
  },
  "267": {
    title: "Assault with a Weapon or Causing Bodily Harm",
    severity: "Hybrid",
    minPenalty: "None (summary)",
    maxPenalty: "10 years (indictable)",
    commonRange: "6 months – 3 years",
    notes: "Applies when a weapon is used or bodily harm results. Bodily harm = interferes with health/comfort more than momentarily.",
  },
  "268": {
    title: "Aggravated Assault",
    severity: "Indictable",
    minPenalty: "None (but custody usual)",
    maxPenalty: "14 years",
    commonRange: "2 – 7 years",
    notes: "Requires wounding, maiming, disfiguring, or endangering life. Most serious level of assault.",
  },
  "269": {
    title: "Unlawfully Causing Bodily Harm",
    severity: "Hybrid",
    minPenalty: "None",
    maxPenalty: "10 years (indictable)",
    commonRange: "6 months – 2 years",
    notes: "Covers harm caused during commission of an unlawful act. No intent to harm required.",
  },
  "271": {
    title: "Sexual Assault",
    severity: "Hybrid",
    minPenalty: "None (summary) / 1 year mandatory minimum (indictable, if complainant under 16)",
    maxPenalty: "10 years (14 years if complainant under 16)",
    commonRange: "18 months – 4 years (custody)",
    notes: "Sexual touching without consent. Consent is central; age is an aggravating factor.",
  },
  "272": {
    title: "Sexual Assault with a Weapon",
    severity: "Indictable",
    minPenalty: "5 years mandatory minimum (complainant under 16)",
    maxPenalty: "14 years",
    commonRange: "4 – 10 years",
    notes: "Involves a weapon, threats, or bodily harm during sexual assault.",
  },
  "273": {
    title: "Aggravated Sexual Assault",
    severity: "Indictable",
    minPenalty: "4 years mandatory minimum",
    maxPenalty: "Life imprisonment",
    commonRange: "6 – 14 years",
    notes: "Wounds, maims, disfigures, or endangers life in commission of sexual assault.",
  },
  "264": {
    title: "Criminal Harassment",
    severity: "Hybrid",
    minPenalty: "None",
    maxPenalty: "10 years",
    commonRange: "Probation – 2 years",
    notes: "Stalking provision. Requires conduct that causes the victim to reasonably fear for their safety.",
  },
  "264.1": {
    title: "Uttering Threats",
    severity: "Hybrid",
    minPenalty: "None",
    maxPenalty: "5 years (threat to cause death/bodily harm) / 2 years (property/animals)",
    commonRange: "Probation – 18 months",
    notes: "Knowingly uttering a threat to cause death, bodily harm, or to destroy property.",
  },
  "279": {
    title: "Kidnapping / Forcible Confinement",
    severity: "Indictable",
    minPenalty: "None (confinement) / 4 years mandatory minimum (kidnapping with firearm)",
    maxPenalty: "Life (kidnapping) / 10 years (confinement)",
    commonRange: "18 months – 5 years",
    notes: "s. 279(1) = kidnapping; s. 279(2) = forcible confinement. Consent is a complete defence.",
  },
  "279.1": {
    title: "Hostage Taking",
    severity: "Indictable",
    minPenalty: "None",
    maxPenalty: "Life imprisonment",
    commonRange: "4 – 10 years",
    notes: "Confining a person to compel a third party to do something.",
  },
  "151": {
    title: "Sexual Interference",
    severity: "Hybrid",
    minPenalty: "90 days (summary) / 1 year (indictable) mandatory minimum",
    maxPenalty: "2 years (summary) / 14 years (indictable)",
    commonRange: "1 – 4 years",
    notes: "Sexual touching of a person under 16. One of the most serious child protection offences.",
  },
  "152": {
    title: "Invitation to Sexual Touching",
    severity: "Hybrid",
    minPenalty: "90 days (summary) / 1 year (indictable) mandatory minimum",
    maxPenalty: "2 years (summary) / 14 years (indictable)",
    commonRange: "1 – 3 years",
    notes: "Inviting a person under 16 to touch for a sexual purpose.",
  },
  "175": {
    title: "Causing a Disturbance",
    severity: "Summary",
    minPenalty: "None",
    maxPenalty: "2 years less a day",
    commonRange: "Fine – 90 days",
    notes: "Fighting, screaming, or conduct causing disturbance in a public place.",
  },
  "173": {
    title: "Indecent Acts",
    severity: "Hybrid",
    minPenalty: "None",
    maxPenalty: "2 years (indictable)",
    commonRange: "Fine – 6 months",
    notes: "Committing an indecent act in a public place or in view of others.",
  },
  "423": {
    title: "Intimidation",
    severity: "Hybrid",
    minPenalty: "None",
    maxPenalty: "5 years",
    commonRange: "Probation – 18 months",
    notes: "Using violence, threats, or other means to compel someone to do or refrain from doing something.",
  },

  // === Property Offences ===
  "322": {
    title: "Theft",
    severity: "Hybrid",
    minPenalty: "None",
    maxPenalty: "10 years (over $5,000 indictable) / 2 years less a day (under $5,000 summary)",
    commonRange: "Conditional discharge – 2 years",
    notes: "Taking property without consent, intending to deprive the owner permanently.",
  },
  "334": {
    title: "Punishment for Theft",
    severity: "Hybrid",
    minPenalty: "None",
    maxPenalty: "10 years (over $5,000) / 2 years less a day (under $5,000)",
    commonRange: "Conditional discharge – 18 months",
    notes: "Sentencing provision for theft. Amount determines maximum: over or under $5,000.",
  },
  "343": {
    title: "Robbery",
    severity: "Indictable",
    minPenalty: "4 years mandatory minimum (with firearm)",
    maxPenalty: "Life imprisonment",
    commonRange: "2 – 8 years",
    notes: "Theft combined with violence or threats. Among the most serious property offences.",
  },
  "344": {
    title: "Punishment for Robbery",
    severity: "Indictable",
    minPenalty: "4 years (with restricted/prohibited firearm)",
    maxPenalty: "Life imprisonment",
    commonRange: "2 – 8 years",
    notes: "Sentencing for robbery. Mandatory minimums apply when a firearm is involved.",
  },
  "348": {
    title: "Breaking and Entering",
    severity: "Indictable",
    minPenalty: "None (non-dwelling) / life maximum",
    maxPenalty: "Life (dwelling-house) / 10 years (other place)",
    commonRange: "18 months – 4 years",
    notes: "Breaking into a place to commit an indictable offence. Dwelling-house carries maximum life imprisonment.",
  },
  "349": {
    title: "Being Unlawfully in a Dwelling-House",
    severity: "Hybrid",
    minPenalty: "None",
    maxPenalty: "10 years",
    commonRange: "Probation – 18 months",
    notes: "Entering a home without permission, even if no other offence is committed.",
  },
  "380": {
    title: "Fraud",
    severity: "Hybrid",
    minPenalty: "None (under $5,000) / 2 years mandatory (over $1M)",
    maxPenalty: "14 years (over $5,000) / 2 years less a day (under $5,000)",
    commonRange: "Conditional discharge – 4 years",
    notes: "Dishonest act that causes actual or risk of deprivation. Amount and breach of trust are key aggravating factors.",
  },
  "430": {
    title: "Mischief",
    severity: "Hybrid",
    minPenalty: "None",
    maxPenalty: "10 years (indictable, over $5,000) / 2 years less a day (summary)",
    commonRange: "Fine – 18 months",
    notes: "Willfully destroying or damaging property. Amount of damage determines severity of prosecution.",
  },
  "433": {
    title: "Arson: Disregard for Human Life",
    severity: "Indictable",
    minPenalty: "None",
    maxPenalty: "Life imprisonment",
    commonRange: "4 – 10 years",
    notes: "Setting fire in circumstances that disregard human life, e.g., an occupied building.",
  },
  "434": {
    title: "Arson: Property Damage",
    severity: "Indictable",
    minPenalty: "None",
    maxPenalty: "14 years",
    commonRange: "2 – 5 years",
    notes: "Intentionally setting fire to property not wholly owned by the accused.",
  },
  "435": {
    title: "Arson for Fraudulent Purpose",
    severity: "Indictable",
    minPenalty: "None",
    maxPenalty: "10 years",
    commonRange: "18 months – 4 years",
    notes: "Setting fire to property (including own property) for insurance fraud purposes.",
  },
  "333.1": {
    title: "Motor Vehicle Theft",
    severity: "Hybrid",
    minPenalty: "None (first) / 6 months mandatory minimum (3rd+ offence)",
    maxPenalty: "10 years (indictable) / 18 months (summary)",
    commonRange: "Conditional discharge – 2 years",
    notes: "Stealing a motor vehicle. Repeat offences carry mandatory minimum sentences.",
  },

  // === Impaired Driving ===
  "320.14": {
    title: "Operation While Impaired",
    severity: "Hybrid",
    minPenalty: "$1,000 fine (first) / 30 days (second) / 120 days (third+)",
    maxPenalty: "10 years (impaired causing bodily harm) / Life (causing death)",
    commonRange: "Fine – 18 months (impaired only); 1 – 3 years (causing harm)",
    notes: "Includes impaired by alcohol, drugs, or combination. BAC ≥ 80mg per 100mL creates a presumption.",
  },
  "320.15": {
    title: "Failure to Comply with Demand",
    severity: "Hybrid",
    minPenalty: "$2,000 fine mandatory",
    maxPenalty: "10 years",
    commonRange: "Fine – 6 months",
    notes: "Refusing a breath/blood/drug test demand. Treated similarly to impaired driving.",
  },
  "320.16": {
    title: "Failure to Stop at Scene of Accident",
    severity: "Indictable",
    minPenalty: "None",
    maxPenalty: "Life (if person dies) / 10 years (bodily harm) / 5 years (other)",
    commonRange: "6 months – 3 years",
    notes: "Hit and run. Severity depends on injuries caused. Flight is a significant aggravating factor.",
  },
};

/**
 * Look up sentencing info for a Criminal Code section string.
 * Tries exact match first (after stripping "s. "), then base section (strip subsection).
 * @param {string} section  e.g. "s. 267(b)" or "s. 348(1)(a)"
 * @returns {object|null}
 */
export function getSentencing(section) {
  if (!section) return null;

  // Strip leading "s." / "s. " and whitespace
  const clean = section.replace(/^s\.\s*/i, "").trim();

  // Try exact key
  if (sentencingData[clean]) return sentencingData[clean];

  // Try base section (strip parenthetical subsections like (1)(b))
  const base = clean.replace(/\(.*$/, "").trim();
  if (sentencingData[base]) return sentencingData[base];

  return null;
}

export default sentencingData;
