// History viewer screen — TASKS.md §2. Thin Ink layer over history-view.ts, which is what's
// actually tested. Integration/manual per this project's convention.

import { OUTCOME } from "./glyphs.ts";
import { Box, Text } from "ink";
import type { HistoryViewRun } from "./history-view.ts";

const RESULT_GLYPH: Record<string, string> = {
  success: OUTCOME.success,
  failed: OUTCOME.failed,
  skipped: OUTCOME.skipped,
};

export interface HistoryScreenProps {
  runs: readonly HistoryViewRun[];
}

export function HistoryScreen({ runs }: HistoryScreenProps) {
  if (runs.length === 0) {
    return <Text dimColor>No history yet.</Text>;
  }

  return (
    <Box flexDirection="column">
      {runs.map((run) => (
        <Box key={run.runId} flexDirection="column" marginBottom={1}>
          <Text bold color="cyan">
            {run.timestamp} ({run.runId})
          </Text>
          {run.records.map((record, i) => (
            <Text key={i}>
              {"  "}
              {RESULT_GLYPH[record.result] ?? "?"} {record.key}
              {record.message ? ` — ${record.message}` : ""}
            </Text>
          ))}
        </Box>
      ))}
    </Box>
  );
}
