import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      {
        name: "api-dev-middleware",
        configureServer(server) {
          server.middlewares.use("/api/analyze", async (req, res) => {
            if (req.method === "OPTIONS") {
              res.writeHead(200);
              res.end();
              return;
            }
            if (req.method !== "POST") {
              res.writeHead(405, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Method not allowed" }));
              return;
            }

            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            const body = JSON.parse(Buffer.concat(chunks).toString());
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
              console.error("API middleware error:", err);
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Internal server error" }));
            }
          });
        },
      },
    ],
  };
});
