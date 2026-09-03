// Human-readable plan rendering — TASKS.md §1.5 and §1.8, for the confirm screen and `--dry-run`
// output. Destructive/hard-to-reverse actions (PROJECT_DEFINITION.md §14) get a distinct,
// impossible-to-miss marker rather than being listed identically to a routine install — this is
// what actually enforces "nothing destructive happens without the user having seen it named in
// the plan first." The same applies to untrusted sources (§13/§14): a profile loaded ad hoc from a
// pasted URL gets its origin and full raw contents shown verbatim, up front, before anything else
// in the plan — not just a marker next to the affected entries, since the whole point is that the
// user hasn't implicitly vetted this source the way they have the bundled catalog or their own
// configured overlay repo.

import { entryKey } from "../catalog/types.ts";
import type { CatalogEntry } from "../catalog/types.ts";
import type { Plan } from "./compute.ts";

export interface UntrustedSource {
  origin: string;
  /** Exact raw text as fetched — shown verbatim, not reformatted, so nothing is hidden or altered. */
  rawContents: string;
  /** Catalog entry keys this source contributed to the current selection. */
  keys: readonly string[];
}

export function renderPlan(
  plan: Plan,
  catalog: readonly CatalogEntry[],
  untrustedSources: readonly UntrustedSource[] = [],
): string {
  const nameByKey = new Map(catalog.map((e) => [entryKey(e), e.meta.name]));
  const nameOf = (key: string) => nameByKey.get(key) ?? key;

  const untrustedKeys = new Set(untrustedSources.flatMap((s) => s.keys));
  const untrustedMarker = (key: string) => (untrustedKeys.has(key) ? " [UNTRUSTED SOURCE]" : "");

  const lines: string[] = [];

  for (const source of untrustedSources) {
    lines.push(`UNTRUSTED SOURCE: ${source.origin}`);
    lines.push("Full contents, shown before anything from it can run:");
    for (const contentLine of source.rawContents.split("\n")) lines.push(`  | ${contentLine}`);
    lines.push("");
  }

  if (plan.actions.length === 0) {
    lines.push("Nothing to do — everything is already how you asked for it.");
    return lines.join("\n");
  }

  if (plan.actions.length > 0) {
    lines.push(`The following ${plan.actions.length} action(s) will run:`);
    for (const action of plan.actions) {
      const elevated = action.requiresElevation ? " (requires elevated access)" : "";
      const marker = action.destructive ? " [DESTRUCTIVE — hard to reverse]" : "";
      lines.push(
        `  ${action.actionKind.padEnd(9)} ${nameOf(action.key)}${elevated}${marker}${
          untrustedMarker(action.key)
        }`,
      );
    }
  }

  // Deliberately silent about entries that need no action. The plan answers exactly one question
  // — what is about to change — and listing dozens of already-satisfied entries alongside it
  // buried the few lines that mattered. Reported by the user: "no need to show what is already
  // applied, too much noise, only show what will change." Available updates are likewise not
  // listed here: the list screen already marks them with ↑, and marking one with `u` is what
  // turns an update into a change this plan would report.
  return lines.join("\n");
}
