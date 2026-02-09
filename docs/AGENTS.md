# Agents Guide — `docs/`

## Overview

Comprehensive project documentation covering architecture, all modules, API reference, and configuration.

## Structure

| File | Content |
|---|---|
| `README.md` | Documentation index with links to all sections |
| `architecture.md` | System architecture, data flow diagram, module dependency graph |
| `api-reference.md` | Complete table of all exported functions, interfaces, and constants |
| `configuration.md` | Environment variables, constants, and tuning parameters |
| `modules/` | Per-module detailed documentation |

## Updating Docs

When modifying source code:

1. Update the relevant `modules/<module>.md` file.
2. If adding new exports, update `api-reference.md`.
3. If adding new config parameters, update `configuration.md`.
4. If changing module relationships, update `architecture.md`.
