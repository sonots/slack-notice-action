## Prepare Slack credentials

The action supports two transports — **Incoming Webhook** and
**Bot Token** — and the [`E2E` workflow](../.github/workflows/e2e.yml)
exercises both. Set up the secrets below before dispatching it.

| Secret | Used by | Notes |
|---|---|---|
| `SLACK_WEBHOOK_URL` | `test.yml`, `release.yml`, trailing step in `slack-mainline.yml` | Standard notification target. |
| `SLACK_WEBHOOK_URL_FOR_INTEGRATION_TEST` | `slack-mainline.yml`, `e2e.yml` (webhook job) | Dedicated test channel. May reuse the same URL as above if you don't need to isolate. |
| `SLACK_BOT_TOKEN` | `e2e.yml` (bot_token job) | `xoxb-…` Bot User OAuth token. |
| `SLACK_TEST_CHANNEL` | `e2e.yml` (bot_token job) | Channel ID (`C…`) or `#name`. Bot must be a member. |

### 1. Create an Incoming Webhook (Slack App)

Used for `SLACK_WEBHOOK_URL` and `SLACK_WEBHOOK_URL_FOR_INTEGRATION_TEST`.

1. Open https://api.slack.com/apps and click **Create New App** → **From scratch**.
2. Pick an app name (e.g. `slack-notice-action-ci`) and the test workspace, then **Create App**.
3. In the left sidebar, open **Incoming Webhooks** and toggle the feature **On**.
4. Scroll down and click **Add New Webhook to Workspace**.
5. Choose the channel that should receive test messages (a dedicated `#test_slack_notice_action` channel is recommended) and click **Allow**.
6. Copy the generated `https://hooks.slack.com/services/T.../B.../...` URL.

You can reuse the same URL for both `SLACK_WEBHOOK_URL` and
`SLACK_WEBHOOK_URL_FOR_INTEGRATION_TEST`, or create two separate webhooks if you
want to route them to different channels.

### 2. Create a Bot Token Slack App

Used for `SLACK_BOT_TOKEN` and `SLACK_TEST_CHANNEL`.

1. Open https://api.slack.com/apps and either reuse the app from step 1 or **Create New App** → **From scratch**.
2. In the left sidebar, open **OAuth & Permissions**.
3. Under **Scopes → Bot Token Scopes**, add `chat:write`, `chat:write.customize`, and `chat:write.public`.
4. At the top of the same page click **Install to Workspace** (or **Reinstall to Workspace** if you added scopes to an existing app) and authorize.
5. Copy the **Bot User OAuth Token** (`xoxb-…`).
6. Create or pick a test channel (e.g. `#test_slack_notice_action_bot`) and invite the bot with `/invite @<bot-name>`. `chat:write.public` lets the bot post to public channels without an explicit invite, but private channels still require membership.

### 3. Register the secrets on GitHub

Repository admin permission is required.

**Web UI:** open
<https://github.com/sonots/slack-notice-action/settings/secrets/actions>,
click **New repository secret**, paste the value, and **Add secret**.
Repeat for each secret.

**`gh` CLI:**

```
$ gh secret set SLACK_WEBHOOK_URL                       -R sonots/slack-notice-action
$ gh secret set SLACK_WEBHOOK_URL_FOR_INTEGRATION_TEST  -R sonots/slack-notice-action
$ gh secret set SLACK_BOT_TOKEN                         -R sonots/slack-notice-action
$ gh secret set SLACK_TEST_CHANNEL                      -R sonots/slack-notice-action
```

Each command prompts for the value — paste it and press Enter.

### 4. Verify

Dispatch the `E2E` workflow and watch it through to completion:

```
$ gh workflow run e2e.yml -F mode=both
$ gh run watch $(gh run list --workflow=e2e.yml --limit 1 --json databaseId --jq '.[0].databaseId')
```

Every step in the `webhook` and `bot_token` jobs should be green, and
the corresponding messages should appear in the Slack channel(s). For
the full Claude-driven verification flow (including programmatic checks
of colors, `username`, and `icon_*` overrides) see
[`docs/e2e.md`](e2e.md) / [`docs/e2e.ja.md`](e2e.ja.md).

### Troubleshooting

- **`HTTP protocol error occurred: statusCode = 404`** — the webhook URL is
  invalid, expired, or has been revoked. Recreate it via the steps above and
  re-register the secret.
- **`channel_not_found`** — the bot is not a member of a private channel, or
  `SLACK_TEST_CHANNEL` is wrong. Either `/invite @<bot-name>` into the
  channel, or grant `chat:write.public` and target a public channel.
- **`missing_scope`** — the app was installed before you added the required
  scope. Add the scope under **OAuth & Permissions → Bot Token Scopes**
  and click **Reinstall to Workspace**.
- **`not_authed` / `invalid_auth`** — `SLACK_BOT_TOKEN` is unset or expired.
  Re-copy the `xoxb-…` token from **OAuth & Permissions**.
- **`Cannot read properties of null (reading 'replace')`** — usually means the
  bundled `dist/index.js` is from a release that predates the null-safe mention
  parsing. Rebuild with `npm run release` and commit the regenerated `dist/`.
- **E2E job fails only on a PR from a fork** — secrets are not exposed to
  fork PRs. Dispatch the workflow against a branch in this repository.

## How to Develop

Cut a feature branch from `main`:

```
$ git checkout main
$ git pull origin main
$ git checkout -b feature/your-change
```

Install the dependencies:

```
$ npm install
```

Build the typescript and run tests:

```
$ npm run all
```

Push your branch and either dispatch the `E2E` workflow against it or
open a PR to `main`:

```
$ git push -u origin feature/your-change
$ gh workflow run e2e.yml --ref feature/your-change -F mode=both
```

## How to Release

Update version in `package.json`.

Open a PR from your feature branch to `main` and merge it.
Open a PR from `main` to `v4` and merge it.

Add a tag with a release version:

```
$ git tag v4.x.x
$ git push origin refs/tags/v4.x.x
```

Go to https://github.com/sonots/slack-notice-action/releases.

`Edit > Update release` with `Publish this Action to the GitHub Marketplace` checked.
