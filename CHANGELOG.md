# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.2.11](https://github.com/cawa-93/fs-nano-store/compare/v0.2.10...v0.2.11) (2023-01-06)


### Bug Fixes

* data in store should ne immutable ([02fcc6f](https://github.com/cawa-93/fs-nano-store/commit/02fcc6fdb074e8d7da9a1a7ec3503c979a1ee8e6))

### [0.2.10](https://github.com/cawa-93/fs-nano-store/compare/v0.2.9...v0.2.10) (2022-12-31)


### Bug Fixes

* ensure path to file exist before start watcher ([beb011a](https://github.com/cawa-93/fs-nano-store/commit/beb011a8e0009de92e63667aa4a04bbffcf10102))
* Ensure that the destination directory for the file exists ([f58997c](https://github.com/cawa-93/fs-nano-store/commit/f58997c9e33716473004dc35acc71b2c98e521f1))
* watcher for macOS ([f2a182d](https://github.com/cawa-93/fs-nano-store/commit/f2a182db242bb1190eb4d0d1c6c60bb78c3ca79e)), closes [#5](https://github.com/cawa-93/fs-nano-store/issues/5)

### [0.2.9](https://github.com/cawa-93/fs-nano-store/compare/v0.2.8...v0.2.9) (2022-12-30)


### Bug Fixes

* create full path to file if it doesn't exist ([0e1c8b6](https://github.com/cawa-93/fs-nano-store/commit/0e1c8b67e142d46d7ce4b981f9bc2bdc0c9ed6b1))

### [0.2.8](https://github.com/cawa-93/fs-nano-store/compare/v0.2.7...v0.2.8) (2022-12-27)


### Bug Fixes

* do not emit `changed` event on initialization if file doesn't exist ([311ee90](https://github.com/cawa-93/fs-nano-store/commit/311ee90f1b65dbbfef1e1dbeb40232e578ad7d2d))
* do not run parsing if file is empty ([2202650](https://github.com/cawa-93/fs-nano-store/commit/2202650091528069d633bb803ad091b0b88be516))

### [0.2.7](https://github.com/cawa-93/fs-nano-store/compare/v0.2.6...v0.2.7) (2022-12-27)


### Bug Fixes

* custom serializer doesn't use in `set` ([a2e2118](https://github.com/cawa-93/fs-nano-store/commit/a2e21181807d831e7133c75c50e60a4480fde3b0))

### [0.2.6](https://github.com/cawa-93/fs-nano-store/compare/v0.2.5...v0.2.6) (2022-12-27)


### Features

* allowed more complex data types ([bf53e4d](https://github.com/cawa-93/fs-nano-store/commit/bf53e4dad8234e2eccf0f46fb62b4eaac1873067))


### Bug Fixes

* objects are copied to the store and not referenced to it ([aa91ca7](https://github.com/cawa-93/fs-nano-store/commit/aa91ca7c1ce7c0f4aaed705136ef30b4bce0aa11))

### [0.2.5](https://github.com/cawa-93/fs-nano-store/compare/v0.2.4...v0.2.5) (2022-12-26)


### Features

* disallow saving fields from `Object.prototype` ([bfc6b43](https://github.com/cawa-93/fs-nano-store/commit/bfc6b43423e745e8990db55e8c8c1baaf50c37a4))
* mark package as `sideEffects: false` ([f60f540](https://github.com/cawa-93/fs-nano-store/commit/f60f5401900068e30eff74388fb10380ea9a5800))

### [0.2.4](https://github.com/cawa-93/fs-nano-store/compare/v0.2.3...v0.2.4) (2022-12-25)


### Features

* add support for custom serializer ([023969b](https://github.com/cawa-93/fs-nano-store/commit/023969b8a925a2ed6fccc928196829452b1419d5))

## 0.2.0 (2022-12-24)

* 0.2.0 ([30db470](https://github.com/cawa-93/fs-nano-store/commit/30db470))
* feat: export types ([f45e8e4](https://github.com/cawa-93/fs-nano-store/commit/f45e8e4))
* fix: exports ([26b885f](https://github.com/cawa-93/fs-nano-store/commit/26b885f))
* fix: Store types ([9aae14a](https://github.com/cawa-93/fs-nano-store/commit/9aae14a))
* docs: fix typo ([39e1420](https://github.com/cawa-93/fs-nano-store/commit/39e1420))



## 0.1.0 (2022-12-24)

* 0.1.0 ([3228201](https://github.com/cawa-93/fs-nano-store/commit/3228201))
* Initial commit ([38fda48](https://github.com/cawa-93/fs-nano-store/commit/38fda48))
* chore: add credentials ([929f799](https://github.com/cawa-93/fs-nano-store/commit/929f799))
* chore: add IDE config ([3fa05c8](https://github.com/cawa-93/fs-nano-store/commit/3fa05c8))
* refactor: simplify imports ([a3d597c](https://github.com/cawa-93/fs-nano-store/commit/a3d597c))
* ci: add renovate config ([77c6181](https://github.com/cawa-93/fs-nano-store/commit/77c6181))
* docs: Update README.md ([173b0c5](https://github.com/cawa-93/fs-nano-store/commit/173b0c5))
* docs: Update README.md ([edfc0ae](https://github.com/cawa-93/fs-nano-store/commit/edfc0ae))
* feat: sync read-write ([37df2cc](https://github.com/cawa-93/fs-nano-store/commit/37df2cc))
