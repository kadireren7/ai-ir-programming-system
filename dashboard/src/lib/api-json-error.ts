import { NextResponse } from "next/server";
import { getOrCreateRequestId } from "@/lib/api-request-id";
import { logStructured } from "@/lib/structured-log";

export type TorqaApiErrorBody = {
  error: string;
  code: string;
  requestId: string;
};

function inferErrorCode(status: number): string {
  if (status === 400) return "bad_request";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 413) return "payload_too_large";
  if (status === 429) return "rate_limited";
  if (status === 503) return "service_unavailable";
  if (status >= 500) return "internal_error";
  return "error";
}

/**
 * Standard JSON error for API routes: `{ error, code, requestId }` plus `x-request-id` response header.
 */
export function jsonErrorResponse(
  status: number,
  message: string,
  requestId: string,
  code?: string
): NextResponse<TorqaApiErrorBody> {
  const c = code ?? inferErrorCode(status);
  const res = NextResponse.json({ error: message, code: c, requestId }, { status });
  res.headers.set("x-request-id", requestId);
  return res;
}

export function jsonDatabaseErrorResponse(requestId: string): NextResponse<TorqaApiErrorBody> {
  logStructured("warn", "api_database_error", { requestId, code: "database_error" });
  return jsonErrorResponse(500, "A database error occurred", requestId, "database_error");
}

/** Shorthand: derive request id from the incoming request. */
export function apiJsonError(request: Request, status: number, message: string, code?: string): NextResponse<TorqaApiErrorBody> {
  return jsonErrorResponse(status, message, getOrCreateRequestId(request), code);
}

export function apiJsonDatabaseError(request: Request): NextResponse<TorqaApiErrorBody> {
  return jsonDatabaseErrorResponse(getOrCreateRequestId(request));
}

export function attachRequestIdHeader(res: NextResponse, requestId: string): NextResponse {
  res.headers.set("x-request-id", requestId);
  return res;
}
