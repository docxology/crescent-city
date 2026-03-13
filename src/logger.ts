/**
 * Structured logging module.
 *
 * Provides configurable, timestamped, module-tagged log output.
 * Controlled via the LOG_LEVEL environment variable.
 *
 * Usage:
 *   import { createLogger } from "./logger.js";
 *   const log = createLogger("scraper");
 *   log.info("Scraping article", { guid: "abc123" });
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m",  // green
  warn: "\x1b[33m",  // yellow
  error: "\x1b[31m", // red
};

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";

/** Parse LOG_LEVEL env var (default: "info") */
function parseLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  if (raw in LEVEL_ORDER) return raw as LogLevel;
  return "info";
}

let currentLevel: LogLevel = parseLevel();

/** Get the current global log level */
export function getLogLevel(): LogLevel {
  return currentLevel;
}

/** Set the global log level at runtime */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

/** Check if a level is enabled given the current threshold */
export function isLevelEnabled(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel];
}

/** Format a log line with timestamp, level, and module tag */
function formatLine(level: LogLevel, module: string, message: string, data?: Record<string, unknown>): string {
  const ts = new Date().toISOString();
  const color = LEVEL_COLORS[level];
  const levelTag = level.toUpperCase().padEnd(5);
  const dataStr = data ? ` ${JSON.stringify(data)}` : "";
  return `${DIM}${ts}${RESET} ${color}${levelTag}${RESET} [${module}] ${message}${dataStr}`;
}

export interface Logger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  /** Current module name */
  readonly module: string;
}

/**
 * Create a logger scoped to a module.
 *
 * @param module - Tag for the module (e.g., "scraper", "gui", "llm")
 * @returns Logger instance with debug/info/warn/error methods
 */
export function createLogger(module: string): Logger {
  return {
    module,
    debug(message: string, data?: Record<string, unknown>) {
      if (isLevelEnabled("debug")) console.debug(formatLine("debug", module, message, data));
    },
    info(message: string, data?: Record<string, unknown>) {
      if (isLevelEnabled("info")) console.log(formatLine("info", module, message, data));
    },
    warn(message: string, data?: Record<string, unknown>) {
      if (isLevelEnabled("warn")) console.warn(formatLine("warn", module, message, data));
    },
    error(message: string, data?: Record<string, unknown>) {
      if (isLevelEnabled("error")) console.error(formatLine("error", module, message, data));
    },
  };
}
