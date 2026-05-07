/**
 * Outbound webhook URL allowlisting to reduce SSRF risk when posting to Slack / Discord.
 * Does not replace network egress controls; validates URL shape and host/path only.
 */

export const WEBHOOK_URL_MAX_LENGTH = 2048;

const SLACK_HOST = "hooks.slack.com";
const DISCORD_HOSTS = new Set(["discord.com", "discordapp.com"]);
const TEAMS_HOSTS = new Set(["outlook.office.com", "outlook.office365.com"]);

function parsedHttpsUrl(url: string): URL | null {
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > WEBHOOK_URL_MAX_LENGTH) return null;
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  if (u.port && u.port !== "443") return null;
  if (u.hash) return null;
  return u;
}

function slackPathOk(pathname: string): boolean {
  if (!pathname.startsWith("/services/")) return false;
  const parts = pathname.split("/").filter(Boolean);
  return parts.length >= 4 && parts[0] === "services";
}

function discordPathOk(pathname: string): boolean {
  return pathname.startsWith("/api/webhooks/") && pathname.split("/").filter(Boolean).length >= 4;
}

export function validateSlackWebhookUrlForOutbound(url: string): { ok: true } | { ok: false; message: string } {
  const u = parsedHttpsUrl(url);
  if (!u) return { ok: false, message: "Slack webhook must be a valid https URL" };
  if (u.hostname.toLowerCase() !== SLACK_HOST) return { ok: false, message: "Slack webhook host must be hooks.slack.com" };
  if (!slackPathOk(u.pathname)) return { ok: false, message: "Slack webhook path must be under /services/" };
  return { ok: true };
}

export function validateDiscordWebhookUrlForOutbound(url: string): { ok: true } | { ok: false; message: string } {
  const u = parsedHttpsUrl(url);
  if (!u) return { ok: false, message: "Discord webhook must be a valid https URL" };
  if (!DISCORD_HOSTS.has(u.hostname.toLowerCase())) {
    return { ok: false, message: "Discord webhook host must be discord.com or discordapp.com" };
  }
  if (!discordPathOk(u.pathname)) return { ok: false, message: "Discord webhook path must be under /api/webhooks/" };
  return { ok: true };
}

export function validateTeamsWebhookUrlForOutbound(url: string): { ok: true } | { ok: false; message: string } {
  const u = parsedHttpsUrl(url);
  if (!u) return { ok: false, message: "Teams webhook must be a valid https URL" };
  if (!TEAMS_HOSTS.has(u.hostname.toLowerCase())) {
    return { ok: false, message: "Teams webhook host must be outlook.office.com or outlook.office365.com" };
  }
  if (!u.pathname.startsWith("/webhookb2/")) {
    return { ok: false, message: "Teams webhook path must start with /webhookb2/" };
  }
  return { ok: true };
}

export function validateWebhookUrlForDestination(
  type: "slack" | "discord" | "teams",
  url: string
): { ok: true } | { ok: false; message: string } {
  if (type === "slack") return validateSlackWebhookUrlForOutbound(url);
  if (type === "teams") return validateTeamsWebhookUrlForOutbound(url);
  return validateDiscordWebhookUrlForOutbound(url);
}

/**
 * Validate a free-form outbound webhook URL (used by the `webhook` alert
 * destination type). Stricter than Slack/Discord because the user can
 * supply any host, so we additionally block:
 *   - non-https
 *   - localhost / loopback / private RFC1918 IP literals
 *   - link-local ranges (169.254.0.0/16)
 *   - IPv6 loopback / ULA / link-local literals
 *   - non-standard ports (only 443 allowed)
 *
 * This is *defense in depth*; it is not a substitute for network egress
 * controls (e.g. blocking metadata IPs at the load balancer).
 */
export function validateGenericWebhookUrlForOutbound(
  url: string
): { ok: true } | { ok: false; message: string } {
  const u = parsedHttpsUrl(url);
  if (!u) return { ok: false, message: "Webhook URL must be a valid https URL" };
  const host = u.hostname.toLowerCase();
  if (!host) return { ok: false, message: "Webhook URL must include a host" };
  if (host === "localhost" || host.endsWith(".localhost")) {
    return { ok: false, message: "localhost is not allowed" };
  }
  // IPv4 literal checks.
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if ([0, 10, 127].includes(a)) return { ok: false, message: "Loopback / private IPs are not allowed" };
    if (a === 169 && b === 254) return { ok: false, message: "Link-local IPs are not allowed" };
    if (a === 172 && b >= 16 && b <= 31) return { ok: false, message: "Private IPs are not allowed" };
    if (a === 192 && b === 168) return { ok: false, message: "Private IPs are not allowed" };
    if (a === 100 && b >= 64 && b <= 127) return { ok: false, message: "Carrier-grade NAT IPs are not allowed" };
    if (a >= 224) return { ok: false, message: "Multicast / reserved IPs are not allowed" };
  }
  // IPv6 quick checks (URL hostname strips brackets).
  if (host === "::1" || host === "0:0:0:0:0:0:0:1") {
    return { ok: false, message: "IPv6 loopback is not allowed" };
  }
  if (host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")) {
    return { ok: false, message: "Private / link-local IPv6 is not allowed" };
  }
  return { ok: true };
}
