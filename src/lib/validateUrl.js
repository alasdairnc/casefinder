const TRUSTED_DOMAINS = ["canlii.org", "laws-lois.justice.gc.ca"];

export function isValidUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      TRUSTED_DOMAINS.some(
        (d) => parsed.hostname === d || parsed.hostname.endsWith("." + d)
      )
    );
  } catch {
    return false;
  }
}
