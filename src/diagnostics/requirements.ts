// System requirements check — TASKS.md §1.4. Reuses the same two checks the current script.sh's
// `check_requirements` does (internet, disk space), as a baseline; pure decision functions over
// already-gathered values, so the real network/filesystem access lives only in the wrappers below.

export interface RequirementCheck {
  name: string;
  passed: boolean;
  /** Present only when passed is false — a specific, actionable reason, never a generic message. */
  reason?: string;
}

const MINIMUM_DISK_SPACE_GB = 10;

export interface ConnectivityProbe {
  reachable: boolean;
  /** Why the probe failed, when the cause is something other than being offline. */
  reason?: string;
}

export function checkInternetConnectivity(probe: boolean | ConnectivityProbe): RequirementCheck {
  const result: ConnectivityProbe = typeof probe === "boolean" ? { reachable: probe } : probe;
  if (result.reachable) return { name: "internet", passed: true };
  return {
    name: "internet",
    passed: false,
    // The probe's own reason wins when it has one. "No internet" was previously reported for any
    // failure at all, including a missing --allow-net, which told the user something plainly
    // untrue about their machine and pointed them at the wrong problem entirely.
    reason: result.reason ?? "no internet connection detected",
  };
}

export function checkDiskSpace(
  availableGB: number,
  minimumGB: number = MINIMUM_DISK_SPACE_GB,
): RequirementCheck {
  return availableGB >= minimumGB ? { name: "disk-space", passed: true } : {
    name: "disk-space",
    passed: false,
    reason: `less than ${minimumGB}GB free (${availableGB.toFixed(1)}GB available)`,
  };
}

export function runSystemRequirementChecks(
  inputs: { internetReachable: boolean | ConnectivityProbe; availableDiskGB: number },
): RequirementCheck[] {
  return [
    checkInternetConnectivity(inputs.internetReachable),
    checkDiskSpace(inputs.availableDiskGB),
  ];
}

/**
 * Real wrapper: HEAD request with a timeout — any response at all means there's connectivity.
 *
 * Distinguishes *why* it failed. A denied network permission is a configuration problem on this
 * machine, not a statement about the network, and reporting it as "no internet connection" sent
 * the user looking at their router instead of at the command that launched the tool.
 */
export async function checkInternetConnectivityReal(
  url = "https://flathub.org",
  timeoutMs = 5000,
  /** Injected so the failure classification can be tested without touching the real network or
   * mutating this process's permissions, which would leak into every other test in the run. */
  fetchImpl: typeof fetch = fetch,
): Promise<ConnectivityProbe> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      await fetchImpl(url, { method: "HEAD", signal: controller.signal });
      return { reachable: true };
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    // Deno raises `NotCapable` here, not `PermissionDenied` — checked against a real denied run
    // rather than assumed, because the obvious guess silently never matches and the misleading
    // "no internet" message survives. The other two forms are kept as belt and braces.
    const denied = err instanceof Deno.errors.PermissionDenied ||
      (err instanceof Error &&
        (err.name === "NotCapable" || err.message.includes("--allow-net")));
    if (denied) {
      return {
        reachable: false,
        reason:
          "network access is not permitted for this process — run with --allow-net (deno task start already does)",
      };
    }
    if (err instanceof DOMException && err.name === "AbortError") {
      return { reachable: false, reason: `no response from ${url} within ${timeoutMs}ms` };
    }
    return { reachable: false, reason: "no internet connection detected" };
  }
}

/**
 * Real wrapper: parses `df -Pk <path>`'s "Available" column (1024-byte blocks) into GB.
 * `-P` forces the POSIX single-line format so this doesn't need to handle line-wrapped output.
 * Unverified under Git Bash on Windows — MSYS coreutils' `df` is expected to report real Windows
 * drive space in the same format, but this hasn't been checked against an actual Windows machine.
 */
export async function checkAvailableDiskSpaceReal(path = "/"): Promise<number> {
  const command = new Deno.Command("df", { args: ["-Pk", path], stdout: "piped", stderr: "null" });
  const { stdout } = await command.output();
  const output = new TextDecoder().decode(stdout);
  const dataLine = output.split("\n")[1] ?? "";
  const fields = dataLine.trim().split(/\s+/);
  const availableKb = Number(fields[3]);
  if (!Number.isFinite(availableKb)) {
    throw new Error(`could not parse "df -Pk ${path}" output: ${JSON.stringify(output)}`);
  }
  return availableKb / (1024 * 1024);
}
