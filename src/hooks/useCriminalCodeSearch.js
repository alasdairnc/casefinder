import { useState, useMemo, useEffect, useRef } from "react";
import { CRIMINAL_CODE_SECTIONS } from "../lib/criminalCodeData.js";

const MAX_RESULTS = 100;
const DEBOUNCE_MS = 100;

/**
 * Natural sort for section numbers (e.g., "2", "2.1", "10", "100")
 */
function compareSections(a, b) {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const valA = partsA[i] || 0;
    const valB = partsB[i] || 0;
    if (valA !== valB) return valA - valB;
  }
  return a.localeCompare(b);
}

export function useCriminalCodeSearch() {
  const [query, setQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [partFilter, setPartFilter] = useState("all");
  const [results, setResults] = useState([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const timerRef = useRef(null);

  // Convert Map to array once
  const allSections = useMemo(() => {
    return Array.from(CRIMINAL_CODE_SECTIONS.entries())
      .map(([num, entry]) => ({
        num,
        ...entry,
      }))
      .sort((a, b) => compareSections(a.num, b.num));
  }, []);

  // Total section count
  const totalSections = allSections.length;

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const q = query.toLowerCase().replace(/^s\.\s*/, "").trim();
      const filtered = [];
      let total = 0;

      // Pre-filter by severity and part if they are not "all"
      const needsSeverityFilter = severityFilter !== "all";
      const needsPartFilter = partFilter !== "all";
      const sevFilterLower = severityFilter.toLowerCase();

      for (const section of allSections) {
        // Severity filter
        if (needsSeverityFilter) {
          const sev = (section.severity || "").toLowerCase();
          if (!sev.includes(sevFilterLower)) continue;
        }

        // Part filter
        if (needsPartFilter) {
          if (!section.partOf || !section.partOf.includes(partFilter)) continue;
        }

        // Text search
        let score = 0;
        if (q) {
          const numMatch = section.num.startsWith(q);
          const titleMatch = (section.title || "").toLowerCase().includes(q);
          const defMatch = (section.definition || "").toLowerCase().includes(q);
          const tagMatch = (section.topicsTagged || []).some((t) =>
            t.toLowerCase().includes(q)
          );

          if (!numMatch && !titleMatch && !defMatch && !tagMatch) continue;

          // Score for sorting: exact number > starts with number > title starts > title includes > definition/tags
          if (section.num === q) score = 1000;
          else if (numMatch) score = 800;
          else if ((section.title || "").toLowerCase().startsWith(q)) score = 600;
          else if (titleMatch) score = 400;
          else if (defMatch) score = 200;
          else score = 100;
        }

        total++;
        if (filtered.length < MAX_RESULTS || q) {
          filtered.push({ ...section, _score: score });
        }
      }

      // Sort by score (desc), then by section number (asc)
      if (q) {
        filtered.sort((a, b) => {
          if (b._score !== a._score) return b._score - a._score;
          return compareSections(a.num, b.num);
        });
      }

      setResults(q ? filtered.slice(0, MAX_RESULTS) : filtered.slice(0, MAX_RESULTS));
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
