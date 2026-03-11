import { useTheme } from "../lib/ThemeContext.jsx";
import { jurisdictions, courtLevels, dateRanges, lawTypeOptions, defaultLawTypes } from "../lib/constants.js";
import Select from "./Select.jsx";

export default function FiltersPanel({ filters, setFilters, filtersOpen, setFiltersOpen }) {
  const t = useTheme();
  const selectCount = [filters.jurisdiction, filters.courtLevel, filters.dateRange]
    .filter(v => v !== "all").length;
  const uncheckedCount = lawTypeOptions.filter(o => !filters.lawTypes?.[o.key]).length;
  const activeCount = selectCount + uncheckedCount;

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
        <div style={{ marginTop: 16, paddingBottom: 4 }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
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
          </div>

          {/* Law Type checkboxes */}
          <div style={{ marginTop: 18 }}>
            <div style={{
              fontFamily: "'Helvetica Neue', Helvetica, sans-serif",
              fontSize: 9, letterSpacing: 3, textTransform: "uppercase",
              color: t.textTertiary, marginBottom: 10,
            }}>
              Law Types
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 20px" }}>
              {lawTypeOptions.map(o => (
                <label
                  key={o.key}
                  style={{
                    display: "flex", alignItems: "center", gap: 7, cursor: "pointer",
                    fontFamily: "'Helvetica Neue', sans-serif", fontSize: 13,
                    color: filters.lawTypes?.[o.key] ? t.text : t.textTertiary,
                    transition: "color 0.2s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!filters.lawTypes?.[o.key]}
                    onChange={() => setFilters({
                      ...filters,
                      lawTypes: {
                        ...filters.lawTypes,
                        [o.key]: !filters.lawTypes?.[o.key],
                      },
                    })}
                    style={{ accentColor: t.accent, cursor: "pointer" }}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </div>

          {activeCount > 0 && (
            <div style={{ marginTop: 14 }}>
              <button
                onClick={() => setFilters({
                  jurisdiction: "all", courtLevel: "all", dateRange: "all",
                  lawTypes: { ...defaultLawTypes },
                })}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: 11, color: t.accentRed, textDecoration: "underline",
                  padding: "4px 0",
                }}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}

      {/* Guidance text — always visible */}
      <p style={{
        fontFamily: "'Helvetica Neue', Helvetica, sans-serif",
        fontSize: 12, color: t.textTertiary, lineHeight: 1.6,
        margin: "16px 0 0 0", letterSpacing: 0.2,
      }}>
        Type in a crime or complex legal issue and it will come up with relevant crimes, provincial offences, case law, and civil law.
      </p>
    </div>
  );
}
