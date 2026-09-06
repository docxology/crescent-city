# AGENTS.md — crescent-city/src/domains

Domain coverage metrics. `coverage.ts` computes the percentage of municipal
code sections cross-referenced by each intelligence domain; run with
`bun run src/domains/coverage.ts` or import `computeDomainCoverage`. Output
goes to `output/domain-coverage.json`. Imports the project logger, domain
registry (`../domains.js`), and data loader (`../shared/data.js`).