import { test, expect } from "@playwright/test";

// ResultCard renders: item.citation (bold header) and item.summary (body text).
// item.title is NOT rendered. Assert only on citation and summary text.
// Charter items must use `citation` field (not `section`) to render the citation text.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockApis(page, analyzeResponse, verifyResponse = {}) {
  return Promise.all([
    page.route("/api/analyze", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(analyzeResponse),
      })
    ),
    page.route("/api/verify", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(verifyResponse),
      })
    ),
  ]);
}

async function submitScenario(page, scenario) {
  await page.goto("/");
  await page.locator('[data-testid="scenario-input"]').fill(scenario);
  await page.locator('[data-testid="research-submit"]').click();
  await expect(page.getByText("Scenario Summary", { exact: true })).toBeVisible({ timeout: 10000 });
}

// ---------------------------------------------------------------------------
// Scenario 1: Impaired Driving
// ---------------------------------------------------------------------------

const IMPAIRED_DRIVING_RESPONSE = {
  summary:
    "A driver was pulled over and found to have a blood alcohol concentration exceeding 80 mg of alcohol per 100 mL of blood following a roadside demand.",
  criminal_code: [
    {
      citation: "s. 320.14(1)(b)",
      title: "Operation While Impaired — Blood Alcohol",
      summary: "Operating a conveyance with a BAC over 80 mg per 100 mL.",
    },
    {
      citation: "s. 320.15",
      title: "Failure or Refusal to Comply with Demand",
      summary: "Refusing a breathalyzer demand is itself an offence.",
    },
  ],
  case_law: [
    {
      citation: "R v Stellato, 1994 CanLII 94 (SCC)",
      title: "R v Stellato",
      summary: "Established the slight degree of impairment test for over 80 offences.",
      court: "SCC",
      year: "1994",
      matched_content: "Slight impairment is sufficient for conviction under the impaired driving provisions.",
    },
  ],
  civil_law: [],
  charter: [
    {
      citation: "s. 8",
      title: "Search and Seizure",
      summary: "Warrantless breath demands must be supported by reasonable grounds.",
    },
    {
      citation: "s. 9",
      title: "Arbitrary Detention",
      summary: "A traffic stop must not constitute arbitrary detention.",
    },
  ],
  analysis:
    "This scenario engages the Criminal Code's impaired driving regime. The Crown must prove the accused operated the conveyance with a BAC over 80 mg per 100 mL.",
  suggestions: [
    { type: "canlii", label: "impaired driving BAC over 80", term: "impaired driving BAC over 80" },
  ],
};

const IMPAIRED_VERIFY_RESPONSE = {
  "R v Stellato, 1994 CanLII 94 (SCC)": {
    status: "verified",
    url: "https://www.canlii.org/en/ca/scc/doc/1994/1994canlii94/1994canlii94.html",
    searchUrl: "https://www.canlii.org/en/#search/text=R+v+Stellato",
    title: "R v Stellato",
  },
};

