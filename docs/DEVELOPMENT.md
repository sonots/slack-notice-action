## Prepare Slack credentials

The two transports — **Incoming Webhook** and **Bot Token** — have
separate setup paths. Only the Webhook flow is exercised by CI today;
Bot Token mode is verified by running the action locally or on a
short-lived branch.

### Incoming Webhook (required for CI)

The CI workflows reference two repository secrets. The integration-test secret
must be valid for the `Slack Pre` / `Slack Mainline` workflows to pass.

| Secret | Type | Used by |
|---|---|---|
| `SLACK_WEBHOOK_URL` | Modern (Slack App) | `test.yml`, `release.yml`, and the trailing notification step in `slack-pre.yml` / `slack-mainline.yml` |
| `SLACK_WEBHOOK_URL_FOR_INTEGRATION_TEST` | Modern (Slack App) | `slack-pre.yml`, `slack-mainline.yml` |

#### 1. Create an Incoming Webhook (Slack App)

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

#### 2. Register the secrets on GitHub

Repository admin permission is required.

**Web UI:** open
<https://github.com/sonots/slack-notice-action/settings/secrets/actions>,
click **New repository secret**, paste the URL into *Value*, and **Add secret**.
Repeat for each of the two secrets above.

**`gh` CLI:**

```
$ gh secret set SLACK_WEBHOOK_URL                             -R sonots/slack-notice-action
$ gh secret set SLACK_WEBHOOK_URL_FOR_INTEGRATION_TEST        -R sonots/slack-notice-action
```

Each command prompts for the value — paste the webhook URL and press Enter.

#### 3. Verify

Push an empty commit to `pre` to trigger the `Slack Pre` integration workflow:

```
$ git commit --allow-empty -m "ci: trigger integration test"
$ git push origin pre
```

Every step in the `notification` job (Succeeded Check / Failed Check /
Cancelled Check / Custom Field Check / final Check) should turn green and the
corresponding messages should appear in the Slack channel.

#### Troubleshooting

- **`HTTP protocol error occurred: statusCode = 404`** — the webhook URL is
  invalid, expired, or has been revoked. Recreate it via the steps above and
  re-register the secret.
- **`Cannot read properties of null (reading 'replace')`** — usually means the
  bundled `dist/index.js` is from a release that predates the null-safe mention
  parsing. Rebuild with `npm run release` and commit the regenerated `dist/`.
- **`Slack Pre` job is the only failing check on a PR** — the integration test
  cannot run from forks because secrets are not exposed. Merge into `pre` from a
  branch in the same repository, or rerun the workflow manually after merging.

### Bot Token (manual verification only)

CI does not currently exercise Bot Token mode — verify changes to the
Bot Token code path by running the action on a short-lived branch with
`SLACK_BOT_TOKEN` set, or by invoking `dist/index.js` locally.

#### 1. Create a Bot Token Slack App

Follow [README → Slack App Setup → Bot Token App](../README.md#bot-token-app)
to create the app, add the `chat:write` / `chat:write.customize` /
`chat:write.public` scopes, install it to the workspace, and copy the
`xoxb-…` token. Reuse a dedicated test channel
(e.g. `#test_slack_notice_action`).

#### 2. Verify against a branch (recommended)

Add `SLACK_BOT_TOKEN` as a repository secret on your fork or branch and
push a workflow step like:

```yaml
- uses: sonots/slack-notice-action@<your-sha>
  with:
    status: ${{ job.status }}
    channel: '#test_slack_notice_action'
    username: 'CI Bot (test)'
    icon_emoji: ':test_tube:'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
```

Check that the message arrives in the target channel and that
`username` / `icon_emoji` overrides apply.

#### 3. Verify locally (faster iteration)

You can also invoke the bundled action against a real Slack workspace
without going through GitHub Actions:

```
$ export GITHUB_TOKEN=...                  # any token with repo read
$ export SLACK_BOT_TOKEN=xoxb-...
$ export INPUT_STATUS=success
$ export INPUT_CHANNEL='#test_slack_notice_action'
$ export GITHUB_REPOSITORY=sonots/slack-notice-action
$ export GITHUB_SHA=$(git rev-parse HEAD)
$ export GITHUB_RUN_ID=0
$ export GITHUB_WORKFLOW=local-bot-test
$ node dist/index.js
```

#### Troubleshooting

- **`channel_not_found`** — the bot is not a member of a private
  channel, or the channel name is wrong. Either `/invite @YourBotName`
  into the channel, or grant `chat:write.public` and target a public
  channel.
- **`missing_scope`** — the app was installed before you added the
  required scope. Add the scope under **OAuth & Permissions → Bot
  Token Scopes** and click **Reinstall to Workspace**.
- **`not_authed` / `invalid_auth`** — `SLACK_BOT_TOKEN` is unset or
  expired. Re-copy the `xoxb-…` token from **OAuth & Permissions**.

## How to Develop

Switch to `pre` branch:

```
$ git checkout pre
```

Install the dependencies

```
$ npm install
```

Build the typescript and run tests

```
$ npm run all
```

Git push to run GitHub Actions.

```
$ git push origin pre
```

Send PR from `pre` branch to `main` branch, and merge it.

## How to Release

Update version in package.json.

Send PR from `pre` branch to `main` branch, and merge it.
Send PR from `main` branch to `v4` branch, and merge it.

Add a tag with a release version.

```
$ git tag v4.x.x
$ git push origin refs/tags/v4.x.x
```

Go to https://github.com/sonots/slack-notice-action/releases.

`Edit > Update release` with `Publish this Action to the GitHub Marketplace` checked.
