// Windows elevated-helper progress relay — §15/TASKS.md §1.3: the elevated helper process (spawned
// only for the apply phase) reports per-entry progress back to the still-unelevated TUI process as
// newline-delimited JSON on stdout, one ProgressMessage per line, so the main process can pipe-read
// and render it without a second console window.

export interface ProgressMessage {
  entryId: string;
  status: "running" | "success" | "failed";
  /** Present for "failed" (the error), optionally present for "running"/"success" (a status line). */
  message?: string;
}

const VALID_STATUSES = new Set(["running", "success", "failed"]);

export function serializeProgressMessage(msg: ProgressMessage): string {
  return JSON.stringify(msg) + "\n";
}

/** Returns null for anything that doesn't parse as a well-formed ProgressMessage, rather than
 * guessing at a partial/malformed line — a relay consumer should skip and log, not crash or misread. */
export function parseProgressMessage(line: string): ProgressMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;

  if (typeof obj.entryId !== "string" || obj.entryId.length === 0) return null;
  if (typeof obj.status !== "string" || !VALID_STATUSES.has(obj.status)) return null;
  if (obj.message !== undefined && typeof obj.message !== "string") return null;

  return {
    entryId: obj.entryId,
    status: obj.status as ProgressMessage["status"],
    ...(obj.message !== undefined ? { message: obj.message } : {}),
  };
}

/** Parses every well-formed line in a chunk of relay output (e.g. one stdout read), silently
 * skipping blank lines and anything malformed rather than failing the whole batch. */
export function parseProgressStream(chunk: string): ProgressMessage[] {
  const messages: ProgressMessage[] = [];
  for (const line of chunk.split("\n")) {
    if (line.trim().length === 0) continue;
    const msg = parseProgressMessage(line);
    if (msg !== null) messages.push(msg);
  }
  return messages;
}
