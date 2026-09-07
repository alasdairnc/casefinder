#!/usr/bin/env node
// scripts/expand-caselaw.js
// Propose-only caselaw corpus EXPANSION ("make the knowledge more expansive").
//
// This is the counterpart to the relevance loop (improve-caselaw.js). It never
// edits the corpus. It discovers candidate Canadian cases, VERIFIES every
// candidate citation against the CanLII API, dedupes against the existing
// corpus, and writes a dated, human-gated proposal digest.
//
// The CanLII verification step is the hard anti-fabrication gate. The corpus
// previously shipped 24 fabricated pre-2000 SCC citations (see project memory).
// A candidate may ONLY be proposed as commit-ready if CanLII confirms it exists.
// Discovery (firecrawl/LLM/manual lists) is allowed to surface wrong or
// hallucinated cites — verification is what stops them reaching the corpus.
//
// Usage:
//   node scripts/expand-caselaw.js [--out-dir DIR] [--limit N]
//                                  [--input candidates.json]
//                                  [--from-failures daily-<date>.json]
//                                  [--queries "topic a;topic b"]
//
// Env:
//   CANLII_API_KEY    required to verify (without it nothing is commit-ready)
//   FIRECRAWL_API_KEY optional; enables web discovery of recent leading cases

import fs from "fs";
import path from "path";

import { lookupCase, buildCitationIdentityKey } from "../src/lib/canlii.js";

// ── candidate corpus (existing) ──────────────────────────────────────────────
// Imported only to build the dedup index. Never mutated.
async function loadExistingIdentityKeys() {
  const keys = new Set();
  const add = (citation) => {
    if (citation) keys.add(buildCitationIdentityKey(citation));
  };
  try {
    const { MASTER_CASE_LAW_DB } = await import(
      "../src/lib/caselaw/index.js"
    );
    for (const c of MASTER_CASE_LAW_DB || []) {
      // caselaw/* entries store the neutral cite alone (e.g. "2016 SCC 27")
      add(c.citation);
      if (c.title && c.citation) add(`${c.title}, ${c.citation}`);
    }
  } catch (err) {
    process.stderr.write(`warn: could not load MASTER_CASE_LAW_DB: ${err.message}\n`);
  }
  try {
    const mod = await import("../src/lib/landmarkCases.js");
    const LANDMARK_CASES = mod.LANDMARK_CASES || mod.default || [];
    for (const c of LANDMARK_CASES) add(c.citation);
  } catch (err) {
    process.stderr.write(`warn: could not load LANDMARK_CASES: ${err.message}\n`);
  }
  return keys;
}

// ── arg parsing ──────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = {
    outDir: "reports/caselaw-expansion",
    limit: 40,
    input: "",
    fromFailures: "",
    queries: "",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--out-dir" && next) (out.outDir = next), (i += 1);
    else if (arg === "--limit" && next)
      (out.limit = Math.max(1, Math.min(200, Number(next) || 40))), (i += 1);
    else if (arg === "--input" && next) (out.input = next), (i += 1);
    else if (arg === "--from-failures" && next)
      (out.fromFailures = next), (i += 1);
    else if (arg === "--queries" && next) (out.queries = next), (i += 1);
  }
  return out;
}

// ── citation extraction ──────────────────────────────────────────────────────
// Pull plausible Canadian neutral / SCR citations out of free text. These are
// CANDIDATES only — every one is verified against CanLII before it can be
// proposed, so a greedy/loose regex here is safe.
const NEUTRAL_RE = /\b((?:19|20)\d{2})\s+([A-Z]{2,8})\s+(\d{1,5})\b/g;
const SCR_RE = /\[((?:19|20)\d{2})\]\s+\d+\s+S\.?C\.?R\.?\s+\d+/g;

export function extractCitations(text) {
  if (!text || typeof text !== "string") return [];
  const found = new Set();
  let m;
  while ((m = NEUTRAL_RE.exec(text)) !== null) {
    found.add(`${m[1]} ${m[2]} ${m[3]}`);
  }
  while ((m = SCR_RE.exec(text)) !== null) {
    found.add(m[0].replace(/S\.C\.R\./i, "SCR"));
  }
  return [...found];
}

