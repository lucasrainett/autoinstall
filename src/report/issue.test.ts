import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { type FailureReport, issueBody, issueTitle, issueUrl, MAX_URL_LENGTH } from "./issue.ts";

const CTX = { homeDir: "/home/alice", username: "alice", hostname: "box" };

const REPORT: FailureReport = {
  key: "librewolf",
  action: "install",
  platform: "linux",
  error: "E: Unable to locate package librewolf",
  output: "Reading package lists...\nE: Unable to locate package librewolf",
  toolVersion: "0.2.0",
};

Deno.test("issueTitle - names the entry, the operation and the platform", () => {
  assertEquals(
    issueTitle(REPORT),
    "librewolf fails to install on Linux (Debian/Ubuntu)",
  );
});

Deno.test("issueBody - carries what is needed to act on the report", () => {
  const body = issueBody(REPORT, CTX);
  for (const needed of ["librewolf", "install", "0.2.0", "Unable to locate"]) {
    assertStringIncludes(body, needed);
  }
});

Deno.test("issueBody - redacts the body, so a report cannot leak the reporter's machine", () => {
  const body = issueBody({
    ...REPORT,
    error: "cannot write /home/alice/.config/thing",
    output: "GITHUB_TOKEN=hunter2\nuser alice on box",
  }, CTX);
  assert(!body.includes("/home/alice"), "leaked the home directory");
  assert(!body.includes("hunter2"), "leaked a token");
  assertStringIncludes(body, "~/.config/thing");
});

Deno.test("issueBody - keeps the END of a long log, not the beginning", () => {
  // A failing script's useful line is almost always its last. Truncating from the end would
  // routinely discard the only part worth reading.
  const output = "filler line\n".repeat(2000) + "THE ACTUAL ERROR";
  const body = issueBody({ ...REPORT, output }, CTX, 500);
  assertStringIncludes(body, "THE ACTUAL ERROR");
  assertStringIncludes(body, "earlier output trimmed");
});

Deno.test("issueBody - an entry with no captured output still produces a usable report", () => {
  const body = issueBody({ ...REPORT, output: undefined }, CTX);
  assertStringIncludes(body, "Unable to locate");
  assert(!body.includes("**Output**"));
});

Deno.test("issueUrl - stays inside the length limit even for a huge log", () => {
  // A URL over the limit does not open at all, which is a worse outcome than a trimmed log.
  const { url, truncated } = issueUrl("owner/repo", {
    ...REPORT,
    output: "x".repeat(200_000),
  }, CTX);
  assert(url.length <= MAX_URL_LENGTH, `url was ${url.length} chars`);
  assertEquals(truncated, true);
});

Deno.test("issueUrl - a short report is not marked truncated", () => {
  const { truncated } = issueUrl("owner/repo", REPORT, CTX);
  assertEquals(truncated, false);
});

Deno.test("issueUrl - points at the configured repository and the issue template", () => {
  const { url } = issueUrl("someone/their-fork", REPORT, CTX);
  assertStringIncludes(url, "https://github.com/someone/their-fork/issues/new");
  assertStringIncludes(url, "template=entry-problem.yml");
});

Deno.test("issueUrl - the platform value matches an option in the real issue template", async () => {
  // GitHub only pre-fills a dropdown when the value matches an option exactly; a mismatch is
  // silently ignored, so this would rot without a test reading the template itself.
  const template = await Deno.readTextFile(
    fromFileUrl(new URL("../../.github/ISSUE_TEMPLATE/entry-problem.yml", import.meta.url)),
  );
  for (const platform of ["linux", "macos", "windows"] as const) {
    const { url } = issueUrl("owner/repo", { ...REPORT, platform }, CTX);
    const value = new URL(url).searchParams.get("platform");
    assert(value !== null);
    assert(
      template.includes(`"${value}"`),
      `the template has no dropdown option "${value}" — the prefill would be dropped`,
    );
  }
});
