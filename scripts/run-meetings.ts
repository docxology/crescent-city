#!/usr/bin/env bun
/**
 * scripts/run-meetings.ts — Thin orchestrator: government meeting monitor.
 *
 * Imports and runs the government meeting tracking pipeline from
 * src/gov_meeting_monitor.ts. Fetches city council, planning commission,
 * and harbor commission agendas and saves to output/gov_meetings/.
 *
 * Usage:
 *   bun run scripts/run-meetings.ts
 *   bun run gov-meetings
 */
import { monitorGovMeetings } from "../src/gov_meeting_monitor.ts";
import { createLogger } from "../src/logger.ts";

const logger = createLogger("run-meetings");

logger.info("=== Government Meeting Monitoring ===");
const items = await monitorGovMeetings();
logger.info(`Meeting monitor complete: ${items.length} items saved to output/gov_meetings/`);
