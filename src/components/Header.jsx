import { useTheme, useThemeActions } from "../lib/ThemeContext.jsx";

export default function Header({ bookmarkCount = 0, onOpenBookmarks, onOpenCodeExplorer }) {
  const t = useTheme();
  const { isDark, toggleTheme } = useThemeActions();

  const navBtn = {
    background: "none",
    border: `1px solid ${t.borderLight}`,
    color: t.textSecondary,
    cursor: "pointer",
    padding: "7px 14px",
    fontFamily: "'Helvetica Neue', sans-serif",
    fontSize: 11,
    display: "flex",
    alignItems: "center",
    gap: 7,
    transition: "border-color 0.2s, color 0.2s",
  };

  const navHover = (e) => {
    e.currentTarget.style.borderColor = t.border;
    e.currentTarget.style.color = t.text;
  };
  const navLeave = (e) => {
    e.currentTarget.style.borderColor = t.borderLight;
    e.currentTarget.style.color = t.textSecondary;
  };

  return (
    <header>
      {/* Gold accent top rule — full viewport width */}
      <div style={{ height: 2, background: t.accent }} />

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "26px 24px 0" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}>
          {/* Wordmark */}
          <div>
            <h1 style={{
              fontSize: "clamp(30px, 5.5vw, 46px)",
              fontWeight: 400,
              margin: 0,
              fontFamily: "'Times New Roman', Times, serif",
              letterSpacing: "0.06em",
              lineHeight: 1,
              color: t.text,
            }}>
              casedive
            </h1>
            <div style={{
              fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: 9,
              letterSpacing: "0.44em",
              textTransform: "uppercase",
              color: t.textTertiary,
              marginTop: 9,
            }}>
              Canadian Legal Research
            </div>
          </div>

          {/* Nav buttons */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {onOpenBookmarks && (
              <button
                onClick={onOpenBookmarks}
                aria-label="Saved citations"
                style={{ ...navBtn, position: "relative" }}
                onMouseEnter={navHover}
                onMouseLeave={navLeave}
              >
                <svg
                  width="12" height="12" viewBox="0 0 16 16"
                  fill={bookmarkCount > 0 ? t.accent : "none"}
                  stroke={bookmarkCount > 0 ? t.accent : "currentColor"}
                  strokeWidth="1.5"
                  style={{ display: "block" }}
                >
                  <path d="M3 2h10v12l-5-3-5 3V2z" />
                </svg>
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em" }}>Saved</span>
                {bookmarkCount > 0 && (
                  <span style={{
                    background: t.accent, color: "#fff",
                    borderRadius: "50%", width: 15, height: 15,
                    fontSize: 8, fontWeight: 700, letterSpacing: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    position: "absolute", top: -5, right: -5,
                  }}>
                    {bookmarkCount > 9 ? "9+" : bookmarkCount}
                  </span>
                )}
              </button>
            )}
            {onOpenCodeExplorer && (
              <button
                onClick={onOpenCodeExplorer}
                aria-label="Criminal Code Explorer"
                style={navBtn}
                onMouseEnter={navHover}
                onMouseLeave={navLeave}
              >
                <span style={{ fontFamily: "'Courier New', monospace", fontSize: 14, fontWeight: 700 }}>§</span>
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em" }}>Code</span>
              </button>
            )}
            <a
              href="https://buymeacoffee.com/alasdairnc"
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...navBtn, textDecoration: "none" }}
              onMouseEnter={navHover}
              onMouseLeave={navLeave}
            >
              <span style={{ fontSize: 13 }}>☕</span>
              <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em" }}>Coffee</span>
            </a>
            <button
              onClick={toggleTheme}
              style={navBtn}
              onMouseEnter={navHover}
              onMouseLeave={navLeave}
            >
              <span style={{ fontSize: 13 }}>{isDark ? "○" : "●"}</span>
              <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em" }}>
                {isDark ? "Light" : "Dark"}
              </span>
            </button>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${t.border}`, marginTop: 22 }} />
      </div>
    </header>
  );
}
