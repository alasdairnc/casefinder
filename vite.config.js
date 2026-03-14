import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    plugins: [
      tailwindcss(),
      react(),
      {
        name: "api-dev-middleware",
        configureServer(server) {

          // ── /api/analyze ──────────────────────────────────────────────
          server.middlewares.use("/api/analyze", async (req, res) => {
            if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }
            if (req.method !== "POST") {
              res.writeHead(405, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Method not allowed" }));
              return;
            }

            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            let body;
            try { body = JSON.parse(Buffer.concat(chunks).toString()); }
            catch { res.writeHead(400, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "Invalid JSON" })); return; }
            const { scenario, filters } = body;

            if (!scenario || typeof scenario !== "string" || !scenario.trim()) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Scenario is required" }));
              return;
            }

            const { buildSystemPrompt } = await import("./src/lib/prompts.js");

            try {
              const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-api-key": env.ANTHROPIC_API_KEY,
                  "anthropic-version": "2023-06-01",
                },
                body: JSON.stringify({
                  model: "claude-sonnet-4-20250514",
                  max_tokens: 1000,
                  system: buildSystemPrompt(filters || {}),
                  messages: [{ role: "user", content: scenario }],
                }),
              });

              const data = await response.json();

              if (!response.ok) {
                res.writeHead(response.status, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                  error: data.error?.message || `Anthropic API error: ${response.status}`,
                }));
                return;
              }

              const text = data.content?.map((b) => b.text || "").join("") || "";
              const clean = text.replace(/```json|```/g, "").trim();

              try {
                const parsed = JSON.parse(clean);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(parsed));
              } catch {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Failed to parse AI response", raw: clean }));
              }
            } catch (err) {
              console.error("Analyze middleware error:", err);
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Internal server error" }));
            }
          });

          // ── /api/case-summary ─────────────────────────────────────────
          server.middlewares.use("/api/case-summary", async (req, res) => {
            if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }
            if (req.method !== "POST") {
              res.writeHead(405, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Method not allowed" }));
              return;
            }

            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            let body;
            try { body = JSON.parse(Buffer.concat(chunks).toString()); }
            catch { res.writeHead(400, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "Invalid JSON" })); return; }

            const { citation, title, court, year, summary, matchedContent, scenario } = body;
            if (!citation) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "citation is required" }));
              return;
            }

            const prompt = [
              `Citation: ${citation}`,
              title ? `Title: ${title}` : null,
              court ? `Court: ${court}` : null,
              year ? `Year: ${year}` : null,
              summary ? `Existing summary: ${summary}` : null,
              matchedContent ? `Matched context: ${matchedContent}` : null,
              scenario ? `User scenario: ${scenario}` : null,
            ].filter(Boolean).join("\n");

            const system = `You are a Canadian legal research assistant. Given case metadata and context, produce a concise structured summary. Return ONLY valid JSON with these exact keys: facts, held, ratio, keyQuote, significance. Keep each field to 1-3 sentences. Set keyQuote to null if you cannot cite a verbatim passage from the provided context. Never fabricate holdings, quotes, or outcomes.`;

            try {
              const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-api-key": env.ANTHROPIC_API_KEY,
                  "anthropic-version": "2023-06-01",
                },
                body: JSON.stringify({
                  model: "claude-sonnet-4-20250514",
                  max_tokens: 800,
                  system,
                  messages: [{ role: "user", content: prompt }],
                }),
              });

              const data = await response.json();
              if (!response.ok) {
                res.writeHead(response.status, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: data.error?.message || `API error: ${response.status}` }));
                return;
              }

              const text = data.content?.map((b) => b.text || "").join("") || "";
              const clean = text.replace(/```json|```/g, "").trim();
              try {
                const parsed = JSON.parse(clean);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(parsed));
              } catch {
                res.writeHead(422, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Could not parse structured summary." }));
              }
            } catch (err) {
              console.error("case-summary middleware error:", err);
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Internal server error" }));
            }
          });

          // ── /api/verify ───────────────────────────────────────────────
          server.middlewares.use("/api/verify", async (req, res) => {
            if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }
            if (req.method !== "POST") {
              res.writeHead(405, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Method not allowed" }));
              return;
            }

            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            let parsedBody;
            try { parsedBody = JSON.parse(Buffer.concat(chunks).toString()); }
            catch { res.writeHead(400, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "Invalid JSON" })); return; }
            const { citations } = parsedBody;

            if (!Array.isArray(citations) || citations.length === 0) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "citations array is required" }));
              return;
            }

            const { parseCitation, buildCaseId, buildApiUrl, buildCaseUrl, buildSearchUrl } =
              await import("./src/lib/canlii.js");

            const apiKey = env.CANLII_API_KEY || "";
            const results = {};

            await Promise.all(
              citations.map(async (citation) => {
                const parsed = parseCitation(citation);
                if (!parsed) {
                  results[citation] = { status: "unparseable", searchUrl: buildSearchUrl(citation) };
                  return;
                }
                if (!parsed.dbId) {
                  results[citation] = { status: "unknown_court", searchUrl: buildSearchUrl(citation) };
                  return;
                }
                const caseId = buildCaseId({ year: parsed.year, courtCode: parsed.courtCode, number: parsed.number });
                const caseUrl = buildCaseUrl(parsed.dbId, parsed.year, caseId);
                const searchUrl = buildSearchUrl(citation);

                if (!apiKey) {
                  results[citation] = { status: "unverified", url: caseUrl, searchUrl };
                  return;
                }

                try {
                  const apiRes = await fetch(buildApiUrl(parsed.dbId, caseId, apiKey));
                  if (apiRes.status === 404) { results[citation] = { status: "not_found", searchUrl }; return; }
                  if (!apiRes.ok) { results[citation] = { status: "error", searchUrl }; return; }
                  const data = await apiRes.json();
                  results[citation] = { status: "verified", url: caseUrl, searchUrl, title: data.title || citation };
                } catch {
                  results[citation] = { status: "error", searchUrl };
                }
              })
            );

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(results));
          });

        },
      },
    ],
  };
});
