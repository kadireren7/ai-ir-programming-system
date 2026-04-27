/** Default cap for scan-style JSON payloads (source + content + policy hints). */
export const SCAN_JSON_BODY_MAX_BYTES = 512 * 1024;

export type ReadJsonBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; status: 400 | 413; message: string };

/**
 * Reads the full body as bytes (bounded), then JSON.parse. Rejects when Content-Length or
 * actual body exceeds maxBytes. Use on scan and other high-risk POST routes.
 */
export async function readJsonBodyWithByteLimit(request: Request, maxBytes: number): Promise<ReadJsonBodyResult> {
  const cl = request.headers.get("content-length");
  if (cl) {
    const n = Number.parseInt(cl, 10);
    if (Number.isFinite(n) && n > maxBytes) {
      return { ok: false, status: 413, message: "Request body too large" };
    }
  }

  let buf: ArrayBuffer;
  try {
    buf = await request.arrayBuffer();
  } catch {
    return { ok: false, status: 400, message: "Could not read request body" };
  }

  if (buf.byteLength > maxBytes) {
    return { ok: false, status: 413, message: "Request body too large" };
  }

  if (buf.byteLength === 0) {
    return { ok: false, status: 400, message: "Empty body" };
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return { ok: false, status: 400, message: "Body must be valid UTF-8" };
  }

  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, status: 400, message: "Invalid JSON body" };
  }

  return { ok: true, value };
}
