#!/usr/bin/env node
// scripts/mergeCriminalCode.mjs
// Merges the extracted XML sections with existing enriched data in criminalCodeData.js.
// Outputs the final criminalCodeData.js with all sections.
//
// Usage: node scripts/mergeCriminalCode.mjs

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Read extracted sections from JSON
const xmlSections = JSON.parse(
  readFileSync(resolve(__dirname, "criminal-code-sections.json"), "utf-8")
);

// Read existing criminalCodeData.js to extract enriched entries
const existingSource = readFileSync(
  resolve(ROOT, "src/lib/criminalCodeData.js"),
  "utf-8"
);

// Parse existing entries from the JS source
// Each entry looks like: ["NUM", { title: "...", ... }],
function parseExistingEntries(source) {
  const entries = new Map();
  // Match each Map entry
  const entryRegex = /\["([^"]+)",\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}\s*\]/g;
  let match;
  while ((match = entryRegex.exec(source)) !== null) {
    const key = match[1];
    const objStr = match[2];

    // Check if this is an enriched entry (has definition field)
    const isEnriched = objStr.includes("definition:");
    const hasPartOf = objStr.includes("partOf:");

    entries.set(key, {
      raw: match[0], // The full raw JS text
      isEnriched,
      hasPartOf,
    });
  }
  return entries;
}

const existingEntries = parseExistingEntries(existingSource);
console.log(`Existing entries: ${existingEntries.size}`);
console.log(
  `Enriched entries: ${[...existingEntries.values()].filter((e) => e.isEnriched).length}`
);

// Criminal Code Part definitions for export
const PARTS_EXPORT = `export const CRIMINAL_CODE_PARTS = [
  { id: "I", label: "Part I — General" },
  { id: "II", label: "Part II — Offences Against Public Order" },
  { id: "II.1", label: "Part II.1 — Terrorism" },
  { id: "III", label: "Part III — Firearms and Other Weapons" },
  { id: "IV", label: "Part IV — Offences Against Administration of Law and Justice" },
  { id: "V", label: "Part V — Sexual Offences, Public Morals and Disorderly Conduct" },
  { id: "VI", label: "Part VI — Invasion of Privacy" },
  { id: "VII", label: "Part VII — Disorderly Houses, Gaming and Betting" },
  { id: "VIII", label: "Part VIII — Offences Against the Person and Reputation" },
  { id: "VIII.1", label: "Part VIII.1 — Offences Relating to Conveyances" },
  { id: "IX", label: "Part IX — Offences Against Rights of Property" },
  { id: "X", label: "Part X — Fraudulent Transactions Relating to Contracts and Trade" },
  { id: "XI", label: "Part XI — Wilful and Forbidden Acts in Respect of Certain Property" },
  { id: "XII", label: "Part XII — Offences Relating to Currency" },
  { id: "XII.2", label: "Part XII.2 — Proceeds of Crime" },
  { id: "XIII", label: "Part XIII — Attempts — Conspiracies — Accessories" },
  { id: "XIV", label: "Part XIV — Jurisdiction" },
  { id: "XV", label: "Part XV — Special Procedure and Powers" },
  { id: "XVI", label: "Part XVI — Compelling Appearance and Interim Release" },
  { id: "XVII", label: "Part XVII — Language of Accused" },
  { id: "XVIII", label: "Part XVIII — Procedure on Preliminary Inquiry" },
  { id: "XVIII.1", label: "Part XVIII.1 — Case Management Judge" },
  { id: "XIX", label: "Part XIX — Indictable Offences — Trial Without Jury" },
  { id: "XIX.1", label: "Part XIX.1 — Nunavut Court of Justice" },
  { id: "XX", label: "Part XX — Procedure in Jury Trials and General Provisions" },
  { id: "XX.1", label: "Part XX.1 — Mental Disorder" },
  { id: "XXI", label: "Part XXI — Appeals — Indictable Offences" },
  { id: "XXI.1", label: "Part XXI.1 — Applications for Ministerial Review — Miscarriages of Justice" },
  { id: "XXII", label: "Part XXII — Procuring Attendance" },
  { id: "XXII.01", label: "Part XXII.01 — Remote Attendance by Certain Persons" },
  { id: "XXII.1", label: "Part XXII.1 — Remediation Agreements" },
  { id: "XXIII", label: "Part XXIII — Sentencing" },
  { id: "XXIV", label: "Part XXIV — Dangerous Offenders and Long-Term Offenders" },
  { id: "XXV", label: "Part XXV — Effect and Enforcement of Recognizances" },
  { id: "XXVI", label: "Part XXVI — Extraordinary Remedies" },
  { id: "XXVII", label: "Part XXVII — Summary Convictions" },
  { id: "XXVIII", label: "Part XXVIII — Miscellaneous" },
];`;

// Build the merged Map entries
// For existing enriched entries: keep the raw JS, inject partOf if missing
// For existing basic entries: keep severity/maxPenalty, add partOf
// For new sections: create basic entry with partOf

