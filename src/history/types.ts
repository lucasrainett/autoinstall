// History record schema — TASKS.md §1.6. Stored as JSON Lines (one record per line), not TOML:
// this is an append-only audit log, not configuration/metadata, so the "TOML for config, .sh for
// scripts" rule (TASKS.md's file-format rule) doesn't apply here — JSONL is append-friendly and
// stream-readable in a way a single parse-the-whole-file TOML document isn't.

import type { Kind } from "../catalog/types.ts";

export type HistoryAction = "install" | "configure" | "remove" | "update" | "skip";
export type HistoryResult = "success" | "failed" | "skipped";

export interface HistoryRecord {
  /** Groups every record written during one run — see query functions in store.ts. */
  runId: string;
  timestamp: string; // ISO 8601
  key: string; // "category/kind/id"
  kind: Kind;
  action: HistoryAction;
  result: HistoryResult;
  /** e.g. the platform or package manager involved, when known. */
  method?: string;
  version?: string;
  /** e.g. an error detail — expected to be present when result is "failed". */
  message?: string;
}
