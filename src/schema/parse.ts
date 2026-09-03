// Shared Zod plumbing for the TOML documents this project parses (entry metadata, user config,
// profiles, manifests).
//
// These parsers were originally hand-written: ~870 lines across four modules containing 37
// separate `throw new Error` calls doing field-presence, type and allowed-value checks. Zod
// expresses the same rules declaratively and derives the TypeScript types, so the shapes can no
// longer drift from the validation that guards them.
//
// The one thing deliberately preserved from the hand-written versions is the *quality* of the
// error messages. These files are edited by hand, so an error has to name the file, the exact
// field path, and what was expected — "unrecognized field" with no path would be a regression.
// `formatIssues` rebuilds that shape from Zod's issue list.

import { z } from "zod";

/** Renders Zod issues in this project's established style: `"field.path": what went wrong`,
 * joined when a document has several problems at once. */
export function formatIssues(issues: readonly z.core.$ZodIssue[]): string {
  return issues
    .map((issue) => {
      const path = issue.path.map((p) => String(p)).join(".");
      return path.length > 0 ? `"${path}": ${issue.message}` : issue.message;
    })
    .join("; ");
}

/**
 * Validates `value` against `schema`, throwing a single Error carrying every problem found rather
 * than only the first — a hand-edited file with three mistakes should report three, not force
 * three round trips.
 *
 * `context` is prefixed when given (callers pass the file path), matching how catalog issues have
 * always been reported.
 */
export function parseWith<T>(schema: z.ZodType<T>, value: unknown, context?: string): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const detail = formatIssues(result.error.issues);
  throw new Error(context !== undefined ? `${context}: ${detail}` : detail);
}

/**
 * A strict TOML table: unknown keys are an error, never silently ignored. Catching a typo'd field
 * is the whole point — a silently-dropped `requiresElevation` would mean a missing sudo prompt.
 *
 * The wrong-type message deliberately says "must be a table" rather than Zod's default "expected
 * object". Every document these schemas validate is TOML, hand-edited, and *table* is TOML's own
 * word for this construct; telling someone editing a .toml file that an "object" was expected
 * describes a JavaScript value they never wrote.
 */
export function strictTable<T extends z.ZodRawShape>(shape: T) {
  return z.strictObject(shape, {
    error: (issue) => issue.code === "invalid_type" ? "must be a table" : undefined,
  });
}

/** TOML parsing failures are reported distinctly from schema failures, because the fix differs:
 * one is malformed syntax, the other is a well-formed document with wrong contents. */
export function parseTomlOrThrow(
  raw: string,
  parse: (raw: string) => unknown,
): unknown {
  try {
    return parse(raw);
  } catch (err) {
    throw new Error(`could not parse TOML (${(err as Error).message})`);
  }
}