// ── discovery: gap topics from production no-caselaw failures ─────────────────
// Tells us WHICH areas the live product fails to cover. These become firecrawl
// search queries (and a human-curation list when discovery is unavailable).
function gapTopicsFromFailures(failuresPath) {
  if (!failuresPath || !fs.existsSync(failuresPath)) return [];
  try {
    const payload = JSON.parse(fs.readFileSync(failuresPath, "utf8"));
    const events =
      payload.events || payload.failures || payload.samples || [];
    const topics = new Map();
    for (const ev of events) {
      const q = (ev.query || ev.q || ev.prompt || "").toString().trim();
      if (q) topics.set(q.toLowerCase(), q);
    }
    return [...topics.values()];
  } catch {
    return [];
  }
}

// ── discovery: firecrawl web search (optional) ───────────────────────────────
async function discoverViaFirecrawl(queries, apiKey, limit) {
  if (!apiKey || !queries.length) return { candidates: [], note: null };
  const candidates = new Map(); // citation -> {citation, title, source}
  const errors = [];
  for (const q of queries.slice(0, Math.min(queries.length, 8))) {
    const searchQuery = `${q} leading Canadian case Supreme Court of Canada citation site:canlii.org`;
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ query: searchQuery, limit: 5 }),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) {
        errors.push(`"${q}": HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      const results = data.data || data.results || [];
      for (const r of results) {
        const blob = `${r.title || ""} ${r.description || ""} ${r.url || ""} ${r.markdown || ""}`;
        for (const cite of extractCitations(blob)) {
          if (!candidates.has(cite)) {
            candidates.set(cite, {
              citation: cite,
              title: (r.title || "").slice(0, 120),
              source: `firecrawl:${q}`,
            });
          }
          if (candidates.size >= limit) break;
        }
        if (candidates.size >= limit) break;
      }
    } catch (err) {
      errors.push(`"${q}": ${err.message}`);
    }
    if (candidates.size >= limit) break;
  }
  return {
    candidates: [...candidates.values()],
    note: errors.length ? `firecrawl errors: ${errors.join("; ")}` : null,
  };
}

// ── candidate ingestion from explicit input file ─────────────────────────────
function candidatesFromInput(inputPath) {
  if (!inputPath || !fs.existsSync(inputPath)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(inputPath, "utf8"));
    const arr = Array.isArray(raw) ? raw : raw.candidates || [];
    return arr
      .map((c) =>
        typeof c === "string"
          ? { citation: c, source: "input" }
          : { citation: c.citation, title: c.title, source: c.source || "input" },
      )
      .filter((c) => c.citation);
  } catch {
    return [];
  }
}

// ── verification gate ────────────────────────────────────────────────────────
async function verifyCandidate(candidate, apiKey) {
  // Without an API key we cannot verify; mark explicitly. Never commit-ready.
  if (!apiKey) {
    return { ...candidate, status: "needs_key" };
  }
  try {
    const verdict = await lookupCase(candidate.citation, apiKey);
    return {
      ...candidate,
      status: verdict.status,
      url: verdict.url || verdict.searchUrl,
      verifiedTitle: verdict.title,
    };
  } catch (err) {
    return { ...candidate, status: "error", error: err.message };
  }
}

// ── bucketing (pure; the anti-fabrication core) ──────────────────────────────
//  - verified + new       → proposal (commit-ready after human review)
//  - verified + in corpus → duplicate
//  - not_found            → rejected: a real fabrication signal (CanLII has no
//                           such case for these parties)
//  - needs_key            → dropped (no key; surfaced in the digest header)
//  - everything else      → unresolved: could NOT be checked. NOT a fabrication
//                           signal — e.g. legacy [YYYY] N SCR cites parse to
//                           number:null and can't be API-verified. Never fake.
export function bucketVerdicts(verified, existingKeys) {
  const proposals = [];
  const duplicates = [];
  const rejected = [];
  const unresolved = [];
  for (const v of verified) {
    if (v.status === "verified") {
      if (existingKeys.has(buildCitationIdentityKey(v.citation))) duplicates.push(v);
      else proposals.push(v);
    } else if (v.status === "not_found") {
      rejected.push(v);
    } else if (v.status === "needs_key") {
      // Cannot decide; surfaced in digest header, not proposed.
    } else {
      unresolved.push(v);
    }
  }
  return { proposals, duplicates, rejected, unresolved };
}

// ── digest rendering ─────────────────────────────────────────────────────────
function renderDigest({
  dateTag,
  existingCount,
  gapTopics,
  discoveryNote,
  candidates,
  verified,
  rejected,
  unresolved,
  duplicates,
  proposals,
  hasCanliiKey,
  hasFirecrawlKey,
}) {
  let status;
  if (proposals.length > 0) status = "🟡 PROPOSALS READY (human review required)";
  else if (!hasCanliiKey && candidates.length > 0)
    status = "🔑 UNVERIFIED — set CANLII_API_KEY to gate candidates";
  else if (candidates.length === 0) status = "🟢 NO CANDIDATES (idle)";
  else status = "🟢 NO NEW VERIFIED CASES";

  const L = [];
  L.push(`# Caselaw expansion — proposal digest (${dateTag})`);
  L.push("");
  L.push(`**Status:** ${status}`);
  L.push("");
  L.push(
    "_Propose-only run. **No corpus, filter, or threshold files were modified.** " +
      "Every proposed citation below was confirmed to exist via the CanLII API; " +
      "a human must still review fit and write the corpus entry._",
  );
  L.push("");
  L.push("## 1. Inputs");
  L.push(`- Existing corpus citations indexed (dedup): **${existingCount}**`);
  L.push(`- CanLII verification: **${hasCanliiKey ? "enabled" : "DISABLED (no CANLII_API_KEY)"}**`);
  L.push(`- Firecrawl discovery: **${hasFirecrawlKey ? "enabled" : "disabled (no FIRECRAWL_API_KEY)"}**`);
  L.push(`- Gap topics from production failures: **${gapTopics.length}**`);
  if (discoveryNote) L.push(`- ⚠ ${discoveryNote}`);
  L.push(`- Raw candidates gathered: **${candidates.length}**`);
  L.push("");

  L.push("## 2. ✅ Proposed additions (CanLII-verified, not yet in corpus)");
  if (proposals.length === 0) {
    L.push("- _None this run._");
  } else {
    L.push("");
    L.push("| Citation | CanLII title | Source | URL |");
    L.push("| --- | --- | --- | --- |");
    for (const p of proposals) {
      L.push(
        `| ${p.citation} | ${(p.verifiedTitle || "—").replace(/\|/g, "/")} | ${p.source} | ${p.url || ""} |`,
      );
    }
    L.push("");
    L.push(
      "> These exist on CanLII and are absent from the corpus. **Do not bulk-paste.** " +
        "For each, a human writes a real `{ citation, title, year, court, topics, tags, facts, ratio }` " +
        "entry into the appropriate `src/lib/caselaw/*.js` file, then runs `legal-data-validator` " +
        "and `npm run test:guardrails` before committing.",
    );
  }
  L.push("");

  L.push("## 3. ⛔ Rejected — CanLII returned NOT FOUND (fabrication signal)");
  if (rejected.length === 0) {
    L.push("- _None._");
  } else {
    for (const r of rejected) {
      L.push(`- \`${r.citation}\` — **not_found** — source: ${r.source}`);
    }
    L.push("");
    L.push("> Never add these. CanLII has no such case for these parties — exactly the fabrication signal the corpus must block.");
  }
  L.push("");

  L.push("## 4. ⚠ Unresolved — could NOT be verified this run (NOT a fabrication signal)");
  if (!unresolved || unresolved.length === 0) {
    L.push("- _None._");
  } else {
    for (const u of unresolved) {
      L.push(`- \`${u.citation}\` — **${u.status}**${u.error ? ` (${u.error})` : ""} — source: ${u.source}`);
    }
    L.push("");
    L.push(
      "> Not eligible to propose, but **not** evidence of fabrication. Legacy `[YYYY] N SCR` cites can't be " +
        "API-verified (they parse without a CanLII case number). A human can confirm these manually on CanLII.",
    );
  }
  L.push("");

  L.push("## 5. Already in corpus (verified duplicates)");
  L.push(
    duplicates.length
      ? duplicates.map((d) => `- \`${d.citation}\``).join("\n")
      : "- _None._",
  );
  L.push("");

  if (gapTopics.length) {
    L.push("## 6. Coverage gaps (production queries that returned no caselaw)");
    for (const t of gapTopics.slice(0, 25)) L.push(`- ${t}`);
    if (!hasFirecrawlKey) {
      L.push("");
      L.push(
        "> Set `FIRECRAWL_API_KEY` to auto-discover candidate leading cases for these gaps; " +
          "otherwise treat this as a manual curation worklist.",
      );
    }
    L.push("");
  }

  L.push("## Human next steps");
  if (!hasCanliiKey) {
    L.push("1. **Set `CANLII_API_KEY`** — without it nothing can be verified or proposed.");
  }
  L.push(
    `${hasCanliiKey ? "1" : "2"}. Review section 2 proposals; write real corpus entries for the ones that fit CaseDive's scope.`,
  );
  L.push(
    `${hasCanliiKey ? "2" : "3"}. Run \`legal-data-validator\` + \`npm run test:guardrails\` before committing any new case.`,
  );
  L.push(`${hasCanliiKey ? "3" : "4"}. Re-run anytime with \`npm run expand:caselaw\`.`);
  L.push("");
  return L.join("\n");
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const canliiKey = process.env.CANLII_API_KEY || "";
  const firecrawlKey = process.env.FIRECRAWL_API_KEY || "";
  const dateTag = new Date().toISOString().slice(0, 10);

  const existing = await loadExistingIdentityKeys();

  // 1. Gather candidates from all discovery sources.
  const gapTopics = gapTopicsFromFailures(args.fromFailures);
  const queries = [
    ...gapTopics,
    ...args.queries.split(";").map((s) => s.trim()).filter(Boolean),
  ];

  const seen = new Set();
  const candidates = [];
  const pushCandidate = (c) => {
    const key = buildCitationIdentityKey(c.citation);
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(c);
  };

  for (const c of candidatesFromInput(args.input)) pushCandidate(c);

  const { candidates: discovered, note: discoveryNote } =
    await discoverViaFirecrawl(queries, firecrawlKey, args.limit);
  for (const c of discovered) pushCandidate(c);

  const limited = candidates.slice(0, args.limit);

  // 2. Verify every candidate against CanLII (the anti-fabrication gate).
  const verified = [];
  for (const c of limited) {
    verified.push(await verifyCandidate(c, canliiKey));
  }

  // 3. Bucket results.
  const { proposals, duplicates, rejected, unresolved } = bucketVerdicts(
    verified,
    existing,
  );

  // 4. Write digest + machine-readable record. Never touches src/lib.
  const outDir = path.resolve(process.cwd(), args.outDir);
  fs.mkdirSync(outDir, { recursive: true });
  const md = renderDigest({
    dateTag,
    existingCount: existing.size,
    gapTopics,
    discoveryNote,
    candidates: limited,
    verified,
    rejected,
    unresolved,
    duplicates,
    proposals,
    hasCanliiKey: Boolean(canliiKey),
    hasFirecrawlKey: Boolean(firecrawlKey),
  });
  const mdPath = path.join(outDir, `expand-${dateTag}.md`);
  const jsonPath = path.join(outDir, `expand-${dateTag}.json`);
  fs.writeFileSync(mdPath, md);
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      { dateTag, proposals, rejected, unresolved, duplicates, gapTopics, candidateCount: limited.length },
      null,
      2,
    ),
  );

  process.stdout.write(
    `caselaw expansion: ${proposals.length} proposed, ${rejected.length} rejected, ` +
      `${duplicates.length} duplicates → ${path.relative(process.cwd(), mdPath)}\n`,
  );
  // Propose-only: success exit regardless of count. Never fail a scheduled run.
  process.exit(0);
}

// Only run the pipeline when executed directly, so tests can import the pure
// helpers (bucketVerdicts, extractCitations) without triggering a live run.
import { fileURLToPath } from "url";
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    process.stderr.write(`expand-caselaw failed: ${err.stack || err.message}\n`);
    process.exit(1);
  });
}
