// Strips personal detail out of anything destined for a public bug report.
//
// A failure report is worth having only if people are willing to send it, and a script's stderr
// routinely carries the things that make someone think twice: their username in every path, the
// machine's hostname, an email address from a git identity, and occasionally a token that some
// tool echoed. None of that helps diagnose a broken catalog entry.
//
// This is deliberately conservative in one direction: it would rather mangle a harmless string
// than leak a real one. Over-redaction costs a slightly less readable log; under-redaction is
// published on a public issue tracker and cannot be taken back.

export interface RedactionContext {
  homeDir?: string;
  username?: string;
  hostname?: string;
}

/** Reads the identifying values from the environment, for the real call site. */
export function currentRedactionContext(
  env: { get(k: string): string | undefined } = Deno.env,
  hostname: () => string = () => Deno.hostname(),
): RedactionContext {
  const home = env.get("HOME") ?? env.get("USERPROFILE");
  // Guarded here rather than inside the default argument: Deno.hostname() needs --allow-sys, and
  // an injected implementation can throw too. A report is worth more than a hostname.
  let host = "";
  try {
    host = hostname();
  } catch {
    host = "";
  }
  return {
    homeDir: home,
    username: env.get("USER") ?? env.get("USERNAME") ??
      (home !== undefined ? home.split(/[\\/]/).filter(Boolean).pop() : undefined),
    hostname: host,
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Secret-shaped assignments: `GITHUB_TOKEN=abc`, `api_key: "xyz"`, `--password abc`.
 *
 * Matched on the *name* rather than the value, because a secret is not recognisable by shape —
 * plenty of tokens look like ordinary words, and plenty of ordinary words look like tokens.
 */
const SECRET_NAME =
  /(\b[A-Za-z0-9_-]*(?:token|secret|password|passwd|api[_-]?key|auth)[A-Za-z0-9_-]*\b)(\s*[=:]\s*|\s+)(["']?)([^\s"']+)\3/gi;

/** Known-prefix credentials, which are unambiguous and worth catching wherever they appear. */
const KNOWN_TOKENS =
  /\b(gh[pousr]_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})\b/g;

const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

/** Replaces identifying detail with stable placeholders. Order matters: home before username, so
 * `/home/alice` becomes `~` rather than `/home/<user>`. */
export function redact(text: string, ctx: RedactionContext): string {
  let out = text;

  // Longest-first so a home directory is not half-replaced by a username match inside it.
  if (ctx.homeDir !== undefined && ctx.homeDir.length > 0) {
    out = out.replaceAll(ctx.homeDir, "~");
    // Windows paths appear with either separator depending on which tool printed them.
    out = out.replaceAll(ctx.homeDir.replaceAll("\\", "/"), "~");
  }
  // Emails and credentials go *before* the username, and this ordering is load-bearing: a
  // username replaced first turns alice@example.com into <user>@example.com, which no longer
  // matches the email pattern, so the domain survives into a public issue. Caught by a test.
  out = out.replace(KNOWN_TOKENS, "<redacted-token>");
  out = out.replace(
    SECRET_NAME,
    (_m, name, sep, quote, _value) => `${name}${sep}${quote}<redacted>${quote}`,
  );
  out = out.replace(EMAIL, "<email>");

  if (ctx.username !== undefined && ctx.username.length > 1) {
    out = out.replace(new RegExp(`\\b${escapeRegExp(ctx.username)}\\b`, "g"), "<user>");
  }
  if (ctx.hostname !== undefined && ctx.hostname.length > 1) {
    out = out.replace(new RegExp(`\\b${escapeRegExp(ctx.hostname)}\\b`, "g"), "<host>");
  }
  return out;
}
