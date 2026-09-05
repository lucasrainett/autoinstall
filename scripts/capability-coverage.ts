// Which capabilities this catalog can deliver, per platform.
//
// Written because the question "is this capability available on all three platforms?" was being
// answered by a human reading entry notes and reasoning about them — which produced a run of wrong
// answers: Junction marked Linux-only because its *mechanism* is Linux-only, LACT claimed to have
// no Windows counterpart, Bazaar called a Linux-only concept when every OS has an app store.
//
// A capability is "covered" on a platform when at least one entry providing it has a folder for
// that platform. Everything below is computed from the catalog, so it cannot drift from it.
//
//   deno task capabilities            every capability, with gaps marked
//   deno task capabilities --gaps     only the ones missing somewhere

import { fromFileUrl } from "@std/path";
import { loadCatalog } from "../src/catalog/loader.ts";
import { CAPABILITIES, type Capability } from "../src/catalog/capabilities.ts";
import { entryKey, type Platform, PLATFORMS } from "../src/catalog/types.ts";

const gapsOnly = Deno.args.includes("--gaps");
const root = fromFileUrl(new URL("../catalog", import.meta.url));
const { entries } = await loadCatalog(root);

/** capability -> platform -> the entries providing it there */
const coverage = new Map<Capability, Map<Platform, string[]>>();
for (const entry of entries) {
  for (const cap of entry.meta.capabilities ?? []) {
    const byPlatform = coverage.get(cap) ?? new Map<Platform, string[]>();
    for (const platform of PLATFORMS) {
      if (entry.platforms[platform] === undefined) continue;
      byPlatform.set(platform, [...(byPlatform.get(platform) ?? []), entryKey(entry)]);
    }
    coverage.set(cap, byPlatform);
  }
}

const untagged = entries.filter((e) => (e.meta.capabilities ?? []).length === 0);
const rows: Array<{ cap: Capability; missing: Platform[]; counts: string }> = [];
for (const cap of Object.keys(CAPABILITIES) as Capability[]) {
  const byPlatform = coverage.get(cap);
  if (byPlatform === undefined) continue; // vocabulary entry nothing claims yet
  const missing = PLATFORMS.filter((p) => (byPlatform.get(p) ?? []).length === 0);
  const counts = PLATFORMS.map((p) => `${p[0].toUpperCase()}${(byPlatform.get(p) ?? []).length}`)
    .join(" ");
  rows.push({ cap, missing, counts });
}

const shown = gapsOnly ? rows.filter((r) => r.missing.length > 0) : rows;
const width = Math.max(...shown.map((r) => r.cap.length), 10);

for (const { cap, missing, counts } of shown) {
  const mark = missing.length === 0 ? "✓" : `missing: ${missing.join(", ")}`;
  console.log(`${cap.padEnd(width)}  ${counts.padEnd(12)}  ${mark}`);
}

const complete = rows.filter((r) => r.missing.length === 0).length;
console.log();
console.log(
  `${rows.length} capabilities claimed by ${entries.length} entries — ` +
    `${complete} on all three platforms, ${rows.length - complete} with a gap.`,
);
const unclaimed = (Object.keys(CAPABILITIES) as Capability[]).filter((c) => !coverage.has(c));
if (unclaimed.length > 0) console.log(`${unclaimed.length} in the vocabulary with no entry yet.`);
if (untagged.length > 0) {
  console.log(`\n${untagged.length} entries declare no capability:`);
  for (const e of untagged) console.log(`  ${entryKey(e)}`);
}