function escapeStr(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function buildEntry(section, title, partOf, existing) {
  const url = `\`\${JUSTICE_LAWS_BASE}/section-${section.section}.html\``;

  if (existing && existing.isEnriched) {
    // For enriched entries, we need to inject partOf if missing
    let raw = existing.raw;
    if (!existing.hasPartOf && partOf) {
      // Add partOf before the closing }
      raw = raw.replace(/\}\s*\]$/, `, partOf: "${escapeStr(partOf)}" }]`);
    }
    return raw;
  }

  if (existing) {
    // Existing basic entry — rebuild with partOf
    // Extract severity and maxPenalty from raw
    const sevMatch = existing.raw.match(/severity:\s*"([^"]*)"/);
    const penMatch = existing.raw.match(/maxPenalty:\s*"([^"]*)"/);
    const severity = sevMatch ? sevMatch[1] : "";
    const penalty = penMatch ? penMatch[1] : "";

    const parts = [
      `title: "${escapeStr(title)}"`,
      `severity: "${severity}"`,
      `maxPenalty: "${penalty}"`,
      `url: ${url}`,
    ];
    if (partOf) parts.push(`partOf: "${escapeStr(partOf)}"`);
    return `["${section.section}", { ${parts.join(", ")} }]`;
  }

  // New section — basic entry
  const parts = [
    `title: "${escapeStr(title)}"`,
    `severity: ""`,
    `maxPenalty: ""`,
    `url: ${url}`,
  ];
  if (partOf) parts.push(`partOf: "${escapeStr(partOf)}"`);
  return `["${section.section}", { ${parts.join(", ")} }]`;
}

// Sort sections by numeric value for output
const sortedSections = [...xmlSections].sort((a, b) => {
  const na = parseFloat(a.section);
  const nb = parseFloat(b.section);
  if (na !== nb) return na - nb;
  // For same float value (e.g., 83.02 vs 83.03), compare as strings
  return a.section.localeCompare(b.section);
});

// Group by Part for comments
let currentPart = "";
const lines = [];
let newCount = 0;
let preservedCount = 0;

for (const section of sortedSections) {
  const existing = existingEntries.get(section.section);

  // Use existing title for preserved entries, XML title for new
  const title = existing
    ? (existing.raw.match(/title:\s*"([^"]*)"/) || [])[1] || section.title
    : section.title;

  const entry = buildEntry(section, title, section.partOf, existing);

  // Add Part comment separator
  if (section.partOf && section.partOf !== currentPart) {
    currentPart = section.partOf;
    lines.push("");
    lines.push(`  // ── ${currentPart} ──`);
  }

  lines.push(`  ${entry},`);

  if (existing) preservedCount++;
  else newCount++;
}

// Check for existing entries not in XML (shouldn't happen, but just in case)
const xmlSectionNums = new Set(xmlSections.map((s) => s.section));
let missingFromXml = 0;
for (const [key, existing] of existingEntries) {
  if (!xmlSectionNums.has(key)) {
    console.warn(`Warning: existing section ${key} not found in XML — preserving it`);
    lines.push(`  ${existing.raw},`);
    missingFromXml++;
  }
}

console.log(
  `\nMerge result: ${sortedSections.length + missingFromXml} total entries`
);
console.log(`  Preserved from existing: ${preservedCount}`);
console.log(`  New from XML: ${newCount}`);
console.log(`  Existing but not in XML: ${missingFromXml}`);

// Build the final file
const output = `// src/lib/criminalCodeData.js
// Complete Criminal Code (RSC 1985, c C-46) section lookup.
// Auto-generated from Justice Laws XML (laws-lois.justice.gc.ca/eng/XML/C-46.xml)
// Generated: ${new Date().toLocaleDateString("en-CA", { month: "long", year: "numeric" })} | Sections: ${sortedSections.length + missingFromXml}
// Includes all numbered sections from the Criminal Code.
// 46 high-priority sections are enriched with definitions, defences, and related sections.
//
// This file is used by api/verify.js to confirm AI-suggested Criminal Code
// sections are real and by CriminalCodeExplorer for browsing/searching.

const JUSTICE_LAWS_BASE = "https://laws-lois.justice.gc.ca/eng/acts/c-46";

export const CRIMINAL_CODE_SECTIONS = new Map([
${lines.join("\n")}
]);

${PARTS_EXPORT}

/**
 * Normalize a citation string like "s. 348(1)(b)" to its base section number "348".
 * Handles decimal sections like "s. 320.14(1)(a)" → "320.14".
 * Returns null if the string does not look like a Criminal Code section.
 */
export function normalizeSection(citation) {
  if (!citation || typeof citation !== "string") return null;
  const match = citation.match(/(?:^s\\.\\s*|^section\\s+|^)(\\d+(?:\\.\\d+)?)/i);
  return match ? match[1] : null;
}

/**
 * Look up a Criminal Code section. Returns the entry object or null.
 * Entry: { title, severity, maxPenalty, url, partOf, ... }
 */
export function lookupSection(citation) {
  const num = normalizeSection(citation);
  if (!num) return null;
  return CRIMINAL_CODE_SECTIONS.get(num) || null;
}
`;

const outPath = resolve(ROOT, "src/lib/criminalCodeData.js");
writeFileSync(outPath, output);
console.log(`\nWritten to ${outPath}`);
console.log(`File size: ${(output.length / 1024).toFixed(1)} KB`);
