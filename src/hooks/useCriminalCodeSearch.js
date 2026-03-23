import { useState, useMemo, useEffect, useRef } from "react";
import { CRIMINAL_CODE_SECTIONS } from "../lib/criminalCodeData.js";

const MAX_RESULTS = 50;
const DEBOUNCE_MS = 150;

export function useCriminalCodeSearch() {
  const [query, setQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [partFilter, setPartFilter] = useState("all");
  const [results, setResults] = useState([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const timerRef = useRef(null);

  // Convert Map to array once
  const allSections = useMemo(() => {
    return Array.from(CRIMINAL_CODE_SECTIONS.entries()).map(([num, entry]) => ({
      num,
      ...entry,
    }));
  }, []);

  // Total section count
  const totalSections = allSections.length;

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const q = query.toLowerCase().replace(/^s\.\s*/, "").trim();
      const filtered = [];
      let total = 0;

      for (const section of allSections) {
        // Severity filter
        if (severityFilter !== "all") {
          const sev = (section.severity || "").toLowerCase();
          if (!sev.includes(severityFilter.toLowerCase())) continue;
        }

        // Part filter
        if (partFilter !== "all") {
          if (!section.partOf || !section.partOf.includes(partFilter)) continue;
        }

        // Text search
        if (q) {
          const numMatch = section.num.startsWith(q);
          const titleMatch = (section.title || "").toLowerCase().includes(q);
          const defMatch = (section.definition || "").toLowerCase().includes(q);
          const tagMatch = (section.topicsTagged || []).some((t) =>
            t.toLowerCase().includes(q)
          );
          if (!numMatch && !titleMatch && !defMatch && !tagMatch) continue;
        }

        total++;
        if (filtered.length < MAX_RESULTS) {
          // Score for sorting: section number match > title > definition > tag
          let score = 0;
          if (q) {
            if (section.num === q) score = 100;
            else if (section.num.startsWith(q)) score = 80;
            else if ((section.title || "").toLowerCase().startsWith(q)) score = 60;
            else if ((section.title || "").toLowerCase().includes(q)) score = 40;
            else score = 20;
          }
          filtered.push({ ...section, _score: score });
        }
      }

      // Sort by score (desc), then by section number (asc)
      if (q) {
        filtered.sort((a, b) => {
          if (b._score !== a._score) return b._score - a._score;
          return parseFloat(a.num) - parseFloat(b.num);
        });
      }

      setResults(filtered);
      setTotalMatches(total);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timerRef.current);
  }, [query, severityFilter, partFilter, allSections]);

  return {
    query,
    setQuery,
    severityFilter,
    setSeverityFilter,
    partFilter,
    setPartFilter,
    results,
    totalMatches,
    totalSections,
  };
}
