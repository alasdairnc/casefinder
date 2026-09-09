// Shared helpers for CaseDive Claude Code hooks.
// All hooks run through Node so they behave identically on macOS, Windows, and CI
// (no dependency on python3 / sh being on PATH).

/** Read all of stdin as a string. */
export async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

/** Read stdin and parse the Claude Code hook JSON payload. Returns {} on any error. */
export async function readPayload() {
  try {
    const raw = await readStdin();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Extract tool_input.file_path from a payload, normalized to forward slashes. */
export function filePathFrom(payload) {
  const p = (payload && payload.tool_input && payload.tool_input.file_path) || '';
  return p.replace(/\\/g, '/');
}

/** Extract tool_input.command from a payload. */
export function commandFrom(payload) {
  return (payload && payload.tool_input && payload.tool_input.command) || '';
}
