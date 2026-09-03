// Optional raw-input diagnostic logging — enabled via AUTOINSTALL_DEBUG_LOG=<path>. Exists
// specifically for cases like a real-terminal-only bug (garbled screen / bell while moving the
// mouse) that synthetic pty test harnesses don't reproduce: this captures exactly what bytes the
// user's actual terminal sends, plus any uncaught error, so it can be diagnosed from a real log
// instead of guessed at. Not part of the engine, no-op unless the env var is set.

import process from "node:process";

export function installDebugLogging(): void {
  const path = Deno.env.get("AUTOINSTALL_DEBUG_LOG");
  if (path === undefined) return;

  const file = Deno.openSync(path, { write: true, create: true, append: true });
  const encoder = new TextEncoder();

  function log(line: string) {
    file.writeSync(encoder.encode(`${new Date().toISOString()} ${line}\n`));
  }

  log("=== debug logging started ===");
  log(`stdin.isTerminal=${Deno.stdin.isTerminal()} stdout.isTerminal=${Deno.stdout.isTerminal()}`);
  try {
    log(`consoleSize=${JSON.stringify(Deno.consoleSize())}`);
  } catch (err) {
    log(`consoleSize() threw: ${err}`);
  }

  let chunkCount = 0;
  process.stdin.on("data", (chunk: Uint8Array | string) => {
    chunkCount++;
    const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join(" ");
    log(`STDIN #${chunkCount} len=${bytes.length} hex=[${hex}]`);
  });

  globalThis.addEventListener("error", (event) => {
    const err = (event as ErrorEvent).error;
    log(`UNCAUGHT ERROR: ${err?.stack ?? (event as ErrorEvent).message}`);
  });
  globalThis.addEventListener("unhandledrejection", (event) => {
    const reason = (event as PromiseRejectionEvent).reason;
    log(`UNHANDLED REJECTION: ${reason?.stack ?? reason}`);
  });
}
