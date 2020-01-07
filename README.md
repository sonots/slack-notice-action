# Slack Notice Action

![](https://github.com/sonots/slack-notice-action/workflows/build-test/badge.svg)
![](https://github.com/sonots/slack-notice-action/workflows/Slack%20Mainline/badge.svg)
![](https://img.shields.io/github/license/sonots/slack-notice-action?color=brightgreen)
![](https://img.shields.io/github/v/release/sonots/slack-notice-action?color=brightgreen)
[![codecov](https://codecov.io/gh/sonots/slack-notice-action/branch/master/graph/badge.svg)](https://codecov.io/gh/sonots/slack-notice-action)

Yet Another GitHub Action to notify slack.

## Usage

### with Parameters

| key               | value                                                                                                                                     | default               | description                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------- |
| status            | 'success' or 'failure' or 'cancelled' or 'custom'                                                                                         | ''                    | Recommend<br />`${{ job.status }}`.                                                                         |
| text              | any string                                                                                                                                | ''                    | You can add to text by specifying it.                                                                       |
| title             | any string                                                                                                                                | workflow name         | It can be overwritten by specifying. The job name is recommend.                                             |
| mention           | 'here' or 'channel' or [user_id](https://api.slack.com/reference/surfaces/formatting#mentioning-users) (e.g. `mention: user_id,user_id2`) | ''                    | Always mention when specified.                                                                              |
| only_mention_fail | 'here' or 'channel' or [user_id](https://api.slack.com/reference/surfaces/formatting#mentioning-users) (e.g. `mention: user_id,user_id2`) | ''                    | If specified, mention only on failure.                                                                      |
| payload           | e.g. `{"text": "Custom Field Check", obj: 'LOWER CASE'.toLowerCase()}`                                                                    | ''                    | Only available when status: custom. The payload format can pass javascript object.                          |
| username          | Only legacy incoming webhook supported.                                                                                                   | ''                    | override the legacy integration's default name.                                                             |
| icon_emoji        | Only legacy incoming webhook supported.                                                                                                   | ''                    | an [emoji code](https://www.webfx.com/tools/emoji-cheat-sheet/) string to use in place of the default icon. |
| icon_url          | Only legacy incoming webhook supported.                                                                                                   | ''                    | an icon image URL string to use in place of the default icon.                                               |
| channel           | Only legacy incoming webhook supported.                                                                                                   | ''                    | override the legacy integration's default channel. This should be an ID, such as `C8UJ12P4P`.               |

See here for `payload` reference or [Custom Notification](https://github.com/sonots/slack-notice-action#custom-notification).

- [Message Formatting](https://api.slack.com/docs/messages/builder)
  - Enter json and check in preview.
- [Reference: Message payloads](https://api.slack.com/reference/messaging/payload)

### Notification

<img width="480" alt="success" src="https://user-images.githubusercontent.com/2290461/71901838-1bdbab00-31a4-11ea-9fde-110b6acdab4e.png" />

```yaml
- uses: sonots/slack-notice-action@v3
  with:
    status: ${{ job.status }}
    title: Integration Test # default: sonots@slack-notice-action
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} # required, but GitHub should automatically supply
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }} # required
  if: always() # Pick up events even if the job fails or is canceled.
```

In case of failure or cancellation, you will be notified as follows.

<img width="480" alt="failure" src="https://user-images.githubusercontent.com/2290461/71901854-26964000-31a4-11ea-9386-bec251a8a550.png" />
<img width="480" alt="canceled" src="https://user-images.githubusercontent.com/2290461/71901862-2dbd4e00-31a4-11ea-99ea-9c1b37abe443.png" />


#### Legacy Incoming Webhooks

Legacy incoming webhooks are also supported.
The `secrets.SLACK_WEBHOOK_URL` must be legacy one.

```yaml
- uses: sonots/slack-notice-action@v3
  with:
    type: ${{ job.status }}
    username: Custom Username
    icon_emoji: ':octocat:'
    channel: '#integration-test'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} # required
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }} # required
```

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
          "title": "sonots@slack-notice-action", // json
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

## Special Thanks

This orginally started as a fork of https://github.com/8398a7/action-slack. Thanks!
