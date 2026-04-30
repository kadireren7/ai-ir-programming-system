# Integration Guide

How to integrate Torqa into your workflow development pipeline.

## Flow

```
Connect source → Select workflows → Auto scan → Review report → Enforce policy → Notify
```

## n8n

1. Go to **Sources** in Torqa dashboard
2. Click **Connect** on the n8n card
3. Enter your n8n base URL and API key
4. Click **Save connection**
5. Go to **Workflows** to see synced workflows
6. Set up a **Schedule** in Automations to scan automatically

## GitHub

1. Go to **Sources** → GitHub → Connect
2. Set `GITHUB_WEBHOOK_SECRET` env var on the Torqa server
3. In your GitHub repo: Settings → Webhooks → Add webhook
   - URL: `https://your-torqa-domain.com/api/webhooks/github`
   - Secret: same as `GITHUB_WEBHOOK_SECRET`
   - Events: `pull_request`, `push`
4. Optionally set `GITHUB_BOT_TOKEN` for PR comment posting

## Generic webhook / CI

Use the API key flow — see `api-quickstart.md`.

## Policy enforcement

1. Go to **Policies** — pick or create a policy template
2. Attach it to a schedule or source
3. Scans that fail the policy will:
   - Appear as FAIL in Runs
   - Trigger notifications if rules are configured
   - Block CI if using the fail-gate pattern

## Notifications

1. Go to **Automations → Notifications**
2. Add a Slack/Discord webhook destination
3. Create a rule: trigger → destination
4. Test the destination to confirm delivery
