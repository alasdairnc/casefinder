import { useTheme } from "../lib/ThemeContext.jsx";

const MAX_CHARS = 5000;

export default function SearchArea({ query, setQuery, onSubmit, loading }) {
  const t = useTheme();
  const remaining = MAX_CHARS - query.length;
  const nearLimit = remaining <= 500;
  const atLimit = remaining <= 0;

  return (
    <section style={{ maxWidth: 760, margin: "0 auto", padding: "20px 24px 0" }}>
      <div style={{ position: "relative" }}>
        <textarea
          data-testid="scenario-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !loading) onSubmit();
          }}
          maxLength={MAX_CHARS}
          placeholder="e.g., A suspect was observed entering a residential property at night through an unlocked rear window. The homeowner discovered electronics and jewelry missing the following morning..."
          style={{
            width: "100%",
            background: t.inputBg,
            border: `1px solid ${atLimit ? t.accentRed : t.border}`,
            color: t.text,
            fontFamily: "'Times New Roman', Times, serif",
            fontSize: "clamp(15px, 2.5vw, 17px)",
            padding: "20px 22px",
            resize: "vertical",
            minHeight: 150,
            outline: "none",
            lineHeight: 1.7,
            boxSizing: "border-box",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = atLimit ? t.accentRed : t.border;
            e.target.style.boxShadow = `inset 3px 0 0 ${atLimit ? t.accentRed : t.accent}, 0 6px 28px ${t.shadow || "rgba(28,25,22,0.07)"}`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = atLimit ? t.accentRed : t.border;
            e.target.style.boxShadow = "none";
          }}
        />
        {/* Character counter — visible only near limit */}
        {nearLimit && (
          <div style={{
            position: "absolute",
            bottom: 10,
            right: 12,
            fontFamily: "'Helvetica Neue', sans-serif",
            fontSize: 10,
            letterSpacing: "0.04em",
            color: atLimit ? t.accentRed : t.textFaint,
            transition: "color 0.2s",
            pointerEvents: "none",
          }}>
            {remaining.toLocaleString()}
          </div>
        )}
      </div>

      <div style={{
        display: "flex",
        gap: 18,
        marginTop: 14,
        alignItems: "center",
        flexWrap: "wrap",
      }}>
        <button
          data-testid="research-submit"
          onClick={onSubmit}
          disabled={loading || !query.trim() || atLimit}
          style={{
            background: loading ? t.textTertiary : t.buttonBg,
            color: t.buttonText,
            border: "none",
            padding: "13px 38px",
            fontFamily: "'Helvetica Neue', sans-serif",
            fontSize: 11,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            cursor: loading ? "wait" : "pointer",
            opacity: (!query.trim() || atLimit) ? 0.35 : 1,
            transition: "opacity 0.2s, background 0.2s",
          }}
        >
          {loading ? "Analyzing\u2026" : "Research"}
        </button>
        <span style={{
          fontSize: 11,
          color: t.textFaint,
          fontFamily: "'Helvetica Neue', sans-serif",
          letterSpacing: "0.02em",
        }}>
          {"\u2318"}/Ctrl + Enter
        </span>
      </div>
    </section>
  );
}
