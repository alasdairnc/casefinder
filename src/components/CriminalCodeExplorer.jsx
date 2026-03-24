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
  const isEnriched =
    !!(section.definition || section.maxPenalty || section.relatedSections?.length);

  return (
    <div
      style={{
        padding: "14px 24px",
        borderBottom: `1px solid ${t.borderLight}`,
        cursor: isEnriched || section.url ? "pointer" : "default",
        background: isExpanded ? t.bgAlt : "transparent",
        transition: "background 0.2s ease",
      }}
      onClick={isEnriched ? onToggle : undefined}
    >
      {/* Top row: section number, title, severity tag */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: 20,
            marginTop: 2,
          }}
        >
          {isEnriched && (
            <span
              style={{
                fontSize: 10,
                color: t.textTertiary,
                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
                display: "inline-block",
              }}
            >
              ▶
            </span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 4,
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
                fontSize: "clamp(14px, 2vw, 16px)",
                color: t.text,
                lineHeight: 1.4,
                flex: 1,
                minWidth: 0,
              }}
            >
              {section.title}
            </span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {isEnriched && !isExpanded && (
                <span
                  style={{
                    fontSize: 8,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    color: t.accentGreen,
                    border: `1px solid ${t.accentGreen}44`,
                    padding: "0px 4px",
                    borderRadius: 2,
                  }}
                >
                  Enriched
                </span>
              )}
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
                  }}
                >
                  {section.severity}
                </span>
              )}
            </div>
          </div>

          {/* Definition preview (collapsed) */}
          {!isExpanded && section.definition && (
            <div
              style={{
                fontFamily: "'Helvetica Neue', sans-serif",
                fontSize: 12,
                color: t.textSecondary,
                lineHeight: 1.5,
                marginTop: 4,
                display: "-webkit-box",
                WebkitLineClamp: 1,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                opacity: 0.8,
              }}
            >
              {section.definition}
            </div>
          )}

          {/* Topic tags */}
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
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && isEnriched && (
        <div style={{ marginTop: 16, paddingLeft: 32, paddingRight: 8 }}>
          {section.definition && (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 9,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: t.textTertiary,
                  marginBottom: 6,
                }}
              >
                Definition
              </div>
              <div
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 13,
                  color: t.textSecondary,
                  lineHeight: 1.6,
                }}
              >
                {section.definition}
              </div>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
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
                  Common Defences
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
          </div>

          {section.relatedSections?.length > 0 && (
            <div style={{ marginBottom: 16, marginTop: 8 }}>
              <div
                style={{
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 9,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: t.textTertiary,
                  marginBottom: 6,
                }}
              >
                Related Sections
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {section.relatedSections.map((s) => (
                  <span
                    key={s}
                    style={{
                      fontFamily: "'Courier New', monospace",
                      fontSize: 11,
                      color: t.accent,
                      background: t.bg,
                      padding: "2px 6px",
                      border: `1px solid ${t.borderLight}`,
                    }}
                  >
                    s. {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: 20,
              paddingTop: 12,
              borderTop: `1px solid ${t.borderLight}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {section.partOf && (
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
                fontWeight: 500,
              }}
            >
              Full Text on Justice Laws ↗
            </a>
          </div>
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
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(2px)",
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
          maxWidth: 800,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: `1px solid ${t.borderLight}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span
              style={{
                fontFamily: "'Helvetica Neue', sans-serif",
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                fontWeight: 600,
                color: t.text,
              }}
            >
              Criminal Code of Canada
            </span>
            <span
              style={{
                fontSize: 10,
                color: t.textTertiary,
                background: t.bgAlt,
                padding: "1px 8px",
                borderRadius: 10,
                border: `1px solid ${t.borderLight}`,
                fontFamily: "'Helvetica Neue', sans-serif",
              }}
            >
              {totalSections} Sections
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 8px",
              fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: 24,
              color: t.textTertiary,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Search + Filters */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${t.borderLight}`, background: t.bgAlt + "44" }}>
          <div style={{ position: "relative" }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search section number, title, or keywords (e.g. 'theft', 'assault')..."
              style={{
                width: "100%",
                padding: "12px 16px",
                fontFamily: "'Helvetica Neue', sans-serif",
                fontSize: 14,
                backgroundColor: t.inputBg,
                color: t.text,
                border: `1px solid ${t.border}`,
                borderRadius: 4,
                outline: "none",
                boxSizing: "border-box",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
              }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: t.textTertiary,
                  cursor: "pointer",
                  fontSize: 18,
                }}
              >
                ×
              </button>
            )}
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 12,
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
              background: t.bg,
            }}
          >
            {totalMatches === 0
              ? "No results found."
              : totalMatches <= 100
                ? `Showing ${totalMatches} result${totalMatches !== 1 ? "s" : ""}`
                : `Showing first 100 of ${totalMatches} matches. Refine your search for better results.`}
          </div>
        )}

        {/* Results list */}
        <div style={{ overflowY: "auto", flexGrow: 1, background: t.bg }}>
          {results.length === 0 ? (
            <div
              style={{
                padding: "48px 24px",
                fontFamily: "'Times New Roman', serif",
                fontSize: 16,
                color: t.textTertiary,
                fontStyle: "italic",
                textAlign: "center",
              }}
            >
              {query || severityFilter !== "all" || partFilter !== "all"
                ? "No sections match your current filters."
                : "Type to browse or search the Criminal Code database."}
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
