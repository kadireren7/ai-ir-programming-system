/**
 * Maps Torqa scan rule IDs to SOC2 Type II and ISO 27001:2022 controls.
 * Used for compliance report generation.
 */

export type ComplianceControl = {
  framework: "soc2" | "iso27001";
  control: string;
  title: string;
};

export type RuleComplianceMap = Record<string, ComplianceControl[]>;

// SOC2 Type II — Trust Services Criteria
// ISO 27001:2022 — Annex A Controls

export const RULE_COMPLIANCE_MAP: RuleComplianceMap = {
  // Credential / secret exposure
  "v1.secret.plaintext_detected": [
    { framework: "soc2", control: "CC6.1", title: "Logical and Physical Access Controls" },
    { framework: "soc2", control: "CC6.7", title: "Restrict Transmission of Information" },
    { framework: "iso27001", control: "A.8.12", title: "Data Leakage Prevention" },
    { framework: "iso27001", control: "A.9.4", title: "System and Application Access Control" },
  ],
  "v1.github.hardcoded_credential": [
    { framework: "soc2", control: "CC6.1", title: "Logical and Physical Access Controls" },
    { framework: "soc2", control: "CC6.7", title: "Restrict Transmission of Information" },
    { framework: "iso27001", control: "A.8.12", title: "Data Leakage Prevention" },
  ],
  "v1.github.secret_in_env": [
    { framework: "soc2", control: "CC6.1", title: "Logical and Physical Access Controls" },
    { framework: "iso27001", control: "A.8.12", title: "Data Leakage Prevention" },
  ],
  "v1.github.secret_echo": [
    { framework: "soc2", control: "CC6.7", title: "Restrict Transmission of Information" },
    { framework: "iso27001", control: "A.8.12", title: "Data Leakage Prevention" },
  ],

  // Transport security
  "v1.http.tls_verification_disabled": [
    { framework: "soc2", control: "CC6.7", title: "Restrict Transmission of Information" },
    { framework: "soc2", control: "CC6.6", title: "Logical Access from Non-Internal Networks" },
    { framework: "iso27001", control: "A.8.24", title: "Use of Cryptography" },
  ],
  "v1.http.plaintext_transport": [
    { framework: "soc2", control: "CC6.7", title: "Restrict Transmission of Information" },
    { framework: "iso27001", control: "A.8.24", title: "Use of Cryptography" },
    { framework: "iso27001", control: "A.5.14", title: "Information Transfer" },
  ],
  "v1.generic.http_plaintext_url": [
    { framework: "soc2", control: "CC6.7", title: "Restrict Transmission of Information" },
    { framework: "iso27001", control: "A.8.24", title: "Use of Cryptography" },
  ],

  // Authentication & access
  "v1.webhook.public_no_auth": [
    { framework: "soc2", control: "CC6.1", title: "Logical and Physical Access Controls" },
    { framework: "soc2", control: "CC6.6", title: "Logical Access from Non-Internal Networks" },
    { framework: "iso27001", control: "A.5.15", title: "Access Control" },
    { framework: "iso27001", control: "A.8.3", title: "Information Access Restriction" },
  ],
  "v1.webhook.auth_not_explicit": [
    { framework: "soc2", control: "CC6.1", title: "Logical and Physical Access Controls" },
    { framework: "iso27001", control: "A.5.15", title: "Access Control" },
  ],
  "v1.generic.webhook_auth_unclear": [
    { framework: "soc2", control: "CC6.1", title: "Logical and Physical Access Controls" },
    { framework: "iso27001", control: "A.5.15", title: "Access Control" },
  ],

  // Privilege management
  "v1.credential.privileged_integration": [
    { framework: "soc2", control: "CC6.3", title: "Role-Based Access Controls" },
    { framework: "iso27001", control: "A.5.18", title: "Access Rights" },
    { framework: "iso27001", control: "A.8.2", title: "Privileged Access Rights" },
  ],
  "v1.credential.scope_unnecessary": [
    { framework: "soc2", control: "CC6.3", title: "Role-Based Access Controls" },
    { framework: "iso27001", control: "A.5.18", title: "Access Rights" },
  ],
  "v1.github.permissions_write_all": [
    { framework: "soc2", control: "CC6.3", title: "Role-Based Access Controls" },
    { framework: "iso27001", control: "A.8.2", title: "Privileged Access Rights" },
  ],
  "v1.github.write_on_pr": [
    { framework: "soc2", control: "CC6.3", title: "Role-Based Access Controls" },
    { framework: "iso27001", control: "A.8.2", title: "Privileged Access Rights" },
  ],

  // Supply chain
  "v1.github.unpinned_action": [
    { framework: "soc2", control: "CC7.1", title: "Evaluate and Test for New Threats" },
    { framework: "iso27001", control: "A.5.19", title: "Information Security in Supplier Relationships" },
    { framework: "iso27001", control: "A.8.8", title: "Management of Technical Vulnerabilities" },
  ],
  "v1.github.pwn_request": [
    { framework: "soc2", control: "CC7.1", title: "Evaluate and Test for New Threats" },
    { framework: "iso27001", control: "A.8.9", title: "Configuration Management" },
  ],
  "v1.github.self_hosted_runner": [
    { framework: "soc2", control: "CC6.6", title: "Logical Access from Non-Internal Networks" },
    { framework: "iso27001", control: "A.8.1", title: "User Endpoint Devices" },
  ],

  // Side effects & network
  "v1.http.side_effect_unknown_domain": [
    { framework: "soc2", control: "CC6.6", title: "Logical Access from Non-Internal Networks" },
    { framework: "iso27001", control: "A.5.14", title: "Information Transfer" },
  ],
  "v1.spam.direct_webhook_side_effect": [
    { framework: "soc2", control: "CC6.6", title: "Logical Access from Non-Internal Networks" },
    { framework: "iso27001", control: "A.5.14", title: "Information Transfer" },
  ],

  // Error handling & resilience
  "v1.http.missing_error_handling": [
    { framework: "soc2", control: "A1.2", title: "System Availability and Capacity" },
    { framework: "iso27001", control: "A.8.15", title: "Logging" },
  ],
  "v1.flow.error_strategy_missing": [
    { framework: "soc2", control: "A1.2", title: "System Availability and Capacity" },
    { framework: "iso27001", control: "A.8.15", title: "Logging" },
  ],
  "v1.flow.cycle_detected": [
    { framework: "soc2", control: "A1.2", title: "System Availability and Capacity" },
    { framework: "iso27001", control: "A.8.16", title: "Monitoring Activities" },
  ],

  // AI Agent risks
  "v1.agent.prompt_injection_risk": [
    { framework: "soc2", control: "CC7.1", title: "Evaluate and Test for New Threats" },
    { framework: "soc2", control: "CC6.1", title: "Logical and Physical Access Controls" },
    { framework: "iso27001", control: "A.8.8", title: "Management of Technical Vulnerabilities" },
  ],
  "v1.agent.scope_creep": [
    { framework: "soc2", control: "CC6.3", title: "Role-Based Access Controls" },
    { framework: "iso27001", control: "A.5.15", title: "Access Control" },
  ],
  "v1.agent.privileged_permission": [
    { framework: "soc2", control: "CC6.3", title: "Role-Based Access Controls" },
    { framework: "iso27001", control: "A.8.2", title: "Privileged Access Rights" },
  ],
  "v1.agent.tool_code_execution": [
    { framework: "soc2", control: "CC6.1", title: "Logical and Physical Access Controls" },
    { framework: "iso27001", control: "A.8.19", title: "Installation of Software on Operational Systems" },
  ],
  "v1.agent.tool_db_write": [
    { framework: "soc2", control: "CC6.1", title: "Logical and Physical Access Controls" },
    { framework: "iso27001", control: "A.8.3", title: "Information Access Restriction" },
  ],
  "v1.agent.tool_file_write": [
    { framework: "soc2", control: "CC6.1", title: "Logical and Physical Access Controls" },
    { framework: "iso27001", control: "A.8.3", title: "Information Access Restriction" },
  ],
  "v1.agent.tool_network": [
    { framework: "soc2", control: "CC6.6", title: "Logical Access from Non-Internal Networks" },
    { framework: "iso27001", control: "A.5.14", title: "Information Transfer" },
  ],
};

