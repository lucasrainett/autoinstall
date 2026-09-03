// Dev-only tool: load the real bundled catalog and print what the loader/validator see.
// Not part of the engine (src/) — just a manual way to look at current progress.
// Usage: deno run --allow-read scripts/inspect-catalog.ts

import { loadCatalog } from "../src/catalog/loader.ts";
import { validateCatalog } from "../src/catalog/validator.ts";

const catalogRoot = new URL("../catalog", import.meta.url).pathname;
const { entries, errors } = await loadCatalog(catalogRoot);
const issues = validateCatalog(entries);

console.log(
  `Loaded ${entries.length} entr${entries.length === 1 ? "y" : "ies"} from ${catalogRoot}\n`,
);

for (const entry of entries) {
  console.log(`- ${entry.meta.name}  [${entry.category}/${entry.kind}/${entry.id}]`);
  console.log(`    ${entry.meta.description}`);
  if (entry.meta.website) console.log(`    ${entry.meta.website}`);
  for (const [platform, ops] of Object.entries(entry.platforms)) {
    console.log(`    ${platform}: ${Object.keys(ops).join(", ")}`);
  }
  console.log("");
}

if (errors.length > 0) {
  console.log(`Load errors (${errors.length}):`);
  for (const e of errors) console.log(`  ${e.path}: ${e.message}`);
}

if (issues.length > 0) {
  console.log(`Validation issues (${issues.length}):`);
  for (const i of issues) console.log(`  ${i.path}: ${i.message}`);
}

if (errors.length === 0 && issues.length === 0) {
  console.log("No load errors, no validation issues.");
}
