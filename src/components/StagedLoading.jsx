import { useState, useEffect } from "react";
import { useTheme } from "../lib/ThemeContext.jsx";

const stages = [
  "Analyzing scenario...",
  "Searching Criminal Code...",
  "Searching case law & civil law...",
  "Checking Charter implications...",
  "Building legal analysis...",
];

export default function StagedLoading() {
  const t = useTheme();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = stages.map((_, i) =>
      setTimeout(() => setStage(i), i * 1500)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <section style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px" }}>
      <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 32 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {stages.map((s, i) => (
            <div key={i} style={{
              fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12,
              letterSpacing: 2, textTransform: "uppercase",
              color: i <= stage ? t.textSecondary : t.textFaint,
              transition: "color 0.4s, opacity 0.4s",
              opacity: i <= stage ? 1 : 0.3,
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <span style={{
                display: "inline-block", width: 8, height: 8,
                background: i < stage ? t.accentGreen : i === stage ? t.accent : t.border,
                borderRadius: "50%", transition: "background 0.4s",
              }} />
              {s}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
