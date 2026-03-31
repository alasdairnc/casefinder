import { useTheme, useThemeActions } from "../lib/ThemeContext.jsx";

export default function Header({ bookmarkCount = 0, onOpenBookmarks, onOpenCodeExplorer }) {
  const t = useTheme();
  const { isDark, toggleTheme } = useThemeActions();

  const navItem = {
    background: "none",
    border: "none",
    color: t.textTertiary,
    cursor: "pointer",
    padding: 0,
    fontFamily: "'Helvetica Neue', sans-serif",
    fontSize: 11,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    textDecoration: "none",
    transition: "color 0.15s",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  };

  const hover = (e) => { e.currentTarget.style.color = t.text; };
  const leave = (e) => { e.currentTarget.style.color = t.textTertiary; };

  return (
    <header>
      {/* Gold top rule */}
      <div style={{ height: 2, background: t.accent }} />

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "16px 24px 0" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}>
          {/* Wordmark */}
          <img
            src={isDark ? '/logos/casedive-header-dark.svg' : '/logos/casedive-header.svg'}
            alt="CaseDive"
            style={{ height: '28px', width: 'auto', display: 'block' }}
          />

          {/* Nav */}
          <nav style={{ display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
            {onOpenBookmarks && (
              <button
                onClick={onOpenBookmarks}
                aria-label="Saved citations"
                style={{ ...navItem, position: "relative" }}
                onMouseEnter={hover}
                onMouseLeave={leave}
              >
                Saved
                {bookmarkCount > 0 && (
                  <span style={{ color: t.accent }}>
                    &thinsp;({bookmarkCount})
                  </span>
                )}
              </button>
            )}
            {onOpenCodeExplorer && (
              <button
                onClick={onOpenCodeExplorer}
                aria-label="Criminal Code Explorer"
                style={navItem}
                onMouseEnter={hover}
                onMouseLeave={leave}
              >
                <span style={{ fontFamily: "'Courier New', monospace", fontSize: 12 }}>§</span>
                &thinsp;Code
              </button>
            )}
            <a
              href="https://buymeacoffee.com/alasdairnc"
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...navItem, textDecoration: "none" }}
              onMouseEnter={hover}
              onMouseLeave={leave}
            >
              Coffee
            </a>
            <button
              onClick={toggleTheme}
              style={navItem}
              onMouseEnter={hover}
              onMouseLeave={leave}
            >
              {isDark ? "Light" : "Dark"}
            </button>
          </nav>
        </div>

        {/* Hairline rule */}
        <div style={{ borderBottom: `1px solid ${t.border}`, marginTop: 14 }} />
      </div>
    </header>
  );
}
