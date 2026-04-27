import { isSupabaseConfigured } from "@/lib/env";
import { getConfiguredScanProviderId, getScanProvider, SCAN_PROVIDER_IDS } from "@/lib/scan/providers";
import { TORQA_APP_VERSION } from "@/lib/torqa-version";

export type TorqaHealthSnapshot = {
  status: "ok" | "degraded";
  version: string;
  environment: "development" | "production" | "test" | "unknown";
  checks: {
    supabasePublicConfigured: boolean;
    scanProviderId: string;
    scanProviderResolvable: boolean;
    hostedEngineUrlConfigured: boolean;
    publicScanAuthConfigured: boolean;
    cronSecretConfigured: boolean;
    apiKeyPepperConfigured: boolean;
  };
};

function nodeEnv(): TorqaHealthSnapshot["environment"] {
  const e = process.env.NODE_ENV;
  if (e === "development" || e === "production" || e === "test") return e;
  return "unknown";
}

/**
 * Safe for unauthenticated `GET /api/health` — booleans and version only, no secret values.
 */
export function getTorqaHealthSnapshot(): TorqaHealthSnapshot {
  const supabasePublicConfigured = isSupabaseConfigured();
  const scanProviderId = getConfiguredScanProviderId();
  let scanProviderResolvable = false;
  try {
    getScanProvider();
    scanProviderResolvable = true;
  } catch {
    scanProviderResolvable = false;
  }

  const hostedEngineUrlConfigured = Boolean(process.env.TORQA_ENGINE_URL?.trim());
  const cronSecretConfigured = Boolean(process.env.TORQA_CRON_SECRET?.trim());
  const apiKeyPepperConfigured = Boolean(process.env.TORQA_API_KEY_PEPPER?.trim());
  const publicScanAuthConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );

  /** Core scan path must resolve a provider; other flags are informational. */
  const degraded = !scanProviderResolvable;

  return {
    status: degraded ? "degraded" : "ok",
    version: TORQA_APP_VERSION,
    environment: nodeEnv(),
    checks: {
      supabasePublicConfigured,
      scanProviderId,
      scanProviderResolvable,
      hostedEngineUrlConfigured,
      publicScanAuthConfigured,
      cronSecretConfigured,
      apiKeyPepperConfigured,
    },
  };
}

/** Registered scan provider ids (for operators comparing env typos). */
export { SCAN_PROVIDER_IDS };
