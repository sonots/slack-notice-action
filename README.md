# Slack Notice Action

[![Slack Mainline](https://github.com/sonots/slack-notice-action/workflows/Slack%20Mainline/badge.svg)](https://github.com/sonots/slack-notice-action/actions/workflows/slack-mainline.yml)
[![release](https://img.shields.io/github/v/release/sonots/slack-notice-action?color=brightgreen)](https://github.com/sonots/slack-notice-action/releases)
[![license](https://img.shields.io/github/license/sonots/slack-notice-action?color=brightgreen)](LICENSE)

A GitHub Action that posts job-status notifications to Slack. Pass
`${{ job.status }}` and you get a colored success / failure /
cancellation message with commit, author, and workflow link. Supports
`@here` / `@channel` / user-id mentions, mention-only-on-failure, and
arbitrary custom payloads. Works with either a Slack App **Incoming
Webhook URL** or a **Bot Token**.

## Contents

- [Quick Start](#quick-start)
- [Input Parameters](#input-parameters)
- [Environment Variables](#environment-variables)
- [Custom Text and Mentions](#custom-text-and-mentions)
- [Bot Token Mode](#bot-token-mode)
- [Custom Payload](#custom-payload)
- [Outputs](#outputs)
- [Screenshots](#screenshots)
- [Slack App Setup](#slack-app-setup)
- [Migration & Changelog](#migration--changelog)

## Quick Start

```yaml
- uses: sonots/slack-notice-action@v4
  with:
    status: ${{ job.status }}
    only_mention_fail: 'channel'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} # `secrets.GITHUB_TOKEN` is automatically provided by GitHub Actions
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }} # Slack App Incoming Webhook URL which you must provide
  if: always() # Pick up events even if the job fails or is canceled.
```

## Input Parameters

| Key                 | Value                                                                           | Default       | Description                                                                                              |
| ------------------- | ------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------- |
| `status`            | <ul><li>`success`</li><li>`failure`</li><li>`cancelled`</li><li>`custom`</li></ul> | —           | **Required.** Use `${{ job.status }}` for the first three.                                               |
| `text`              | any string                                                                      | `''`          | Override the default text on every status.                                                               |
| `text_on_success`   | any string                                                                      | `''`          | Override text on success only. Wins over `text`.                                                         |
| `text_on_fail`      | any string                                                                      | `''`          | Override text on failure only. Wins over `text`.                                                         |
| `text_on_cancel`    | any string                                                                      | `''`          | Override text on cancellation only. Wins over `text`.                                                    |
| `title`             | any string                                                                      | workflow name | Attachment title.                                                                                        |
| `mention`           | <ul><li>`here`</li><li>`channel`</li><li>user ID (e.g. `U024BE7LH`)</li></ul>   | `''`          | Mention always if specified. Comma-separate for multiple users. See [Mentioning Users][mentioning-users]. |
| `only_mention_fail` | same as `mention`                                                               | `''`          | Mention only on failure if specified.                                                                    |
| `channel`           | channel ID (e.g. `C0123456789`) or `#name`                                      | `''`          | **Required in Bot Token mode.** Ignored in Webhook mode.                                                 |
| `username`          | any string                                                                      | `''`          | Override bot display name. **Bot Token mode only.**                                                      |
| `icon_emoji`        | `:emoji:`                                                                       | `''`          | Override bot icon with an emoji. **Bot Token mode only.**                                                |
| `icon_url`          | image URL                                                                       | `''`          | Override bot icon with an image URL. **Bot Token mode only.**                                            |
| `update_ts`         | Slack message `ts`                                                              | `''`          | Update an existing message instead of posting a new one. **Bot Token mode only.**                       |
| `payload`           | JavaScript object literal                                                       | —             | **Required when `status: custom`.** Replaces the default message. See [Custom Payload](#custom-payload). |

[mentioning-users]: https://api.slack.com/reference/surfaces/formatting#mentioning-users

## Environment Variables

| Name                | Required | Description                                                                                  |
| ------------------- | :------: | -------------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN`      | yes      | Pass `${{ secrets.GITHUB_TOKEN }}`. Automatically provided by GitHub Actions.                |
| `SLACK_WEBHOOK_URL` | one of   | Slack App Incoming Webhook URL. Triggers **Webhook mode**.                                   |
| `SLACK_BOT_TOKEN`   | one of   | Slack App Bot User OAuth Token (`xoxb-…`). Triggers **Bot Token mode**. Takes precedence over `SLACK_WEBHOOK_URL` when both are set. |

## Custom Text and Mentions

Override the default message text per status and control who gets
mentioned. `text_on_*` wins over `text`, and `only_mention_fail` only
fires when `status` is `failure`.

```yaml
- uses: sonots/slack-notice-action@v4
  with:
    status: ${{ job.status }}
    title: 'Build & Test'
    text_on_success: ':white_check_mark: All checks passed!'
    text_on_fail: ':rotating_light: Build broke — please investigate.'
    text_on_cancel: ':warning: Job was cancelled.'
    mention: 'channel'                          # always mentions @channel
    only_mention_fail: 'U024BE7LH,U987XYZAB'    # mentions these users only on failure
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
  if: always()
```

## Bot Token Mode

Use a **Bot Token** instead of an Incoming Webhook to unlock features
that modern webhooks no longer support:

- Choose `channel` at post time (route prod alerts to `#alerts`, PR
  noise to `#ci-noisy`, etc.)
- Override `username` / `icon_emoji` / `icon_url` per message
- Update a previously-posted message via `update_ts`

```yaml
- id: notify
  uses: sonots/slack-notice-action@v4
  with:
    status: ${{ job.status }}
    channel: '#alerts'
    username: 'CI Bot (prod)'
    icon_emoji: ':rocket:'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
```

To update the same message from a later step (e.g. mark "in progress" → "done"):

```yaml
- id: start
  uses: sonots/slack-notice-action@v4
  with:
    status: custom
    channel: '#alerts'
    payload: |
      { text: ':hourglass_flowing_sand: Deploying…' }
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}

- run: ./deploy.sh

- uses: sonots/slack-notice-action@v4
  if: always()
  with:
    status: ${{ job.status }}
    channel: '#alerts'
    update_ts: ${{ steps.start.outputs.ts }}
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
```

### Required Slack scopes

Set under your Slack App's **OAuth & Permissions → Bot Token Scopes**:

| Scope                   | Why                                                        |
| ----------------------- | ---------------------------------------------------------- |
| `chat:write`            | Post / update messages.                                    |
| `chat:write.customize`  | Override `username` / `icon_emoji` / `icon_url`.           |
| `chat:write.public`     | Post to public channels without inviting the bot first.    |

Reinstall the app to the workspace after changing scopes, then copy the
**Bot User OAuth Token** (`xoxb-…`) into the `SLACK_BOT_TOKEN` secret.

## Custom Payload

Use `status: custom` when you want full control over the Slack payload.
The `payload` input is evaluated as a JavaScript object literal, so you
can use template strings and runtime expressions.

```yaml
- uses: sonots/slack-notice-action@v4
  with:
    status: custom
    payload: |
      {
        text: "Custom Field Check",
        attachments: [{
          author_name: "sonots@slack-notice-action",
          fallback: 'fallback',
          color: 'good',
          title: 'CI Result',
          text: 'Succeeded',
          fields: [
            { title: 'lower case', value: 'LOWER CASE CHECK'.toLowerCase(), short: true },
            { title: 'reverse',    value: 'gnirts esrever'.split('').reverse().join(''), short: true },
            { title: 'long title', value: 'long value', short: false },
          ]
        }]
      }
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

References:

- [Reference: Message payloads](https://api.slack.com/reference/messaging/payload)
- [Block Kit Builder](https://app.slack.com/block-kit-builder) — for richer layouts using `blocks` instead of `attachments`

## Outputs

| Name | Description                                                                                  |
| ---- | -------------------------------------------------------------------------------------------- |
| `ts` | Slack message timestamp of the posted/updated message. **Bot Token mode only**; empty in Webhook mode. Use with `update_ts` to chain edits. |

## Screenshots

| Success | Failure | Cancellation |
|---|---|---|
| <img width="280" alt="success" src="https://user-images.githubusercontent.com/2290461/71901838-1bdbab00-31a4-11ea-9fde-110b6acdab4e.png" /> | <img width="280" alt="failure" src="https://user-images.githubusercontent.com/2290461/71901854-26964000-31a4-11ea-9386-bec251a8a550.png" /> | <img width="280" alt="canceled" src="https://user-images.githubusercontent.com/2290461/71901862-2dbd4e00-31a4-11ea-99ea-9c1b37abe443.png" /> |

## Slack App Setup

This action requires a **Slack App Incoming Webhook URL**, which you
store in the `SLACK_WEBHOOK_URL` repository secret.

1. Open <https://api.slack.com/apps> and click **Create New App** → **From scratch**.
2. Pick an app name and your workspace, then **Create App**.
3. In the sidebar, open **Incoming Webhooks** and toggle the feature **On**.
4. Click **Add New Webhook to Workspace**, choose the destination channel, and **Allow**.
5. Copy the generated `https://hooks.slack.com/services/...` URL.
6. Add it as a repository secret named `SLACK_WEBHOOK_URL`:
   - GitHub UI: **Settings → Secrets and variables → Actions → New repository secret**, or
   - CLI: `gh secret set SLACK_WEBHOOK_URL`

Reference: [Slack: Sending messages using Incoming Webhooks](https://api.slack.com/messaging/webhooks).

## Migration & Changelog

- **Upgrading from v3?** See the [v3 → v4 migration guide](CHANGELOG.md#migration-guide-v3--v4)
  in `CHANGELOG.md`.
- Full release history: [CHANGELOG.md](CHANGELOG.md)

## Special Thanks

This originally started as a fork of <https://github.com/8398a7/action-slack>. Thanks!
