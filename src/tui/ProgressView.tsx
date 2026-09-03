// Live progress view — TASKS.md §2. Thin Ink layer over the state machine in progress.ts, which is
// what's actually tested. Integration/manual per this project's convention.

import { OUTCOME } from "./glyphs.ts";
import { Box, Text } from "ink";
import type { ProgressState, ProgressStatus } from "./progress.ts";

const STATUS_GLYPH: Record<ProgressStatus, string> = {
  pending: "·",
  running: "…",
  success: OUTCOME.success,
  failed: OUTCOME.failed,
  skipped: OUTCOME.skipped,
};

const STATUS_COLOR: Record<ProgressStatus, string> = {
  pending: "gray",
  running: "yellow",
  success: "green",
  failed: "red",
  skipped: "gray",
};

export interface ProgressViewProps {
  state: ProgressState;
  /** key -> display name; falls back to the raw key if not found. */
  names: ReadonlyMap<string, string>;
}

export function ProgressView({ state, names }: ProgressViewProps) {
  return (
    <Box flexDirection="column">
      {[...state.values()].map((entry) => (
        <Text key={entry.key} color={STATUS_COLOR[entry.status]}>
          {STATUS_GLYPH[entry.status]} {names.get(entry.key) ?? entry.key}
          {entry.message ? ` — ${entry.message}` : ""}
        </Text>
      ))}
    </Box>
  );
}
