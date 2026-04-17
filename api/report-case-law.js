import { randomUUID } from "crypto";
import {
  applyStandardApiHeaders,
  handleOptionsAndMethod,
  respondRateLimit,
  validateJsonRequest,
} from "./_apiCommon.js";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "./_rateLimit.js";
import {
  logRequestStart,
  logRateLimitCheck,
  logValidationError,
  logSuccess,
  logError,
} from "./_logging.js";
import { recordCaseLawReport } from "./_caseLawReportStore.js";
import {
  CASE_LAW_REPORT_REASON_SET,
  MAX_CASE_LAW_REPORT_NOTE_LENGTH,
  MAX_CASE_LAW_REPORT_SCENARIO_SNIPPET_LENGTH,
  MAX_CASE_LAW_REPORT_SUMMARY_LENGTH,
} from "../src/lib/caseLawReportReasons.js";

const VALID_JURISDICTIONS = new Set([
  "all",
  "Ontario",
  "British Columbia",
  "Alberta",
  "Quebec",
  "Manitoba",
  "Saskatchewan",
  "Nova Scotia",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Prince Edward Island",
]);

const VALID_COURT_LEVELS = new Set([
  "all",
  "scc",
  "appeal",
  "superior",
  "provincial",
]);

const VALID_DATE_RANGES = new Set(["all", "5", "10", "20"]);
const VALID_LAW_TYPES = new Set([
  "criminal_code",
  "case_law",
  "civil_law",
  "charter",
]);

function sanitizeText(value, maxLen) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLen);
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function normalizeFilters(rawFilters) {
  if (!isPlainObject(rawFilters)) return null;
  if (!VALID_JURISDICTIONS.has(rawFilters.jurisdiction)) return null;
  if (!VALID_COURT_LEVELS.has(rawFilters.courtLevel)) return null;
  if (!VALID_DATE_RANGES.has(rawFilters.dateRange)) return null;
  if (!isPlainObject(rawFilters.lawTypes)) return null;

  const lawTypes = {};
  for (const key of VALID_LAW_TYPES) {
    const value = rawFilters.lawTypes[key];
    if (typeof value !== "boolean") return null;
    lawTypes[key] = value;
  }

  return {
    jurisdiction: rawFilters.jurisdiction,
    courtLevel: rawFilters.courtLevel,
    dateRange: rawFilters.dateRange,
    lawTypes,
  };
}

function normalizeCaseLawMeta(rawMeta) {
  if (rawMeta == null) return null;
  if (!isPlainObject(rawMeta)) return null;

  const verifiedCount = rawMeta.verifiedCount;
  if (
    verifiedCount != null &&
    (!Number.isFinite(verifiedCount) || verifiedCount < 0)
  ) {
    return null;
  }

  return {
    source: sanitizeText(rawMeta.source, 40) || null,
    reason: sanitizeText(rawMeta.reason, 60) || null,
    issuePrimary: sanitizeText(rawMeta.issuePrimary, 40) || null,
    retrievalPass: sanitizeText(rawMeta.retrievalPass, 40) || null,
    fallbackReason: sanitizeText(rawMeta.fallbackReason, 80) || null,
    verifiedCount:
      verifiedCount == null ? null : Math.floor(Number(verifiedCount)),
  };
}

