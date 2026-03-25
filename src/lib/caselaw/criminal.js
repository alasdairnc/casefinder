export const criminalCases = [
  // ── CHARTER: SECTION 11(b) (DELAY) ─────────────────────────
  {
    citation: "2016 SCC 27",
    title: "R. v. Jordan",
    year: 2016,
    court: "SCC",
    topics: ["Charter", "s. 11(b)", "Trial Delay", "Stay of Proceedings"],
    tags: ["unreasonable delay", "time limits", "ceilings", "institutional delay", "11b", "jordan"],
    facts: "The accused was charged with drug offences. The delay between the charges and the end of the trial was 49.5 months, well beyond historical norms.",
    ratio: "Establishes a hard ceiling beyond which delay is presumptively unreasonable: 18 months for provincial courts without a preliminary inquiry, and 30 months for superior courts or cases with a preliminary inquiry. Exceeding the ceiling mandates a stay of proceedings absent exceptional circumstances."
  },

  // ── CHARTER: SECTION 24(2) (EXCLUSION OF EVIDENCE) ────────
  {
    citation: "2009 SCC 32",
    title: "R. v. Grant",
    year: 2009,
    court: "SCC",
    topics: ["Charter", "s. 24(2)", "s. 9", "Arbitrary Detention", "Exclusion of Evidence"],
    tags: ["admissibility", "grant test", "charter breach", "detention", "firearm", "police conduct"],
    facts: "A young Black man was stopped by three police officers while walking down the street. The Supreme Court found he was psychologically detained without reasonable suspicion, leading to the discovery of a firearm.",
    ratio: "Establishes the three-part 'Grant test' for excluding evidence under s. 24(2): (1) the seriousness of the Charter-infringing state conduct, (2) the impact of the breach on the Charter-protected interests of the accused, and (3) society's interest in the adjudication of the case on its merits."
  },

  // ── CHARTER: SECTION 8 (SEARCH & SEIZURE) ─────────────────
  {
    citation: "2017 SCC 59",
    title: "R. v. Marakah",
    year: 2017,
    court: "SCC",
    topics: ["Charter", "s. 8", "Search and Seizure", "Privacy"],
    tags: ["text messages", "cell phones", "electronic evidence", "reasonable expectation of privacy"],
    facts: "Police seized the accused's cell phone and his accomplice's cell phone, finding incriminating text messages relating to firearms trafficking. The accused challenged the search of the text messages found on the accomplice's phone.",
    ratio: "An accused can have a reasonable expectation of privacy in text messages sent to and found on another person's seized phone, depending on the totality of circumstances. The sender implicitly retains a privacy interest in the electronic conversation."
  },
  {
    citation: "2013 SCC 60",
    title: "R. v. Vu",
    year: 2013,
    court: "SCC",
    topics: ["Charter", "s. 8", "Search and Seizure", "Computers"],
    tags: ["warrant", "computer search", "electronic devices", "privacy"],
    facts: "Police obtained a warrant to search a residence for theft of electricity but the warrant did not specifically authorize the search of computers. Police found a computer and searched it, discovering evidence of marijuana production.",
    ratio: "A warrant authorizing the search of a place does not implicitly authorize the search of computers or cell phones found within that place. Specific prior authorization is required to search personal electronic devices due to their uniquely high privacy interests."
  },

  // ── SEXUAL ASSAULT & CONSENT ──────────────────────────────
  {
    citation: "1999 SCC 3",
    title: "R. v. Ewanchuk",
    year: 1999,
    court: "SCC",
    topics: ["Sexual Assault", "Consent", "Mens Rea"],
    tags: ["implied consent", "sexual assault", "myth", "affirmative consent", "rape"],
    facts: "The accused sexually assaulted a complainant who came to his trailer for a job interview. He argued she 'impliedly consented' by not physically resisting his advances.",
    ratio: "There is no defence of 'implied consent' to sexual assault in Canadian law. Consent must be given affirmatively. The trier of fact must determine whether the complainant subjectively consented in her mind. Furthermore, the accused's belief in consent must be based on reasonable steps."
  },
  {
    citation: "2011 SCC 28",
    title: "R. v. J.A.",
    year: 2011,
    court: "SCC",
    topics: ["Sexual Assault", "Consent", "Incapacity"],
    tags: ["unconscious", "choking", "prior agreement", "revocation of consent"],
    facts: "The accused and his partner agreed that he would choke her to the point of unconsciousness and then perform sexual acts on her while she was passed out.",
    ratio: "An individual cannot legally consent in advance to sexual activity that occurs while they are unconscious. Under s. 273.1 of the Criminal Code, consent requires a conscious, operating mind capable of revoking the consent at any time during the sexual activity."
  },
  {
    citation: "2019 SCC 33",
    title: "R. v. Barton",
    year: 2019,
    court: "SCC",
    topics: ["Sexual Assault", "Murder", "Evidence"],
    tags: ["rape shield", "indigenous victim", "prejudice", "prior sexual history", "s. 276"],
    facts: "An Indigenous woman was found dead in a motel room. The accused claimed her death was the result of an accidental injury during consensual sexual activity. The trial was characterized by prejudiced stereotyping regarding the victim's sex work.",
    ratio: "Evidence of a complainant's sexual history (including sex work) is strictly governed by the s. 276 rape shield provisions. Judges must explicitly instruct juries to dispel myths and stereotypes regarding Indigenous women and sex workers to ensure a fair trial."
  },

  // ── SENTENCING & GLADUE RIGHTS ────────────────────────────
  {
    citation: "1999 SCC 20",
    title: "R. v. Gladue",
    year: 1999,
    court: "SCC",
    topics: ["Sentencing", "Indigenous Offenders", "s. 718.2(e)"],
    tags: ["gladue report", "aboriginal", "incarceration principles", "restorative justice"],
    facts: "An Indigenous woman fatally stabbed her common-law husband. During sentencing, the judge failed to consider her Indigenous background as a mitigating factor under s. 718.2(e).",
    ratio: "Section 718.2(e) requires sentencing judges to consider the unique systemic and background factors affecting Indigenous offenders, and to explicitly consider all available sanctions other than imprisonment that are reasonable under the circumstances."
  },
  {
    citation: "2012 SCC 13",
    title: "R. v. Ipeelee",
    year: 2012,
    court: "SCC",
    topics: ["Sentencing", "Indigenous Offenders", "Long-Term Offenders"],
    tags: ["gladue analysis", "aboriginal", "breach of condition"],
    facts: "Involved two Indigenous offenders who breached long-term supervision orders. The lower courts failed to appropriately apply Gladue principles.",
    ratio: "Reaffirms and forcefully expands R. v. Gladue. Gladue principles apply to all Indigenous offenders in every sentencing context (including breaches of long-term orders). Courts must take judicial notice of the systemic factors affecting Indigenous peoples, such as the legacy of colonialism and residential schools."
  },

  // ── IMPAIRED DRIVING & BREATHALYZERS ──────────────────────
  {
    citation: "2005 SCC 42",
    title: "R. v. Woods",
    year: 2005,
    court: "SCC",
    topics: ["Impaired Driving", "Charter", "s. 10(b)"],
    tags: ["right to counsel", "breathalyzer", " roadside screening", "ASD"],
    facts: "The accused was stopped at a roadside checkpoint. The officer demanded a breath sample without first informing the accused of his right to counsel under s. 10(b) of the Charter.",
    ratio: "While roadside screening demands (ASD) implicitly limit the right to counsel, the limit is justified under s. 1 of the Charter. However, if police delay the breath test significantly, the justification evaporates and the accused must be provided their s. 10(b) rights."
  },
  {
    citation: "2012 SCC 57",
    title: "R. v. St-Onge Lamoureux",
    year: 2012,
    court: "SCC",
    topics: ["Impaired Driving", "Evidence", "Over 80"],
    tags: ["breathalyzer accuracy", "presumption", "Carter defence", "evidence to the contrary"],
    facts: "Parliament severely restricted the 'evidence to the contrary' defence (the Carter defence) for impaired driving, making it exceptionally difficult to challenge breathalyzer results.",
    ratio: "Upheld most legislative limits restricting challenges to breathalyzer accuracy, reaffirming that the state's interest in preventing drunk driving justifies stringent evidentiary presumptions against the accused, provided the machine is properly maintained and operated."
  },

  // ── DISCLOSURE & EVIDENCE ─────────────────────────────────
  {
    citation: "1991 SCC 93",
    title: "R. v. Stinchcombe",
    year: 1991,
    court: "SCC",
    topics: ["Disclosure", "Charter", "s. 7", "Fair Trial"],
    tags: ["crown obligation", "withholding evidence", "witness statements"],
    facts: "The Crown prosecutor withheld statements given by a key witness from the defence, believing they were not relevant or trustworthy.",
    ratio: "The Crown has a constitutional obligation under s. 7 of the Charter to disclose all relevant information to the defence, whether exculpatory or inculpatory. Withholding evidence violates the right to make full answer and defence."
  },

  // ── THE OAKES TEST (CHARTER JUSTIFICATION) ────────────────
  {
    citation: "1986 SCC 8",
    title: "R. v. Oakes",
    year: 1986,
    court: "SCC",
    topics: ["Charter", "s. 1", "s. 11(d)", "Presumption of Innocence"],
    tags: ["oakes test", "justification", "proportionality", "narcotics", "reverse onus"],
    facts: "The accused was found with narcotics. A provision in the law required him to prove he was not trafficking, reversing the presumption of innocence under s. 11(d).",
    ratio: "Establishes the 'Oakes test' for justifying Charter infringements under Section 1: The law must have a pressing and substantial objective, and the means must be proportional (rationally connected, minimally impairing, and balancing salutary/deleterious effects). The reverse onus provision failed the minimal impairment test."
  },
  // ── CRIMINAL LIABILITY & FAULT ────────────────────────────
  {
    citation: "1978 SCC 23",
    title: "R. v. Sault Ste. Marie (City)",
    year: 1978,
    court: "SCC",
    topics: ["Criminal Law", "Mens Rea", "Strict Liability"],
    tags: ["regulatory offences", "absolute liability", "due diligence defence"],
    facts: "The city was charged with pollution after waste leaked into a creek. The case centered on what level of mental fault is required for regulatory vs criminal offences.",
    ratio: "Created three categories of offences: (1) Mens rea offences (require proof of intent), (2) Strict liability (the Crown doesn't need to prove intent, but the accused can avoid conviction by proving they exercised 'due diligence'), and (3) Absolute liability (no fault required)."
  },
  // ── SECTION 7 & FUNDAMENTAL JUSTICE ───────────────────────
  {
    citation: "1985 SCC 31",
    title: "Re B.C. Motor Vehicle Act",
    year: 1985,
    court: "SCC",
    topics: ["Charter", "s. 7", "Principles of Fundamental Justice"],
    tags: ["substantive justice", "absolute liability jail", "mens rea"],
    facts: "The BC government created an absolute liability offence for driving while prohibited, which mandated a minimum jail term even if the driver didn't know they were prohibited.",
    ratio: "Ruled that the 'Principles of Fundamental Justice' in Section 7 are not just procedural but substantive. It is unconstitutional to send someone to jail for an absolute liability offence that requires no mental element (mens rea)."
  },
  {
    citation: "2013 SCC 72",
    title: "Canada (AG) v. Bedford",
    year: 2013,
    court: "SCC",
    topics: ["Charter", "s. 7", "Prostitution"],
    tags: ["sex work", "safety", "overbreadth", "grossly disproportionate"],
    facts: "Sex workers challenged three provisions of the Criminal Code (keeping a bawdy house, living on the avails, and communicating in public) arguing they made their work dangerous.",
    ratio: "Struck down Canada's prostitution laws. The laws were found to be arbitrary, overbroad, or grossly disproportionate because they prevented sex workers from taking safety measures (like working indoors or hiring security), violating their Section 7 right to security of the person."
  },
  // ── SECTION 8: WARRANTS & PRIVACY ─────────────────────────
  {
    citation: "1984 SCC 14",
    title: "Hunter v. Southam Inc.",
    year: 1984,
    court: "SCC",
    topics: ["Charter", "s. 8", "Search and Seizure"],
    tags: ["reasonable expectation of privacy", "warrant requirement", "prior authorization"],
    facts: "Combines investigators searched the offices of Southam Inc. under a broad administrative statute without a neutral warrant.",
    ratio: "The seminal s. 8 case. Established that the purpose of Section 8 is to protect reasonable expectations of privacy. Ruled that 'prior authorization' (a warrant from a neutral and impartial arbiter) is generally required for a search to be reasonable."
  },
  {
    citation: "2004 SCC 67",
    title: "R. v. Tessling",
    year: 2004,
    court: "SCC",
    topics: ["Charter", "s. 8", "Search and Seizure", "Privacy"],
    tags: ["flir", "infrared", "heat sensing", "marijuana grow op"],
    facts: "Police flew a plane over the accused's house using Forward Looking Infra-Red (FLIR) technology to detect heat patterns consistent with a marijuana grow op.",
    ratio: "At the time, the court ruled that heat patterns escaping a home are 'waste heat' and do not reveal intimate details of private life; therefore, FLIR usage did not violate a reasonable expectation of privacy under s. 8."
  },
  // ── EXCLUSION OF EVIDENCE (PRE-GRANT) ─────────────────────
  {
    citation: "1997 SCC 48",
    title: "R. v. Stillman",
    year: 1997,
    court: "SCC",
    topics: ["Charter", "s. 24(2)", "Exclusion of Evidence"],
    tags: ["conscriptive evidence", "bodily samples", "trial fairness"],
    facts: "Police forcibly took hair samples and teeth impressions from a youth suspect without a warrant or consent.",
    ratio: "Established the pre-2009 framework for evidence exclusion. Classified evidence as either 'conscriptive' (compelled from the accused) or 'non-conscriptive'. Conscriptive evidence was almost always excluded as it was seen as fundamentally unfair to the trial process."
  },
  // ── EXTRADITION & SECTION 12 ──────────────────────────────
  {
    citation: "2001 SCC 7",
    title: "United States v. Burns",
    year: 2001,
    court: "SCC",
    topics: ["Charter", "s. 7", "s. 12", "Extradition"],
    tags: ["death penalty", "assurances", "extradition to us"],
    facts: "The Canadian government sought to extradite two individuals to Washington State to face murder charges without seeking assurances that the death penalty would not be applied.",
    ratio: "Ruled that extraditing someone to a country where they face the death penalty without assurances violates the Charter (specifically s. 7 and the evolving standards of s. 12 regarding cruel and unusual punishment)."
  },
  {
    citation: "2022 SCC 19",
    title: "R. v. Bissonnette",
    year: 2022,
    court: "SCC",
    topics: ["Charter", "s. 12", "Sentencing"],
    tags: ["life without parole", "consecutive sentences", "cruel and unusual punishment", "quebec mosque shooting"],
    facts: "The shooter in the Quebec City mosque shooting was sentenced to multiple consecutive 25-year blocks, effectively resulting in life without the possibility of parole for 40+ years.",
    ratio: "Consecutive life sentences that result in life without the realistic possibility of parole are 'cruel and unusual punishment' and violate s. 12 of the Charter. Such sentences deny the possibility of personal rehabilitation and human dignity."
  }
];
