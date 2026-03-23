// /api/export-pdf.js — Vercel Serverless Function
// Generates a branded CaseDive PDF from analysis results.

import { checkRateLimit, getClientIp, rateLimitHeaders } from "./_rateLimit.js";
import PDFDocument from "pdfkit";

const ACCENT = "#d4a040";
const BG = "#FAF7F2";
const TEXT = "#2c2825";
const TEXT_SECONDARY = "#6b6258";
const BORDER = "#d8d0c4";

// Strip control characters and PDF structure keywords that could corrupt the document.
// Preserves printable ASCII, \n, \t. Does NOT strip Unicode.
function sanitizePdfText(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]/g, "") // control chars (keep \n \t)
    .replace(/%%EOF/gi, "")                               // PDF end-of-file marker
    .slice(0, 20_000);                                    // hard cap per field
}

// Strip HTML tags and sanitize a string field for PDF insertion.
function cleanField(str) {
  if (typeof str !== "string") return "";
  return sanitizePdfText(str.replace(/<\/?[^>]+>/g, ""));
}

const MAX_SUMMARY_LEN   = 5_000;
const MAX_ANALYSIS_LEN  = 10_000;
const MAX_ARRAY_ITEMS   = 20;
const MAX_CASE_LAW_ITEMS = 10;

const SECTIONS = [
  { key: "criminal_code", label: "Criminal Code" },
  { key: "case_law", label: "Case Law" },
  { key: "civil_law", label: "Civil Law" },
  { key: "charter", label: "Charter Rights" },
];

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function drawDivider(doc, margin) {
  const [r, g, b] = hexToRgb(BORDER);
  doc.moveTo(margin, doc.y).lineTo(doc.page.width - margin, doc.y).strokeColor(r, g, b).lineWidth(0.5).stroke();
  doc.moveDown(0.5);
}

