import { assert } from "@std/assert";
import { fromFileUrl } from "@std/path";

// Keeps the interface's own help honest.
//
// Reported by the user: "the application don't show that i can press o to run applications" — the
// key worked, the README documented it, and the in-app help did not. Nothing could have caught
// that, because the list of keys the app *handles* and the list it *documents* were two unrelated
// pieces of text. This compares them.

const APP = fromFileUrl(new URL("./App.tsx", import.meta.url));
const README = fromFileUrl(new URL("../../README.md", import.meta.url));

/** Single-character keys the browse screen acts on. */
async function handledKeys(): Promise<string[]> {
  const source = await Deno.readTextFile(APP);
  return [...new Set([...source.matchAll(/input === "([a-zA-Z])"/g)].map((m) => m[1]))].sort();
}

Deno.test("every key the interface handles appears in its own help screen", async () => {
  const source = await Deno.readTextFile(APP);
  // The help screen's table: ["k", "what it does"].
  const documented = new Set(
    [...source.matchAll(/\["([^"]+)", "[^"]*"\]/g)].map((m) => m[1]),
  );
  const missing = (await handledKeys()).filter((k) => !documented.has(k));
  assert(missing.length === 0, `handled but absent from the ? help screen: ${missing.join(", ")}`);
});

Deno.test("every key the interface handles appears in the README key table", async () => {
  // Scoped to the Keys section, and matching the key anywhere inside it: some rows document two
  // keys in one cell (`e` / `i`). The question is whether a key is documented at all, not whether
  // it was given a row of its own.
  const readme = await Deno.readTextFile(README);
  const start = readme.indexOf("## Keys");
  assert(start !== -1, "the README has no Keys section");
  const end = readme.indexOf("\n## ", start + 1);
  const table = readme.slice(start, end === -1 ? undefined : end);

  const missing = (await handledKeys()).filter((k) => !table.includes("`" + k + "`"));
  assert(
    missing.length === 0,
    `handled but absent from the README key table: ${missing.join(", ")}`,
  );
});
