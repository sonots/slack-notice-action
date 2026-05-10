## Prepare Webhook URLs

The CI workflows reference three repository secrets. Both integration-test
secrets must be valid for the `Slack Pre` / `Slack Mainline` workflows to pass.

| Secret | Type | Used by |
|---|---|---|
| `SLACK_WEBHOOK_URL` | Modern (Slack App) | `test.yml`, `release.yml`, and the trailing notification step in `slack-pre.yml` / `slack-mainline.yml` |
| `SLACK_WEBHOOK_URL_FOR_INTEGRATION_TEST` | Modern (Slack App) | `slack-pre.yml`, `slack-mainline.yml` |
| `SLACK_LEGACY_WEBHOOK_URL_FOR_INTEGRATION_TEST` | Legacy Incoming Webhook | "Legacy Check" step of `slack-pre.yml` / `slack-mainline.yml` |

### 1. Create a modern Incoming Webhook (Slack App)

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

### 2. Create a legacy Incoming Webhook

Used for `SLACK_LEGACY_WEBHOOK_URL_FOR_INTEGRATION_TEST`.

1. Open https://slack.com/services/new/incoming-webhook (must be signed into the workspace).
2. Choose the **Post to Channel** target and click **Add Incoming WebHooks integration**.
3. Copy the generated `https://hooks.slack.com/services/T.../B.../...` URL.

Caveats:

- Slack is phasing out legacy custom integrations. The admin toggle that used
  to live under **Workspace settings → Permissions → Apps, Custom Integrations
  & Sandbox** has been removed from the UI on many workspaces (newer
  workspaces, Enterprise Grid org-managed workspaces, and workspaces that
  Slack has already migrated). If you cannot find that toggle, the option is
  not available to you — even as a workspace admin — and there is no path to
  re-enable legacy webhook creation.
- On migrated workspaces the section may still be visible under a renamed
  heading such as **"Apps & Custom Integrations"** with a description like
  *"Manage permissions for apps and integrations from the Slack Marketplace"*.
  Despite the name, this surface now governs **marketplace app installation
  approval only**; the legacy custom-integration creation control has been
  stripped out. Seeing this section does not mean legacy webhooks can be
  created — they cannot.
- **Recommended fallback:** put a modern Slack App webhook URL into
  `SLACK_LEGACY_WEBHOOK_URL_FOR_INTEGRATION_TEST` as well. The action's runtime
  code is identical for both URL types (`new IncomingWebhook(url).send(...)`).
  Modern webhooks silently ignore the `username` / `icon_emoji` override that
  legacy webhooks honored, but they still return HTTP 200, so the "Legacy
  Check" step passes. The only loss is the visible difference in the posted
  message's sender name/icon — CI status and release readiness are unaffected.

### 3. Register the secrets on GitHub

Repository admin permission is required.

**Web UI:** open
<https://github.com/sonots/slack-notice-action/settings/secrets/actions>,
click **New repository secret**, paste the URL into *Value*, and **Add secret**.
Repeat for each of the three secrets above.

**`gh` CLI:**

```
$ gh secret set SLACK_WEBHOOK_URL                             -R sonots/slack-notice-action
$ gh secret set SLACK_WEBHOOK_URL_FOR_INTEGRATION_TEST        -R sonots/slack-notice-action
$ gh secret set SLACK_LEGACY_WEBHOOK_URL_FOR_INTEGRATION_TEST -R sonots/slack-notice-action
```

Each command prompts for the value — paste the webhook URL and press Enter.

### 4. Verify

Push an empty commit to `pre` to trigger the `Slack Pre` integration workflow:

```
$ git commit --allow-empty -m "ci: trigger integration test"
$ git push origin pre
```

Every step in the `notification` job (Succeeded Check / Failed Check /
Cancelled Check / Legacy Check / Custom Field Check / final Check) should turn
green and the corresponding messages should appear in the Slack channel.

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
Send PR from `main` branch to `v3` branch, and merge it.

Add a tag with a release version.

```
$ git tag v3.x.x
$ git push origin refs/tags/v3.x.x
```

Go to https://github.com/sonots/slack-notice-action/releases.

`Edit > Update release` with `Publish this Action to the GitHub Marketplace` checked.
