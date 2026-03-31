import { useState, useEffect } from "react";
import { useTheme } from "../lib/ThemeContext.jsx";

async function resolveUrl(suggestion) {
  if (suggestion.type === "canlii") {
    return `https://www.canlii.org/en/#search/text=${encodeURIComponent(suggestion.term)}`;
  }

  if (suggestion.type === "criminal_code") {
    const { lookupSection } = await import("../lib/criminalCodeData.js");
    const entry = lookupSection(suggestion.citation);
    return entry?.url || null;
  }

  if (suggestion.type === "provincial_statute") {
    const { lookupCivilLawSection } = await import("../lib/civilLawData.js");
    const found = lookupCivilLawSection(suggestion.citation);
    return found?.entry?.url || null;
  }

  return null;
}

export default function SuggestionLink({ suggestion }) {
  const t = useTheme();
  const [url, setUrl] = useState(
    suggestion.type === "canlii"
      ? `https://www.canlii.org/en/#search/text=${encodeURIComponent(suggestion.term)}`
      : null
  );

  useEffect(() => {
    if (suggestion.type === "canlii") return; // already set synchronously above
    resolveUrl(suggestion).then(setUrl);
  }, [suggestion]);

  if (!url) {
    return null;
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