export type ComplianceReportEntry = {
  ruleId: string;
  severity: string;
  controls: ComplianceControl[];
  count: number;
};

export type ComplianceSummary = {
  framework: "soc2" | "iso27001";
  controlsViolated: { control: string; title: string; findings: number }[];
  totalViolations: number;
  coverageScore: number;
};

export function buildComplianceReport(
  findings: { rule_id: string; severity: string }[]
): { entries: ComplianceReportEntry[]; summaries: ComplianceSummary[] } {
  const ruleCount: Record<string, number> = {};
  const ruleSeverity: Record<string, string> = {};

  for (const f of findings) {
    ruleCount[f.rule_id] = (ruleCount[f.rule_id] ?? 0) + 1;
    ruleSeverity[f.rule_id] = f.severity;
  }

  const entries: ComplianceReportEntry[] = [];
  for (const [ruleId, count] of Object.entries(ruleCount)) {
    const controls = RULE_COMPLIANCE_MAP[ruleId] ?? [];
    if (controls.length > 0) {
      entries.push({ ruleId, severity: ruleSeverity[ruleId] ?? "info", controls, count });
    }
  }

  const soc2Violations: Record<string, { title: string; findings: number }> = {};
  const iso27001Violations: Record<string, { title: string; findings: number }> = {};

  for (const entry of entries) {
    for (const ctrl of entry.controls) {
      const target = ctrl.framework === "soc2" ? soc2Violations : iso27001Violations;
      if (!target[ctrl.control]) {
        target[ctrl.control] = { title: ctrl.title, findings: 0 };
      }
      target[ctrl.control].findings += entry.count;
    }
  }

  const SOC2_TOTAL_CONTROLS = 17;
  const ISO27001_TOTAL_CONTROLS = 93;

  const summaries: ComplianceSummary[] = [
    {
      framework: "soc2",
      controlsViolated: Object.entries(soc2Violations).map(([control, v]) => ({ control, title: v.title, findings: v.findings })).sort((a, b) => b.findings - a.findings),
      totalViolations: Object.values(soc2Violations).reduce((s, v) => s + v.findings, 0),
      coverageScore: Math.max(0, Math.round((1 - Object.keys(soc2Violations).length / SOC2_TOTAL_CONTROLS) * 100)),
    },
    {
      framework: "iso27001",
      controlsViolated: Object.entries(iso27001Violations).map(([control, v]) => ({ control, title: v.title, findings: v.findings })).sort((a, b) => b.findings - a.findings),
      totalViolations: Object.values(iso27001Violations).reduce((s, v) => s + v.findings, 0),
      coverageScore: Math.max(0, Math.round((1 - Object.keys(iso27001Violations).length / ISO27001_TOTAL_CONTROLS) * 100)),
    },
  ];

  return { entries, summaries };
}
