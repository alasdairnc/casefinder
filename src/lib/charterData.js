// src/lib/charterData.js
// Canadian Charter of Rights and Freedoms — all 35 sections.
// Source: Constitution Act, 1982, Schedule B, Part I (justice.gc.ca)
// Used by api/verify.js to validate AI-suggested Charter citations.

const CHARTER_BASE = "https://laws-lois.justice.gc.ca/eng/const/page-15.html";

// Map: normalized section string → entry
// Keys: "1", "2", "2(a)", "2(b)", "2(c)", "2(d)", "7", etc.
export const CHARTER_SECTIONS = new Map([
  // ── Guarantee of Rights and Freedoms ────────────────────────────────────────
  ["1", {
    title: "Rights and freedoms in Canada",
    part: "Guarantee of Rights and Freedoms",
    summary: "The Canadian Charter of Rights and Freedoms guarantees the rights and freedoms set out in it subject only to such reasonable limits prescribed by law as can be demonstrably justified in a free and democratic society.",
    relevance: "Section 1 justification, Oakes test, limits on rights, government override",
    url: CHARTER_BASE,
  }],

  // ── Fundamental Freedoms ─────────────────────────────────────────────────────
  ["2", {
    title: "Fundamental freedoms",
    part: "Fundamental Freedoms",
    summary: "Everyone has the following fundamental freedoms: (a) freedom of conscience and religion; (b) freedom of thought, belief, opinion and expression, including freedom of the press and other media of communication; (c) freedom of peaceful assembly; and (d) freedom of association.",
    relevance: "Free speech, religion, assembly, association, hate speech, protest",
    url: CHARTER_BASE,
  }],
  ["2(a)", {
    title: "Freedom of conscience and religion",
    part: "Fundamental Freedoms",
    summary: "Everyone has the freedom of conscience and religion.",
    relevance: "Religious accommodation, freedom of conscience, religious exemptions",
    url: CHARTER_BASE,
  }],
  ["2(b)", {
    title: "Freedom of thought, belief, opinion and expression",
    part: "Fundamental Freedoms",
    summary: "Everyone has the freedom of thought, belief, opinion and expression, including freedom of the press and other media of communication.",
    relevance: "Free speech, hate speech, defamation, press freedom, expressive conduct",
    url: CHARTER_BASE,
  }],
  ["2(c)", {
    title: "Freedom of peaceful assembly",
    part: "Fundamental Freedoms",
    summary: "Everyone has the freedom of peaceful assembly.",
    relevance: "Protest, unlawful assembly, riot, public demonstration",
    url: CHARTER_BASE,
  }],
  ["2(d)", {
    title: "Freedom of association",
    part: "Fundamental Freedoms",
    summary: "Everyone has the freedom of association.",
    relevance: "Union rights, gang membership laws, association-based offences",
    url: CHARTER_BASE,
  }],

  // ── Democratic Rights ────────────────────────────────────────────────────────
  ["3", {
    title: "Democratic rights of citizens",
    part: "Democratic Rights",
    summary: "Every citizen of Canada has the right to vote in an election of members of the House of Commons or of a legislative assembly and to be qualified for membership therein.",
    relevance: "Voting rights, electoral offences, disenfranchisement",
    url: CHARTER_BASE,
  }],
  ["4", {
    title: "Maximum duration of legislative bodies",
    part: "Democratic Rights",
    summary: "No House of Commons and no legislative assembly shall continue for longer than five years from the date fixed for the return of the writs of a general election of its members.",
    relevance: "Constitutional limits, legislative authority",
    url: CHARTER_BASE,
  }],
  ["5", {
    title: "Annual sitting of legislative bodies",
    part: "Democratic Rights",
    summary: "There shall be a sitting of Parliament and of each legislature at least once every twelve months.",
    relevance: "Parliamentary authority, constitutional requirements",
    url: CHARTER_BASE,
  }],

  // ── Mobility Rights ───────────────────────────────────────────────────────────
  ["6", {
    title: "Mobility of citizens",
    part: "Mobility Rights",
    summary: "Every citizen of Canada has the right to enter, remain in and leave Canada. Every citizen of Canada and every person who has the status of a permanent resident of Canada has the right to move to and take up residence in any province.",
    relevance: "Travel restrictions, deportation, extradition, mobility conditions",
    url: CHARTER_BASE,
  }],

  // ── Legal Rights ─────────────────────────────────────────────────────────────
  ["7", {
    title: "Life, liberty and security of person",
    part: "Legal Rights",
    summary: "Everyone has the right to life, liberty and security of the person and the right not to be deprived thereof except in accordance with the principles of fundamental justice.",
    relevance: "Self-defence, bodily autonomy, fundamental justice, arbitrary detention, capital punishment, proportionality",
    url: CHARTER_BASE,
  }],
  ["8", {
    title: "Search or seizure",
    part: "Legal Rights",
    summary: "Everyone has the right to be secure against unreasonable search or seizure.",
    relevance: "Search warrants, warrantless searches, evidence admissibility, privacy, police powers",
    url: CHARTER_BASE,
  }],
  ["9", {
    title: "Detention or imprisonment",
    part: "Legal Rights",
    summary: "Everyone has the right not to be arbitrarily detained or imprisoned.",
    relevance: "Arbitrary arrest, police stops, carding, detention without cause, bail",
    url: CHARTER_BASE,
  }],
  ["10", {
    title: "Arrest or detention",
    part: "Legal Rights",
    summary: "Everyone has the right on arrest or detention (a) to be informed promptly of the reasons therefor; (b) to retain and instruct counsel without delay and to be informed of that right; and (c) to have the validity of the detention determined by way of habeas corpus.",
    relevance: "Right to counsel, right to be informed of charges, habeas corpus, caution",
    url: CHARTER_BASE,
  }],
  ["10(a)", {
    title: "Right to be informed of reasons for arrest",
    part: "Legal Rights",
    summary: "Everyone has the right on arrest or detention to be informed promptly of the reasons therefor.",
    relevance: "Informing accused of charges, unlawful arrest, right to know reasons for detention",
    url: CHARTER_BASE,
  }],
  ["10(b)", {
    title: "Right to retain counsel",
    part: "Legal Rights",
    summary: "Everyone has the right on arrest or detention to retain and instruct counsel without delay and to be informed of that right.",
    relevance: "Right to counsel, duty to inform, lawyer access, police interrogation, statements",
    url: CHARTER_BASE,
  }],
  ["11", {
    title: "Proceedings in criminal and penal matters",
    part: "Legal Rights",
    summary: "Any person charged with an offence has the right to be informed without unreasonable delay of the specific offence; to be tried within a reasonable time; not to be compelled to be a witness in proceedings against that person; to be presumed innocent until proven guilty; not to be denied reasonable bail; to trial by jury; not to be found guilty of any act not an offence at the time; not to be tried or punished again for an offence; and to benefit of the lesser punishment.",
    relevance: "Fair trial rights, presumption of innocence, right to jury trial, double jeopardy",
    url: CHARTER_BASE,
  }],
  ["11(a)", {
    title: "Right to be informed of specific offence",
    part: "Legal Rights",
    summary: "Any person charged with an offence has the right to be informed without unreasonable delay of the specific offence.",
    relevance: "Notice of charges, particulars, delay in charging",
    url: CHARTER_BASE,
  }],
  ["11(b)", {
    title: "Right to be tried within a reasonable time",
    part: "Legal Rights",
    summary: "Any person charged with an offence has the right to be tried within a reasonable time.",
    relevance: "Trial delay, Jordan guidelines, stay of proceedings, s. 11(b) applications",
    url: CHARTER_BASE,
  }],
  ["11(c)", {
    title: "Right not to be compelled as witness",
    part: "Legal Rights",
    summary: "Any person charged with an offence has the right not to be compelled to be a witness in proceedings against that person in respect of the offence.",
    relevance: "Right to silence, self-incrimination, accused testimony",
    url: CHARTER_BASE,
  }],
  ["11(d)", {
    title: "Presumption of innocence",
    part: "Legal Rights",
    summary: "Any person charged with an offence has the right to be presumed innocent until proven guilty according to law in a fair and public hearing by an independent and impartial tribunal.",
    relevance: "Burden of proof, reverse onus provisions, Crown disclosure, fair trial",
    url: CHARTER_BASE,
  }],
  ["11(e)", {
    title: "Right not to be denied reasonable bail",
    part: "Legal Rights",
    summary: "Any person charged with an offence has the right not to be denied reasonable bail without just cause.",
    relevance: "Bail hearings, show cause, bail conditions, detention pending trial",
    url: CHARTER_BASE,
  }],
  ["11(f)", {
    title: "Right to jury trial",
    part: "Legal Rights",
    summary: "Any person charged with an offence has the right, except in the case of an offence under military law tried before a military tribunal, to the benefit of trial by jury where the maximum punishment for the offence is imprisonment for five years or a more severe punishment.",
    relevance: "Election of trial by jury, mode of trial, indictable offences",
    url: CHARTER_BASE,
  }],
  ["11(g)", {
    title: "Right against retroactive offences",
    part: "Legal Rights",
    summary: "Any person charged with an offence has the right not to be found guilty on account of any act or omission unless, at the time of the act or omission, it constituted an offence under Canadian or international law.",
    relevance: "Retroactive offences, ex post facto laws, new offences",
    url: CHARTER_BASE,
  }],
  ["11(h)", {
    title: "Double jeopardy",
    part: "Legal Rights",
    summary: "Any person charged with an offence has the right, if finally acquitted of the offence, not to be tried for it again and, if finally found guilty and punished for the offence, not to be tried or punished for it again.",
    relevance: "Double jeopardy, autrefois acquit, autrefois convict, res judicata",
    url: CHARTER_BASE,
  }],
  ["11(i)", {
    title: "Right to lesser punishment",
    part: "Legal Rights",
    summary: "Any person charged with an offence has the right, if found guilty of the offence and if the punishment for the offence has been varied between the time of commission and the time of sentencing, to the benefit of the lesser punishment.",
    relevance: "Sentencing changes, retroactive sentencing, lesser punishment",
    url: CHARTER_BASE,
  }],
  ["12", {
    title: "Treatment or punishment",
    part: "Legal Rights",
    summary: "Everyone has the right not to be subjected to any cruel and unusual treatment or punishment.",
    relevance: "Cruel and unusual punishment, mandatory minimums, sentencing proportionality, prison conditions",
    url: CHARTER_BASE,
  }],
  ["13", {
    title: "Self-incrimination",
    part: "Legal Rights",
    summary: "A witness who testifies in any proceedings has the right not to have any incriminating testimony so given used to incriminate that witness in any other proceedings, except in a prosecution for perjury or for the giving of contradictory evidence.",
    relevance: "Use immunity, compelled testimony, incriminating evidence, witness protection",
    url: CHARTER_BASE,
  }],
  ["14", {
    title: "Interpreter",
    part: "Legal Rights",
    summary: "A party or witness in any proceedings who does not understand or speak the language in which the proceedings are conducted or who is deaf has the right to the assistance of an interpreter.",
    relevance: "Right to interpreter, language rights, accessibility in proceedings",
    url: CHARTER_BASE,
  }],

  // ── Equality Rights ───────────────────────────────────────────────────────────
  ["15", {
    title: "Equality before and under law and equal protection and benefit of law",
    part: "Equality Rights",
    summary: "Every individual is equal before and under the law and has the right to the equal protection and equal benefit of the law without discrimination and, in particular, without discrimination based on race, national or ethnic origin, colour, religion, sex, age or mental or physical disability.",
    relevance: "Discrimination in prosecution, sentencing disparity, Indigenous rights, racial bias, protected grounds",
    url: CHARTER_BASE,
  }],
  ["15(1)", {
    title: "Equality rights",
    part: "Equality Rights",
    summary: "Every individual is equal before and under the law and has the right to the equal protection and equal benefit of the law without discrimination and, in particular, without discrimination based on race, national or ethnic origin, colour, religion, sex, age or mental or physical disability.",
    relevance: "Discrimination, equality, systemic bias, protected grounds, profiling",
    url: CHARTER_BASE,
  }],
  ["15(2)", {
    title: "Affirmative action programs",
    part: "Equality Rights",
    summary: "Subsection (1) does not preclude any law, program or activity that has as its object the amelioration of conditions of disadvantaged individuals or groups including those that are disadvantaged because of the grounds mentioned in subsection (1).",
    relevance: "Affirmative action, ameliorative programs, equity measures",
    url: CHARTER_BASE,
  }],

  // ── Official Languages ────────────────────────────────────────────────────────
  ["16", {
    title: "Official languages of Canada",
    part: "Official Languages of Canada",
    summary: "English and French are the official languages of Canada and have equality of status and equal rights and privileges as to their use in all institutions of the Parliament and government of Canada.",
    relevance: "Language rights, proceedings in official language, accused rights to French or English",
    url: CHARTER_BASE,
  }],
  ["19", {
    title: "Proceedings in Parliament",
    part: "Official Languages of Canada",
    summary: "Either English or French may be used by any person in, or in any pleading in or process issuing from, any court established by Parliament.",
    relevance: "Right to trial in official language, court proceedings language",
    url: CHARTER_BASE,
  }],

  // ── Minority Language Educational Rights ─────────────────────────────────────
  ["23", {
    title: "Language of instruction",
    part: "Minority Language Educational Rights",
    summary: "Citizens of Canada whose first language learned and still understood is that of the English or French linguistic minority population of the province in which they reside have the right to have their children receive primary and secondary school instruction in that language.",
    relevance: "Minority language education rights",
    url: CHARTER_BASE,
  }],

  // ── Enforcement ───────────────────────────────────────────────────────────────
  ["24", {
    title: "Enforcement of guaranteed rights and freedoms",
    part: "Enforcement",
    summary: "Anyone whose rights or freedoms, as guaranteed by this Charter, have been infringed or denied may apply to a court of competent jurisdiction to obtain such remedy as the court considers appropriate and just in the circumstances. Where, in proceedings under subsection (1), a court concludes that evidence was obtained in a manner that infringed or denied any rights or freedoms guaranteed by this Charter, the evidence shall be excluded if it is established that, having regard to all the circumstances, the admission of it in the proceedings would bring the administration of justice into disrepute.",
    relevance: "Charter remedy, exclusion of evidence, s. 24(2) application, bring administration of justice into disrepute",
    url: CHARTER_BASE,
  }],
  ["24(1)", {
    title: "Remedies for Charter violations",
    part: "Enforcement",
    summary: "Anyone whose rights or freedoms, as guaranteed by this Charter, have been infringed or denied may apply to a court of competent jurisdiction to obtain such remedy as the court considers appropriate and just in the circumstances.",
    relevance: "Charter remedy, stay of proceedings, declaration of invalidity",
    url: CHARTER_BASE,
  }],
  ["24(2)", {
    title: "Exclusion of evidence",
    part: "Enforcement",
    summary: "Where, in proceedings under subsection (1), a court concludes that evidence was obtained in a manner that infringed or denied any rights or freedoms guaranteed by this Charter, the evidence shall be excluded if it is established that, having regard to all the circumstances, the admission of it in the proceedings would bring the administration of justice into disrepute.",
    relevance: "Exclusion of evidence, Grant test, administration of justice, unlawfully obtained evidence",
    url: CHARTER_BASE,
  }],

  // ── General ───────────────────────────────────────────────────────────────────
  ["25", {
    title: "Aboriginal rights and freedoms not affected by Charter",
    part: "General",
    summary: "The guarantee in this Charter of certain rights and freedoms shall not be construed so as to abrogate or derogate from any aboriginal, treaty or other rights or freedoms that pertain to the aboriginal peoples of Canada.",
    relevance: "Indigenous rights, treaty rights, Aboriginal title, s. 35 rights",
    url: CHARTER_BASE,
  }],
  ["27", {
    title: "Multicultural heritage",
    part: "General",
    summary: "This Charter shall be interpreted in a manner consistent with the preservation and enhancement of the multicultural heritage of Canadians.",
    relevance: "Multicultural interpretation, cultural context in sentencing",
    url: CHARTER_BASE,
  }],
  ["28", {
    title: "Rights guaranteed equally to both sexes",
    part: "General",
    summary: "Notwithstanding anything in this Charter, the rights and freedoms referred to in it are guaranteed equally to male and female persons.",
    relevance: "Gender equality, sex discrimination, sentencing equality",
    url: CHARTER_BASE,
  }],

  // ── Application ───────────────────────────────────────────────────────────────
  ["32", {
    title: "Application of Charter",
    part: "Application of Charter",
    summary: "This Charter applies to the Parliament and government of Canada in respect of all matters within the authority of Parliament including all matters relating to the Yukon Territory and Northwest Territories; and to the legislature and government of each province in respect of all matters within the authority of the legislature of each province.",
    relevance: "Applicability of Charter, state action, government actor, private parties",
    url: CHARTER_BASE,
  }],
  ["33", {
    title: "Exception where express declaration",
    part: "Application of Charter",
    summary: "Parliament or the legislature of a province may expressly declare in an Act of Parliament or of the legislature, as the case may be, that the Act or a provision thereof shall operate notwithstanding a provision included in section 2 or sections 7 to 15 of this Charter.",
    relevance: "Notwithstanding clause, legislative override, s. 33 declaration",
    url: CHARTER_BASE,
  }],
]);

// Normalize a Charter citation string to a lookup key.
// Accepts: "s. 7", "s.7", "section 7", "Charter s. 24(2)", "s. 11(b)"
export function normalizeCharterSection(citation) {
  if (!citation || typeof citation !== "string") return null;
  // Strip common prefixes
  const cleaned = citation
    .replace(/^(canadian\s+)?charter\s+(of\s+rights\s+and\s+freedoms,?\s*)?/i, "")
    .replace(/^section\s+/i, "")
    .replace(/^s\.\s*/i, "")
    .trim();
  // Now cleaned should be like "7", "11(b)", "24(2)", "2(b)"
  return cleaned || null;
}

// Look up a Charter section by citation string.
// Returns the entry or null.
export function lookupCharterSection(citation) {
  const key = normalizeCharterSection(citation);
  if (!key) return null;
  return CHARTER_SECTIONS.get(key) || null;
}
