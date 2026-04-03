/** Parse first JSON object from torqa --json stdout/stderr (core owns schema). */
export function tryParseTorqaJson(stdout: string, stderr: string): unknown {
  for (const raw of [stdout.trim(), stderr.trim()]) {
    if (!raw) continue;
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      /* try extract last line object — rare */
    }
  }
  return null;
}
