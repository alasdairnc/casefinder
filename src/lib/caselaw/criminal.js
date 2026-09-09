export const criminalCases = [
  // ── CHARTER: SECTION 11(b) (DELAY) ─────────────────────────
  {
    citation: "2016 SCC 27",
    title: "R. v. Jordan",
    year: 2016,
    court: "SCC",
    topics: ["Charter", "s. 11(b)", "Trial Delay", "Stay of Proceedings"],
    tags: [
      "unreasonable delay",
      "time limits",
      "ceilings",
      "institutional delay",
      "11b",
      "jordan",
    ],
    facts:
      "The accused was charged with drug offences. The delay between the charges and the end of the trial was 49.5 months, well beyond historical norms.",
    ratio:
      "Establishes a hard ceiling beyond which delay is presumptively unreasonable: 18 months for provincial courts without a preliminary inquiry, and 30 months for superior courts or cases with a preliminary inquiry. Exceeding the ceiling mandates a stay of proceedings absent exceptional circumstances.",
  },

  // ── CHARTER: SECTION 24(2) (EXCLUSION OF EVIDENCE) ────────
  {
    citation: "2009 SCC 32",
    title: "R. v. Grant",
    year: 2009,
    court: "SCC",
    topics: [
      "Charter",
      "s. 24(2)",
      "s. 9",
      "Arbitrary Detention",
      "Exclusion of Evidence",
    ],
    tags: [
      "admissibility",
      "grant test",
      "charter breach",
      "detention",
      "firearm",
      "police conduct",
    ],
    facts:
      "A young Black man was stopped by three police officers while walking down the street. The Supreme Court found he was psychologically detained without reasonable suspicion, leading to the discovery of a firearm.",
    ratio:
      "Establishes the three-part 'Grant test' for excluding evidence under s. 24(2): (1) the seriousness of the Charter-infringing state conduct, (2) the impact of the breach on the Charter-protected interests of the accused, and (3) society's interest in the adjudication of the case on its merits.",
  },
  {
    citation: "2004 SCC 52",
    title: "R. v. Mann",
    year: 2004,
    court: "SCC",
    topics: [
      "Charter",
      "s. 9",
      "Investigative Detention",
      "Search and Seizure",
    ],
    tags: [
      "investigative detention",
      "reasonable suspicion",
      "pat down",
      "s. 9",
      "s. 8",
    ],
    facts:
      "Police detained a suspect for investigation and conducted a protective pat-down search, finding evidence linked to a break and enter.",
    ratio:
      "Recognizes a limited common-law power of investigative detention based on reasonable suspicion, with a narrowly tailored protective search for officer safety where justified.",
  },
  {
    citation: "2009 SCC 33",
    title: "R. v. Suberu",
    year: 2009,
    court: "SCC",
    topics: ["Charter", "s. 10(b)", "Right to Counsel", "Detention"],
    tags: ["right to counsel", "immediate advice", "detention", "s. 10(b)"],
    facts:
      "Police stopped and detained the accused during a fraud investigation and delayed providing Charter right-to-counsel advice.",
    ratio:
      "Section 10(b) rights are triggered immediately on detention, and police must provide access to counsel without delay subject only to narrow operational safety limits.",
  },

  // ── CHARTER: SECTION 8 (SEARCH & SEIZURE) ─────────────────
  {
    citation: "2017 SCC 59",
    title: "R. v. Marakah",
    year: 2017,
    court: "SCC",
    topics: ["Charter", "s. 8", "Search and Seizure", "Privacy"],
    tags: [
      "text messages",
      "cell phones",
      "electronic evidence",
      "reasonable expectation of privacy",
    ],
    facts:
      "Police seized the accused's cell phone and his accomplice's cell phone, finding incriminating text messages relating to firearms trafficking. The accused challenged the search of the text messages found on the accomplice's phone.",
    ratio:
      "An accused can have a reasonable expectation of privacy in text messages sent to and found on another person's seized phone, depending on the totality of circumstances. The sender implicitly retains a privacy interest in the electronic conversation.",
  },
  {
    citation: "2013 SCC 60",
    title: "R. v. Vu",
    year: 2013,
    court: "SCC",
    topics: ["Charter", "s. 8", "Search and Seizure", "Computers"],
    tags: ["warrant", "computer search", "electronic devices", "privacy"],
    facts:
      "Police obtained a warrant to search a residence for theft of electricity but the warrant did not specifically authorize the search of computers. Police found a computer and searched it, discovering evidence of marijuana production.",
    ratio:
      "A warrant authorizing the search of a place does not implicitly authorize the search of computers or cell phones found within that place. Specific prior authorization is required to search personal electronic devices due to their uniquely high privacy interests.",
  },

  // ── SEXUAL ASSAULT & CONSENT ──────────────────────────────
  {
    citation: "[1999] 1 SCR 330",
    title: "R. v. Ewanchuk",
    year: 1999,
    court: "SCC",
    topics: ["Sexual Assault", "Consent", "Mens Rea"],
    tags: [
      "implied consent",
      "sexual assault",
      "myth",
      "affirmative consent",
      "rape",
    ],
    facts:
      "The accused sexually assaulted a complainant who came to his trailer for a job interview. He argued she 'impliedly consented' by not physically resisting his advances.",
    ratio:
      "There is no defence of 'implied consent' to sexual assault in Canadian law. Consent must be given affirmatively. The trier of fact must determine whether the complainant subjectively consented in her mind. Furthermore, the accused's belief in consent must be based on reasonable steps.",
  },
  {
    citation: "2011 SCC 28",
    title: "R. v. J.A.",
    year: 2011,
    court: "SCC",
    topics: ["Sexual Assault", "Consent", "Incapacity"],
    tags: [
      "unconscious",
      "choking",
      "prior agreement",
      "revocation of consent",
    ],
    facts:
      "The accused and his partner agreed that he would choke her to the point of unconsciousness and then perform sexual acts on her while she was passed out.",
    ratio:
      "An individual cannot legally consent in advance to sexual activity that occurs while they are unconscious. Under s. 273.1 of the Criminal Code, consent requires a conscious, operating mind capable of revoking the consent at any time during the sexual activity.",
  },
  {
    citation: "2019 SCC 33",
    title: "R. v. Barton",
    year: 2019,
    court: "SCC",
    topics: ["Sexual Assault", "Murder", "Evidence"],
    tags: [
      "rape shield",
      "indigenous victim",
      "prejudice",
      "prior sexual history",
      "s. 276",
    ],
    facts:
      "An Indigenous woman was found dead in a motel room. The accused claimed her death was the result of an accidental injury during consensual sexual activity. The trial was characterized by prejudiced stereotyping regarding the victim's sex work.",
    ratio:
      "Evidence of a complainant's sexual history (including sex work) is strictly governed by the s. 276 rape shield provisions. Judges must explicitly instruct juries to dispel myths and stereotypes regarding Indigenous women and sex workers to ensure a fair trial.",
  },
  {
    citation: "[1991] 2 SCR 714",
    title: "R. v. Jobidon",
    year: 1991,
    court: "SCC",
    topics: ["Assault", "Consent", "Bodily Harm"],
    tags: ["assault", "consent to fight", "bodily harm", "public policy"],
    facts:
      "The accused participated in a consensual fistfight that resulted in serious bodily harm to the other participant.",
    ratio:
      "As a matter of public policy, there is generally no valid consent defence to assaults causing serious hurt in street-fight contexts, especially where bodily harm is intended or likely.",
  },
  {
    citation: "2021 SCC 37",
    title: "R. v. Khill",
    year: 2021,
    court: "SCC",
    topics: ["Assault", "Self-Defence", "Reasonableness"],
    tags: ["self-defence", "reasonableness", "proportionality", "use of force"],
    facts:
      "The accused shot and killed a person he believed was stealing from his truck in his driveway, raising self-defence.",
    ratio:
      "Self-defence under s. 34 requires a contextual reasonableness assessment of the accused's perception of threat and proportionality of the force used.",
  },

  // ── SENTENCING & GLADUE RIGHTS ────────────────────────────
  {
    citation: "[1999] 1 SCR 688",
    title: "R. v. Gladue",
    year: 1999,
    court: "SCC",
    topics: ["Sentencing", "Indigenous Offenders", "s. 718.2(e)"],
    tags: [
      "gladue report",
      "aboriginal",
      "incarceration principles",
      "restorative justice",
    ],
    facts:
      "An Indigenous woman fatally stabbed her common-law husband. During sentencing, the judge failed to consider her Indigenous background as a mitigating factor under s. 718.2(e).",
    ratio:
      "Section 718.2(e) requires sentencing judges to consider the unique systemic and background factors affecting Indigenous offenders, and to explicitly consider all available sanctions other than imprisonment that are reasonable under the circumstances.",
  },
  {
    citation: "2012 SCC 13",
    title: "R. v. Ipeelee",
    year: 2012,
    court: "SCC",
    topics: ["Sentencing", "Indigenous Offenders", "Long-Term Offenders"],
    tags: ["gladue analysis", "aboriginal", "breach of condition"],
    facts:
      "Involved two Indigenous offenders who breached long-term supervision orders. The lower courts failed to appropriately apply Gladue principles.",
    ratio:
      "Reaffirms and forcefully expands R. v. Gladue. Gladue principles apply to all Indigenous offenders in every sentencing context (including breaches of long-term orders). Courts must take judicial notice of the systemic factors affecting Indigenous peoples, such as the legacy of colonialism and residential schools.",
  },

  // ── IMPAIRED DRIVING & BREATHALYZERS ──────────────────────
  {
    citation: "2005 SCC 42",
    title: "R. v. Woods",
    year: 2005,
    court: "SCC",
    topics: ["Impaired Driving", "Charter", "s. 10(b)"],
    tags: ["right to counsel", "breathalyzer", " roadside screening", "ASD"],
    facts:
      "The accused was stopped at a roadside checkpoint. The officer demanded a breath sample without first informing the accused of his right to counsel under s. 10(b) of the Charter.",
    ratio:
      "While roadside screening demands (ASD) implicitly limit the right to counsel, the limit is justified under s. 1 of the Charter. However, if police delay the breath test significantly, the justification evaporates and the accused must be provided their s. 10(b) rights.",
  },
  {
    citation: "2012 SCC 57",
    title: "R. v. St-Onge Lamoureux",
    year: 2012,
    court: "SCC",
    topics: ["Impaired Driving", "Evidence", "Over 80"],
    tags: [
      "breathalyzer accuracy",
      "presumption",
      "Carter defence",
      "evidence to the contrary",
      "charter",
      "detention",
      "reasonable grounds",
    ],
    facts:
      "Parliament severely restricted the 'evidence to the contrary' defence (the Carter defence) for impaired driving, making it exceptionally difficult to challenge breathalyzer results.",
    ratio:
      "Upheld most legislative limits restricting challenges to breathalyzer accuracy, reaffirming that the state's interest in preventing drunk driving justifies stringent evidentiary presumptions against the accused, provided the machine is properly maintained and operated.",
  },
  {
    citation: "2015 SCC 34",
    title: "R. v. Smith",
    year: 2015,
    court: "SCC",
    topics: ["Drug Trafficking", "CDSA", "Sentencing"],
    tags: [
      "cdsa",
      "trafficking",
      "mandatory minimum",
      "section 5",
      "possession",
      "intent",
      "fentanyl",
      "cocaine",
    ],
    facts:
      "The accused challenged mandatory minimum sentences attached to drug trafficking offences under the CDSA.",
    ratio:
      "Mandatory minimum punishments in drug-trafficking contexts under CDSA s. 5 can violate constitutional protections where they are grossly disproportionate in reasonably foreseeable applications; trafficking analysis still turns on possession and intent evidence.",
  },

  // ── DISCLOSURE & EVIDENCE ─────────────────────────────────
  {
    citation: "[1991] 3 SCR 326",
    title: "R. v. Stinchcombe",
    year: 1991,
    court: "SCC",
    topics: ["Disclosure", "Charter", "s. 7", "Fair Trial"],
    tags: ["crown obligation", "withholding evidence", "witness statements"],
    facts:
      "The Crown prosecutor withheld statements given by a key witness from the defence, believing they were not relevant or trustworthy.",
    ratio:
      "The Crown has a constitutional obligation under s. 7 of the Charter to disclose all relevant information to the defence, whether exculpatory or inculpatory. Withholding evidence violates the right to make full answer and defence.",
  },

  // ── THE OAKES TEST (CHARTER JUSTIFICATION) ────────────────
  {
    citation: "[1986] 1 SCR 103",
    title: "R. v. Oakes",
    year: 1986,
    court: "SCC",
    topics: ["Charter", "s. 1", "s. 11(d)", "Presumption of Innocence"],
    tags: [
      "oakes test",
      "justification",
      "proportionality",
      "narcotics",
      "reverse onus",
    ],
    facts:
      "The accused was found with narcotics. A provision in the law required him to prove he was not trafficking, reversing the presumption of innocence under s. 11(d).",
    ratio:
      "Establishes the 'Oakes test' for justifying Charter infringements under Section 1: The law must have a pressing and substantial objective, and the means must be proportional (rationally connected, minimally impairing, and balancing salutary/deleterious effects). The reverse onus provision failed the minimal impairment test.",
  },
  {
    citation: "[1980] 2 SCR 331",
    title: "R. v. McLaughlin",
    year: 1980,
    court: "SCC",
    topics: ["Theft", "Criminal Code", "Computers"],
    tags: [
      "theft",
      "s. 287",
      "computer data",
      "telecommunication facility",
      "colour of right",
    ],
    facts:
      "The accused used a computer, without colour of right, to obtain internal programs of the computer and information from other persons' files stored on it. He was charged with theft of a telecommunication service under s. 287(1)(b) of the Criminal Code.",
    ratio:
      "A computer is a 'data processing facility', not a 'telecommunication facility' within s. 287(1)(b) of the Criminal Code: although intelligence was transmitted within the machine, it was not emitted to or received by outside facilities. Unauthorized computer use therefore did not constitute theft of a telecommunication, and the conviction was set aside. (Parliament later enacted the dedicated unauthorized-use-of-computer offence, s. 342.1.)",
  },
  {
    citation: "[1988] 1 SCR 963",
    title: "R. v. Stewart",
    year: 1988,
    court: "SCC",
    topics: ["Theft", "Property", "Confidential Information"],
    tags: [
      "theft",
      "s. 322",
      "confidential information",
      "intangible property",
      "what is property",
    ],
    facts:
      "A man was hired to obtain the names, addresses and telephone numbers of a hotel's employees and offered a hotel security guard money for that confidential information. He was charged in connection with attempting to take it.",
    ratio:
      "Confidential information, by itself, is not 'property' capable of being stolen under the Criminal Code. Copying or memorizing confidential information deprives the owner of nothing tangible, so it is not theft (s. 322). The decision marks the outer limit of what can be the subject of theft.",
  },
  {
    citation: "[1990] 1 SCR 852",
    title: "R. v. Lavallee",
    year: 1990,
    court: "SCC",
    topics: ["Domestic Assault", "Self-Defence", "Battered Woman Syndrome"],
    tags: [
      "domestic violence",
      "intimate partner",
      "self-defence",
      "spouse",
      "assault",
    ],
    facts:
      "The accused shot her abusive partner after prolonged domestic violence and raised self-defence supported by expert evidence.",
    ratio:
      "Confirms that self-defence reasonableness must be assessed contextually, including the reality of intimate-partner violence and power dynamics over time.",
  },
  // ── CRIMINAL LIABILITY & FAULT ────────────────────────────
  {
    citation: "[1978] 2 SCR 1299",
    title: "R. v. Sault Ste. Marie (City)",
    year: 1978,
    court: "SCC",
    topics: ["Criminal Law", "Mens Rea", "Strict Liability"],
    tags: [
      "regulatory offences",
      "absolute liability",
      "strict liability",
      "due diligence defence",
    ],
    facts:
      "The city was charged with pollution after waste leaked into a creek. The case centered on what level of mental fault is required for regulatory vs criminal offences.",
    ratio:
      "Created three categories of offences: (1) Mens rea offences (require proof of intent), (2) Strict liability (the Crown doesn't need to prove intent, but the accused can avoid conviction by proving they exercised 'due diligence'), and (3) Absolute liability (no fault required).",
  },
  // ── SECTION 7 & FUNDAMENTAL JUSTICE ───────────────────────
  {
    citation: "[1985] 2 SCR 486",
    title: "Re B.C. Motor Vehicle Act",
    year: 1985,
    court: "SCC",
    topics: ["Charter", "s. 7", "Principles of Fundamental Justice"],
    tags: ["substantive justice", "absolute liability jail", "mens rea"],
    facts:
      "The BC government created an absolute liability offence for driving while prohibited, which mandated a minimum jail term even if the driver didn't know they were prohibited.",
    ratio:
      "Ruled that the 'Principles of Fundamental Justice' in Section 7 are not just procedural but substantive. It is unconstitutional to send someone to jail for an absolute liability offence that requires no mental element (mens rea).",
  },
  {
    citation: "2013 SCC 72",
    title: "Canada (AG) v. Bedford",
    year: 2013,
    court: "SCC",
    topics: ["Charter", "s. 7", "Prostitution"],
    tags: ["sex work", "safety", "overbreadth", "grossly disproportionate"],
    facts:
      "Sex workers challenged three provisions of the Criminal Code (keeping a bawdy house, living on the avails, and communicating in public) arguing they made their work dangerous.",
    ratio:
      "Struck down Canada's prostitution laws. The laws were found to be arbitrary, overbroad, or grossly disproportionate because they prevented sex workers from taking safety measures (like working indoors or hiring security), violating their Section 7 right to security of the person.",
  },
  // ── SECTION 8: WARRANTS & PRIVACY ─────────────────────────
  {
    citation: "[1984] 2 SCR 145",
    title: "Hunter v. Southam Inc.",
    year: 1984,
    court: "SCC",
    topics: ["Charter", "s. 8", "Search and Seizure"],
    tags: [
      "reasonable expectation of privacy",
      "warrant requirement",
      "prior authorization",
    ],
    facts:
      "Combines investigators searched the offices of Southam Inc. under a broad administrative statute without a neutral warrant.",
    ratio:
      "The seminal s. 8 case. Established that the purpose of Section 8 is to protect reasonable expectations of privacy. Ruled that 'prior authorization' (a warrant from a neutral and impartial arbiter) is generally required for a search to be reasonable.",
  },
  {
    citation: "2004 SCC 67",
    title: "R. v. Tessling",
    year: 2004,
    court: "SCC",
    topics: ["Charter", "s. 8", "Search and Seizure", "Privacy"],
    tags: ["flir", "infrared", "heat sensing", "marijuana grow op"],
    facts:
      "Police flew a plane over the accused's house using Forward Looking Infra-Red (FLIR) technology to detect heat patterns consistent with a marijuana grow op.",
    ratio:
      "At the time, the court ruled that heat patterns escaping a home are 'waste heat' and do not reveal intimate details of private life; therefore, FLIR usage did not violate a reasonable expectation of privacy under s. 8.",
  },
  // ── EXCLUSION OF EVIDENCE (PRE-GRANT) ─────────────────────
  {
    citation: "[1997] 1 SCR 607",
    title: "R. v. Stillman",
    year: 1997,
    court: "SCC",
    topics: ["Charter", "s. 24(2)", "Exclusion of Evidence"],
    tags: ["conscriptive evidence", "bodily samples", "trial fairness"],
    facts:
      "Police forcibly took hair samples and teeth impressions from a youth suspect without a warrant or consent.",
    ratio:
      "Established the pre-2009 framework for evidence exclusion. Classified evidence as either 'conscriptive' (compelled from the accused) or 'non-conscriptive'. Conscriptive evidence was almost always excluded as it was seen as fundamentally unfair to the trial process.",
  },
  // ── EXTRADITION & SECTION 12 ──────────────────────────────
  {
    citation: "2001 SCC 7",
    title: "United States v. Burns",
    year: 2001,
    court: "SCC",
    topics: ["Charter", "s. 7", "s. 12", "Extradition"],
    tags: ["death penalty", "assurances", "extradition to us"],
    facts:
      "The Canadian government sought to extradite two individuals to Washington State to face murder charges without seeking assurances that the death penalty would not be applied.",
    ratio:
      "Ruled that extraditing someone to a country where they face the death penalty without assurances violates the Charter (specifically s. 7 and the evolving standards of s. 12 regarding cruel and unusual punishment).",
  },
  {
    citation: "2022 SCC 19",
    title: "R. v. Bissonnette",
    year: 2022,
    court: "SCC",
    topics: ["Charter", "s. 12", "Sentencing"],
    tags: [
      "life without parole",
      "consecutive sentences",
      "cruel and unusual punishment",
      "quebec mosque shooting",
    ],
    facts:
      "The shooter in the Quebec City mosque shooting was sentenced to multiple consecutive 25-year blocks, effectively resulting in life without the possibility of parole for 40+ years.",
    ratio:
      "Consecutive life sentences that result in life without the realistic possibility of parole are 'cruel and unusual punishment' and violate s. 12 of the Charter. Such sentences deny the possibility of personal rehabilitation and human dignity.",
  },

  // ── SECTION 8: DIGITAL PRIVACY (INTERNET & PHONES) ────────
  {
    citation: "2014 SCC 43",
    title: "R. v. Spencer",
    year: 2014,
    court: "SCC",
    topics: ["Charter", "s. 8", "Search and Seizure", "Privacy"],
    tags: [
      "internet",
      "ip address",
      "isp subscriber information",
      "anonymity",
      "reasonable expectation of privacy",
      "warrantless",
    ],
    facts:
      "Police obtained the name and address of an internet subscriber from an ISP, without a warrant, by matching it to an IP address used to share child pornography. The accused argued this was an unreasonable search.",
    ratio:
      "There is a reasonable expectation of privacy in the subscriber information linked to anonymous internet activity, because it tends to reveal intimate details of the user's biographical core. Obtaining it from an ISP without prior judicial authorization or other lawful authority is a search under s. 8 and was unreasonable (though on these facts the evidence was admitted under s. 24(2)).",
  },
  {
    citation: "2014 SCC 77",
    title: "R. v. Fearon",
    year: 2014,
    court: "SCC",
    topics: ["Charter", "s. 8", "Search Incident to Arrest", "Cell Phones"],
    tags: [
      "cell phone search",
      "search incident to arrest",
      "robbery",
      "digital privacy",
      "warrantless",
    ],
    facts:
      "Following an arrest for an armed robbery, police searched the accused's cell phone without a warrant, finding a draft text message and photographs of a firearm.",
    ratio:
      "Police may search a cell phone incident to a lawful arrest, but only within strict limits: the search must be truly incidental to the arrest, tailored in scope to its purpose, and police must take detailed notes of what they examine. A general or exploratory rummaging through a phone's contents is not permitted.",
  },

  // ── SECTION 9: ARBITRARY DETENTION (MODERN) ───────────────
  {
    citation: "2019 SCC 34",
    title: "R. v. Le",
    year: 2019,
    court: "SCC",
    topics: ["Charter", "s. 9", "Arbitrary Detention", "Exclusion of Evidence"],
    tags: [
      "arbitrary detention",
      "psychological detention",
      "police entry",
      "racial profiling",
      "social context",
      "s. 24(2)",
    ],
    facts:
      "Three officers entered the private backyard of a townhouse where five young racialized men were talking, questioned them, and demanded identification, with no reasonable suspicion of any offence.",
    ratio:
      "A detention under s. 9 arose the moment police entered the backyard, and it was arbitrary because there were no reasonable grounds. The detention analysis must account for the impact of race and the broader social context of how racialized people experience police encounters. The evidence was excluded under s. 24(2).",
  },

  // ── UTTERING THREATS ──────────────────────────────────────
  {
    citation: "[1991] 3 SCR 72",
    title: "R. v. McCraw",
    year: 1991,
    court: "SCC",
    topics: ["Uttering Threats", "Criminal Code", "s. 264.1"],
    tags: [
      "uttering threats",
      "s. 264.1",
      "serious bodily harm",
      "threat",
      "objective test",
    ],
    facts:
      "The accused sent letters to three women threatening to rape them and was charged with uttering threats to cause serious bodily harm under s. 264.1(1)(a).",
    ratio:
      "'Serious bodily harm' in s. 264.1 means any hurt or injury, physical or psychological, that interferes in a substantial way with the integrity, health or well-being of the victim. Whether words amount to a threat is decided objectively, in context, from the standpoint of a reasonable person; a threat to rape can be a threat to cause serious bodily harm.",
  },

  // ── EVIDENCE: CREDIBILITY & REASONABLE DOUBT ──────────────
  {
    citation: "[1991] 1 SCR 742",
    title: "R. v. W.(D.)",
    year: 1991,
    court: "SCC",
    topics: ["Evidence", "Credibility", "Reasonable Doubt"],
    tags: [
      "credibility",
      "reasonable doubt",
      "jury instruction",
      "burden of proof",
      "w(d)",
    ],
    facts:
      "In a trial turning on whether the trier of fact believed the complainant or the accused, the defence argued the jury charge improperly framed the issue as a simple choice between the two versions.",
    ratio:
      "Where credibility is central, the trier of fact must apply reasonable doubt to credibility: (1) if they believe the accused, acquit; (2) if they do not believe the accused but are left in reasonable doubt by that evidence, acquit; (3) even if not left in doubt by the accused's evidence, they must acquit unless the evidence they do accept proves guilt beyond a reasonable doubt.",
  },

  // ── SECTION 12: MANDATORY MINIMUM SENTENCES ───────────────
  {
    citation: "2015 SCC 15",
    title: "R. v. Nur",
    year: 2015,
    court: "SCC",
    topics: ["Charter", "s. 12", "Mandatory Minimum", "Sentencing"],
    tags: [
      "mandatory minimum",
      "cruel and unusual punishment",
      "firearms",
      "s. 95",
      "reasonable hypothetical",
      "grossly disproportionate",
    ],
    facts:
      "The accused challenged the three-year mandatory minimum sentence for possession of a loaded prohibited firearm under s. 95 of the Criminal Code.",
    ratio:
      "A mandatory minimum sentence violates s. 12 if it is grossly disproportionate either for the offender before the court or in reasonably foreseeable ('reasonable hypothetical') applications. The s. 95 mandatory minimums were struck down because they could capture licensing-type conduct far less serious than the offence's core, producing grossly disproportionate sentences.",
  },

  // ── HOMICIDE: MENS REA ────────────────────────────────────
  {
    citation: "[1990] 2 SCR 633",
    title: "R. v. Martineau",
    year: 1990,
    court: "SCC",
    topics: ["Murder", "Mens Rea", "Charter", "s. 7"],
    tags: [
      "murder",
      "subjective foresight",
      "constructive murder",
      "s. 230",
      "fundamental justice",
    ],
    facts:
      "The accused took part in a robbery during which his companion shot and killed the occupants. He was convicted of murder under the constructive (felony) murder provision, which did not require any foresight of death.",
    ratio:
      "A conviction for murder requires proof beyond a reasonable doubt of subjective foresight of death. The constructive-murder provision (then s. 213, now s. 230), which permitted a murder conviction without that foresight, violated ss. 7 and 11(d) of the Charter and was struck down.",
  },
  {
    citation: "[1993] 3 SCR 3",
    title: "R. v. Creighton",
    year: 1993,
    court: "SCC",
    topics: ["Manslaughter", "Mens Rea", "Criminal Negligence"],
    tags: [
      "unlawful act manslaughter",
      "objective foreseeability",
      "bodily harm",
      "s. 222",
      "fault",
    ],
    facts:
      "The accused injected another person with cocaine, with her consent; she died. He was charged with unlawful act manslaughter.",
    ratio:
      "The mens rea of unlawful act manslaughter is objective foreseeability of the risk of bodily harm that is neither trivial nor transitory, arising from a dangerous unlawful act — foreseeability of death is not required. The standard is that of a reasonable person in the circumstances of the accused.",
  },

  // ── CONFESSIONS & INTERROGATION ───────────────────────────
  {
    citation: "2000 SCC 38",
    title: "R. v. Oickle",
    year: 2000,
    court: "SCC",
    topics: ["Confessions", "Voluntariness", "Evidence"],
    tags: [
      "confessions rule",
      "voluntariness",
      "threats or promises",
      "oppression",
      "operating mind",
      "police trickery",
      "interrogation",
    ],
    facts:
      "The accused confessed to setting a series of fires during a police interrogation that involved suggestions of leniency and psychological pressure. The admissibility of the confession was challenged.",
    ratio:
      "Restates the common-law confessions rule: a statement to a person in authority is inadmissible unless the Crown proves beyond a reasonable doubt that it was voluntary. Voluntariness is assessed contextually through threats or promises, oppression, the operating-mind requirement, and police trickery that would shock the community.",
  },

  // ── PARTIES TO AN OFFENCE ─────────────────────────────────
  {
    citation: "2010 SCC 13",
    title: "R. v. Briscoe",
    year: 2010,
    court: "SCC",
    topics: ["Parties to an Offence", "Mens Rea", "s. 21"],
    tags: [
      "aiding and abetting",
      "party liability",
      "wilful blindness",
      "s. 21(1)",
      "knowledge",
      "intent",
    ],
    facts:
      "The accused drove a group to a secluded location and helped during a kidnapping and murder, while claiming he did not know a killing would occur.",
    ratio:
      "To be liable as an aider or abettor under s. 21(1), the Crown must prove the accused did or omitted something to assist or encourage the principal, intended to do so, and knew the principal intended to commit the offence. Wilful blindness — deliberately declining to inquire once one's suspicion is aroused — can substitute for actual knowledge.",
  },

  // ── BAIL / JUDICIAL INTERIM RELEASE ───────────────────────
  {
    citation: "2017 SCC 27",
    title: "R. v. Antic",
    year: 2017,
    court: "SCC",
    topics: ["Bail", "Charter", "s. 11(e)", "Judicial Interim Release"],
    tags: [
      "bail",
      "ladder principle",
      "release",
      "surety",
      "cash bail",
      "reasonable bail",
      "s. 515",
    ],
    facts:
      "An accused was detained when a bail review judge insisted on a cash deposit, despite other adequate forms of release being available.",
    ratio:
      "The right not to be denied reasonable bail without just cause (s. 11(e)) requires courts to follow the 'ladder principle' in s. 515: release on the least onerous form of bail appropriate, moving up the ladder only as necessary. Conditions must address a statutory ground for detention, not punish the accused or change behaviour; a cash deposit should not be required where other forms suffice.",
  },

  // ── DANGEROUS DRIVING ─────────────────────────────────────
  {
    citation: "2012 SCC 26",
    title: "R. v. Roy",
    year: 2012,
    court: "SCC",
    topics: ["Dangerous Driving", "Mens Rea", "Criminal Code"],
    tags: [
      "dangerous driving",
      "marked departure",
      "modified objective standard",
      "criminal negligence",
      "s. 320",
    ],
    facts:
      "In poor winter visibility, the accused drove his motorhome from a stop onto a highway into the path of an oncoming tractor-trailer; the collision killed his passenger. He was convicted of dangerous driving causing death.",
    ratio:
      "The mens rea of dangerous driving is a marked departure from the standard of care a reasonable person would observe in the accused's circumstances (a modified objective standard). A momentary lapse or simple carelessness sufficient for civil negligence is not enough; the trier of fact must identify how the driving was a marked departure.",
  },

  // ── SECTION 8: STRIP SEARCH ───────────────────────────────
  {
    citation: "2001 SCC 83",
    title: "R. v. Golden",
    year: 2001,
    court: "SCC",
    topics: ["Charter", "s. 8", "Strip Search", "Search Incident to Arrest"],
    tags: [
      "strip search",
      "search incident to arrest",
      "reasonable grounds",
      "dignity",
      "s. 8",
    ],
    facts:
      "Police strip-searched the accused in the stairwell of a restaurant after arresting him for drug trafficking, seizing cocaine.",
    ratio:
      "A strip search is inherently humiliating and is permissible incident to arrest only where police have reasonable and probable grounds for the strip search itself (beyond those grounding the arrest) and conduct it reasonably — generally at a police station, absent exigent circumstances. The search here breached s. 8.",
  },

  // ── SECTION 10(b): SCOPE OF RIGHT TO COUNSEL ──────────────
  {
    citation: "2010 SCC 35",
    title: "R. v. Sinclair",
    year: 2010,
    court: "SCC",
    topics: ["Charter", "s. 10(b)", "Right to Counsel", "Interrogation"],
    tags: [
      "right to counsel",
      "interrogation",
      "counsel present",
      "custodial questioning",
      "s. 10(b)",
    ],
    facts:
      "After arrest for murder, the accused spoke briefly with counsel twice, then repeatedly asked to have his lawyer present during a lengthy interrogation; police continued questioning.",
    ratio:
      "Section 10(b) does not give a detainee the right to have counsel present throughout a custodial interrogation. The right is generally satisfied by a reasonable opportunity to consult counsel at the outset; a further consultation is required only where changed circumstances make it necessary (such as a new procedure or a significant change in jeopardy).",
  },

  // ── ENTRAPMENT ────────────────────────────────────────────
  {
    citation: "[1988] 2 SCR 903",
    title: "R. v. Mack",
    year: 1988,
    court: "SCC",
    topics: ["Entrapment", "Abuse of Process", "Criminal Code"],
    tags: [
      "entrapment",
      "abuse of process",
      "stay of proceedings",
      "reasonable suspicion",
      "police inducement",
    ],
    facts:
      "Over roughly six months the accused repeatedly refused a police agent's requests to sell drugs, eventually relenting under persistent pressure and an implied threat. He raised entrapment.",
    ratio:
      "Entrapment occurs where (a) police provide a person the opportunity to commit an offence without reasonable suspicion that the person is already engaged in criminal activity (or without a bona fide inquiry), or (b) police go beyond providing an opportunity and actually induce the offence. Entrapment is an abuse of process; the remedy is a stay of proceedings, determined by the judge after a finding of guilt.",
  },

  // ── CONFESSIONS: MR. BIG OPERATIONS ───────────────────────
  {
    citation: "2014 SCC 52",
    title: "R. v. Hart",
    year: 2014,
    court: "SCC",
    topics: ["Confessions", "Evidence", "Mr. Big"],
    tags: [
      "mr big",
      "undercover operation",
      "confession",
      "presumptively inadmissible",
      "probative value",
      "prejudicial effect",
    ],
    facts:
      "Undercover officers running a 'Mr. Big' sting drew the accused into a fictitious criminal organization and elicited a confession to the deaths of his young daughters.",
    ratio:
      "Confessions obtained through 'Mr. Big' operations are presumptively inadmissible. The Crown must establish that the confession's probative value (a function of its reliability) outweighs its prejudicial effect; separately, abuse of process (such as coercion) can also require exclusion. The rule targets unreliable confessions and state abuse.",
  },
];
