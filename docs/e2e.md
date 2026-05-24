# E2E test runbook (for Claude / LLM agents)

This document is a runbook for an LLM agent (e.g. Claude Code) to drive
the action's end-to-end test against a real Slack workspace. Humans can
follow it too, but the language assumes an automated executor with
`gh` CLI access and the `claude.ai_Slack` MCP server enabled.

The runbook is also available in Japanese: [`e2e.ja.md`](e2e.ja.md).

## What this verifies

The [`E2E` workflow](../.github/workflows/e2e.yml) dispatches the action
against a test Slack channel in two transport modes:

| Mode | Steps | Coverage |
|---|---|---|
| `webhook` | 4 | `status` = success / failure / cancelled / custom payload |
| `bot_token` | 5 | success / failure / cancelled + `username` & `icon_emoji` override + `icon_url` override |

Both jobs run when `mode=both` (default).

## Prerequisites

The repository must already have these secrets configured. If any are
missing, stop and tell the user to follow
[`DEVELOPMENT.md → Prepare Slack credentials`](DEVELOPMENT.md#prepare-slack-credentials):

- `SLACK_WEBHOOK_URL_FOR_INTEGRATION_TEST`
- `SLACK_BOT_TOKEN`
- `SLACK_TEST_CHANNEL`

The Slack bot identified by `SLACK_BOT_TOKEN` must be a member of
`SLACK_TEST_CHANNEL` (for private channels) or the app must hold the
`chat:write.public` scope (for public channels).

You also need:

- `gh` authenticated against the repository.
- `claude.ai_Slack` MCP server connected to the workspace that owns the
  test channel.

## Execution

```bash
RUN_MARKER="$(date +%s)-$RANDOM"
gh workflow run e2e.yml --ref <branch> -F mode=both -F run_marker="$RUN_MARKER"

# Wait for the dispatched run to finish.
RUN_ID="$(gh run list --workflow=e2e.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
gh run watch "$RUN_ID" --exit-status
```

`--ref` is the branch you want the action's bundled `dist/index.js` to
come from. Use `main` for a smoke test of the released version, or a
feature branch to test changes before merging.

`--exit-status` makes `gh run watch` exit non-zero if any job failed; if
it does, fetch logs with `gh run view "$RUN_ID" --log-failed` and report
the failing step.

## Verification (via Slack MCP)

1. **Resolve the channel.** Call `mcp__claude_ai_Slack__slack_search_channels`
   with the channel name (strip the leading `#`) to obtain the channel
   ID. If the user provided `SLACK_TEST_CHANNEL` as a `C…` ID, skip this
   step.
2. **Read recent messages.** Call
   `mcp__claude_ai_Slack__slack_read_channel` against the resolved
   channel. Fetch enough messages to cover the run (≥ 20 is usually
   safe; bump if other traffic is high).
3. **Filter by marker.** Keep only messages whose `text` (top-level)
   contains `[e2e:<RUN_MARKER>]`. Custom-payload messages embed the
   marker in the payload's `text` field.
4. **Check expected count.**
   - `mode=both` → 9 messages (webhook 4 + bot_token 5)
   - `mode=webhook` → 4
   - `mode=bot_token` → 5
5. **Per-message assertions** (match by the suffix after the marker):

   | Suffix | Mode | Expected |
   |---|---|---|
   | `webhook-success` | webhook | `attachments[0].color` = `good` |
   | `webhook-failure` | webhook | `attachments[0].color` = `danger` |
   | `webhook-cancelled` | webhook | `attachments[0].color` = `warning` |
   | `webhook-custom` | webhook | `attachments[0].color` = `good`, `attachments[0].title` = `CI Result` |
   | `bot-success` | bot_token | `attachments[0].color` = `good` |
   | `bot-failure` | bot_token | `attachments[0].color` = `danger` |
   | `bot-cancelled` | bot_token | `attachments[0].color` = `warning` |
   | `bot-username-emoji` | bot_token | `username` = `e2e-bot (emoji)`, `bot_profile.icons.emoji` or `icons.emoji` contains `:rocket:` |
   | `bot-icon-url` | bot_token | `username` = `e2e-bot (url)`, `icons.image_*` or `bot_profile.icons.image_*` resolves to the Octocat URL |

   Slack returns icon fields under different shapes depending on
   account/API version. Accept either `icons.emoji` / `icons.image_64`
   on the message object or the corresponding fields under
   `bot_profile.icons`. Treat presence in either location as a pass.

## Pass / fail

- **PASS** — `gh run watch` exits 0 **and** all per-message assertions
  hold. Report `PASS` with the run URL and marker.
- **FAIL** — any of: workflow run failed, message count mismatch, or
  per-message assertion failed. Report the specific gap (missing
  suffix, wrong color, missing override) along with the run URL and the
  failing message excerpt so the user can diagnose.

Do not delete or modify the test messages.

## Troubleshooting hints

- **No messages match the marker.** The action may have posted but to
  the wrong channel — check `SLACK_TEST_CHANNEL` and that the webhook
  URL points at the same workspace as `SLACK_BOT_TOKEN`.
- **`bot_token` job failed with `not_in_channel`.** The bot is missing
  from the channel. Stop and ask the user to `/invite @<bot-name>`.
- **`bot_token` job failed with `missing_scope`.** Ask the user to add
  the missing scope on the Slack app and reinstall.
- **`webhook` job failed with HTTP 404.** The webhook URL is stale; ask
  the user to recreate it and rerun.
