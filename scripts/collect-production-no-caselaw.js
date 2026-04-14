#!/usr/bin/env node

import fs from "fs";
import path from "path";
import crypto from "crypto";

function parseArgs(argv) {
  const out = {
    baseUrl: process.env.RETRIEVAL_HEALTH_BASE_URL || "https://www.casedive.ca",
    fallbackBaseUrls: (process.env.RETRIEVAL_HEALTH_FALLBACK_BASE_URLS || "https://casedive.vercel.app")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    outDir: "reports/retrieval-autofix",
    limit: 100,
    maxPages: 8,
    input: "",
    softFail: process.env.RETRIEVAL_HEALTH_SOFT_FAIL !== "false",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--base-url" && next) {
      out.baseUrl = next;
      i += 1;
    } else if (arg === "--out-dir" && next) {
      out.outDir = next;
      i += 1;
    } else if (arg === "--limit" && next) {
      out.limit = Math.max(1, Math.min(100, Number(next) || 100));
      i += 1;
    } else if (arg === "--max-pages" && next) {
      out.maxPages = Math.max(1, Math.min(30, Number(next) || 8));
      i += 1;
    } else if (arg === "--input" && next) {
      out.input = next;
      i += 1;
    }
  }

  return out;
}

function isCloudflareChallenge(bodyText = "") {
  const body = String(bodyText || "").toLowerCase();
  return (
    body.includes("just a moment") ||
    body.includes("cf-browser-verification") ||
    body.includes("cloudflare")
  );
}

