// Maps Criminal Code sections to related charges
// relationType: "simpler" | "harsher" | "variant"

const chargeRelations = {
  "265": {
    title: "Assault (General)",
    related: [
      { section: "s. 266", title: "Assault", relationType: "simpler" },
      { section: "s. 267", title: "Assault with Weapon / Causing Bodily Harm", relationType: "harsher" },
      { section: "s. 268", title: "Aggravated Assault", relationType: "harsher" },
      { section: "s. 264.1", title: "Uttering Threats", relationType: "variant" },
    ],
  },
  "266": {
    title: "Assault",
    related: [
      { section: "s. 267", title: "Assault with Weapon / Causing Bodily Harm", relationType: "harsher" },
      { section: "s. 268", title: "Aggravated Assault", relationType: "harsher" },
      { section: "s. 265", title: "Assault (General)", relationType: "variant" },
      { section: "s. 264.1", title: "Uttering Threats", relationType: "simpler" },
    ],
  },
  "267": {
    title: "Assault with Weapon / Causing Bodily Harm",
    related: [
      { section: "s. 266", title: "Assault", relationType: "simpler" },
      { section: "s. 268", title: "Aggravated Assault", relationType: "harsher" },
      { section: "s. 269", title: "Unlawfully Causing Bodily Harm", relationType: "variant" },
    ],
  },
  "268": {
    title: "Aggravated Assault",
    related: [
      { section: "s. 267", title: "Assault with Weapon / Causing Bodily Harm", relationType: "simpler" },
      { section: "s. 266", title: "Assault", relationType: "simpler" },
      { section: "s. 239", title: "Attempt Murder", relationType: "harsher" },
    ],
  },
  "269": {
    title: "Unlawfully Causing Bodily Harm",
    related: [
      { section: "s. 267", title: "Assault with Weapon / Causing Bodily Harm", relationType: "variant" },
      { section: "s. 268", title: "Aggravated Assault", relationType: "harsher" },
      { section: "s. 430", title: "Mischief", relationType: "simpler" },
    ],
  },
  "271": {
    title: "Sexual Assault",
    related: [
      { section: "s. 272", title: "Sexual Assault with a Weapon", relationType: "harsher" },
      { section: "s. 273", title: "Aggravated Sexual Assault", relationType: "harsher" },
      { section: "s. 266", title: "Assault", relationType: "simpler" },
    ],
  },
  "272": {
    title: "Sexual Assault with a Weapon",
    related: [
      { section: "s. 271", title: "Sexual Assault", relationType: "simpler" },
      { section: "s. 273", title: "Aggravated Sexual Assault", relationType: "harsher" },
    ],
  },
  "273": {
    title: "Aggravated Sexual Assault",
    related: [
      { section: "s. 272", title: "Sexual Assault with a Weapon", relationType: "simpler" },
      { section: "s. 271", title: "Sexual Assault", relationType: "simpler" },
    ],
  },
  "264": {
    title: "Criminal Harassment",
    related: [
      { section: "s. 264.1", title: "Uttering Threats", relationType: "variant" },
      { section: "s. 423", title: "Intimidation", relationType: "variant" },
      { section: "s. 266", title: "Assault", relationType: "harsher" },
    ],
  },
  "264.1": {
    title: "Uttering Threats",
    related: [
      { section: "s. 264", title: "Criminal Harassment", relationType: "harsher" },
      { section: "s. 423", title: "Intimidation", relationType: "variant" },
      { section: "s. 266", title: "Assault", relationType: "harsher" },
    ],
  },
  "279": {
    title: "Kidnapping / Forcible Confinement",
    related: [
      { section: "s. 279.1", title: "Hostage Taking", relationType: "harsher" },
      { section: "s. 264", title: "Criminal Harassment", relationType: "simpler" },
      { section: "s. 423", title: "Intimidation", relationType: "simpler" },
    ],
  },
  "279.1": {
    title: "Hostage Taking",
    related: [
      { section: "s. 279", title: "Kidnapping / Forcible Confinement", relationType: "simpler" },
      { section: "s. 343", title: "Robbery", relationType: "variant" },
    ],
  },
  "151": {
    title: "Sexual Interference",
    related: [
      { section: "s. 152", title: "Invitation to Sexual Touching", relationType: "variant" },
      { section: "s. 271", title: "Sexual Assault", relationType: "variant" },
      { section: "s. 273.3", title: "Removal of Child from Canada", relationType: "variant" },
    ],
  },
  "152": {
    title: "Invitation to Sexual Touching",
    related: [
      { section: "s. 151", title: "Sexual Interference", relationType: "variant" },
      { section: "s. 271", title: "Sexual Assault", relationType: "harsher" },
    ],
  },
  "322": {
    title: "Theft",
    related: [
      { section: "s. 334", title: "Punishment for Theft", relationType: "variant" },
      { section: "s. 343", title: "Robbery", relationType: "harsher" },
      { section: "s. 380", title: "Fraud", relationType: "variant" },
      { section: "s. 348", title: "Breaking and Entering", relationType: "variant" },
    ],
  },
  "334": {
    title: "Punishment for Theft",
    related: [
      { section: "s. 322", title: "Theft", relationType: "variant" },
      { section: "s. 343", title: "Robbery", relationType: "harsher" },
      { section: "s. 333.1", title: "Motor Vehicle Theft", relationType: "variant" },
    ],
  },
  "343": {
    title: "Robbery",
    related: [
      { section: "s. 322", title: "Theft", relationType: "simpler" },
      { section: "s. 266", title: "Assault", relationType: "simpler" },
      { section: "s. 279", title: "Forcible Confinement", relationType: "variant" },
      { section: "s. 267", title: "Assault with Weapon", relationType: "variant" },
    ],
  },
  "344": {
    title: "Punishment for Robbery",
    related: [
      { section: "s. 343", title: "Robbery", relationType: "variant" },
      { section: "s. 334", title: "Punishment for Theft", relationType: "simpler" },
    ],
  },
  "348": {
    title: "Breaking and Entering",
    related: [
      { section: "s. 349", title: "Being Unlawfully in a Dwelling-House", relationType: "simpler" },
      { section: "s. 322", title: "Theft", relationType: "variant" },
      { section: "s. 343", title: "Robbery", relationType: "harsher" },
    ],
  },
  "349": {
    title: "Being Unlawfully in a Dwelling-House",
    related: [
      { section: "s. 348", title: "Breaking and Entering", relationType: "harsher" },
      { section: "s. 430", title: "Mischief", relationType: "variant" },
    ],
  },
  "380": {
    title: "Fraud",
    related: [
      { section: "s. 322", title: "Theft", relationType: "variant" },
      { section: "s. 362", title: "Obtaining Credit by False Pretences", relationType: "simpler" },
      { section: "s. 366", title: "Forgery", relationType: "variant" },
    ],
  },
  "430": {
    title: "Mischief",
    related: [
      { section: "s. 433", title: "Arson: Disregard for Human Life", relationType: "harsher" },
      { section: "s. 434", title: "Arson: Property Damage", relationType: "harsher" },
      { section: "s. 269", title: "Unlawfully Causing Bodily Harm", relationType: "harsher" },
    ],
  },
  "433": {
    title: "Arson: Disregard for Human Life",
    related: [
      { section: "s. 434", title: "Arson: Property Damage", relationType: "simpler" },
      { section: "s. 435", title: "Arson for Fraudulent Purpose", relationType: "simpler" },
      { section: "s. 430", title: "Mischief", relationType: "simpler" },
    ],
  },
  "434": {
    title: "Arson: Property Damage",
    related: [
      { section: "s. 433", title: "Arson: Disregard for Human Life", relationType: "harsher" },
      { section: "s. 435", title: "Arson for Fraudulent Purpose", relationType: "variant" },
      { section: "s. 430", title: "Mischief", relationType: "simpler" },
    ],
  },
  "435": {
    title: "Arson for Fraudulent Purpose",
    related: [
      { section: "s. 433", title: "Arson: Disregard for Human Life", relationType: "harsher" },
      { section: "s. 434", title: "Arson: Property Damage", relationType: "variant" },
      { section: "s. 380", title: "Fraud", relationType: "variant" },
    ],
  },
  "333.1": {
    title: "Motor Vehicle Theft",
    related: [
      { section: "s. 322", title: "Theft", relationType: "variant" },
      { section: "s. 343", title: "Robbery", relationType: "harsher" },
    ],
  },
  "320.14": {
    title: "Operation While Impaired",
    related: [
      { section: "s. 320.15", title: "Failure to Comply with Demand", relationType: "variant" },
      { section: "s. 320.16", title: "Failure to Stop at Scene of Accident", relationType: "variant" },
      { section: "s. 249", title: "Dangerous Operation of a Motor Vehicle", relationType: "harsher" },
    ],
  },
  "320.15": {
    title: "Failure to Comply with Demand",
    related: [
      { section: "s. 320.14", title: "Operation While Impaired", relationType: "variant" },
    ],
  },
  "320.16": {
    title: "Failure to Stop at Scene of Accident",
    related: [
      { section: "s. 320.14", title: "Operation While Impaired", relationType: "variant" },
      { section: "s. 249", title: "Dangerous Operation of a Motor Vehicle", relationType: "simpler" },
    ],
  },
  "423": {
    title: "Intimidation",
    related: [
      { section: "s. 264.1", title: "Uttering Threats", relationType: "variant" },
      { section: "s. 264", title: "Criminal Harassment", relationType: "variant" },
      { section: "s. 346", title: "Extortion", relationType: "harsher" },
    ],
  },
  "175": {
    title: "Causing a Disturbance",
    related: [
      { section: "s. 173", title: "Indecent Acts", relationType: "variant" },
      { section: "s. 266", title: "Assault", relationType: "harsher" },
    ],
  },
};

/**
 * Get related charges for a Criminal Code section.
 * @param {string} section  e.g. "s. 267(b)"
 * @returns {{ title: string, related: Array }|null}
 */
export function getRelatedCharges(section) {
  if (!section) return null;

  const clean = section.replace(/^s\.\s*/i, "").trim();
  if (chargeRelations[clean]) return chargeRelations[clean];

  const base = clean.replace(/\(.*$/, "").trim();
  if (chargeRelations[base]) return chargeRelations[base];

  return null;
}

export default chargeRelations;
