#!/usr/bin/env node

import fs from "fs";
import path from "path";

const CONFIG_PATH = "api/_filterConfig.js";

function parseArgs(argv) {
  const out = {
    report: "",
    apply: false,
    minFailures: Number(process.env.MIN_AUTOFIX_FAILURES || 25),
    summaryPath: "reports/retrieval-autofix/autofix-plan.md",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--report" && next) {
      out.report = next;
      i += 1;
    } else if (arg === "--apply") {
      out.apply = true;
    } else if (arg === "--min-failures" && next) {
      out.minFailures = Math.max(1, Number(next) || out.minFailures);
      i += 1;
    } else if (arg === "--summary" && next) {
      out.summaryPath = next;
      i += 1;
    }
  }

  return out;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function getLatestReportFile(dirPath) {
  const abs = path.resolve(process.cwd(), dirPath);
  const entries = fs
    .readdirSync(abs)
    .filter((name) => name.endsWith(".json"))
    .map((name) => ({
      name,
      fullPath: path.join(abs, name),
      mtime: fs.statSync(path.join(abs, name)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);
  if (entries.length === 0) throw new Error(`No JSON reports found in ${abs}`);
  return entries[0].fullPath;
}

function getMetricAverages(events) {
  const semanticDrops = [];
  const fallbackHits = [];

  for (const event of events) {
    const semantic = Number(event?.semanticFilterDropCount || 0);
    if (Number.isFinite(semantic)) semanticDrops.push(Math.max(0, semantic));
    fallbackHits.push(event?.fallbackPathUsed === true ? 1 : 0);
  }

  const avg = (arr) => {
    if (!arr.length) return 0;
    return arr.reduce((sum, value) => sum + value, 0) / arr.length;
  };

  return {
    avgSemanticDropCount: Number(avg(semanticDrops).toFixed(3)),
    fallbackRate: Number(avg(fallbackHits).toFixed(3)),
  };
}

function getNumericSetting(source, key) {
  const regex = new RegExp(`${key}:\\s*(\\d+)`, "m");
  const match = source.match(regex);
  if (!match) throw new Error(`Could not find numeric setting: ${key}`);
  return Number(match[1]);
}

function replaceNumericSetting(source, key, nextValue) {
  const regex = new RegExp(`(${key}:\\s*)(\\d+)`, "m");
  return source.replace(regex, `$1${nextValue}`);
}

function buildPlan(report, minFailures) {
  const events = Array.isArray(report.events) ? report.events : [];
  const noCaseLawCount = Number(report.noCaselawFailures || events.length || 0);
  const totals = Number(report.totalFailures || noCaseLawCount);
  const noCaseLawRate = totals > 0 ? noCaseLawCount / totals : 0;
  const metrics = getMetricAverages(events);
  const actions = [];

  if (noCaseLawCount < minFailures) {
    return {
      reason: `Below minimum failures (${noCaseLawCount} < ${minFailures})`,
      actions,
      stats: {
        noCaseLawCount,
        totalFailures: totals,
        noCaseLawRate: Number(noCaseLawRate.toFixed(3)),
        ...metrics,
      },
    };
  }

  if (noCaseLawRate >= 0.6 && metrics.avgSemanticDropCount >= 4) {
    actions.push({
      key: "relevance_min_score",
      delta: -1,
      floor: 3,
      rationale:
        "High no-case-law rate with high semantic-drop average suggests prefilter is too strict.",
    });
  }

  if (noCaseLawRate >= 0.7) {
    actions.push({
      key: "relevance_min_token_overlap",
      delta: -1,
      floor: 1,
      rationale: "No-case-law rate indicates token-overlap gate is likely over-pruning.",
    });
  }

  if (noCaseLawRate >= 0.8 && metrics.avgSemanticDropCount >= 6) {
    actions.push({
      key: "relevance_min_concept_overlap",
      delta: -1,
      floor: 0,
      rationale:
        "Persistent misses plus high concept-drop volume suggest concept gate should be relaxed slightly.",
    });
  }

  if (noCaseLawRate >= 0.75 && metrics.fallbackRate >= 0.5) {
    actions.push({
      key: "final_case_min_token_overlap",
      delta: -1,
      floor: 2,
      rationale:
        "Fallback-heavy selection indicates final overlap requirement is too strict for current scenario mix.",
    });
  }

  return {
    reason: actions.length ? "threshold-relaxation" : "No safe deterministic action",
    actions: actions.slice(0, 2),
    stats: {
      noCaseLawCount,
      totalFailures: totals,
      noCaseLawRate: Number(noCaseLawRate.toFixed(3)),
      ...metrics,
    },
  };
}

function ensureDirFor(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function writeSummary(filePath, summaryText) {
  ensureDirFor(filePath);
  fs.writeFileSync(filePath, summaryText);
}

function appendOutputs(outputs) {
  if (!process.env.GITHUB_OUTPUT) return;
  const lines = Object.entries(outputs).map(([key, value]) => `${key}=${value}`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
}

function renderSummary(plan, applied, reportPath) {
  const lines = [];
  lines.push("# Retrieval Auto-Fix Plan");
  lines.push("");
  lines.push(`- Report: ${reportPath}`);
  lines.push(`- Reason: ${plan.reason}`);
  lines.push(`- No-case-law failures: ${plan.stats.noCaseLawCount}`);
  lines.push(`- Total failures: ${plan.stats.totalFailures}`);
  lines.push(`- No-case-law rate: ${plan.stats.noCaseLawRate}`);
  lines.push(`- Avg semantic drop: ${plan.stats.avgSemanticDropCount}`);
  lines.push(`- Fallback rate: ${plan.stats.fallbackRate}`);
  lines.push("");

  if (!applied.length) {
    lines.push("No config changes applied.");
    lines.push("");
    return lines.join("\n");
  }

  lines.push("## Applied Changes");
  lines.push("");
  for (const item of applied) {
    lines.push(`- ${item.key}: ${item.before} -> ${item.after}`);
    lines.push(`  rationale: ${item.rationale}`);
  }
  lines.push("");
  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const reportPath = args.report
    ? path.resolve(process.cwd(), args.report)
    : getLatestReportFile("reports/retrieval-autofix");

  const report = readJson(reportPath);
  const plan = buildPlan(report, args.minFailures);

  const configPath = path.resolve(process.cwd(), CONFIG_PATH);
  let configContent = fs.readFileSync(configPath, "utf-8");
  const applied = [];

  for (const action of plan.actions) {
    const before = getNumericSetting(configContent, action.key);
    const after = Math.max(action.floor, before + action.delta);
    if (before === after) continue;
    configContent = replaceNumericSetting(configContent, action.key, after);
    applied.push({ ...action, before, after });
  }

  if (args.apply && applied.length > 0) {
    fs.writeFileSync(configPath, configContent);
  }

  const summary = renderSummary(plan, applied, reportPath);
  const summaryPath = path.resolve(process.cwd(), args.summaryPath);
  writeSummary(summaryPath, summary);

  const outputs = {
    changed: applied.length > 0 ? "true" : "false",
    applied_count: String(applied.length),
    summary_path: summaryPath,
    reason: plan.reason.replace(/\s+/g, "-"),
  };
  appendOutputs(outputs);

  console.log(
    JSON.stringify(
      {
        reportPath,
        changed: applied.length > 0,
        applied,
        summaryPath,
        reason: plan.reason,
      },
      null,
      2,
    ),
  );
}

try {
  main();
} catch (error) {
  console.error(error?.stack || String(error));
  process.exit(1);
}
