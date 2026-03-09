import { useTheme } from "../lib/ThemeContext.jsx";

export default function ErrorMessage({ message, onRetry }) {
  const t = useTheme();
  return (
    <section style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px" }}>
      <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 28 }}>
        <div style={{
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10,
          letterSpacing: 3, textTransform: "uppercase", color: t.accentRed, marginBottom: 12,
        }}>
          Error
        </div>
        <p style={{
          fontFamily: "'Helvetica Neue', sans-serif",
          fontSize: 14, color: t.textSecondary, lineHeight: 1.6,
        }}>
          {message}
        </p>
        <button onClick={onRetry} style={{
          marginTop: 16, background: t.buttonBg, color: t.buttonText,
          border: "none", padding: "12px 28px", fontSize: 12,
          letterSpacing: 2, textTransform: "uppercase", cursor: "pointer",
          fontFamily: "'Helvetica Neue', sans-serif",
        }}>
          Try Again
        </button>
      </div>
    </section>
  );
}
