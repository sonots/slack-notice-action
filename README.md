# Slack Notice Action

![](https://github.com/sonots/slack-notice-action/workflows/build-test/badge.svg)
![](https://github.com/sonots/slack-notice-action/workflows/Slack%20Mainline/badge.svg)
![](https://img.shields.io/github/license/sonots/slack-notice-action?color=brightgreen)
![](https://img.shields.io/github/v/release/sonots/slack-notice-action?color=brightgreen)
[![codecov](https://codecov.io/gh/sonots/slack-notice-action/branch/master/graph/badge.svg)](https://codecov.io/gh/sonots/slack-notice-action)

Yet Another GitHub Action to notify slack.

## Usage

### with Parameters

| key               | value                                                      | default               | description                               |
| ----------------- | ---------------------------------------------------------- | --------------------- | ------------------------------------------|
| status            | 'success' or 'failure' or 'cancelled' or 'custom'          | ''                    | Use `${{ job.status }}`.                  |
| text              | any string                                                 | ''                    | `text` field                              |
| text_on_success   | any string                                                 | ''                    | `text` field on success                   |
| text_on_fail      | any string                                                 | ''                    | `text` field on failure                   |
| text_on_cancel    | any string                                                 | ''                    | `text` field on cancellation              |
| title             | any string                                                 | workflow name         | `title` field                             |
| mention           | 'here' or 'channel' or user\_id such as `user_id,user_id2` | ''                    | Mention always if specified. The user ID should be an ID, such as `@U024BE7LH`. See [Mentioning Users](https://api.slack.com/reference/surfaces/formatting#mentioning-users) |
| only_mention_fail | 'here' or 'channel' or user\_id such as `user_id,user_id2` | ''                    | Mention only on failure if specified      |

Supported by only legacy incoming webhook.

| key               | value | default  | description                                                                                                 |
| ----------------- | ----- | ---------| ----------------------------------------------------------------------------------------------------------- |
| username          |       | ''       | override the legacy integration's default name.                                                             |
| icon_emoji        |       | ''       | an [emoji code](https://www.webfx.com/tools/emoji-cheat-sheet/) string to use in place of the default icon. |
| icon_url          |       | ''       | an icon image URL string to use in place of the default icon.                                               |
| channel           |       | ''       | override the legacy integration's default channel. This should be an ID, such as `C8UJ12P4P`.               |

Custom notification. See [Custom Notification](https://github.com/sonots/slack-notice-action#custom-notification) for details.

| key               | value | default  | description                                                                                                 |
| ----------------- | ----- | ---------| ----------------------------------------------------------------------------------------------------------- |
| payload           |       | ''       | Only available when status: custom. The payload format can pass javascript object.                          |

### Notification

Example:

```yaml
- uses: sonots/slack-notice-action@v3
  with:
    status: ${{ job.status }}
    username: Custom Username
    icon_emoji: ':octocat:'
    channel: '#integration-test'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} # Required, but this should be automatically supplied by GitHub.
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }} # Required. Legacy Incoming Webhook is also supported.
  if: always() # Pick up events even if the job fails or is canceled.
```

In case of success:

<img width="360" alt="success" src="https://user-images.githubusercontent.com/2290461/71901838-1bdbab00-31a4-11ea-9fde-110b6acdab4e.png" />

In case of failure:

<img width="360" alt="failure" src="https://user-images.githubusercontent.com/2290461/71901854-26964000-31a4-11ea-9386-bec251a8a550.png" />

In case of cancellation:

<img width="360" alt="canceled" src="https://user-images.githubusercontent.com/2290461/71901862-2dbd4e00-31a4-11ea-99ea-9c1b37abe443.png" />

### Custom Notification

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


## Special Thanks

This orginally started as a fork of https://github.com/8398a7/action-slack. Thanks!
