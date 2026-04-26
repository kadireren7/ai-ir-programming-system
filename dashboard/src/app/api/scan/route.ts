import { NextResponse } from "next/server";
import { buildScanApiResult, type ScanSource } from "@/lib/scan-engine";

export const runtime = "nodejs";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isPlainObject(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }

  const sourceRaw = body.source;
  const content = body.content;

  if (sourceRaw !== "n8n" && sourceRaw !== "generic") {
    return NextResponse.json(
      { error: 'Field "source" must be either "n8n" or "generic"' },
      { status: 400 }
    );
  }

  if (!isPlainObject(content)) {
    return NextResponse.json(
      { error: 'Field "content" must be a JSON object (not null or an array)' },
      { status: 400 }
    );
  }

  const source = sourceRaw as ScanSource;
  const payload = buildScanApiResult(content, source);
  return NextResponse.json(payload);
}
