/**
 * POST /api/mcp
 *
 * Torqa MCP server — JSON-RPC 2.0 transport (stateless HTTP).
 * Supports: initialize, tools/list, tools/call
 *
 * Auth: x-api-key header or Authorization: Bearer <key>
 *
 * Implements Model Context Protocol 0.1 (Claude / Cursor / Copilot compatible).
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractApiKeyFromRequest, hashApiKey } from "@/lib/api-keys";
import { MCP_TOOLS, callMcpTool, type McpCallContext } from "@/lib/mcp/tools";
import type { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
};

function ok(id: string | number | null | undefined, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, result });
}

function rpcError(id: string | number | null | undefined, code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
}

const SERVER_INFO = {
  name: "torqa",
  version: "0.2.2",
  description: "Torqa governance engine — scan workflows, evaluate policies, query audit findings",
};

export async function POST(request: Request) {
  const admin = createAdminClient();
  if (!admin) return rpcError(null, -32603, "Service unavailable");

  const rawKey = extractApiKeyFromRequest(request);
  if (!rawKey) return rpcError(null, -32600, "Missing API key");

  const keyHash = hashApiKey(rawKey);
  const { data: keyRow } = await admin
    .from("api_keys")
    .select("id, user_id, revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (!keyRow || keyRow.revoked_at) {
    return rpcError(null, -32600, "Invalid or revoked API key");
  }

  const userId = keyRow.user_id as string;
  const apiKeyId = keyRow.id as string;

  let body: unknown;
  try { body = await request.json(); } catch {
    return rpcError(null, -32700, "Parse error — invalid JSON");
  }

  const req = body as JsonRpcRequest;
  if (!req || req.jsonrpc !== "2.0" || typeof req.method !== "string") {
    return rpcError(req?.id ?? null, -32600, "Invalid request");
  }

  switch (req.method) {
    case "initialize":
      return ok(req.id, {
        protocolVersion: "0.1.0",
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });

    case "tools/list":
      return ok(req.id, { tools: MCP_TOOLS });

    case "tools/call": {
      const params = req.params ?? {};
      const toolName = typeof params.name === "string" ? params.name : null;
      const args = (params.arguments ?? {}) as Record<string, unknown>;
      if (!toolName) return rpcError(req.id, -32602, "params.name required");

      const mcpCtx: McpCallContext = { admin: admin as SupabaseClient, userId, apiKeyId };
      const result = await callMcpTool(toolName, args, mcpCtx);
      if (!result.ok) {
        return rpcError(req.id, -32602, result.error);
      }
      return ok(req.id, { content: [{ type: "text", text: result.text }] });
    }

    case "ping":
      return ok(req.id, { pong: true });

    default:
      return rpcError(req.id, -32601, `Method not found: ${req.method}`);
  }
}

export async function GET() {
  return NextResponse.json({
    ...SERVER_INFO,
    transport: "http",
    endpoint: "/api/mcp",
    tools: MCP_TOOLS.map((t) => ({ name: t.name, description: t.description })),
  });
}