export default async function handler(req, res) {
  const origin = req.headers.origin ?? "";
  const allowed = ["https://casedive.ca", "https://www.casedive.ca", "https://casefinder-project.vercel.app"];
  if (allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Content-Security-Policy", "default-src 'none'");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ct = req.headers["content-type"] || "";
  if (!ct.includes("application/json")) {
    return res.status(415).json({ error: "Content-Type must be application/json" });
  }

  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  if (contentLength > 200_000) return res.status(413).json({ error: "Request body too large" });

  const rlResult = await checkRateLimit(getClientIp(req), "export-pdf");
  const rlHeaders = rateLimitHeaders(rlResult);
  Object.entries(rlHeaders).forEach(([k, v]) => res.setHeader(k, v));
  if (!rlResult.allowed) {
    return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
  }

  const body = req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Request body is required" });
  }

  let { summary, criminal_code, case_law, civil_law, charter, analysis, verifications } = body;

  if (!summary && !analysis && !criminal_code && !case_law && !civil_law && !charter) {
    return res.status(400).json({ error: "Results data is required" });
  }

  // Sanitize and cap all text fields before PDF insertion
  summary  = cleanField(summary).slice(0, MAX_SUMMARY_LEN);
  analysis = cleanField(analysis).slice(0, MAX_ANALYSIS_LEN);
  if (Array.isArray(criminal_code)) criminal_code = criminal_code.slice(0, MAX_ARRAY_ITEMS);
  if (Array.isArray(case_law))      case_law      = case_law.slice(0, MAX_CASE_LAW_ITEMS);
  if (Array.isArray(civil_law))     civil_law      = civil_law.slice(0, MAX_ARRAY_ITEMS);
  if (Array.isArray(charter))       charter        = charter.slice(0, MAX_ARRAY_ITEMS);

  const verifs = verifications && typeof verifications === "object" ? verifications : {};
  const dateStr = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

  // Build PDF in memory
  const chunks = [];
  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: 60, bottom: 60, left: 60, right: 60 },
    info: {
      Title: "CaseDive — Criminal Code Analysis",
      Author: "casedive.ca",
      Subject: "Canadian Legal Research",
    },
  });

  doc.on("data", (chunk) => chunks.push(chunk));

  const margin = 60;
  const pageWidth = doc.page.width - margin * 2;
  const [tr, tg, tb] = hexToRgb(TEXT);
  const [sr, sg, sb] = hexToRgb(TEXT_SECONDARY);
  const [ar, ag, ab] = hexToRgb(ACCENT);

  // ── Header ─────────────────────────────────────────────────────────────────
  doc
    .font("Times-Bold")
    .fontSize(20)
    .fillColor(tr, tg, tb)
    .text("casedive.ca", margin, 60, { continued: true })
    .font("Times-Roman")
    .fillColor(ar, ag, ab)
    .text("  —  Criminal Code Analysis", { continued: false });

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(sr, sg, sb)
    .text(dateStr, margin, doc.y + 4);

  doc.moveDown(0.8);
  drawDivider(doc, margin);

  // ── Scenario Summary ───────────────────────────────────────────────────────
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(sr, sg, sb)
    .text("SCENARIO SUMMARY", margin, doc.y, { characterSpacing: 2 });

  doc.moveDown(0.4);

  if (summary) {
    doc
      .font("Times-Roman")
      .fontSize(12)
      .fillColor(tr, tg, tb)
      .text(summary, margin, doc.y, { width: pageWidth, lineGap: 3 });
    doc.moveDown(1);
  }

  // ── Law Sections ───────────────────────────────────────────────────────────
  const sectionData = { criminal_code, case_law, civil_law, charter };

  for (const { key, label } of SECTIONS) {
    const items = sectionData[key];
    if (!Array.isArray(items) || items.length === 0) continue;

    drawDivider(doc, margin);

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(sr, sg, sb)
      .text(label.toUpperCase(), margin, doc.y, { characterSpacing: 2 });

    doc.moveDown(0.6);

    for (const item of items) {
      // Check for page overflow — add new page if < 100px remain
      if (doc.y > doc.page.height - doc.page.margins.bottom - 100) {
        doc.addPage();
      }

      const citation = sanitizePdfText(item.citation || item.section || "");
      const summary_text = sanitizePdfText(item.summary || item.description || "");
      const isVerified = key === "case_law" && verifs[citation]?.status === "verified";

      // Citation line
      doc
        .font("Times-Bold")
        .fontSize(11)
        .fillColor(tr, tg, tb)
        .text(citation, margin, doc.y, { continued: isVerified, width: pageWidth });

      if (isVerified) {
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor(ar, ag, ab)
          .text("  ✓ Verified by CanLII", { continued: false });
      }

      // Summary text
      if (summary_text) {
        doc
          .font("Times-Roman")
          .fontSize(11)
          .fillColor(tr, tg, tb)
          .text(summary_text, margin, doc.y + 2, { width: pageWidth, lineGap: 2 });
      }

      doc.moveDown(0.8);
    }
  }

  // ── Legal Analysis ─────────────────────────────────────────────────────────
  if (analysis) {
    drawDivider(doc, margin);

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(sr, sg, sb)
      .text("LEGAL ANALYSIS", margin, doc.y, { characterSpacing: 2 });

    doc.moveDown(0.6);

    // Accent bar
    const [abr, abg, abb] = hexToRgb(ACCENT);
    doc
      .rect(margin, doc.y, 2, 14)
      .fillColor(abr, abg, abb)
      .fill();

    doc
      .font("Times-Roman")
      .fontSize(12)
      .fillColor(tr, tg, tb)
      .text(analysis, margin + 14, doc.y, { width: pageWidth - 14, lineGap: 3 });

    doc.moveDown(1);
  }

  // ── Footer Disclaimer ──────────────────────────────────────────────────────
  // Place at bottom of last page
  const footerY = doc.page.height - doc.page.margins.bottom - 30;
  drawDivider(doc, margin);

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(sr, sg, sb)
    .text(
      "Educational tool only — not legal advice. Verify citations at canlii.org",
      margin,
      footerY,
      { width: pageWidth, align: "center" }
    );

  doc.end();

  await new Promise((resolve) => doc.once("end", resolve));

  const pdfBuffer = Buffer.concat(chunks);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="casedive-analysis.pdf"');
  res.setHeader("Content-Length", pdfBuffer.length);
  return res.status(200).send(pdfBuffer);
}
