/**
 * Outbound webhook URL allowlisting to reduce SSRF risk when posting to Slack / Discord.
 * Does not replace network egress controls; validates URL shape and host/path only.
 */

export const WEBHOOK_URL_MAX_LENGTH = 2048;

const SLACK_HOST = "hooks.slack.com";
const DISCORD_HOSTS = new Set(["discord.com", "discordapp.com"]);

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

export function validateWebhookUrlForDestination(
  type: "slack" | "discord",
  url: string
): { ok: true } | { ok: false; message: string } {
  return type === "slack" ? validateSlackWebhookUrlForOutbound(url) : validateDiscordWebhookUrlForOutbound(url);
}
