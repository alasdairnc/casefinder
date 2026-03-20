import { useTheme } from "../lib/ThemeContext.jsx";

function formatTime(ts) {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function formatDate(ts) {
  const d = new Date(ts);
  const today = new Date();
  if (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  ) {
    return "Today";
  }
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export default function SearchHistory({ history, onSelect, onClose, clearHistory }) {
  const t = useTheme();

  const overlayStyle = {
    position: "fixed", inset: 0, zIndex: 200,
    background: "rgba(0,0,0,0.35)",
    display: "flex", alignItems: "flex-end", justifyContent: "center",
  };

  const sheetStyle = {
    background: t.bg,
    border: `1px solid ${t.border}`,
    borderBottom: "none",
    width: "100%", maxWidth: 760,
    maxHeight: "70vh",
    display: "flex", flexDirection: "column",
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={sheetStyle} onClick={e => e.stopPropagation()}>
        {/* Drag handle */}
        <div style={{
          display: "flex", justifyContent: "center", padding: "12px 0 4px",
        }}>
          <div style={{
            width: 36, height: 4,
            background: t.border, borderRadius: 2,
          }} />
        </div>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 24px 12px", borderBottom: `1px solid ${t.borderLight}`,
        }}>
          <div style={{
            fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10,
            letterSpacing: 3.5, textTransform: "uppercase", color: t.textTertiary,
          }}>
            Search History
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                  fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
                  color: t.textTertiary, letterSpacing: 1,
                }}
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: 0,
                fontFamily: "'Helvetica Neue', sans-serif", fontSize: 18,
                color: t.textTertiary, lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ overflowY: "auto", flexGrow: 1 }}>
          {history.length === 0 ? (
            <div style={{
              padding: "32px 24px",
              fontFamily: "'Times New Roman', serif",
              fontSize: 15, color: t.textTertiary,
              fontStyle: "italic", textAlign: "center",
            }}>
              No search history yet.
            </div>
          ) : (
            history.slice(0, 10).map(entry => (
              <div
                key={entry.id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 24px",
                  borderBottom: `1px solid ${t.borderLight}`,
                  gap: 12,
                }}
              >
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'Times New Roman', serif",
                    fontSize: "clamp(13px, 2vw, 14px)",
                    color: t.textSecondary,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    lineHeight: 1.5,
                  }}>
                    {entry.query.length > 70
                      ? entry.query.slice(0, 70) + "…"
                      : entry.query}
                  </div>
                  <div style={{
                    fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10,
                    color: t.textFaint, marginTop: 3, letterSpacing: 0.5,
                  }}>
                    {formatDate(entry.timestamp)} · {formatTime(entry.timestamp)}
                    {(() => {
                      const rc = entry.resultCounts || {};
                      const count = (rc.criminal_code || 0) + (rc.case_law || 0) +
                        (rc.civil_law || 0) + (rc.charter || 0);
                      return count ? ` · ${count} result${count !== 1 ? "s" : ""}` : "";
                    })()}
                  </div>
                </div>
                <button
                  onClick={() => { onSelect(entry.id); onClose(); }}
                  style={{
                    flexShrink: 0,
                    background: "none",
                    border: `1px solid ${t.border}`,
                    cursor: "pointer",
                    padding: "6px 14px",
                    fontFamily: "'Helvetica Neue', sans-serif",
                    fontSize: 11, letterSpacing: 1,
                    textTransform: "uppercase",
                    color: t.textSecondary,
                  }}
                >
                  Re-run
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
