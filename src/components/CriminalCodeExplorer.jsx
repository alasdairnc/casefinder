import { useEffect, useState, useRef } from "react";
import { useTheme } from "../lib/ThemeContext.jsx";
import { CRIMINAL_CODE_PARTS } from "../lib/criminalCodeData.js";
import { useCriminalCodeSearch } from "../hooks/useCriminalCodeSearch.js";
import Select from "./Select.jsx";

const SEVERITY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "Hybrid", label: "Hybrid" },
  { value: "Indictable", label: "Indictable" },
  { value: "Summary", label: "Summary" },
];

const PART_OPTIONS = [
  { value: "all", label: "All Parts" },
  ...CRIMINAL_CODE_PARTS.map((p) => ({ value: p.label, label: p.label })),
];

function SectionRow({ section, isExpanded, onToggle, t }) {
  const hasDetails =
    section.definition || section.maxPenalty || section.relatedSections?.length;

  return (
    <div
      style={{
        padding: "12px 24px",
        borderBottom: `1px solid ${t.borderLight}`,
        cursor: hasDetails || section.url ? "pointer" : "default",
      }}
      onClick={hasDetails ? onToggle : undefined}
    >
      {/* Top row: section number, title, severity tag */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 13,
            fontWeight: 700,
            color: t.accent,
            whiteSpace: "nowrap",
          }}
        >
          s. {section.num}
        </span>
        <span
          style={{
            fontFamily: "'Times New Roman', serif",
            fontSize: "clamp(13px, 2vw, 15px)",
            color: t.text,
            lineHeight: 1.4,
            flex: 1,
            minWidth: 0,
          }}
        >
          {section.title}
        </span>
        {section.severity && (
          <span
            style={{
              fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: 9,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: t.tagText,
              background: t.tagBg,
              padding: "1px 6px",
              border: `1px solid ${t.border}`,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {section.severity}
          </span>
        )}
      </div>

      {/* Definition preview (collapsed) */}
      {!isExpanded && section.definition && (
        <div
          style={{
            fontFamily: "'Helvetica Neue', sans-serif",
            fontSize: 12,
            color: t.textSecondary,
            lineHeight: 1.5,
            marginTop: 6,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {section.definition}
        </div>
      )}

      {/* Topic tags (always visible if present) */}
      {section.topicsTagged?.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
            marginTop: 6,
          }}
        >
          {section.topicsTagged.map((tag) => (
            <span
              key={tag}
              style={{
                fontFamily: "'Helvetica Neue', sans-serif",
                fontSize: 9,
                letterSpacing: 1,
                color: t.textTertiary,
                background: t.bgAlt,
                padding: "1px 6px",
                border: `1px solid ${t.borderLight}`,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Expanded details */}
      {isExpanded && hasDetails && (
        <div style={{ marginTop: 12, paddingLeft: 2 }}>
          {section.definition && (
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 9,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: t.textTertiary,
                  marginBottom: 4,
                }}
              >
                Definition
              </div>
              <div
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 12,
                  color: t.textSecondary,
                  lineHeight: 1.6,
                }}
              >
                {section.definition}
              </div>
            </div>
          )}

          {section.maxPenalty && (
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 9,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: t.textTertiary,
                  marginBottom: 4,
                }}
              >
                Max Penalty
              </div>
              <div
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 12,
                  color: t.textSecondary,
                  lineHeight: 1.5,
                }}
              >
                {section.maxPenalty}
              </div>
            </div>
          )}

          {section.defences?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 9,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: t.textTertiary,
                  marginBottom: 4,
                }}
              >
                Defences
              </div>
              <div
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 12,
                  color: t.textSecondary,
                  lineHeight: 1.5,
                }}
              >
                {section.defences.join(" · ")}
              </div>
            </div>
          )}

          {section.relatedSections?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 9,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: t.textTertiary,
                  marginBottom: 4,
                }}
              >
                Related Sections
              </div>
              <div
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: 12,
                  color: t.accent,
                  lineHeight: 1.5,
                }}
              >
                {section.relatedSections.map((s) => `s. ${s}`).join(", ")}
              </div>
            </div>
          )}

          {section.partOf && (
            <div style={{ marginBottom: 8 }}>
              <span
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 10,
                  color: t.textFaint,
                  letterSpacing: 0.5,
                }}
              >
                {section.partOf}
              </span>
            </div>
          )}

          <a
            href={section.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: 11,
              color: t.accentGreen,
              textDecoration: "none",
              letterSpacing: 0.5,
            }}
          >
            View on Justice Laws ↗
          </a>
        </div>
      )}
    </div>
  );
}

