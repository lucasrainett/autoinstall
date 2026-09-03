import { assert, assertEquals } from "@std/assert";
import { loadCatalog } from "./loader.ts";
import { fromFileUrl } from "@std/path";

// README quotes concrete catalog counts, which is the useful thing to quote and also the thing
// that silently rots — a review found it claiming a test count 10 short of reality. Volatile
// numbers were removed from the docs where they carried no meaning; the ones worth stating are
// pinned here instead, so adding an entry fails this test rather than quietly making the README
// wrong.
Deno.test("README's catalog counts match the catalog on disk", async () => {
  const readme = await Deno.readTextFile(new URL("../../README.md", import.meta.url));
  const { entries } = await loadCatalog(fromFileUrl(new URL("../../catalog", import.meta.url)));

  const categories = new Set(entries.map((e) => e.category)).size;
  assert(
    readme.includes(`**${entries.length} entries** across ${categories} categories`),
    `README does not state ${entries.length} entries across ${categories} categories`,
  );

  const counts: Record<string, number> = { linux: 0, macos: 0, windows: 0 };
  for (const entry of entries) {
    for (const platform of Object.keys(counts)) {
      if (entry.platforms[platform as keyof typeof entry.platforms]) counts[platform]++;
    }
  }
  const claim = `${counts.linux} Linux, ${counts.macos} macOS, ${counts.windows} Windows`;
  assert(readme.includes(claim), `README does not state platform coverage "${claim}"`);

  // The screenshot drifted to 79 while the prose above stayed correct, because only the prose was
  // ever checked. Anything in the README quoting a count is now pinned, wherever it appears.
  for (const match of readme.matchAll(/\[1 of (\d+)\]/g)) {
    assertEquals(Number(match[1]), counts.linux, "README screenshot's entry count is stale");
  }
  for (const match of readme.matchAll(/ready — (\d+) entries diagnosed/g)) {
    assertEquals(Number(match[1]), counts.linux, "README screenshot's status line is stale");
  }
});
