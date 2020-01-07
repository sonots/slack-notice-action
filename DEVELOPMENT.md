## How to Develop

Switch to `pre` branch:

```
$ git checkout pre
```

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

Build dist/index.js

```
$ npm run pack
```

Git push to run GitHub Actions.

```
$ git push origin pre
```

## How to Release

Switch to `v3` branch

```
$ git checkout v3
```

Build dist/index.js

```
$ npm run all
```

Finally, tag it with a release version.

```
$ git tag v3.x.x
$ git push origin refs/tags/v3.x.x
```

