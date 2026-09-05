import { assert, assertEquals } from "@std/assert";
import { openerFor, openInBrowser } from "./open.ts";

Deno.test("openerFor - each platform gets an opener that exists there", () => {
  assertEquals(openerFor("darwin")[0].cmd, "open");
  assertEquals(openerFor("linux")[0].cmd, "xdg-open");
  assertEquals(openerFor("windows")[0].cmd, "cmd");
});

Deno.test("openerFor - the Windows form keeps cmd's empty title argument", () => {
  // Without it, `start "https://…"` treats the quoted URL as the window title and opens nothing.
  assertEquals(openerFor("windows")[0].args("https://x"), ["/c", "start", "", "https://x"]);
});

Deno.test("openInBrowser - falls through to the next opener when the first is missing", async () => {
  const tried: string[] = [];
  const ok = await openInBrowser("https://x", "linux", (cmd) => {
    tried.push(cmd);
    if (cmd === "xdg-open") throw new Deno.errors.NotFound("no xdg-open");
    return Promise.resolve({ success: true });
  });
  assertEquals(ok, true);
  assertEquals(tried, ["xdg-open", "wslview"]);
});

Deno.test("openInBrowser - a non-zero exit is treated as failure, not success", async () => {
  const ok = await openInBrowser("https://x", "darwin", () => Promise.resolve({ success: false }));
  assertEquals(ok, false);
});

Deno.test("openInBrowser - reports failure rather than throwing when nothing works", async () => {
  // The caller is a failure screen; it must always be able to fall back to printing the URL.
  const ok = await openInBrowser("https://x", "linux", () => {
    throw new Error("denied");
  });
  assert(ok === false);
});
