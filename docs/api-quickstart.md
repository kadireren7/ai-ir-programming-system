# API Quickstart

Torqa exposes a public scan API. Generate a key from **Settings → API**.

## Authentication

All API requests require `Authorization: Bearer <api-key>`.

## Scan a workflow (cURL)

```bash
curl -X POST https://your-torqa-domain.com/api/public/scan \
  -H "Authorization: Bearer torqa_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d @workflow.json
```

Response:
```json
{
  "scanId": "abc123",
  "status": "pass",
  "riskScore": 12,
  "findings": []
}
```

## GitHub Actions

```yaml
name: Torqa scan
on: [pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Scan workflows
        run: |
          for f in workflows/*.json; do
            curl -sf -X POST $TORQA_URL/api/public/scan \
              -H "Authorization: Bearer $TORQA_API_KEY" \
              -H "Content-Type: application/json" \
              -d @$f
          done
        env:
          TORQA_URL: ${{ secrets.TORQA_URL }}
          TORQA_API_KEY: ${{ secrets.TORQA_API_KEY }}
```

## n8n workflow export + scan

```bash
# Export from n8n
curl -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "$N8N_BASE_URL/api/v1/workflows/MY_WORKFLOW_ID" \
  > workflow.json

# Scan with Torqa
curl -X POST $TORQA_URL/api/public/scan \
  -H "Authorization: Bearer $TORQA_API_KEY" \
  -H "Content-Type: application/json" \
  -d @workflow.json
```

## CI fail gate

```bash
RESULT=$(curl -sf -X POST $TORQA_URL/api/public/scan \
  -H "Authorization: Bearer $TORQA_API_KEY" \
  -H "Content-Type: application/json" \
  -d @workflow.json)

STATUS=$(echo $RESULT | jq -r '.status')
if [ "$STATUS" = "fail" ]; then
  echo "Torqa policy FAIL — blocking CI"
  exit 1
fi
```
