import type { SupabaseClient } from "@supabase/supabase-js";
import type { PolicyThresholdConfig } from "@/lib/policy-types";
import {
  BUILT_IN_POLICY_TEMPLATES,
  getBuiltInTemplateBySlug,
  mergeThresholdConfig,
} from "@/lib/built-in-policy-templates";

export type ResolvedScanPolicy = {
  name: string;
  config: PolicyThresholdConfig;
};

async function loadTemplateConfigFromDb(
  supabase: SupabaseClient,
  slug: string
): Promise<PolicyThresholdConfig | null> {
  const { data, error } = await supabase
    .from("policy_templates")
    .select("config")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data?.config || typeof data.config !== "object" || Array.isArray(data.config)) {
    return null;
  }
  return data.config as PolicyThresholdConfig;
}

function normalizeConfig(raw: unknown): Partial<PolicyThresholdConfig> & Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Partial<PolicyThresholdConfig> & Record<string, unknown>;
}

/**
 * Resolves effective thresholds for a scan from a saved workspace policy and/or template slug.
 */
export async function resolveScanPolicy(
  supabase: SupabaseClient | null,
  opts: {
    workspacePolicyId?: string | null;
    policyTemplateSlug?: string | null;
    /** When set (e.g. public API key path), workspace policies are limited to personal rows for this user. */
    strictPersonalUserId?: string | null;
  }
): Promise<ResolvedScanPolicy | null> {
  const { workspacePolicyId, policyTemplateSlug, strictPersonalUserId } = opts;

  if (workspacePolicyId && supabase) {
    let q = supabase
      .from("workspace_policies")
      .select("id,name,template_slug,config,enabled,user_id,organization_id")
      .eq("id", workspacePolicyId);
    if (strictPersonalUserId) {
      q = q.is("organization_id", null).eq("user_id", strictPersonalUserId);
    }
    const { data: row, error } = await q.maybeSingle();
    if (error || !row || row.enabled === false) return null;

    const name = typeof row.name === "string" ? row.name : "Workspace policy";
    const templateSlug = typeof row.template_slug === "string" ? row.template_slug : null;
    const patch = normalizeConfig(row.config);

    let base: PolicyThresholdConfig | null = null;
    if (templateSlug) {
      const built = getBuiltInTemplateBySlug(templateSlug);
      if (built) {
        base = { ...built.config };
      } else if (supabase) {
        const dbCfg = await loadTemplateConfigFromDb(supabase, templateSlug);
        if (dbCfg) base = { ...dbCfg };
      }
    }
    if (!base) {
      base = { ...BUILT_IN_POLICY_TEMPLATES[0].config };
    }
    return { name, config: mergeThresholdConfig(base, patch) };
  }

  const slug = policyTemplateSlug?.trim() || null;
  if (!slug) return null;

  const built = getBuiltInTemplateBySlug(slug);
  if (built) {
    return { name: built.name, config: { ...built.config } };
  }

  if (supabase) {
    const { data: tpl } = await supabase
      .from("policy_templates")
      .select("name,config")
      .eq("slug", slug)
      .maybeSingle();
    if (tpl?.config && typeof tpl.config === "object" && !Array.isArray(tpl.config)) {
      const nm = typeof tpl.name === "string" ? tpl.name : slug;
      return { name: nm, config: tpl.config as PolicyThresholdConfig };
    }
  }

  return null;
}
