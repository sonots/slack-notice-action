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

Merge (Send PR) `pre` into `master` branch.

## How to Release

Merge (Send PR) `master` into `v3` branch.

Add a tag with a release version.

```
$ git tag v3.x.x
$ git push origin refs/tags/v3.x.x
```

Go to https://github.com/sonots/slack-notice-action/releases.

`Edit > Update release` with `Publish this Action to the GitHub Marketplace` checked.
