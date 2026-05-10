# Slack Notice Action

![](https://github.com/sonots/slack-notice-action/workflows/build-test/badge.svg)
![](https://github.com/sonots/slack-notice-action/workflows/Slack%20Mainline/badge.svg)
![](https://img.shields.io/github/license/sonots/slack-notice-action?color=brightgreen)
![](https://img.shields.io/github/v/release/sonots/slack-notice-action?color=brightgreen)
[![codecov](https://codecov.io/gh/sonots/slack-notice-action/branch/master/graph/badge.svg)](https://codecov.io/gh/sonots/slack-notice-action)

Yet Another GitHub Action to notify slack.

## Quick Start

```yaml
- uses: sonots/slack-notice-action@v3
  with:
    status: ${{ job.status }}
    only_mention_fail: 'channel'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} # Required, but this should be automatically supplied by GitHub.
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }} # Required. A Slack App Incoming Webhook URL.
  if: always() # Pick up events even if the job fails or is canceled.
```

<img width="360" alt="success" src="https://user-images.githubusercontent.com/2290461/71901838-1bdbab00-31a4-11ea-9fde-110b6acdab4e.png" />

## Usage

### with Parameters

| key               | value                                                      | default               | description                               |
| ----------------- | ---------------------------------------------------------- | --------------------- | ------------------------------------------|
| status            | `success` or `failure` or `cancelled` or `custom`          | ''                    | Use `${{ job.status }}`.                  |
| text              | any string                                                 | ''                    | `text` field                              |
| text_on_success   | any string                                                 | ''                    | `text` field on success                   |
| text_on_fail      | any string                                                 | ''                    | `text` field on failure                   |
| text_on_cancel    | any string                                                 | ''                    | `text` field on cancellation              |
| title             | any string                                                 | workflow name         | `title` field                             |
| mention           | `here` or `channel` or user\_id such as `user_id,user_id2` | ''                    | Mention always if specified. The user ID should be an ID, such as `@U024BE7LH`. See [Mentioning Users](https://api.slack.com/reference/surfaces/formatting#mentioning-users) |
| only_mention_fail | `here` or `channel` or user\_id such as `user_id,user_id2` | ''                    | Mention only on failure if specified      |

Custom notification. See [Custom Notification](https://github.com/sonots/slack-notice-action#custom-notification) for details.

| key               | value | default  | description                                                                                                 |
| ----------------- | ----- | ---------| ----------------------------------------------------------------------------------------------------------- |
| payload           |       | ''       | Only available when status: custom. The payload format can pass javascript object.                          |

## Example

In case of success:

<img width="360" alt="success" src="https://user-images.githubusercontent.com/2290461/71901838-1bdbab00-31a4-11ea-9fde-110b6acdab4e.png" />

In case of failure:

<img width="360" alt="failure" src="https://user-images.githubusercontent.com/2290461/71901854-26964000-31a4-11ea-9386-bec251a8a550.png" />

In case of cancellation:

<img width="360" alt="canceled" src="https://user-images.githubusercontent.com/2290461/71901862-2dbd4e00-31a4-11ea-99ea-9c1b37abe443.png" />

## Example: Custom Notification

Use `status: custom` if you want to send an arbitrary payload.
The payload format can pass javascript object.

```yaml
- uses: sonots/slack-notice-action@v3
  with:
    status: custom
    payload: |
      {
        text: "Custom Field Check",
        attachments: [{
          "author_name": "sonots@slack-notice-action", // json
          fallback: 'fallback',
          color: 'good',
          title: 'CI Result',
          text: 'Succeeded',
          fields: [{
            title: 'lower case',
            value: 'LOWER CASE CHECK'.toLowerCase(),
            short: true
          },
          {
            title: 'reverse',
            value: 'gnirts esrever'.split('').reverse().join(''),
            short: true
          },
          {
            title: 'long title1',
            value: 'long value1',
            short: false
          }],
          actions: [{
          }]
        }]
      }
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} # optional
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }} # required
```

See also:

- [Message Builder](https://api.slack.com/docs/messages/builder)
- [Reference: Message payloads](https://api.slack.com/reference/messaging/payload)


## Migrating from Legacy Incoming Webhook (v3 → v4)

`v3` and earlier supported legacy custom-integration Incoming Webhooks
and exposed `username` / `icon_emoji` / `icon_url` / `channel` inputs to
override the sender and target channel per message.

Slack has phased out legacy custom integrations, so `v4` only supports
**Slack App** Incoming Webhooks. With Slack App webhooks, channel and
sender appearance are configured **once on the Slack side** instead of
per message, and those four inputs have therefore been removed.

If you previously used those inputs, here is how to migrate:

### `channel`: choose the channel when creating the webhook

A Slack App Incoming Webhook URL is permanently bound to the channel
you pick when authorizing the app. There is no way to override it at
post time, so you choose the destination once on the Slack side:

1. Open <https://api.slack.com/apps> → your app → **Incoming Webhooks**
2. Click **Add New Webhook to Workspace** and select the target channel
3. Save the URL as the `SLACK_WEBHOOK_URL` secret (see Quick Start above)

If you need to post to multiple channels, repeat steps 1–3 for each
channel and store each URL as a separate secret, then pass whichever
one a given step needs to `SLACK_WEBHOOK_URL`.

### `username` / `icon_emoji` / `icon_url`: configure on the Slack App

Slack App webhooks ignore per-message sender overrides. Set the name
and icon on the app itself, and they apply to every webhook the app
posts:

1. Open <https://api.slack.com/apps> → your app → **Basic Information**
2. Under **Display Information**, set the app name and icon
3. Save — changes take effect immediately for all of the app's webhooks

If you need different sender appearances for different notifications,
create separate Slack Apps (each with its own name/icon) and use each
app's webhook URL where appropriate.


## Special Thanks

This orginally started as a fork of https://github.com/8398a7/action-slack. Thanks!
