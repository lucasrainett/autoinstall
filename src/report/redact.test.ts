import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { currentRedactionContext, redact } from "./redact.ts";

const CTX = { homeDir: "/home/alice", username: "alice", hostname: "alices-laptop" };

Deno.test("redact - the home directory becomes ~, not /home/<user>", () => {
  // Order matters: replacing the username first would leave "/home/<user>", which is both uglier
  // and leaks the layout of the machine for no benefit.
  assertEquals(
    redact("bash: /home/alice/.local/bin/thing: not found", CTX),
    "bash: ~/.local/bin/thing: not found",
  );
});

Deno.test("redact - a Windows home directory is caught with either separator", () => {
  const ctx = { homeDir: "C:\\Users\\alice", username: "alice" };
  assertEquals(redact("at C:\\Users\\alice\\AppData", ctx), "at ~\\AppData");
  assertEquals(redact("at C:/Users/alice/AppData", ctx), "at ~/AppData");
});

Deno.test("redact - the username is replaced where it appears outside a path", () => {
  assertEquals(
    redact("user alice is not in the sudoers file", CTX),
    "user <user> is not in the sudoers file",
  );
});

Deno.test("redact - a username is only replaced as a whole word", () => {
  // Regression guard for the obvious cheap implementation: a bare substring replace turns
  // "malice" into "m<user>" and makes the log nonsense.
  assertEquals(redact("malice detected in metallica", CTX), "malice detected in metallica");
});

Deno.test("redact - the hostname is replaced", () => {
  assertStringIncludes(redact("ssh: connect to alices-laptop", CTX), "<host>");
});

Deno.test("redact - email addresses go", () => {
  assertEquals(
    redact("fatal: empty ident name for <alice@example.com>", CTX),
    "fatal: empty ident name for <<email>>",
  );
});

Deno.test("redact - known credential formats are caught anywhere they appear", () => {
  for (
    const secret of [
      "ghp_abcdefghijklmnopqrstuvwxyz0123456789",
      "github_pat_11ABCDEFG0abcdefghijklmnop",
      "xoxb-123456789012-abcdefghijkl",
      "AKIAIOSFODNN7EXAMPLE",
    ]
  ) {
    const out = redact(`curl -H "Authorization: ${secret}" https://x`, CTX);
    assert(!out.includes(secret), `leaked ${secret}`);
    assertStringIncludes(out, "<redacted");
  }
});

Deno.test("redact - secret-shaped assignments are redacted by name, not by guessing at the value", () => {
  // A secret is not recognisable by shape: plenty of real tokens look like words. The variable
  // name is the reliable signal.
  for (
    const [input, mustNotContain] of [
      ["GITHUB_TOKEN=hunter2", "hunter2"],
      ["api_key: 'swordfish'", "swordfish"],
      ['PASSWORD="correct-horse"', "correct-horse"],
      ["MY_AUTH_SECRET=letmein", "letmein"],
    ] as const
  ) {
    const out = redact(input, CTX);
    assert(!out.includes(mustNotContain), `leaked from ${input}: ${out}`);
    assertStringIncludes(out, "<redacted>");
  }
});

Deno.test("redact - ordinary output is left alone", () => {
  // Over-redaction is the safer failure, but a report where everything is <redacted> is useless.
  const log = "E: Unable to locate package foo\nflatpak: no remote chosen\nexit code 100";
  assertEquals(redact(log, CTX), log);
});

Deno.test("currentRedactionContext - falls back to the home directory's last segment for the username", () => {
  const ctx = currentRedactionContext(
    { get: (k) => (k === "HOME" ? "/home/bob" : undefined) },
    () => "box",
  );
  assertEquals(ctx.username, "bob");
  assertEquals(ctx.homeDir, "/home/bob");
  assertEquals(ctx.hostname, "box");
});

Deno.test("currentRedactionContext - a hostname lookup that throws is not fatal", () => {
  const ctx = currentRedactionContext({ get: () => undefined }, () => {
    throw new Error("denied");
  });
  assertEquals(ctx.hostname, "");
});
