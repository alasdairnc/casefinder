import { useTheme } from "../lib/ThemeContext.jsx";

export default function SearchArea({ query, setQuery, onSubmit, loading }) {
  const t = useTheme();
  return (
    <section style={{ maxWidth: 760, margin: "0 auto", padding: "24px 24px 0" }}>
      <label style={{
        display: "block", fontFamily: "'Helvetica Neue', sans-serif",
        fontSize: 10, letterSpacing: 3.5, textTransform: "uppercase",
        color: t.textTertiary, marginBottom: 12,
      }}>
        Describe the Scenario
      </label>
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !loading) onSubmit();
        }}
        placeholder="e.g., A suspect was observed entering a residential property at night through an unlocked rear window. The homeowner discovered electronics and jewelry missing the following morning..."
        style={{
          width: "100%", background: t.inputBg,
          border: `1px solid ${t.border}`, color: t.text,
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: "clamp(15px, 2.5vw, 17px)", padding: "20px 22px",
          resize: "vertical", minHeight: 120,
          outline: "none", lineHeight: 1.7,
          boxSizing: "border-box", transition: "border-color 0.2s",
        }}
        onFocus={(e) => e.target.style.borderColor = t.text}
        onBlur={(e) => e.target.style.borderColor = t.border}
      />
      <div style={{
        display: "flex", gap: 16, marginTop: 18,
        alignItems: "center", flexWrap: "wrap",
      }}>
        <button
          onClick={onSubmit}
          disabled={loading || !query.trim()}
          style={{
            background: loading ? t.textTertiary : t.buttonBg,
            color: t.buttonText, border: "none",
            padding: "14px 34px",
            fontFamily: "'Helvetica Neue', sans-serif",
            fontSize: 12, letterSpacing: 2.5,
            textTransform: "uppercase",
            cursor: loading ? "wait" : "pointer",
            opacity: !query.trim() ? 0.4 : 1,
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