export default function CriminalCodeExplorer({ onClose }) {
  const t = useTheme();
  const inputRef = useRef(null);
  const [expandedSection, setExpandedSection] = useState(null);

  const {
    query,
    setQuery,
    severityFilter,
    setSeverityFilter,
    partFilter,
    setPartFilter,
    results,
    totalMatches,
    totalSections,
  } = useCriminalCodeSearch();

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Auto-focus search input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: t.bg,
          border: `1px solid ${t.border}`,
          borderBottom: "none",
          width: "100%",
          maxWidth: 760,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "12px 0 4px",
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              background: t.border,
              borderRadius: 2,
            }}
          />
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 24px 12px",
            borderBottom: `1px solid ${t.borderLight}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                fontFamily: "'Helvetica Neue', sans-serif",
                fontSize: 10,
                letterSpacing: 3.5,
                textTransform: "uppercase",
                color: t.textTertiary,
              }}
            >
              Criminal Code
            </span>
            <span
              style={{
                fontSize: 10,
                color: t.tagText,
                background: t.tagBg,
                padding: "1px 6px",
                border: `1px solid ${t.border}`,
                fontWeight: 700,
                fontFamily: "'Helvetica Neue', sans-serif",
              }}
            >
              {totalSections}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: 18,
              color: t.textTertiary,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Search + Filters */}
        <div style={{ padding: "12px 24px", borderBottom: `1px solid ${t.borderLight}` }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by section, title, or keyword..."
            style={{
              width: "100%",
              padding: "10px 12px",
              fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: 13,
              backgroundColor: t.inputBg,
              color: t.text,
              border: `1px solid ${t.border}`,
              outline: "none",
              boxSizing: "border-box",
              transition: "background-color 0.3s, color 0.3s, border-color 0.3s",
            }}
          />
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 10,
              flexWrap: "wrap",
            }}
          >
            <Select
              label="Severity"
              options={SEVERITY_OPTIONS}
              value={severityFilter}
              onChange={setSeverityFilter}
            />
            <Select
              label="Part"
              options={PART_OPTIONS}
              value={partFilter}
              onChange={setPartFilter}
            />
          </div>
        </div>

        {/* Results count */}
        {(query || severityFilter !== "all" || partFilter !== "all") && (
          <div
            style={{
              padding: "8px 24px",
              fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: 11,
              color: t.textTertiary,
              letterSpacing: 0.5,
              borderBottom: `1px solid ${t.borderLight}`,
            }}
          >
            {totalMatches === 0
              ? "No results"
              : totalMatches <= 50
                ? `${totalMatches} result${totalMatches !== 1 ? "s" : ""}`
                : `Showing 50 of ${totalMatches} — refine your search`}
          </div>
        )}

        {/* Results list */}
        <div style={{ overflowY: "auto", flexGrow: 1 }}>
          {results.length === 0 ? (
            <div
              style={{
                padding: "32px 24px",
                fontFamily: "'Times New Roman', serif",
                fontSize: 15,
                color: t.textTertiary,
                fontStyle: "italic",
                textAlign: "center",
              }}
            >
              {query || severityFilter !== "all" || partFilter !== "all"
                ? "No sections match your search."
                : "Enter a search term to browse the Criminal Code."}
            </div>
          ) : (
            results.map((section) => (
              <SectionRow
                key={section.num}
                section={section}
                isExpanded={expandedSection === section.num}
                onToggle={() =>
                  setExpandedSection(
                    expandedSection === section.num ? null : section.num
                  )
                }
                t={t}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