test.describe("Scenario: Impaired Driving", () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page, IMPAIRED_DRIVING_RESPONSE, IMPAIRED_VERIFY_RESPONSE);
  });

  test("shows Criminal Code section for over-80 offence", async ({ page }) => {
    await submitScenario(page, "Driver pulled over with BAC of 0.12 after refusing a roadside test");
    await expect(page.getByText("Operating a conveyance with a BAC over 80 mg per 100 mL.")).toBeVisible();
    await expect(page.getByText("Refusing a breathalyzer demand is itself an offence.")).toBeVisible();
  });

  test("shows Charter rights section", async ({ page }) => {
    await submitScenario(page, "Driver pulled over with BAC of 0.12 after refusing a roadside test");
    await expect(page.locator('[data-testid="results-section"]').getByText("Charter Rights", { exact: true })).toBeVisible();
    await expect(page.getByText("Warrantless breath demands must be supported by reasonable grounds.")).toBeVisible();
    await expect(page.getByText("A traffic stop must not constitute arbitrary detention.")).toBeVisible();
  });

  test("shows verified case law citation", async ({ page }) => {
    await submitScenario(page, "Driver pulled over with BAC of 0.12 after refusing a roadside test");
    await expect(page.getByText("R v Stellato, 1994 CanLII 94 (SCC)")).toBeVisible();
    await expect(page.getByRole("link", { name: /Verified on CanLII/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: Assault Causing Bodily Harm
// ---------------------------------------------------------------------------

const ASSAULT_RESPONSE = {
  summary:
    "The accused punched the complainant repeatedly during an altercation, causing a broken nose and black eye.",
  criminal_code: [
    {
      citation: "s. 267(b)",
      title: "Assault Causing Bodily Harm",
      summary: "Assault that causes bodily harm to the complainant.",
    },
    {
      citation: "s. 265",
      title: "Assault",
      summary: "Intentional application of force without consent.",
    },
  ],
  case_law: [
    {
      citation: "R v McCraw, 1991 CanLII 29 (SCC)",
      title: "R v McCraw",
      summary: "Defined bodily harm as hurt or injury that interferes with health or comfort.",
      court: "SCC",
      year: "1991",
      matched_content: "Bodily harm must be more than merely transient or trifling.",
    },
  ],
  civil_law: [],
  charter: [],
  analysis:
    "The repeated blows resulting in a broken nose and black eye likely meet the threshold of bodily harm under s.267(b). The Crown must prove intent to apply force and that harm resulted.",
  suggestions: [
    { type: "canlii", label: "assault bodily harm sentencing", term: "assault bodily harm sentencing" },
    { type: "criminal_code", label: "s. 267", citation: "s. 267" },
  ],
};

const ASSAULT_VERIFY_RESPONSE = {
  "R v McCraw, 1991 CanLII 29 (SCC)": {
    status: "verified",
    url: "https://www.canlii.org/en/ca/scc/doc/1991/1991canlii29/1991canlii29.html",
    searchUrl: "https://www.canlii.org/en/#search/text=R+v+McCraw",
    title: "R v McCraw",
  },
};

test.describe("Scenario: Assault Causing Bodily Harm", () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page, ASSAULT_RESPONSE, ASSAULT_VERIFY_RESPONSE);
  });

  test("shows assault causing bodily harm section", async ({ page }) => {
    await submitScenario(page, "The accused punched the victim repeatedly causing a broken nose");
    await expect(page.getByText("Assault that causes bodily harm to the complainant.")).toBeVisible();
    await expect(page.getByText("Intentional application of force without consent.")).toBeVisible();
  });

  test("shows legal analysis mentioning bodily harm", async ({ page }) => {
    await submitScenario(page, "The accused punched the victim repeatedly causing a broken nose");
    await expect(page.getByText("Legal Analysis")).toBeVisible();
    await expect(page.locator("body")).toContainText("threshold of bodily harm");
  });

  test("shows suggested Criminal Code link for s.267", async ({ page }) => {
    await submitScenario(page, "The accused punched the victim repeatedly causing a broken nose");
    await expect(page.getByText("Suggested Links")).toBeVisible();
    const ccLink = page.getByRole("link", { name: "s. 267 ↗" });
    await expect(ccLink).toBeVisible();
    const href = await ccLink.getAttribute("href");
    expect(href).toContain("laws-lois.justice.gc.ca");
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: Drug Trafficking (CDSA)
// ---------------------------------------------------------------------------

const DRUG_TRAFFICKING_RESPONSE = {
  summary:
    "Police conducted a controlled drug purchase and arrested the accused for selling cocaine, finding additional product and cash at the accused's residence.",
  criminal_code: [],
  case_law: [
    {
      citation: "R v Nguyen, 2020 ONCA 25",
      title: "R v Nguyen",
      summary: "Sentencing principles for mid-level cocaine trafficking.",
      court: "ONCA",
      year: "2020",
      matched_content: "Controlled drug purchases are a common investigative technique for mid-level trafficking.",
    },
  ],
  civil_law: [
    {
      citation: "CDSA s. 5(1)",
      title: "Trafficking in Substance",
      summary: "Trafficking in a substance listed in Schedule I (cocaine) is an indictable offence.",
      act: "CDSA",
    },
    {
      citation: "CDSA s. 5(3)(a)(i)",
      title: "Punishment — Schedule I Substance",
      summary: "Maximum life imprisonment for trafficking in a Schedule I substance.",
      act: "CDSA",
    },
  ],
  charter: [
    {
      citation: "s. 8",
      title: "Search and Seizure",
      summary: "Residential search requires a warrant. Evidence at residence may be challenged.",
    },
  ],
  analysis:
    "The controlled purchase provides direct evidence of trafficking under CDSA s.5(1). The residential search must be supported by a valid warrant.",
  suggestions: [
    { type: "canlii", label: "cocaine trafficking sentencing", term: "cocaine trafficking sentencing" },
  ],
};

const DRUG_VERIFY_RESPONSE = {
  "R v Nguyen, 2020 ONCA 25": {
    status: "verified",
    url: "https://www.canlii.org/en/on/onca/doc/2020/2020onca25/2020onca25.html",
    searchUrl: "https://www.canlii.org/en/#search/text=R+v+Nguyen+2020+ONCA+25",
    title: "R v Nguyen",
  },
};

test.describe("Scenario: Drug Trafficking (CDSA)", () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page, DRUG_TRAFFICKING_RESPONSE, DRUG_VERIFY_RESPONSE);
  });

  test("shows CDSA civil law sections", async ({ page }) => {
    await submitScenario(page, "Accused sold cocaine to an undercover officer and had more drugs at home");
    await expect(page.getByText("Trafficking in a substance listed in Schedule I (cocaine) is an indictable offence.")).toBeVisible();
    await expect(page.getByText("Maximum life imprisonment for trafficking in a Schedule I substance.")).toBeVisible();
  });

  test("shows Charter Search and Seizure concern", async ({ page }) => {
    await submitScenario(page, "Accused sold cocaine to an undercover officer and had more drugs at home");
    await expect(page.locator('[data-testid="results-section"]').getByText("Charter Rights", { exact: true })).toBeVisible();
    await expect(page.getByText("Residential search requires a warrant. Evidence at residence may be challenged.")).toBeVisible();
  });

  test("shows verified ONCA case law", async ({ page }) => {
    await submitScenario(page, "Accused sold cocaine to an undercover officer and had more drugs at home");
    await expect(page.getByText("R v Nguyen, 2020 ONCA 25")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: Sexual Assault
// ---------------------------------------------------------------------------

const SEXUAL_ASSAULT_RESPONSE = {
  summary:
    "The complainant alleges that the accused engaged in sexual touching without consent at a party after the complainant had consumed alcohol.",
  criminal_code: [
    {
      citation: "s. 271",
      title: "Sexual Assault",
      summary: "Assault of a sexual nature committed without consent.",
    },
    {
      citation: "s. 273.1",
      title: "Meaning of Consent",
      summary: "Consent means voluntary agreement to engage in sexual activity.",
    },
    {
      citation: "s. 276",
      title: "Evidence of Complainant's Sexual Activity",
      summary: "Rape shield provisions restricting use of prior sexual history.",
    },
  ],
  case_law: [
    {
      citation: "R v Ewanchuk, 1999 CanLII 711 (SCC)",
      title: "R v Ewanchuk",
      summary: "There is no defence of implied consent to sexual assault.",
      court: "SCC",
      year: "1999",
      matched_content: "Consent must be communicated; silence or ambiguity does not constitute consent.",
    },
  ],
  civil_law: [],
  charter: [
    {
      citation: "s. 7",
      title: "Life, Liberty and Security",
      summary: "Accused right to full answer and defence must be balanced against complainant privacy rights.",
    },
  ],
  analysis:
    "The key issue is consent under s.273.1. Intoxication of the complainant affects capacity to consent. Ewanchuk confirms there is no implied consent.",
  suggestions: [
    { type: "canlii", label: "sexual assault consent intoxication", term: "sexual assault consent intoxication" },
  ],
};

const SEXUAL_ASSAULT_VERIFY_RESPONSE = {
  "R v Ewanchuk, 1999 CanLII 711 (SCC)": {
    status: "verified",
    url: "https://www.canlii.org/en/ca/scc/doc/1999/1999canlii711/1999canlii711.html",
    searchUrl: "https://www.canlii.org/en/#search/text=R+v+Ewanchuk",
    title: "R v Ewanchuk",
  },
};

test.describe("Scenario: Sexual Assault", () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page, SEXUAL_ASSAULT_RESPONSE, SEXUAL_ASSAULT_VERIFY_RESPONSE);
  });

  test("shows sexual assault and consent sections", async ({ page }) => {
    await submitScenario(page, "Accused touched the complainant sexually at a party without consent");
    await expect(page.getByText("Assault of a sexual nature committed without consent.")).toBeVisible();
    await expect(page.getByText("Consent means voluntary agreement to engage in sexual activity.")).toBeVisible();
  });

  test("shows rape shield provision summary", async ({ page }) => {
    await submitScenario(page, "Accused touched the complainant sexually at a party without consent");
    await expect(page.getByText("Rape shield provisions restricting use of prior sexual history.")).toBeVisible();
  });

  test("shows Ewanchuk case verified", async ({ page }) => {
    await submitScenario(page, "Accused touched the complainant sexually at a party without consent");
    await expect(page.getByText("R v Ewanchuk, 1999 CanLII 711 (SCC)")).toBeVisible();
    await expect(page.getByRole("link", { name: /Verified on CanLII/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: Fraud Over $5,000
// ---------------------------------------------------------------------------

const FRAUD_RESPONSE = {
  summary:
    "The accused operated a fraudulent investment scheme, collecting over $200,000 from victims while never investing the funds.",
  criminal_code: [
    {
      citation: "s. 380(1)(a)",
      title: "Fraud Over $5,000",
      summary: "Defrauding the public or any person of property, money, or services valued over $5,000.",
    },
    {
      citation: "s. 380.1",
      title: "Aggravating Factors — Fraud",
      summary: "Sentencing aggravating factors including large number of victims and sophistication.",
    },
  ],
  case_law: [
    {
      citation: "R v Theroux, 1993 CanLII 134 (SCC)",
      title: "R v Theroux",
      summary: "Defined the mental element for fraud: subjective knowledge of the prohibited act and risk of deprivation.",
      court: "SCC",
      year: "1993",
      matched_content: "Fraud requires proof of dishonest act and subjective awareness of deprivation risk.",
    },
  ],
  civil_law: [],
  charter: [],
  analysis:
    "Operating a Ponzi-style scheme meets the actus reus of fraud under s.380(1)(a). The scale and sophistication of the scheme engages aggravating factors under s.380.1.",
  suggestions: [
    { type: "canlii", label: "fraud investment sentencing", term: "fraud investment sentencing" },
    { type: "criminal_code", label: "s. 380", citation: "s. 380" },
  ],
};

const FRAUD_VERIFY_RESPONSE = {
  "R v Theroux, 1993 CanLII 134 (SCC)": {
    status: "verified",
    url: "https://www.canlii.org/en/ca/scc/doc/1993/1993canlii134/1993canlii134.html",
    searchUrl: "https://www.canlii.org/en/#search/text=R+v+Theroux",
    title: "R v Theroux",
  },
};

test.describe("Scenario: Fraud Over $5,000", () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page, FRAUD_RESPONSE, FRAUD_VERIFY_RESPONSE);
  });

  test("shows fraud over $5,000 section", async ({ page }) => {
    await submitScenario(page, "Accused ran a fake investment scheme collecting $200,000 from victims");
    await expect(page.getByText("Defrauding the public or any person of property, money, or services valued over $5,000.")).toBeVisible();
  });

  test("shows aggravating factors section", async ({ page }) => {
    await submitScenario(page, "Accused ran a fake investment scheme collecting $200,000 from victims");
    await expect(page.getByText("Sentencing aggravating factors including large number of victims and sophistication.")).toBeVisible();
  });

  test("shows Theroux verified and analysis mentions Ponzi", async ({ page }) => {
    await submitScenario(page, "Accused ran a fake investment scheme collecting $200,000 from victims");
    await expect(page.getByText("R v Theroux, 1993 CanLII 134 (SCC)")).toBeVisible();
    await expect(page.locator("body")).toContainText("Ponzi");
  });
});

// ---------------------------------------------------------------------------
// Scenario 6: Youth Offender (YCJA)
// ---------------------------------------------------------------------------

const YCJA_RESPONSE = {
  summary:
    "A 15-year-old was caught shoplifting electronics worth $800 from a department store. This is the youth's first offence.",
  criminal_code: [
    {
      citation: "s. 334(b)",
      title: "Theft Under $5,000",
      summary: "Theft of property valued under $5,000.",
    },
  ],
  case_law: [],
  civil_law: [
    {
      citation: "YCJA s. 4",
      title: "Extrajudicial Measures",
      summary: "Extrajudicial measures are presumed adequate for first-time non-violent offences by youth.",
      act: "YCJA",
    },
    {
      citation: "YCJA s. 38",
      title: "Purpose of Youth Sentencing",
      summary: "Youth sentencing focuses on rehabilitation and reintegration, not deterrence and denunciation.",
      act: "YCJA",
    },
  ],
  charter: [],
  analysis:
    "As a first offence by a 15-year-old, YCJA s.4 creates a presumption in favour of extrajudicial measures such as a caution or referral to a community program.",
  suggestions: [
    { type: "canlii", label: "youth extrajudicial measures shoplifting", term: "youth extrajudicial measures shoplifting" },
  ],
};

test.describe("Scenario: Youth Offender (YCJA)", () => {
  test.beforeEach(async ({ page }) => {
    await mockApis(page, YCJA_RESPONSE);
  });

  test("shows YCJA extrajudicial measures and sentencing purpose", async ({ page }) => {
    await submitScenario(page, "A 15-year-old first-time offender was caught shoplifting $800 of electronics");
    await expect(page.getByText("Extrajudicial measures are presumed adequate for first-time non-violent offences by youth.")).toBeVisible();
    await expect(page.getByText("Youth sentencing focuses on rehabilitation and reintegration, not deterrence and denunciation.")).toBeVisible();
  });

  test("shows underlying CC theft section alongside YCJA", async ({ page }) => {
    await submitScenario(page, "A 15-year-old first-time offender was caught shoplifting $800 of electronics");
    await expect(page.getByText("Theft of property valued under $5,000.")).toBeVisible();
    await expect(page.getByText("YCJA s. 4")).toBeVisible();
  });

  test("analysis mentions extrajudicial measures", async ({ page }) => {
    await submitScenario(page, "A 15-year-old first-time offender was caught shoplifting $800 of electronics");
    await expect(page.getByText("Legal Analysis")).toBeVisible();
    await expect(page.locator("body")).toContainText("extrajudicial measures");
  });
});
