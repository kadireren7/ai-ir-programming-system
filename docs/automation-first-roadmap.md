# Automation-First Roadmap (v0.1.7+)

## Direction

Torqa shifts from manual-scan-first to automation-first:

**Before (v0.1.6):** Upload JSON → Run scan → Review → Maybe schedule

**After (v0.1.7+):** Connect source → Auto scan → Review run → Enforce policy → Notify

Manual scan is preserved as an advanced option at `/advanced/manual-scan`.

## Nav change

| v0.1.6 nav | v0.1.7 nav |
|------------|------------|
| Overview | Home |
| Projects + Workflow library | Workflows |
| Scan | Advanced → Manual scan |
| Scan results / history | Runs |
| Policies | Policies |
| Integrations | Sources |
| Insights | Reports |
| Alerts + Schedules | Automations |
| API keys + Workspace + Notifications | Settings |

## Connector roadmap

### v0.1.7 (current)
- [x] Connector registry abstraction
- [x] n8n connector (available)
- [x] GitHub connector (available)
- [x] Generic webhook connector (available)
- [x] Zapier / Make / Pipedream placeholders (coming soon UI)

### v0.1.8
- [ ] n8n: deep workflow sync with Supabase persistence
- [ ] GitHub: full PR comment posting with App token
- [ ] Background worker for scheduled auto-scan

### v0.1.9
- [ ] Zapier connector (beta)
- [ ] Make connector (beta)
- [ ] Pipedream connector (beta)

## Mobile

All dashboard pages are mobile-responsive from v0.1.7:
- Sidebar → drawer (mobile/tablet)
- Tables → card/list format on small screens
- Single-column forms on mobile
