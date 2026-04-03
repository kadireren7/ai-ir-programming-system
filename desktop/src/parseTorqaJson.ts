/** Parse JSON from torqa --json stdout/stderr (core owns schema). Handles stderr-only payloads and noise before `{`. */

function extractBalancedObject(s: string, start: number): string | null {
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === "{") depth++;
    if (c === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

/** Largest `{…}` slice that parses as JSON (last resort). */
function extractLargestJsonObject(s: string): string | null {
  let best: string | null = null;
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== "{") continue;
    const slice = extractBalancedObject(s, i);
    if (!slice) continue;
    if (!best || slice.length > best.length) best = slice;
  }
  return best;
}

function tryParseOneBlock(raw: string): unknown | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    const extracted = extractLargestJsonObject(t);
    if (!extracted) return null;
    try {
      return JSON.parse(extracted) as unknown;
    } catch {
      return null;
    }
  }
}

/** Prefer stdout, then stderr, then combined (for split payloads). */
export function tryParseTorqaJson(stdout: string, stderr: string): unknown {
  const blocks = [stdout.trim(), stderr.trim(), [stdout, stderr].filter(Boolean).join("\n").trim()];
  for (const raw of blocks) {
    const v = tryParseOneBlock(raw);
    if (v !== null) return v;
  }
  return null;
}
