import type { Connector } from "./types";

export const githubConnector: Connector = {
  id: "github",
  name: "GitHub",
  description: "Webhook-based scanning on push and pull_request events. PR comments supported.",
  status: "available",
  authType: "oauth",
  credentialFields: [
    {
      key: "webhookSecret",
      label: "Webhook Secret",
      type: "password",
      placeholder: "GITHUB_WEBHOOK_SECRET value",
      required: true,
      hint: "Used to verify X-Hub-Signature-256 on incoming events.",
    },
    {
      key: "botToken",
      label: "Bot Token (optional)",
      type: "password",
      placeholder: "ghp_… or GitHub App token",
      required: false,
      hint: "Required to post PR comments. Leave blank for signature-only mode.",
    },
  ],
  capabilities: ["test_connection", "pr_comments", "webhook"],
  docsUrl: "/docs/github-pr-automation.md",
};
