import { useTheme } from "../lib/ThemeContext.jsx";

function getUrlForSuggestion(suggestion) {
  if (suggestion.type === "canlii") {
    return `https://www.canlii.org/en/#search/text=${encodeURIComponent(suggestion.term)}`;
  }
  return null;
}

export default function SuggestionLink({ suggestion }) {
  const t = useTheme();
  const url = getUrlForSuggestion(suggestion);

  if (!url) {
    return null; // Don't render if we can't generate a URL
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        fontFamily: "'Helvetica Neue', sans-serif",
        fontSize: 12,
        color: t.tagText,
        background: t.tagBg,
        padding: "6px 14px",
        textDecoration: "none",
        border: `1px solid ${t.border}`,
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {suggestion.label} {"\u2197"}
    </a>
  );
}
