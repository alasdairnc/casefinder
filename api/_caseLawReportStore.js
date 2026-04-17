import { redis } from "./_rateLimit.js";
import { API_REDIS_TIMEOUT_MS } from "./_constants.js";
import { isValidUrl } from "../src/lib/validateUrl.js";

const REPORTS_KEY = "feedback:case-law-reports:v1";
const MAX_STORED_REPORTS = 1000;
const memoryReports = [];

function sanitizeText(value, maxLen, { required = false } = {}) {
  if (typeof value !== "string") {
    return required ? null : null;
  }

  const cleaned = value.replace(/\s+/g, " ").trim().slice(0, maxLen);
  if (!cleaned) return required ? null : null;
  return cleaned;
}

function toNonNegativeInt(value, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Math.floor(num);
}

function normalizeFilters(raw = {}) {
  return {
    jurisdiction: sanitizeText(raw?.jurisdiction, 40) || "all",
    courtLevel: sanitizeText(raw?.courtLevel, 40) || "all",
    dateRange: sanitizeText(raw?.dateRange, 10) || "all",
    lawTypes: {
      criminal_code: raw?.lawTypes?.criminal_code !== false,
      case_law: raw?.lawTypes?.case_law !== false,
      civil_law: raw?.lawTypes?.civil_law !== false,
      charter: raw?.lawTypes?.charter !== false,
    },
  };
}

function normalizeCaseLawMeta(raw = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const normalized = {
    source: sanitizeText(raw?.source, 40),
    reason: sanitizeText(raw?.reason, 60),
    issuePrimary: sanitizeText(raw?.issuePrimary, 40),
    retrievalPass: sanitizeText(raw?.retrievalPass, 40),
    fallbackReason: sanitizeText(raw?.fallbackReason, 80),
    verifiedCount:
      typeof raw?.verifiedCount === "number"
        ? toNonNegativeInt(raw.verifiedCount, 0)
        : null,
  };

  return Object.values(normalized).some((value) => value != null)
    ? normalized
    : null;
}

export function normalizeCaseLawReport(raw = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const citation = sanitizeText(raw?.item?.citation, 180, { required: true });
  if (!citation) return null;

  const normalized = {
    reportId: sanitizeText(raw?.reportId, 80, { required: true }),
    reportedAt: sanitizeText(raw?.reportedAt, 40, { required: true }),
    analysisRequestId: sanitizeText(raw?.analysisRequestId, 120),
    scenarioSnippet: sanitizeText(raw?.scenarioSnippet, 280, {
      required: true,
    }),
    filters: normalizeFilters(raw?.filters),
    item: {
      citation,
      title: sanitizeText(raw?.item?.title, 180),
      court: sanitizeText(raw?.item?.court, 40),
      year: sanitizeText(raw?.item?.year, 12),
      url_canlii: isValidUrl(raw?.item?.url_canlii)
        ? raw.item.url_canlii
        : null,
      summary: sanitizeText(raw?.item?.summary, 300),
    },
    resultIndex: toNonNegativeInt(raw?.resultIndex, 0),
    reason: sanitizeText(raw?.reason, 40, { required: true }),
    note: sanitizeText(raw?.note, 300),
    caseLawMeta: normalizeCaseLawMeta(raw?.caseLawMeta),
  };

  if (!normalized.reportId || !normalized.reportedAt) return null;
  if (!normalized.scenarioSnippet || !normalized.reason) return null;

  return normalized;
}

function trimMemoryReports() {
  if (memoryReports.length > MAX_STORED_REPORTS) {
    memoryReports.splice(0, memoryReports.length - MAX_STORED_REPORTS);
  }
}

async function readRedisReports() {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Redis timeout")), API_REDIS_TIMEOUT_MS),
  );
  const raw = await Promise.race([redis.get(REPORTS_KEY), timeout]);
  let rows = raw;

  if (typeof raw === "string") {
    try {
      rows = JSON.parse(raw);
    } catch {
      rows = [];
    }
  }

  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => normalizeCaseLawReport(row))
    .filter(Boolean)
    .slice(-MAX_STORED_REPORTS);
}

async function writeRedisReports(reports) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Redis timeout")), API_REDIS_TIMEOUT_MS),
  );

  await Promise.race([
    redis.set(REPORTS_KEY, JSON.stringify(reports.slice(-MAX_STORED_REPORTS))),
    timeout,
  ]);
}

export async function recordCaseLawReport(raw = {}) {
  const normalized = normalizeCaseLawReport(raw);
  if (!normalized) {
    throw new Error("Invalid case-law report");
  }

  memoryReports.push(normalized);
  trimMemoryReports();

  if (!redis) return normalized;

  try {
    const existing = await readRedisReports();
    existing.push(normalized);
    await writeRedisReports(existing);
  } catch {
    // In-memory fallback already captured the report.
  }

  return normalized;
}

export async function getStoredCaseLawReports() {
  if (redis) {
    try {
      return await readRedisReports();
    } catch {
      // Fall through to memory snapshot.
    }
  }

  return memoryReports.slice();
}

export function resetInMemoryCaseLawReports() {
  memoryReports.length = 0;
}
