## Prepare Webhook URLs

The CI workflows reference two repository secrets. The integration-test secret
must be valid for the `Slack Pre` / `Slack Mainline` workflows to pass.

| Secret | Type | Used by |
|---|---|---|
| `SLACK_WEBHOOK_URL` | Modern (Slack App) | `test.yml`, `release.yml`, and the trailing notification step in `slack-pre.yml` / `slack-mainline.yml` |
| `SLACK_WEBHOOK_URL_FOR_INTEGRATION_TEST` | Modern (Slack App) | `slack-pre.yml`, `slack-mainline.yml` |

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

### 2. Register the secrets on GitHub

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

### 3. Verify

Push an empty commit to `pre` to trigger the `Slack Pre` integration workflow:

```
$ git commit --allow-empty -m "ci: trigger integration test"
$ git push origin pre
```

Every step in the `notification` job (Succeeded Check / Failed Check /
Cancelled Check / Custom Field Check / final Check) should turn green and the
corresponding messages should appear in the Slack channel.

### Troubleshooting

- **`HTTP protocol error occurred: statusCode = 404`** — the webhook URL is
  invalid, expired, or has been revoked. Recreate it via the steps above and
  re-register the secret.
- **`Cannot read properties of null (reading 'replace')`** — usually means the
  bundled `dist/index.js` is from a release that predates the null-safe mention
  parsing. Rebuild with `npm run release` and commit the regenerated `dist/`.
- **`Slack Pre` job is the only failing check on a PR** — the integration test
  cannot run from forks because secrets are not exposed. Merge into `pre` from a
  branch in the same repository, or rerun the workflow manually after merging.

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
