// Turns a failed action into a GitHub issue the user can review and submit.
//
// The motivating problem is specific: ~549 macOS and Windows catalog scripts have never been
// executed anywhere, so the first person to run one is doing the verification. Today, whatever
// they learn dies in their scrollback. This is the cheapest possible path from "it broke" to a
// report someone can act on.
//
// Two rules shape the design.
//
// **Nothing is transmitted by this tool.** It builds a URL to GitHub's pre-filled new-issue form
// and opens a browser; the user reads the filled-in form and presses Submit themselves. There is
// no API token, no background POST, and no way for this to send anything the user did not see. A
// tool whose whole premise is "review the plan before it runs" cannot make an exception for its
// own telemetry.
//
// **The body is redacted first** (see redact.ts), because script output routinely carries the
// user's home path, hostname and occasionally a token.

import { redact, type RedactionContext } from "./redact.ts";

/** GitHub rejects very long URLs, and browsers/proxies impose their own limits well before that.
 * 6000 leaves room for the fixed fields under the ~8k practical ceiling. */
export const MAX_URL_LENGTH = 6000;

export interface FailureReport {
  /** Entry key, e.g. "browsers/install/librewolf". */
  key: string;
  /** The operation that failed. */
  action: string;
  platform: "linux" | "macos" | "windows";
  /** The error as reported by the runner. */
  error: string;
  /** Combined script output, when captured. */
  output?: string;
  toolVersion: string;
  osDescription?: string;
}

/** The dropdown labels in .github/ISSUE_TEMPLATE/entry-problem.yml. Prefill only works when the
 * value matches an option exactly, so these are duplicated deliberately and asserted by a test. */
const PLATFORM_LABEL: Record<FailureReport["platform"], string> = {
  linux: "Linux (Debian/Ubuntu)",
  macos: "macOS",
  windows: "Windows",
};

export function issueTitle(report: FailureReport): string {
  return `${report.key} fails to ${report.action} on ${PLATFORM_LABEL[report.platform]}`;
}

/**
 * The issue body, redacted and bounded.
 *
 * When the output has to be cut, the *tail* is kept: a failing script's useful line is almost
 * always its last, and truncating from the end would routinely throw away the only thing worth
 * reading.
 */
export function issueBody(
  report: FailureReport,
  ctx: RedactionContext,
  maxOutputChars = 2500,
): string {
  return buildIssueBody(report, ctx, maxOutputChars).body;
}

/**
 * As `issueBody`, but also reports whether the log had to be cut.
 *
 * Separate because the caller must be able to say so: a user who sees their 4000-line log reduced
 * to a tail needs to know, so they can attach the full file instead of assuming everything made it.
 */
export function buildIssueBody(
  report: FailureReport,
  ctx: RedactionContext,
  maxOutputChars = 2500,
): { body: string; truncated: boolean } {
  const lines: string[] = [];
  lines.push(`**Entry:** \`${report.key}\``);
  lines.push(`**Operation:** ${report.action}`);
  lines.push(`**Platform:** ${PLATFORM_LABEL[report.platform]}`);
  if (report.osDescription !== undefined && report.osDescription.length > 0) {
    lines.push(`**OS:** ${redact(report.osDescription, ctx)}`);
  }
  lines.push(`**Tool version:** ${report.toolVersion}`);
  lines.push("");
  lines.push("**Error**");
  lines.push("```");
  lines.push(redact(report.error, ctx).trim() || "(none reported)");
  lines.push("```");

  let truncated = false;
  const raw = (report.output ?? "").trim();
  if (raw.length > 0) {
    let out = redact(raw, ctx);
    if (out.length > maxOutputChars) {
      out = "… earlier output trimmed …\n" + out.slice(out.length - maxOutputChars);
      truncated = true;
    }
    lines.push("");
    lines.push("**Output**");
    lines.push("```");
    lines.push(out);
    lines.push("```");
  }

  lines.push("");
  lines.push(
    "<sub>Reported from the tool. Personal paths, hostnames and credentials are removed " +
      "automatically — please check before submitting.</sub>",
  );
  return { body: lines.join("\n"), truncated };
}

/**
 * The pre-filled new-issue URL.
 *
 * Shortens the body rather than producing a URL that will be rejected: an issue with a trimmed log
 * is useful, and a link that fails to open is not. The caller is told when that happened so it can
 * offer to save the full report to a file instead.
 */
export function issueUrl(
  repo: string,
  report: FailureReport,
  ctx: RedactionContext,
): { url: string; truncated: boolean } {
  const base = `https://github.com/${repo}/issues/new`;
  const build = (body: string) => {
    const params = new URLSearchParams({
      template: "entry-problem.yml",
      title: issueTitle(report),
      entry: report.key,
      platform: PLATFORM_LABEL[report.platform],
      version: report.toolVersion,
      output: body,
    });
    return `${base}?${params.toString()}`;
  };

  let budget = 2500;
  let built = buildIssueBody(report, ctx, budget);
  // Percent-encoding inflates length unpredictably (a newline costs three characters), so the
  // budget is walked down against the *encoded* result rather than computed from the plain text.
  while (build(built.body).length > MAX_URL_LENGTH && budget > 200) {
    budget = Math.floor(budget / 2);
    built = buildIssueBody(report, ctx, budget);
  }
  // Reports truncation from *either* mechanism — the default budget or the URL-length squeeze.
  // Which one did it is an internal detail; what the user needs to know is "your log did not fit".
  return { url: build(built.body), truncated: built.truncated };
}
