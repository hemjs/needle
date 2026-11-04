# Changelog

## [2.0.0](https://github.com/hemjs/needle/compare/1.3.0...2.0.0) (2026-11-04)

### ⚠ BREAKING CHANGES

* align names with their roles
* drop the deprecated `shared` option
* migrate to esm and exports map
* store providers in a single private registry

### Features

* add a conflict policy for duplicate providers ([d037ba6](https://github.com/hemjs/needle/commit/d037ba6159116fcbcc9c4d0cd1d38c736bf5f650))
* detect circular dependencies between services ([20f3458](https://github.com/hemjs/needle/commit/20f3458d516ed7374739fa7cae56d63558cc3f47))
* drop the deprecated `shared` option ([945c663](https://github.com/hemjs/needle/commit/945c663f3b07f943b497f3b262089ba88a0347b2))
* export error classes and report nested failures once ([80bdfe4](https://github.com/hemjs/needle/commit/80bdfe46bf5fc88d372506a52641d62eb747c6fa))
* migrate to esm and exports map ([840c090](https://github.com/hemjs/needle/commit/840c0900e4d2e4b41908300ae58239f8382c0c52))
* report the position of invalid providers ([14f187c](https://github.com/hemjs/needle/commit/14f187cd625eb0f735ad9c3f8b578dba694d2cdc))

### Bug Fixes

* address code review findings in validation and error reporting ([91a531e](https://github.com/hemjs/needle/commit/91a531e7f8e5328a563979f8232a81331fc4bd1e))
* check alias loops before registering an alias ([128742e](https://github.com/hemjs/needle/commit/128742e776e92db825a63dbf093626746eb91dad))
* check classes by whether new works on them ([df9bccb](https://github.com/hemjs/needle/commit/df9bccb01e19c26828efdaec4f3870ce4ee0f050))
* correct typo in invalid constructor error message ([dca390e](https://github.com/hemjs/needle/commit/dca390e119c8a35f1e2c27755028dcb313734fb0))
* detect alias cycles of any length ([2deb9d6](https://github.com/hemjs/needle/commit/2deb9d60cec90501da3ba78f6af45e4d4d5514f5))
* format any value safely in error messages ([c058cc6](https://github.com/hemjs/needle/commit/c058cc6c446c079390413bf3fdc342c95165381b))
* handle null providers and undefined provider values ([9928397](https://github.com/hemjs/needle/commit/9928397c62949630a51e67fdd18df54c25584134))
* harden error reporting and alias registration ([09d3526](https://github.com/hemjs/needle/commit/09d3526bf33d81c19d3a78e646a28585ecc1d88e))
* keep error messages from throwing on unserializable values ([ca5a471](https://github.com/hemjs/needle/commit/ca5a471e02beea12a6abdfe94c9fad206f47b979))
* keep error names in minified builds ([1235cd4](https://github.com/hemjs/needle/commit/1235cd41574f4bfe9b1101432d50b837322ec6d2))
* keep factory failures from being replaced while reporting them ([8ebe535](https://github.com/hemjs/needle/commit/8ebe5354c5f49573829f4eae6125240104e90371))
* let the last registered provider for a token win ([80f6c97](https://github.com/hemjs/needle/commit/80f6c97613758c304c8bfe19d287fbcca48fa50f))
* mark only true cycles as circular in error messages ([42e7d62](https://github.com/hemjs/needle/commit/42e7d62afd8b94df32c5ad5eb777e090ac897c38))
* print arrays through the same cycle checks as objects ([69ff02a](https://github.com/hemjs/needle/commit/69ff02ae60197d6d2ba12e310e58703005c5d21b))
* print repeated objects once in error messages ([ae5354d](https://github.com/hemjs/needle/commit/ae5354d21c0816227645ba2b8fc3585837d713ec))
* reject non-constructable functions in class providers ([1ca6df1](https://github.com/hemjs/needle/commit/1ca6df1ce3ae783756b5d2d4d2b86bc66f14d03d))
* reject provider lists and options of the wrong type ([520da97](https://github.com/hemjs/needle/commit/520da978c4c484106d8128c388dffc578691090f))
* reject provider tokens that are not strings or symbols ([6f4b51e](https://github.com/hemjs/needle/commit/6f4b51ecabd5e95efb00b485007b6e791855c86d))
* reject unknown lifetime and conflictPolicy values ([0e8dbf2](https://github.com/hemjs/needle/commit/0e8dbf2fb241986e151caa15dd9813665f9ea79f))
* **release:** keep bare version tags and local schema ([7303a6b](https://github.com/hemjs/needle/commit/7303a6b352b29c53ee6a5c9d2c10c1b952258365))
* report falsy provider values accurately and allow empty alias targets ([a969934](https://github.com/hemjs/needle/commit/a96993481ac51c087e167cac6346323cf17fc72c))

### Code Refactoring

* align names with their roles ([4c8b087](https://github.com/hemjs/needle/commit/4c8b087724a3d2567dc8076abe278f390b88743f))
* store providers in a single private registry ([1abb287](https://github.com/hemjs/needle/commit/1abb287ea4816a7f097cd884f5beb5c1aa7b03aa))
