# Logger Module

## `src/logger.ts` — Structured Logging

Provides module-scoped, timestamped, color-coded log output controlled via `LOG_LEVEL`.

All `src/` modules create their own logger via `createLogger()` — no module writes to `console` directly.

### Exports

| Export | Signature | Description |
| :--- | :--- | :--- |
| `createLogger` | `(module: string) → Logger` | Returns a module-scoped logger |
| `getLogLevel` | `() → LogLevel` | Current global log level |
| `setLogLevel` | `(level: LogLevel) → void` | Override global log level at runtime |
| `isLevelEnabled` | `(level: LogLevel) → boolean` | Check if level passes the current threshold |
| `LogLevel` | `type` | `"debug" \| "info" \| "warn" \| "error"` |

### `Logger` Interface

```typescript
interface Logger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  readonly module: string;
}
```

### Log Format

```text
2026-03-18T09:00:00.000Z INFO  [scraper] Scraping article {"guid":"abc123"}
```

Fields: `ISO timestamp · LEVEL · [module] · message · optional JSON data`

### Configuration

Controlled via `LOG_LEVEL` environment variable. Default: `info`.

```bash
LOG_LEVEL=debug bun run gui      # verbose output
LOG_LEVEL=warn  bun run monitor  # warnings and errors only
```

### Level Hierarchy

| Level | Numeric | Includes |
| :--- | :--- | :--- |
| `debug` | 0 | All messages |
| `info` | 1 | Info, warn, error |
| `warn` | 2 | Warn, error only |
| `error` | 3 | Errors only |

### Usage

```typescript
import { createLogger } from "./logger.js";
const log = createLogger("my-module");
log.info("Processing article", { guid: "abc123", title: "Zoning" });
log.warn("Rate limit approaching", { remaining: 2 });
log.error("Failed to fetch", { error: err.message });
```

### Tests

```bash
bun test tests/logger.test.ts   # 6 tests
```
