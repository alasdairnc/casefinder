// Family law landmark cases (spousal support, custody / best interests,
// common-law property / unjust enrichment). Used by the local retrieval
// fallback and as a base for family-law landmark seeds.
//
// NOTE: family scenarios are not yet classified by detectCoreIssue (they fall
// through to "general_criminal"), so these surface via token-overlap in the
// general fallback and, for the high-frequency domains, via landmark seeds.

export const familyCases = [
  // ── SPOUSAL SUPPORT ───────────────────────────────────────
  {
    citation: "[1999] 1 SCR 420",
    title: "Bracklow v. Bracklow",
    year: 1999,
    court: "SCC",
    topics: ["Family Law", "Spousal Support", "Divorce Act"],
    tags: [
      "spousal support",
      "non-compensatory support",
      "needs based support",
      "self-sufficiency",
      "maintenance",
    ],
    facts:
      "After the marriage ended, Mrs. Bracklow became disabled and unable to support herself. She sought ongoing spousal support from her former husband although she had been financially independent during much of the relationship.",
    ratio:
      "Spousal support rests on three conceptual bases: compensatory (for economic advantages or disadvantages arising from the marriage or its breakdown), contractual (agreements between the spouses), and non-compensatory or 'needs-based' (where one spouse cannot achieve self-sufficiency, the marriage itself can ground a residual obligation). Need alone can found an entitlement to support.",
  },
  {
    citation: "[1992] 3 SCR 813",
    title: "Moge v. Moge",
    year: 1992,
    court: "SCC",
    topics: ["Family Law", "Spousal Support", "Divorce Act"],
    tags: [
      "spousal support",
      "compensatory support",
      "economic disadvantage",
      "self-sufficiency",
      "long marriage",
    ],
    facts:
      "After a long traditional marriage in which the wife cared for the home and children, a lower court moved to terminate her spousal support on the basis that she should have become self-sufficient.",
    ratio:
      "Spousal support under the Divorce Act is primarily compensatory: it should recognize the economic advantages and disadvantages to each spouse arising from the marriage and its breakdown. Self-sufficiency is only one of several objectives and must not be elevated above fairly compensating a spouse for the economic consequences of the marriage.",
  },

  // ── CUSTODY / PARENTING / RELOCATION (BEST INTERESTS) ─────
  {
    citation: "[1996] 2 SCR 27",
    title: "Gordon v. Goertz",
    year: 1996,
    court: "SCC",
    topics: ["Family Law", "Custody", "Relocation", "Best Interests of the Child"],
    tags: [
      "child custody",
      "best interests of the child",
      "relocation",
      "mobility",
      "access",
      "material change",
    ],
    facts:
      "A custodial mother wished to move abroad to study, taking the child with her. The father sought to prevent the relocation and to vary custody.",
    ratio:
      "A parent seeking to vary a custody or access order to relocate must first establish a material change in the child's circumstances. The court then makes a fresh inquiry into the best interests of the child — the only consideration — with no legal presumption in favour of the custodial parent, although that parent's views are entitled to great respect.",
  },
  {
    citation: "2022 SCC 22",
    title: "Barendregt v. Grebliunas",
    year: 2022,
    court: "SCC",
    topics: ["Family Law", "Relocation", "Best Interests of the Child"],
    tags: [
      "relocation",
      "child mobility",
      "best interests of the child",
      "parenting",
      "move-away",
    ],
    facts:
      "Following separation, the mother sought to relocate with the children roughly ten hours away from the father, who opposed the move.",
    ratio:
      "Relocation decisions turn entirely on the best interests of the child, assessed through a highly fact-specific and discretionary inquiry into the child's physical, emotional and psychological safety, security and well-being. The court restated the modern relocation framework and reaffirmed the limited scope for appellate intervention in such discretionary decisions.",
  },

  // ── COMMON-LAW SPOUSES: PROPERTY & UNJUST ENRICHMENT ──────
  {
    citation: "2011 SCC 10",
    title: "Kerr v. Baranow",
    year: 2011,
    court: "SCC",
    topics: ["Family Law", "Unjust Enrichment", "Common-Law Spouses", "Property"],
    tags: [
      "common law spouse",
      "unjust enrichment",
      "joint family venture",
      "division of property",
      "constructive trust",
    ],
    facts:
      "An older couple separated after a common-law relationship of more than 25 years and disputed the division of property accumulated during the relationship.",
    ratio:
      "Property disputes between unmarried (common-law) spouses are resolved through the law of unjust enrichment. Where the parties' relationship was a 'joint family venture' and the claimant's contributions are linked to the accumulation of wealth, the remedy may be a proportionate monetary share of that wealth rather than a fee-for-services calculation.",
  },
  {
    citation: "[1980] 2 SCR 834",
    title: "Pettkus v. Becker",
    year: 1980,
    court: "SCC",
    topics: ["Family Law", "Unjust Enrichment", "Constructive Trust", "Property"],
    tags: [
      "unjust enrichment",
      "constructive trust",
      "common law spouse",
      "property",
      "contributions",
    ],
    facts:
      "An unmarried woman contributed labour and money to her partner's farm and beekeeping business over about 19 years. On separation the property stood in his name alone.",
    ratio:
      "Established the modern Canadian doctrine of unjust enrichment — an enrichment, a corresponding deprivation, and the absence of any juristic reason — and recognized the remedial constructive trust as a remedy. It applied these principles to award a common-law partner a share of property to which she had contributed.",
  },
];
