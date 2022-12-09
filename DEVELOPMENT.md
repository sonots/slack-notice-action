## Prepare Webhook URL

To create a legacy incoming webhook, go to https://slack.com/services/new/incoming-webhook.

To create an incoming webhook, go to https://api.slack.com/apps, and create a new app, and an incoming webhook from there.

Go to GitHub, and Settings > Secrets > Actions > Repository secrets, and create `SLACK_WEBHOOK_URL` to test.

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

Send PR from  `pre` branch to `master` branch, and merge it.

## How to Release

Update version in package.json.

Send PR from `master` branch to `v3` branch, and merge it.

Add a tag with a release version.

```
$ git tag v3.x.x
$ git push origin refs/tags/v3.x.x
```

Go to https://github.com/sonots/slack-notice-action/releases.

`Edit > Update release` with `Publish this Action to the GitHub Marketplace` checked.
