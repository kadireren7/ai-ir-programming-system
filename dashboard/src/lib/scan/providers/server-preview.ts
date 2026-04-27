import { buildScanApiResult, type ScanApiSuccess } from "@/lib/scan-engine";
import type { ScanProvider, ScanProviderInput } from "./types";

/**
 * Default dashboard analyzer: deterministic TypeScript Scan Engine v1 from {@link scan-engine}.
 * Provider id remains `server-preview` for env compatibility; payload `engine` comes from scan-engine.
 */
export const serverPreviewProvider: ScanProvider = {
  id: "server-preview",
  label: "Dashboard server preview (TypeScript heuristics)",
  async scan(input: ScanProviderInput): Promise<ScanApiSuccess> {
    return buildScanApiResult(input.content, input.source);
  },
};
