# Contributing to Crescent City Municipal Code

Thank you for your interest in contributing! This project is licensed under **CC BY-SA 4.0** (Creative Commons Attribution-ShareAlike 4.0 International). All contributions must be compatible with this license.

## Getting Started

1. Fork and clone the repository
2. Follow [start_here.md](start_here.md) to set up your environment
3. Run `bun test` to verify everything works (85 tests, 0 failures)

## Development Workflow

```bash
bun install          # Install dependencies
bun test             # Run all tests
bun run gui          # Launch web viewer for manual testing
```

## What to Contribute

- **Bug fixes** — issues with scraping, verification, export, or GUI
- **New export formats** — additional output formats beyond JSON/Markdown/TXT/CSV
- **GUI improvements** — UI/UX enhancements, accessibility, responsive design
- **Analytics features** — new visualizations, clustering methods, statistics
- **Documentation** — corrections, clarifications, additional guides
- **Test coverage** — new unit tests for untested pure-logic functions

## Code Conventions

- **TypeScript** on Bun runtime — no build step, all scripts run directly
- **No external frameworks** — the GUI is a single HTML file with embedded CSS/JS
- **Types** — all shared interfaces go in `src/types.ts`
- **Constants** — project-wide values go in `src/constants.ts`
- **Paths** — use `src/shared/paths.ts` for all file I/O paths (never hardcode)
- **Data loading** — use `src/shared/data.ts` to read scraped output
- **No mocks** — all tests use real methods, no mock/fake/stub implementations
- **Logging** — use `console.log` with bracketed prefixes (e.g., `[chat]`, `[analytics]`)

## Adding Tests

1. Create `tests/<module>.test.ts`
2. Import functions directly from the source module
3. Use `describe` / `test` / `expect` from `bun:test`
4. Focus on pure-logic functions — skip integration modules that require external services

## Updating Documentation

When modifying source code:

1. Update the relevant `docs/modules/<module>.md` file
2. If adding new exports, update `docs/api-reference.md`
3. If adding new config parameters, update `docs/configuration.md`
4. If changing module relationships, update `docs/architecture.md`

## Pull Request Guidelines

1. Run `bun test` — all 85 tests must pass
2. Include tests for new pure-logic functions
3. Update documentation for any API or behavior changes
4. Keep commits focused — one logical change per commit
5. Write descriptive commit messages

## License

By contributing, you agree that your contributions will be licensed under the [CC BY-SA 4.0](LICENSE) license. You must give appropriate attribution and share derivative works under the same terms.
