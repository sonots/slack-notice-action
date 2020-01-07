# Action Slack

![](https://github.com/sonots/slack-notice-action/workflows/build-test/badge.svg)
![](https://github.com/sonots/slack-notice-action/workflows/Slack%20Mainline/badge.svg)
![](https://img.shields.io/github/license/sonots/slack-notice-action?color=brightgreen)
![](https://img.shields.io/github/v/release/sonots/slack-notice-action?color=brightgreen)
[![codecov](https://codecov.io/gh/sonots/slack-notice-action/branch/master/graph/badge.svg)](https://codecov.io/gh/sonots/slack-notice-action)

You can notify slack of GitHub Actions.

## Usage

See [action.yml](action.yml), [test.yml](.github/workflows/test.yml)

### with Parameters

| key               | value                                                                                                                                     | default               | description                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------- |
| status            | 'success' or 'failure' or 'cancelled' or 'custom'                                                                                         | ''                    | Recommend<br />`${{ job.status }}`.                                                                         |
| text              | any string                                                                                                                                | ''                    | You can add to text by specifying it.                                                                       |
| author_name       | any string                                                                                                                                | 'sonots@slack-notice-action' | It can be overwritten by specifying. The job name is recommend.                                             |
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

<img width="480" alt="success" src="https://user-images.githubusercontent.com/8043276/64882150-7c942480-d697-11e9-9fc8-85e6c02f6aeb.png">

```yaml
- uses: sonots/slack-notice-action@v3
  with:
    status: ${{ job.status }}
    author_name: Integration Test # default: sonots@slack-notice-action
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} # required
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }} # required
  if: always() # Pick up events even if the job fails or is canceled.
```

When adding to text, write as follows.

```yaml
- uses: sonots/slack-notice-action@v3
  with:
    status: ${{ job.status }}
    text: overwrite text
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} # required
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }} # required
```

In case of failure or cancellation, you will be notified as follows.

<img width="483" alt="failure" src="https://user-images.githubusercontent.com/8043276/64882189-933a7b80-d697-11e9-8afc-56530176a15e.png">
<img width="484" alt="cancelled" src="https://user-images.githubusercontent.com/8043276/64882212-a3525b00-d697-11e9-8e98-aa5e515b304f.png">

#### Legacy Incoming Webhooks

If you specify as follows, you can also support legacy incoming webhooks.
The specified `secrets.SLACK_WEBHOOK_URL` must be legacy.

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

<img width="401" alt="custom" src="https://user-images.githubusercontent.com/8043276/64948009-1aaf0700-d8b1-11e9-868e-00be274821cf.png">

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

## Next Action

### Selectable Field

Currently the field is fixed, but I want to make it selectable.
It is assumed that the input is in csv format.

```yaml
- uses: sonots/slack-notice-action@v3
  with:
    status: ${{ job.status }}
    fields: repo,message,action,author
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} # required
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }} # required
```

## How to Develop

Install the dependencies

```
$ npm install
```

Build the typescript

```
$ npm run build
```

Run the tests ✔️

```
$ npm test

 PASS  ./index.test.js
  ✓ throws invalid number (3ms)
  ✓ wait 500 ms (504ms)
  ✓ test runs (95ms)

...
```


## How to Release

Comment out `node_modules` in .gitignore and create a releases/v1 branch

```
# comment out in distribution branches
# node_modules/
```

```
$ git checkout -b releases/v1
$ git commit -a -m "prod dependencies"
$ npm install
$ npm prune --production
$ git add node_modules
$ git commit -a -m "prod dependencies"
$ git push origin releases/v1
```

Finally, tag it with a release version.

```
$ git tag v1.x.x
$ git push origin refs/tags/v1.x.x
```
