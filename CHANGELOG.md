# Changelog

## v4.1.2

### Bug Fixes

- **Declare `text_on_success` / `text_on_fail` / `text_on_cancel` in `action.yml`.**
  These inputs were already implemented and documented, but were missing from
  the `action.yml` `inputs:` declaration, so passing them produced an
  `Unexpected input(s)` warning on every run. The inputs are now declared and
  the warning is gone.

## v4.1.1

### Security

- **Bump `@actions/core` v1 → v3** to drop the transitive vulnerable
  `undici` 5.29.0. Clears five Dependabot alerts. No API changes.

## v4.1.0

### Added

- **Bot Token transport mode.** Set the `SLACK_BOT_TOKEN` (`xoxb-…`)
  environment variable to post via the Slack Web API (`chat.postMessage`)
  instead of an Incoming Webhook. In this mode the `channel`, `username`,
  `icon_emoji`, and `icon_url` inputs are honored again (Slack App
  webhooks ignore those per-message overrides). `channel` is **required**
  when using `SLACK_BOT_TOKEN`. Webhook mode via `SLACK_WEBHOOK_URL`
  continues to work unchanged.

## v4.0.0

### Breaking Changes

- **Drop legacy Incoming Webhook support.** The `username`, `icon_emoji`,
  `icon_url`, and `channel` inputs are removed. Slack has phased out legacy
  custom-integration Incoming Webhooks and Slack App webhooks ignore those
  per-message overrides at the API level. See the migration guide below.
- **Project is ESM and requires Node.js 20+.** `@actions/github` v9 became
  ESM-only, so the action runtime is now ESM. The published action targets
  the `node24` runner runtime.
- **Octokit v22 API surface.** Internal commit/PR lookups go through
  `octokit.rest.*` instead of the v2-era `octokit.repos.*` / `octokit.pulls.*`.
  This is invisible to users but worth noting for forks.

### Migration Guide (v3 → v4)

`v3` and earlier supported legacy custom-integration Incoming Webhooks
and exposed `username` / `icon_emoji` / `icon_url` / `channel` inputs to
override the sender and target channel per message.

`v4` only supports **Slack App** Incoming Webhooks. With Slack App
webhooks, channel and sender appearance are configured **once on the
Slack side** instead of per message, and those four inputs have therefore
been removed.

#### `channel`: choose the channel when creating the webhook

A Slack App Incoming Webhook URL is permanently bound to the channel
you pick when authorizing the app. There is no way to override it at
post time, so you choose the destination once on the Slack side:

1. Open <https://api.slack.com/apps> → your app → **Incoming Webhooks**
2. Click **Add New Webhook to Workspace** and select the target channel
3. Save the URL as the `SLACK_WEBHOOK_URL` secret (see Quick Start in README)

If you need to post to multiple channels, repeat steps 1–3 for each
channel and store each URL as a separate secret, then pass whichever
one a given step needs to `SLACK_WEBHOOK_URL`.

#### `username` / `icon_emoji` / `icon_url`: configure on the Slack App

Slack App webhooks ignore per-message sender overrides. Set the name
and icon on the app itself, and they apply to every webhook the app
posts:

1. Open <https://api.slack.com/apps> → your app → **Basic Information**
2. Under **Display Information**, set the app name and icon
3. Save — changes take effect immediately for all of the app's webhooks

If you need different sender appearances for different notifications,
create separate Slack Apps (each with its own name/icon) and use each
app's webhook URL where appropriate.
