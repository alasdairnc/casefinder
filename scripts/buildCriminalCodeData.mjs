#!/usr/bin/env node
// scripts/buildCriminalCodeData.mjs
// Fetches Criminal Code XML from Justice Laws and extracts all section numbers + titles.
// Outputs a JSON file that can be used to expand criminalCodeData.js.
//
// Usage: node scripts/buildCriminalCodeData.mjs

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const XML_URL = "https://laws-lois.justice.gc.ca/eng/XML/C-46.xml";

// Criminal Code Part boundaries (section number ranges)
// Used to assign partOf to each section
const PARTS = [
  { id: "I", label: "Part I — General", min: 2, max: 45 },
  { id: "II", label: "Part II — Offences Against Public Order", min: 46, max: 83.9 },
  { id: "II.1", label: "Part II.1 — Terrorism", min: 83.01, max: 83.33 },
  { id: "III", label: "Part III — Firearms and Other Weapons", min: 84, max: 117.15 },
  { id: "IV", label: "Part IV — Offences Against Administration of Law and Justice", min: 118, max: 149 },
  { id: "V", label: "Part V — Sexual Offences, Public Morals and Disorderly Conduct", min: 150, max: 182 },
  { id: "VI", label: "Part VI — Invasion of Privacy", min: 183, max: 196.1 },
  { id: "VII", label: "Part VII — Disorderly Houses, Gaming and Betting", min: 197, max: 213 },
  { id: "VIII", label: "Part VIII — Offences Against the Person and Reputation", min: 214, max: 320.1 },
  { id: "VIII.1", label: "Part VIII.1 — Offences Relating to Conveyances", min: 320.11, max: 320.4 },
  { id: "IX", label: "Part IX — Offences Against Rights of Property", min: 321, max: 378 },
  { id: "X", label: "Part X — Fraudulent Transactions Relating to Contracts and Trade", min: 379, max: 427 },
  { id: "XI", label: "Part XI — Wilful and Forbidden Acts in Respect of Certain Property", min: 428, max: 447 },
  { id: "XII", label: "Part XII — Offences Relating to Currency", min: 448, max: 462 },
  { id: "XII.1", label: "Part XII.1 — Instruments and Literature for Illicit Drug Use", min: 462.1, max: 462.2 },
  { id: "XII.2", label: "Part XII.2 — Proceeds of Crime", min: 462.3, max: 462.5 },
  { id: "XIII", label: "Part XIII — Attempts — Conspiracies — Accessories", min: 463, max: 467.2 },
  { id: "XIV", label: "Part XIV — Jurisdiction", min: 468, max: 482 },
  { id: "XV", label: "Part XV — Special Procedure and Powers", min: 483, max: 492.2 },
  { id: "XVI", label: "Part XVI — Compelling Appearance and Interim Release", min: 493, max: 529.5 },
  { id: "XVII", label: "Part XVII — Language of Accused", min: 530, max: 533.1 },
  { id: "XVIII", label: "Part XVIII — Procedure on Preliminary Inquiry", min: 535, max: 551 },
  { id: "XVIII.1", label: "Part XVIII.1 — Case Management Judge", min: 551.1, max: 551.7 },
  { id: "XIX", label: "Part XIX — Indictable Offences — Trial Without Jury", min: 552, max: 572 },
  { id: "XIX.1", label: "Part XIX.1 — Nunavut Court of Justice", min: 573, max: 573.2 },
  { id: "XX", label: "Part XX — Procedure in Jury Trials and General Provisions", min: 574, max: 672 },
  { id: "XX.1", label: "Part XX.1 — Mental Disorder", min: 672.1, max: 672.95 },
  { id: "XXI", label: "Part XXI — Appeals — Indictable Offences", min: 673, max: 696 },
  { id: "XXI.1", label: "Part XXI.1 — Applications for Ministerial Review — Miscarriages of Justice", min: 696.1, max: 696.6 },
  { id: "XXII", label: "Part XXII — Procuring Attendance", min: 697, max: 715 },
  { id: "XXII.01", label: "Part XXII.01 — Remote Attendance by Certain Persons", min: 715.21, max: 715.26 },
  { id: "XXII.1", label: "Part XXII.1 — Remediation Agreements", min: 715.3, max: 715.43 },
  { id: "XXIII", label: "Part XXIII — Sentencing", min: 716, max: 751.1 },
  { id: "XXIV", label: "Part XXIV — Dangerous Offenders and Long-Term Offenders", min: 752, max: 761 },
  { id: "XXV", label: "Part XXV — Effect and Enforcement of Recognizances", min: 762, max: 773 },
  { id: "XXVI", label: "Part XXVI — Extraordinary Remedies", min: 774, max: 784 },
  { id: "XXVII", label: "Part XXVII — Summary Convictions", min: 785, max: 840 },
  { id: "XXVIII", label: "Part XXVIII — Miscellaneous", min: 841, max: 849 },
];

