import type { PolicyThresholdConfig } from "@/lib/policy-types";

export type BuiltInPolicyTemplate = {
  slug: string;
  name: string;
  description: string;
  category: string;
  config: PolicyThresholdConfig;
};

export const BUILT_IN_POLICY_TEMPLATES: BuiltInPolicyTemplate[] = [
  {
    slug: "startup-baseline",
    name: "Startup baseline",
    description: "Pragmatic defaults for small teams shipping quickly.",
    category: "baseline",
    config: {
      minimumTrustScore: 55,
      failOnCritical: true,
      maxReviewFindings: 12,
      reviewOverflowMode: "warn",
      requireNoPlaintextSecrets: true,
      requireWebhookAuth: false,
      requireErrorHandling: false,
      blockTlsBypass: true,
    },
  },
  {
    slug: "strict-security",
    name: "Strict security",
    description: "Tighten gates for production systems handling sensitive data.",
    category: "security",
    config: {
      minimumTrustScore: 72,
      failOnCritical: true,
      maxReviewFindings: 4,
      reviewOverflowMode: "fail",
      requireNoPlaintextSecrets: true,
      requireWebhookAuth: true,
      requireErrorHandling: true,
      blockTlsBypass: true,
    },
  },
  {
    slug: "agency-client-safe",
    name: "Agency client-safe",
    description: "Client delivery posture: visible controls and fewer review surprises.",
    category: "delivery",
    config: {
      minimumTrustScore: 62,
      failOnCritical: true,
      maxReviewFindings: 8,
      reviewOverflowMode: "warn",
      requireNoPlaintextSecrets: true,
      requireWebhookAuth: true,
      requireErrorHandling: true,
      blockTlsBypass: true,
    },
  },
  {
    slug: "enterprise-governance",
    name: "Enterprise governance",
    description: "Board-ready bar: high trust floor and strict hygiene.",
    category: "enterprise",
    config: {
      minimumTrustScore: 80,
      failOnCritical: true,
      maxReviewFindings: 2,
      reviewOverflowMode: "fail",
      requireNoPlaintextSecrets: true,
      requireWebhookAuth: true,
      requireErrorHandling: true,
      blockTlsBypass: true,
    },
  },
  {
    slug: "n8n-production",
    name: "n8n production workflow",
    description: "Optimized for n8n exports: webhooks, HTTP, and TLS expectations.",
    category: "n8n",
    config: {
      minimumTrustScore: 68,
      failOnCritical: true,
      maxReviewFindings: 6,
      reviewOverflowMode: "fail",
      requireNoPlaintextSecrets: true,
      requireWebhookAuth: true,
      requireErrorHandling: true,
      blockTlsBypass: true,
    },
  },
];

export function getBuiltInTemplateBySlug(slug: string): BuiltInPolicyTemplate | undefined {
  return BUILT_IN_POLICY_TEMPLATES.find((t) => t.slug === slug);
}

export function mergeThresholdConfig(
  base: PolicyThresholdConfig,
  patch: Partial<PolicyThresholdConfig> & Record<string, unknown>
): PolicyThresholdConfig {
  const pickNum = (k: keyof PolicyThresholdConfig): number | undefined => {
    const v = patch[k];
    return typeof v === "number" && Number.isFinite(v) ? v : undefined;
  };
  const pickBool = (k: keyof PolicyThresholdConfig): boolean | undefined => {
    const v = patch[k];
    return typeof v === "boolean" ? v : undefined;
  };
  const modeRaw = patch.reviewOverflowMode;
  const reviewOverflowMode =
    modeRaw === "fail" || modeRaw === "warn"
      ? modeRaw
      : base.reviewOverflowMode;

  return {
    minimumTrustScore: pickNum("minimumTrustScore") ?? base.minimumTrustScore,
    failOnCritical: pickBool("failOnCritical") ?? base.failOnCritical,
    maxReviewFindings: pickNum("maxReviewFindings") ?? base.maxReviewFindings,
    reviewOverflowMode,
    requireNoPlaintextSecrets: pickBool("requireNoPlaintextSecrets") ?? base.requireNoPlaintextSecrets,
    requireWebhookAuth: pickBool("requireWebhookAuth") ?? base.requireWebhookAuth,
    requireErrorHandling: pickBool("requireErrorHandling") ?? base.requireErrorHandling,
    blockTlsBypass: pickBool("blockTlsBypass") ?? base.blockTlsBypass,
  };
}
