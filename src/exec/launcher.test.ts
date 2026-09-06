import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { appRunScript, launchApp, type LaunchedChild } from "./launcher.ts";

function child(over: Partial<LaunchedChild> = {}): LaunchedChild {
  return {
    status: Promise.resolve({ success: true, code: 0 }),
    stderr: new ReadableStream({ start: (c) => c.close() }),
    unref: () => {},
    kill: () => {},
    ...over,
  };
}

function stderrOf(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(c) {
      c.enqueue(new TextEncoder().encode(text));
      c.close();
    },
  });
}

Deno.test("launchApp - an app still running after the grace period counts as launched", async () => {
  let unreffed = false;
  const result = await launchApp("/catalog/gimp/linux/run.sh", "bash", () =>
    child({
      status: new Promise(() => {}), // never exits, like a real app
      unref: () => {
        unreffed = true;
      },
    }), 20);
  assertEquals(result, { ok: true });
  assertEquals(unreffed, true, "a surviving child must be unref'd or quitting the tool hangs");
});

Deno.test("launchApp - an app that dies immediately is reported, with its own stderr", async () => {
  // This is the bug that made it look like nothing happened: the spawn succeeded, so the interface
  // said "Started GIMP" while flatpak had already failed with "not installed".
  const result = await launchApp("/catalog/x/linux/run.sh", "bash", () =>
    child({
      status: Promise.resolve({ success: false, code: 1 }),
      stderr: stderrOf("error: app/app.grayjay.Grayjay/x86_64/stable not installed\n"),
    }), 500);
  assertEquals(result.ok, false);
  if (!result.ok) assertStringIncludes(result.error, "not installed");
});

Deno.test("launchApp - a silent immediate failure still reports the exit code", async () => {
  const result = await launchApp(
    "/catalog/x/linux/run.sh",
    "bash",
    () => child({ status: Promise.resolve({ success: false, code: 127 }) }),
    500,
  );
  assertEquals(result.ok, false);
  if (!result.ok) assertStringIncludes(result.error, "127");
});

Deno.test("launchApp - an app that exits cleanly and fast is not an error", async () => {
  // Some launchers hand off and exit 0 straight away; that is a successful launch, not a failure.
  const result = await launchApp(
    "/catalog/x/linux/run.sh",
    "bash",
    () => child({ status: Promise.resolve({ success: true, code: 0 }) }),
    500,
  );
  assertEquals(result, { ok: true });
});

Deno.test("launchApp - a failed spawn is reported, not thrown", async () => {
  // Triggered by a keypress; a throw would take the whole interface down for a missing binary.
  const result = await launchApp("/x/run.sh", "bash", () => {
    throw new Deno.errors.NotFound("no bash");
  });
  assertEquals(result.ok, false);
  if (!result.ok) assertStringIncludes(result.error, "no bash");
});

Deno.test("launchApp - runs the script through the shell, not directly", async () => {
  let seen: { cmd: string; args: string[] } | undefined;
  await launchApp("/catalog/gimp/linux/run.sh", "bash", (cmd, args) => {
    seen = { cmd, args };
    return child({ status: new Promise(() => {}) });
  }, 20);
  assertEquals(seen?.cmd, "bash");
  assertEquals(seen?.args, ["/catalog/gimp/linux/run.sh"]);
});

Deno.test("appRunScript - an entry with no run script on this platform offers none", () => {
  assert(appRunScript({ linux: { run: "/a/run.sh" } }, "linux") === "/a/run.sh");
  assertEquals(appRunScript({ linux: {} }, "linux"), undefined);
  assertEquals(appRunScript({ linux: { run: "/a/run.sh" } }, "macos"), undefined);
  assertEquals(appRunScript({ linux: { run: "/a/run.sh" } }, undefined), undefined);
});
