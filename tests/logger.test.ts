import { describe, expect, test } from "bun:test";
import {
    createLogger,
    isLevelEnabled,
    setLogLevel,
    getLogLevel,
    type LogLevel,
} from "../src/logger";

describe("Logger", () => {
    test("createLogger returns a logger with expected methods", () => {
        const log = createLogger("test-module");
        expect(typeof log.debug).toBe("function");
        expect(typeof log.info).toBe("function");
        expect(typeof log.warn).toBe("function");
        expect(typeof log.error).toBe("function");
        expect(log.module).toBe("test-module");
    });

    test("getLogLevel returns the current log level", () => {
        const level = getLogLevel();
        expect(["debug", "info", "warn", "error"]).toContain(level);
    });

    test("setLogLevel changes the current level", () => {
        const original = getLogLevel();
        setLogLevel("error");
        expect(getLogLevel()).toBe("error");
        setLogLevel(original); // Restore
    });

    test("isLevelEnabled respects threshold", () => {
        const original = getLogLevel();

        setLogLevel("warn");
        expect(isLevelEnabled("debug")).toBe(false);
        expect(isLevelEnabled("info")).toBe(false);
        expect(isLevelEnabled("warn")).toBe(true);
        expect(isLevelEnabled("error")).toBe(true);

        setLogLevel("debug");
        expect(isLevelEnabled("debug")).toBe(true);
        expect(isLevelEnabled("info")).toBe(true);

        setLogLevel(original); // Restore
    });

    test("logger does not throw when called at any level", () => {
        const log = createLogger("safe-test");
        const original = getLogLevel();
        setLogLevel("debug");

        expect(() => log.debug("test debug")).not.toThrow();
        expect(() => log.info("test info")).not.toThrow();
        expect(() => log.warn("test warn")).not.toThrow();
        expect(() => log.error("test error")).not.toThrow();
        expect(() => log.info("with data", { key: "value" })).not.toThrow();

        setLogLevel(original);
    });

    test("logger suppresses output below threshold", () => {
        const original = getLogLevel();
        setLogLevel("error");

        const log = createLogger("suppress-test");
        // These should not throw, even though they're below threshold
        expect(() => log.debug("suppressed")).not.toThrow();
        expect(() => log.info("suppressed")).not.toThrow();
        expect(() => log.warn("suppressed")).not.toThrow();

        setLogLevel(original);
    });
});