function assignPart(sectionNum) {
  const num = parseFloat(sectionNum);
  if (isNaN(num)) return "";

  // Terrorism sections (83.xx) belong to Part II.1
  if (sectionNum.startsWith("83.") && num >= 83.01) {
    return "Part II.1 — Terrorism";
  }
  // Conveyances (320.1x) belong to Part VIII.1
  if (num >= 320.11 && num <= 320.4) {
    return "Part VIII.1 — Offences Relating to Conveyances";
  }

  for (const part of PARTS) {
    if (num >= part.min && num <= part.max) {
      return part.label;
    }
  }
  return "";
}

async function fetchXML() {
  console.log(`Fetching ${XML_URL}...`);
  const res = await fetch(XML_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  console.log(`Fetched ${(text.length / 1024 / 1024).toFixed(1)} MB`);
  return text;
}

function extractSections(xml) {
  const sections = [];
  const seen = new Set();
  // Match each <Section ...>...</Section> block
  const sectionRegex = /<Section[^>]*>([\s\S]*?)<\/Section>/g;
  let match;

  while ((match = sectionRegex.exec(xml)) !== null) {
    const block = match[1];

    // Extract Label (section number)
    const labelMatch = block.match(/<Label>(\d+(?:\.\d+)?)<\/Label>/);
    if (!labelMatch) continue;
    const sectionNum = labelMatch[1];

    // Skip if the entire section is repealed
    if (block.includes("[Repealed") && !block.match(/<Text>[^<]*[A-Za-z]/)) {
      // Check if there's meaningful text beyond just "[Repealed...]"
      const textBlocks = block.match(/<Text>([\s\S]*?)<\/Text>/g) || [];
      const hasContent = textBlocks.some(t => {
        const stripped = t.replace(/<[^>]+>/g, "").replace(/\[Repealed[^\]]*\]/g, "").trim();
        return stripped.length > 20;
      });
      if (!hasContent) continue;
    }

    // Extract MarginalNote (title)
    const mnMatch = block.match(/<MarginalNote[^>]*>([\s\S]*?)<\/MarginalNote>/);
    let title = "";
    if (mnMatch) {
      title = mnMatch[1].replace(/<[^>]+>/g, "").trim();
    }

    if (!title) {
      // Some sections don't have a marginal note — skip them (usually sub-provisions)
      continue;
    }

    const partOf = assignPart(sectionNum);

    // Deduplicate: keep the first occurrence of each section number
    // (first in document order is the main provision; later ones are transitional/review)
    if (!seen.has(sectionNum)) {
      seen.add(sectionNum);
      sections.push({
        section: sectionNum,
        title,
        partOf,
      });
    }
  }

  return sections;
}

async function main() {
  const xml = await fetchXML();
  const sections = extractSections(xml);

  console.log(`Extracted ${sections.length} sections`);

  // Sort by numeric section number
  sections.sort((a, b) => {
    const na = parseFloat(a.section);
    const nb = parseFloat(b.section);
    return na - nb;
  });

  // Write output
  const outPath = resolve(__dirname, "criminal-code-sections.json");
  writeFileSync(outPath, JSON.stringify(sections, null, 2));
  console.log(`Written to ${outPath}`);

  // Print summary by Part
  const partCounts = {};
  for (const s of sections) {
    const p = s.partOf || "(no part)";
    partCounts[p] = (partCounts[p] || 0) + 1;
  }
  console.log("\nSections by Part:");
  for (const [part, count] of Object.entries(partCounts).sort()) {
    console.log(`  ${part}: ${count}`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
