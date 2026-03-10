import { useTheme } from "../lib/ThemeContext.jsx";

export default function Select({ label, options, value, onChange }) {
  const t = useTheme();
  return (
    <div style={{ flex: "1 1 160px", minWidth: 0 }}>
      <label style={{
        display: "block", fontFamily: "'Helvetica Neue', Helvetica, sans-serif",
        fontSize: 9, letterSpacing: 3, textTransform: "uppercase",
        color: t.textTertiary, marginBottom: 8,
      }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", padding: "10px 12px",
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 13,
          background: t.inputBg, color: t.text,
          border: `1px solid ${t.border}`,
          outline: "none", cursor: "pointer",
          appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='${encodeURIComponent(t.textTertiary)}'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
          boxSizing: "border-box",
          transition: "background 0.3s, color 0.3s, border-color 0.3s",
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
