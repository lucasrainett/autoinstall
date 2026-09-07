import { assert, assertEquals, assertStringIncludes } from "@std/assert";
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

Deno.test("issueUrl - points at the configured repository", () => {
  const { url } = issueUrl("someone/their-fork", REPORT, CTX);
  assertStringIncludes(url, "https://github.com/someone/their-fork/issues/new");
});

Deno.test("issueUrl - carries the report in `body`, which needs no issue template", () => {
  // Field prefill only works when GitHub can resolve the template, and it reads templates solely
  // from the default branch. Where they are absent the form falls back to a blank issue and drops
  // every field parameter — the user gets a title and nothing else, which looks like the tool
  // reported the problem when it reported almost none of it. Seen for real.
  const { url } = issueUrl("owner/repo", REPORT, CTX);
  const body = new URL(url).searchParams.get("body");
  assert(body !== null, "no body parameter");
  assertStringIncludes(body, "librewolf");
  assertStringIncludes(body, "Unable to locate");
  // Nothing may depend on a template resolving.
  assertEquals(new URL(url).searchParams.get("template"), null);
});

Deno.test("issueUrl - names the platform in the body for every platform", () => {
  // The platform used to ride in a dropdown field, which only pre-fills when GitHub resolves the
  // template. In the body it always survives.
  for (const platform of ["linux", "macos", "windows"] as const) {
    const { url } = issueUrl("owner/repo", { ...REPORT, platform }, CTX);
    const body = new URL(url).searchParams.get("body") ?? "";
    assertStringIncludes(body, "**Platform:**");
  }
});
