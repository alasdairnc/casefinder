import { useTheme } from "../lib/ThemeContext.jsx";
import { jurisdictions, courtLevels, dateRanges } from "../lib/constants.js";
import Select from "./Select.jsx";

export default function FiltersPanel({ filters, setFilters, filtersOpen, setFiltersOpen }) {
  const t = useTheme();
  const activeCount = [filters.jurisdiction, filters.courtLevel, filters.dateRange]
    .filter(v => v !== "all").length;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 24px 0" }}>
      <button
        onClick={() => setFiltersOpen(!filtersOpen)}
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
          letterSpacing: 2.5, textTransform: "uppercase",
          color: t.textTertiary, padding: 0,
          display: "flex", alignItems: "center", gap: 10,
          transition: "color 0.15s",
        }}
      >
        <span style={{
          display: "inline-block",
          transform: filtersOpen ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 0.2s", fontSize: 10,
        }}>
          {"\u25B6"}
        </span>
        Filters
        {activeCount > 0 && (
          <span style={{
            background: t.accent, color: t.bg,
            fontSize: 10, fontWeight: 700,
            padding: "2px 7px", marginLeft: 2,
          }}>
            {activeCount}
          </span>
        )}
      </button>

      {filtersOpen && (
        <div style={{
          display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap",
          paddingBottom: 4,
        }}>
          <Select
            label="Jurisdiction"
            options={jurisdictions}
            value={filters.jurisdiction}
            onChange={(v) => setFilters({ ...filters, jurisdiction: v })}
          />
          <Select
            label="Court Level"
            options={courtLevels}
            value={filters.courtLevel}
            onChange={(v) => setFilters({ ...filters, courtLevel: v })}
          />
          <Select
            label="Date Range"
            options={dateRanges}
            value={filters.dateRange}
            onChange={(v) => setFilters({ ...filters, dateRange: v })}
          />
          {activeCount > 0 && (
            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
              <button
                onClick={() => setFilters({ jurisdiction: "all", courtLevel: "all", dateRange: "all" })}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 11, color: t.accentRed, textDecoration: "underline",
                  padding: "10px 4px",
                }}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
