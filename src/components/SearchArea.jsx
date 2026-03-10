import { useTheme } from "../lib/ThemeContext.jsx";

const MAX_CHARS = 5000;

export default function SearchArea({ query, setQuery, onSubmit, loading }) {
  const t = useTheme();
  const remaining = MAX_CHARS - query.length;
  const nearLimit = remaining <= 200;
  const atLimit = remaining <= 0;

  return (
    <section style={{ maxWidth: 760, margin: "0 auto", padding: "24px 24px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <label style={{
          fontFamily: "'Helvetica Neue', sans-serif",
          fontSize: 10, letterSpacing: 3.5, textTransform: "uppercase",
          color: t.textTertiary,
        }}>
          Describe the Scenario
        </label>
        <span style={{
          fontFamily: "'Helvetica Neue', sans-serif",
          fontSize: 11,
          color: atLimit ? t.accentRed : nearLimit ? t.accentOlive ?? "#b8860b" : t.textFaint,
          transition: "color 0.2s",
        }}>
          {remaining.toLocaleString()} / {MAX_CHARS.toLocaleString()}
        </span>
      </div>
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !loading) onSubmit();
        }}
        maxLength={MAX_CHARS}
        placeholder="e.g., A suspect was observed entering a residential property at night through an unlocked rear window. The homeowner discovered electronics and jewelry missing the following morning..."
        style={{
          width: "100%", background: t.inputBg,
          border: `1px solid ${atLimit ? t.accentRed : t.border}`, color: t.text,
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: "clamp(15px, 2.5vw, 17px)", padding: "20px 22px",
          resize: "vertical", minHeight: 120,
          outline: "none", lineHeight: 1.7,
          boxSizing: "border-box", transition: "background 0.3s, color 0.3s, border-color 0.3s",
        }}
        onFocus={(e) => e.target.style.borderColor = atLimit ? t.accentRed : t.text}
        onBlur={(e) => e.target.style.borderColor = atLimit ? t.accentRed : t.border}
      />
      <div style={{
        display: "flex", gap: 16, marginTop: 18,
        alignItems: "center", flexWrap: "wrap",
      }}>
        <button
          onClick={onSubmit}
          disabled={loading || !query.trim() || atLimit}
          style={{
            background: loading ? t.textTertiary : t.buttonBg,
            color: t.buttonText, border: "none",
            padding: "14px 34px",
            fontFamily: "'Helvetica Neue', sans-serif",
            fontSize: 12, letterSpacing: 2.5,
            textTransform: "uppercase",
            cursor: loading ? "wait" : "pointer",
            opacity: (!query.trim() || atLimit) ? 0.4 : 1,
            transition: "all 0.2s",
          }}
        >
          {loading ? "Analyzing..." : "Research"}
        </button>
        <span style={{
          fontSize: 12, color: t.textFaint,
          fontFamily: "'Helvetica Neue', sans-serif",
        }}>
          {"\u2318"}/Ctrl + Enter
        </span>
      </div>
    </section>
  );
}
