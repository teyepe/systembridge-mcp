## [1.0.2](https://github.com/teyepe/systembridge-mcp/compare/v1.0.1...v1.0.2) (2026-02-20)


### Bug Fixes

* **security:** address CodeQL findings - incomplete sanitization and workflow permissions ([eb58b03](https://github.com/teyepe/systembridge-mcp/commit/eb58b03cad5d6b9d99ae8256e39aafeb02012eda))

# 1.0.0 (2026-02-20)


### Bug Fixes

* **ci:** downgrade ESLint to v9 for typescript-eslint compatibility ([4e158cb](https://github.com/teyepe/systembridge-mcp/commit/4e158cb29c8c4a526f95559f1029c52f51572cb4))
* **ci:** pass NPM_TOKEN to semantic-release in release workflow ([a89494d](https://github.com/teyepe/systembridge-mcp/commit/a89494d324340978335ee0416eba441375036203))
* **ci:** use vitest.config.mts for ESM compatibility in CommonJS project ([0b3d0ae](https://github.com/teyepe/systembridge-mcp/commit/0b3d0aea83d026325a8279fd6cfb9842485af0fc))
* resolve all TypeScript compilation errors and optimize codebase ([b079001](https://github.com/teyepe/systembridge-mcp/commit/b0790013d375da1e260291392fe7ffb417260811))


### Features

* add Phase 1 DX improvements (version checking, interactive CLI, test suite) ([9b4f4cc](https://github.com/teyepe/systembridge-mcp/commit/9b4f4cc28a17dd5877602695b11717ba57df5342))
* add plug-and-play setup with npm link support ([5fa418c](https://github.com/teyepe/systembridge-mcp/commit/5fa418c1f8be04f5b2d1eab8932db019ec85a940))
* **audit:** add token topology analysis with dependency graphs and anti-patterns ([ec091f4](https://github.com/teyepe/systembridge-mcp/commit/ec091f4de07b5e9395bb118d562f728701c5abc8))
* **designer:** add designer-centric tools for UI analysis and planning ([e9c92b1](https://github.com/teyepe/systembridge-mcp/commit/e9c92b15563b81047bfdfc154a3e61e6784ff9da))
* **figma:** Add Figma Make guidelines generator ([fbcf32f](https://github.com/teyepe/systembridge-mcp/commit/fbcf32f833ea62de6183828bbd2269ad32c4713a))
* **figma:** add Figma-token sync analysis with cross-reference reporting ([e27705e](https://github.com/teyepe/systembridge-mcp/commit/e27705ef23c5985c9a0eade56337ab46a250d8f5))
* **migration:** add migration executor with dry-run, validation, and rollback ([66f5b8d](https://github.com/teyepe/systembridge-mcp/commit/66f5b8d2c565d6526f6c882cd63b599377b0042d))
* **migration:** add risk assessment and scenario generation for B→C migration orchestration ([2a0f6b0](https://github.com/teyepe/systembridge-mcp/commit/2a0f6b0eb1fa2a9de52c9193346549ab58e33b0c))
* Phase 1 — core token infrastructure ([11487c5](https://github.com/teyepe/systembridge-mcp/commit/11487c506beec543f6dd6364e27e688bc321a537))
* Phase 2 - smart lifecycle filtering, caching, and performance (v0.6.0) ([7c80b4f](https://github.com/teyepe/systembridge-mcp/commit/7c80b4f9a2847964c37cda589b5ede8fd23d18e4))
* Phase 2 — extensibility layer (themes, brands, factory, Figma bridge) ([0fe8c7a](https://github.com/teyepe/systembridge-mcp/commit/0fe8c7ab7dd96f1917a584a09180947ff199b88c))
* Phase 3 - Usage examples, private filtering, metadata enrichment (v0.7.0) ([c3bac16](https://github.com/teyepe/systembridge-mcp/commit/c3bac16b6d80095f81ab288d9c4555b1c7d8e078))
* Phase 4 - contrast checking, token file writing, palette strategies (v0.4.0) ([507b31a](https://github.com/teyepe/systembridge-mcp/commit/507b31a6ed7965a178f36faa1b365dcf565d757e))
* **release:** add semantic-release, GitHub Actions, and documentation ([e25dcd8](https://github.com/teyepe/systembridge-mcp/commit/e25dcd8cd22f3d0afbd59d60176e9d1fe70d406a))
* **scales:** add mathematical scale type system and design principles database ([70983ad](https://github.com/teyepe/systembridge-mcp/commit/70983ad0050797dba573e578b60924e8b62fee8f))
* **scales:** implement mathematical scale generation and analysis system ([3a1de90](https://github.com/teyepe/systembridge-mcp/commit/3a1de907ec71c4f85486b4a3fa2e5c7e73882e24))
* **search,limits:** add result limits with config defaults and truncation UX ([f149e0a](https://github.com/teyepe/systembridge-mcp/commit/f149e0acd0b2e04636fcf65ecf9096d67c820085))
* **semantics:** alias-aware lenient parsing for contrast detection ([495abfb](https://github.com/teyepe/systembridge-mcp/commit/495abfbcd2afe07c701dea9fd4fb9ee0f415fe1e))

# 1.0.0 (2026-02-19)


### Bug Fixes

* **ci:** downgrade ESLint to v9 for typescript-eslint compatibility ([4e158cb](https://github.com/teyepe/systembridge-mcp/commit/4e158cb29c8c4a526f95559f1029c52f51572cb4))
* **ci:** use vitest.config.mts for ESM compatibility in CommonJS project ([0b3d0ae](https://github.com/teyepe/systembridge-mcp/commit/0b3d0aea83d026325a8279fd6cfb9842485af0fc))
* resolve all TypeScript compilation errors and optimize codebase ([b079001](https://github.com/teyepe/systembridge-mcp/commit/b0790013d375da1e260291392fe7ffb417260811))


### Features

* add Phase 1 DX improvements (version checking, interactive CLI, test suite) ([9b4f4cc](https://github.com/teyepe/systembridge-mcp/commit/9b4f4cc28a17dd5877602695b11717ba57df5342))
* add plug-and-play setup with npm link support ([5fa418c](https://github.com/teyepe/systembridge-mcp/commit/5fa418c1f8be04f5b2d1eab8932db019ec85a940))
* **audit:** add token topology analysis with dependency graphs and anti-patterns ([ec091f4](https://github.com/teyepe/systembridge-mcp/commit/ec091f4de07b5e9395bb118d562f728701c5abc8))
* **designer:** add designer-centric tools for UI analysis and planning ([e9c92b1](https://github.com/teyepe/systembridge-mcp/commit/e9c92b15563b81047bfdfc154a3e61e6784ff9da))
* **figma:** Add Figma Make guidelines generator ([fbcf32f](https://github.com/teyepe/systembridge-mcp/commit/fbcf32f833ea62de6183828bbd2269ad32c4713a))
* **figma:** add Figma-token sync analysis with cross-reference reporting ([e27705e](https://github.com/teyepe/systembridge-mcp/commit/e27705ef23c5985c9a0eade56337ab46a250d8f5))
* **migration:** add migration executor with dry-run, validation, and rollback ([66f5b8d](https://github.com/teyepe/systembridge-mcp/commit/66f5b8d2c565d6526f6c882cd63b599377b0042d))
* **migration:** add risk assessment and scenario generation for B→C migration orchestration ([2a0f6b0](https://github.com/teyepe/systembridge-mcp/commit/2a0f6b0eb1fa2a9de52c9193346549ab58e33b0c))
* Phase 1 — core token infrastructure ([11487c5](https://github.com/teyepe/systembridge-mcp/commit/11487c506beec543f6dd6364e27e688bc321a537))
* Phase 2 - smart lifecycle filtering, caching, and performance (v0.6.0) ([7c80b4f](https://github.com/teyepe/systembridge-mcp/commit/7c80b4f9a2847964c37cda589b5ede8fd23d18e4))
* Phase 2 — extensibility layer (themes, brands, factory, Figma bridge) ([0fe8c7a](https://github.com/teyepe/systembridge-mcp/commit/0fe8c7ab7dd96f1917a584a09180947ff199b88c))
* Phase 3 - Usage examples, private filtering, metadata enrichment (v0.7.0) ([c3bac16](https://github.com/teyepe/systembridge-mcp/commit/c3bac16b6d80095f81ab288d9c4555b1c7d8e078))
* Phase 4 - contrast checking, token file writing, palette strategies (v0.4.0) ([507b31a](https://github.com/teyepe/systembridge-mcp/commit/507b31a6ed7965a178f36faa1b365dcf565d757e))
* **release:** add semantic-release, GitHub Actions, and documentation ([e25dcd8](https://github.com/teyepe/systembridge-mcp/commit/e25dcd8cd22f3d0afbd59d60176e9d1fe70d406a))
* **scales:** add mathematical scale type system and design principles database ([70983ad](https://github.com/teyepe/systembridge-mcp/commit/70983ad0050797dba573e578b60924e8b62fee8f))
* **scales:** implement mathematical scale generation and analysis system ([3a1de90](https://github.com/teyepe/systembridge-mcp/commit/3a1de907ec71c4f85486b4a3fa2e5c7e73882e24))
* **semantics:** alias-aware lenient parsing for contrast detection ([495abfb](https://github.com/teyepe/systembridge-mcp/commit/495abfbcd2afe07c701dea9fd4fb9ee0f415fe1e))
