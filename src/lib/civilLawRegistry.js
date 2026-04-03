function extractSectionNumber(citation) {
  const m = citation.match(/s\.\s*([\d.]+(?:\(\w+\))?)/i)
    || citation.match(/section\s+([\d.]+)/i)
    || citation.match(/,\s*([\d.]+(?:\(\w+\))?)\s*$/);
  return m ? m[1].trim() : null;
}

export function createCivilLawRegistry({ indexSources = [], aliases = [] } = {}) {
  const index = new Map(
    indexSources.flatMap(({ prefix, map }) =>
      Array.from(map.entries()).map(([k, v]) => [`${prefix} s. ${k}`, v])
    )
  );

  function lookup(citation) {
    if (!citation || typeof citation !== "string") return null;
    const trimmed = citation.trim();

    for (const { pattern, prefix, map } of aliases) {
      if (pattern.test(trimmed)) {
        const sectionNum = extractSectionNumber(trimmed);
        if (!sectionNum) continue;

        let entry = map.get(sectionNum);
        if (!entry) {
          const baseNum = sectionNum.split("(")[0];
          if (baseNum !== sectionNum) {
            entry = map.get(baseNum);
          }
        }

        if (entry) return { entry, prefix };
      }
    }

    return null;
  }

  return {
    index,
    lookup,
  };
}
