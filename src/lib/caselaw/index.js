import { criminalCases } from "./criminal.js";
import { charterCases } from "./charter.js";
import { constitutionalCases } from "./constitutional.js";
import { indigenousCases } from "./indigenous.js";
import { administrativeCases } from "./administrative.js";

/**
 * The Master Database aggregates all highly-curated Landmark Case Law sets
 * into a single unified array. This guarantees Vercel Ram overhead runs smoothly 
 * while allowing a unified domain scan from the API RAG Indexer.
 * 
 * Future Scalability: When crossing 500 cases, migrate this JSON shape to Postgres.
 */
export const MASTER_CASE_LAW_DB = [
  ...criminalCases,
  ...charterCases,
  ...constitutionalCases,
  ...indigenousCases,
  ...administrativeCases
];