export default async function handler(req, res) {
  const requestId = req.headers["x-vercel-id"] || randomUUID();
  const startMs = Date.now();
  logRequestStart(req, "report-case-law", requestId);
  applyStandardApiHeaders(req, res, "POST, OPTIONS", "Content-Type");

  if (handleOptionsAndMethod(req, res, "POST")) return;
  if (
    !validateJsonRequest(req, res, {
      requestId,
      endpoint: "report-case-law",
      maxBytes: 20_000,
      logValidationError,
    })
  ) {
    return;
  }

  const rlResult = await checkRateLimit(getClientIp(req), "report-case-law");
  logRateLimitCheck(requestId, "report-case-law", rlResult, getClientIp(req));
  const rlHeaders = rateLimitHeaders(rlResult);
  Object.entries(rlHeaders).forEach(([key, value]) =>
    res.setHeader(key, value),
  );
  if (respondRateLimit(res, rlResult)) return;

  try {
    const {
      analysisRequestId,
      scenarioSnippet,
      filters,
      item,
      resultIndex,
      reason,
      note,
      caseLawMeta,
    } = req.body || {};

    if (
      analysisRequestId != null &&
      (typeof analysisRequestId !== "string" ||
        sanitizeText(analysisRequestId, 120).length === 0)
    ) {
      logValidationError(
        requestId,
        "report-case-law",
        "Invalid analysisRequestId",
        "analysisRequestId",
      );
      return res.status(400).json({ error: "Invalid analysis request ID." });
    }

    const normalizedScenarioSnippet = sanitizeText(
      scenarioSnippet,
      MAX_CASE_LAW_REPORT_SCENARIO_SNIPPET_LENGTH,
    );
    if (!normalizedScenarioSnippet) {
      logValidationError(
        requestId,
        "report-case-law",
        "Missing scenario snippet",
        "scenarioSnippet",
      );
      return res.status(400).json({ error: "Scenario snippet is required." });
    }

    const normalizedFilters = normalizeFilters(filters);
    if (!normalizedFilters) {
      logValidationError(
        requestId,
        "report-case-law",
        "Invalid filters payload",
        "filters",
      );
      return res.status(400).json({ error: "Invalid filters payload." });
    }

    if (!isPlainObject(item)) {
      logValidationError(
        requestId,
        "report-case-law",
        "Invalid item payload",
        "item",
      );
      return res.status(400).json({ error: "Reported item is required." });
    }

    const normalizedCitation = sanitizeText(item.citation, 180);
    if (!normalizedCitation) {
      logValidationError(
        requestId,
        "report-case-law",
        "Missing item citation",
        "item.citation",
      );
      return res
        .status(400)
        .json({ error: "Reported item citation is required." });
    }

    const normalizedReason = sanitizeText(reason, 40);
    if (!CASE_LAW_REPORT_REASON_SET.has(normalizedReason)) {
      logValidationError(
        requestId,
        "report-case-law",
        "Invalid reason",
        "reason",
      );
      return res.status(400).json({ error: "Invalid report reason." });
    }

    const normalizedNote = sanitizeText(note, MAX_CASE_LAW_REPORT_NOTE_LENGTH);
    if (
      typeof note === "string" &&
      note.replace(/\s+/g, " ").trim().length > MAX_CASE_LAW_REPORT_NOTE_LENGTH
    ) {
      logValidationError(requestId, "report-case-law", "Note too long", "note");
      return res
        .status(400)
        .json({ error: "Note must be 300 characters or fewer." });
    }

    if (
      !Number.isInteger(resultIndex) ||
      resultIndex < 0 ||
      resultIndex > 100
    ) {
      logValidationError(
        requestId,
        "report-case-law",
        "Invalid result index",
        "resultIndex",
      );
      return res.status(400).json({ error: "Invalid result index." });
    }

    const normalizedCaseLawMeta = normalizeCaseLawMeta(caseLawMeta);
    if (caseLawMeta != null && !normalizedCaseLawMeta) {
      logValidationError(
        requestId,
        "report-case-law",
        "Invalid case-law metadata",
        "caseLawMeta",
      );
      return res
        .status(400)
        .json({ error: "Invalid case-law metadata payload." });
    }

    const reportId = `clr_${randomUUID()}`;
    const reportedAt = new Date().toISOString();
    await recordCaseLawReport({
      reportId,
      reportedAt,
      analysisRequestId: sanitizeText(analysisRequestId, 120) || null,
      scenarioSnippet: normalizedScenarioSnippet,
      filters: normalizedFilters,
      item: {
        citation: normalizedCitation,
        title: sanitizeText(item.title, 180) || null,
        court: sanitizeText(item.court, 40) || null,
        year: sanitizeText(item.year, 12) || null,
        url_canlii: sanitizeText(item.url_canlii, 400) || null,
        summary:
          sanitizeText(item.summary, MAX_CASE_LAW_REPORT_SUMMARY_LENGTH) ||
          null,
      },
      resultIndex,
      reason: normalizedReason,
      note: normalizedNote || null,
      caseLawMeta: normalizedCaseLawMeta,
    });

    logSuccess(
      requestId,
      "report-case-law",
      201,
      Date.now() - startMs,
      rlResult,
      { reportId },
    );

    return res.status(201).json({
      ok: true,
      reportId,
      reportedAt,
    });
  } catch (error) {
    logError(requestId, "report-case-law", error, 500, Date.now() - startMs);
    return res.status(500).json({
      error: "Could not save the report. Please try again.",
    });
  }
}