function normalizeSnippet(snippet) {
  return String(snippet || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
}

function makeScenarioKey(item) {
  const basis = `${normalizeSnippet(item.scenarioSnippet)}|${String(item.reason || "unknown")}`;
  return crypto.createHash("sha256").update(basis).digest("hex").slice(0, 16);
}

function groupEvents(events) {
  const map = new Map();
  for (const event of events) {
    const key = makeScenarioKey(event);
    const existing = map.get(key);
    const ts = Date.parse(event.ts || "") || Date.now();
    if (!existing) {
      map.set(key, {
        key,
        reason: event.reason || "unknown",
        count: 1,
        firstSeen: new Date(ts).toISOString(),
        lastSeen: new Date(ts).toISOString(),
        scenarioSnippet: normalizeSnippet(event.scenarioSnippet),
        samples: [event].slice(0, 3),
      });
      continue;
    }

    existing.count += 1;
    if (new Date(existing.firstSeen).getTime() > ts) {
      existing.firstSeen = new Date(ts).toISOString();
    }
    if (new Date(existing.lastSeen).getTime() < ts) {
      existing.lastSeen = new Date(ts).toISOString();
    }
    if (existing.samples.length < 3) existing.samples.push(event);
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function toReasonCounts(events) {
  const counts = {};
  for (const event of events) {
    const reason = String(event.reason || "unknown");
    counts[reason] = (counts[reason] || 0) + 1;
  }
  return counts;
}

function writeOutputs(summary) {
  if (!process.env.GITHUB_OUTPUT) return;
  const lines = [
    `report_path=${summary.reportPath}`,
    `markdown_path=${summary.markdownPath}`,
    `total_failures=${summary.totalFailures}`,
    `no_caselaw_failures=${summary.noCaselawFailures}`,
    `group_count=${summary.groupCount}`,
  ];
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
}

async function fetchFailureArchive(baseUrl, token, limit, maxPages) {
  const cleanBase = String(baseUrl || "").replace(/\/$/, "");
  const allItems = [];
  let beforeTs = null;

  for (let page = 0; page < maxPages; page += 1) {
    const params = new URLSearchParams({ failureLimit: String(limit) });
    if (beforeTs) params.set("failuresBeforeTs", String(beforeTs));
    const url = `${cleanBase}/api/retrieval-health?${params.toString()}`;

    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      if (response.status === 403 && isCloudflareChallenge(body)) {
        const err = new Error(`retrieval-health cloudflare_challenge on ${cleanBase}`);
        err.code = "CLOUDFLARE_CHALLENGE";
        throw err;
      }
      throw new Error(`retrieval-health ${response.status}: ${body.slice(0, 300)}`);
    }

    const json = await response.json();
    const archive = json?.failureArchive || {};
    const items = Array.isArray(archive.items) ? archive.items : [];
    allItems.push(...items);

    if (!archive.hasMore || !archive.nextBeforeTs) break;
    beforeTs = archive.nextBeforeTs;
  }

  return allItems;
}

async function fetchFailureArchiveWithFallback({ baseUrl, fallbackBaseUrls, token, limit, maxPages }) {
  const candidates = [baseUrl, ...fallbackBaseUrls]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index);

  const attempts = [];
  for (const candidate of candidates) {
    try {
      const items = await fetchFailureArchive(candidate, token, limit, maxPages);
      return { items, resolvedBaseUrl: candidate, attempts };
    } catch (error) {
      attempts.push({
        baseUrl: candidate,
        code: error?.code || "ERROR",
        message: String(error?.message || error),
      });
      continue;
    }
  }

  const details = attempts.map((attempt) => `${attempt.baseUrl} -> ${attempt.code}`).join(", ");
  throw new Error(`all retrieval-health base URLs failed: ${details}`);
}

function renderMarkdown(summary, grouped) {
  const lines = [];
  lines.push("# Daily No-Case-Law Snapshot");
  lines.push("");
  lines.push(`- Generated: ${summary.generatedAt}`);
  lines.push(`- Base URL: ${summary.baseUrl}`);
  lines.push(`- Total failure events: ${summary.totalFailures}`);
  lines.push(`- No-case-law events: ${summary.noCaselawFailures}`);
  lines.push(`- Deduped groups: ${summary.groupCount}`);
  lines.push("");
  lines.push("## Top Repeated Scenarios");
  lines.push("");

  if (grouped.length === 0) {
    lines.push("No no-case-law events found in this window.");
    lines.push("");
    return lines.join("\n");
  }

  for (const group of grouped.slice(0, 20)) {
    lines.push(`- (${group.count}) ${group.reason}: ${group.scenarioSnippet || "(no scenario snippet)"}`);
  }
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outDir = path.resolve(process.cwd(), args.outDir);
  fs.mkdirSync(outDir, { recursive: true });

  const dateTag = new Date().toISOString().slice(0, 10);
  const reportPath = path.join(outDir, `daily-${dateTag}.json`);
  const markdownPath = path.join(outDir, `daily-${dateTag}.md`);

  let rawEvents = [];
  let fetchMeta = null;
  try {
    if (args.input) {
      rawEvents = JSON.parse(
        fs.readFileSync(path.resolve(process.cwd(), args.input), "utf-8"),
      );
    } else {
      fetchMeta = await fetchFailureArchiveWithFallback({
        baseUrl: args.baseUrl,
        fallbackBaseUrls: args.fallbackBaseUrls,
        token: process.env.RETRIEVAL_HEALTH_TOKEN || "",
        limit: args.limit,
        maxPages: args.maxPages,
      });
      rawEvents = fetchMeta.items;
    }
  } catch (error) {
    if (!args.softFail) throw error;

    const fallbackPayload = {
      generatedAt: new Date().toISOString(),
      baseUrl: args.baseUrl,
      resolvedBaseUrl: null,
      totalFailures: 0,
      noCaselawFailures: 0,
      reasonCounts: {},
      groups: [],
      events: [],
      fetchError: String(error?.message || error),
    };

    fs.writeFileSync(reportPath, JSON.stringify(fallbackPayload, null, 2));
    fs.writeFileSync(
      markdownPath,
      [
        "# Daily No-Case-Law Snapshot",
        "",
        `- Generated: ${fallbackPayload.generatedAt}`,
        `- Base URL: ${fallbackPayload.baseUrl}`,
        "- Fetch status: blocked",
        `- Error: ${fallbackPayload.fetchError}`,
        "",
        "No telemetry could be collected from the configured endpoints in this run.",
      ].join("\n"),
    );

    const summary = {
      reportPath,
      markdownPath,
      totalFailures: 0,
      noCaselawFailures: 0,
      groupCount: 0,
    };
    writeOutputs(summary);
    console.log(JSON.stringify({ ...summary, softFailed: true }, null, 2));
    return;
  }

  const allFailures = Array.isArray(rawEvents) ? rawEvents : [];
  const noCaselawFailures = allFailures.filter((item) => {
    const reason = String(item?.reason || "");
    const finalCount = Number(item?.finalCaseLawCount || 0);
    const verifiedCount = Number(item?.verifiedCount || 0);
    const noResults = finalCount <= 0 && verifiedCount <= 0;
    return noResults || reason === "no_verified";
  });

  const grouped = groupEvents(noCaselawFailures);
  const reasonCounts = toReasonCounts(noCaselawFailures);
  const payload = {
    generatedAt: new Date().toISOString(),
    baseUrl: args.baseUrl,
    resolvedBaseUrl: fetchMeta?.resolvedBaseUrl || args.baseUrl,
    totalFailures: allFailures.length,
    noCaselawFailures: noCaselawFailures.length,
    reasonCounts,
    groups: grouped,
    events: noCaselawFailures,
  };

  fs.writeFileSync(reportPath, JSON.stringify(payload, null, 2));
  fs.writeFileSync(
    markdownPath,
    renderMarkdown(
      {
        generatedAt: payload.generatedAt,
        baseUrl: payload.baseUrl,
        totalFailures: payload.totalFailures,
        noCaselawFailures: payload.noCaselawFailures,
        groupCount: grouped.length,
      },
      grouped,
    ),
  );

  const summary = {
    reportPath,
    markdownPath,
    totalFailures: payload.totalFailures,
    noCaselawFailures: payload.noCaselawFailures,
    groupCount: grouped.length,
  };

  writeOutputs(summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
