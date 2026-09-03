import type { WslDistro, WslInfo } from "./types.ts";
import { commandExists } from "./shell.ts";

const DEBIAN_FAMILY_NAME = /^(ubuntu|debian)/i;

/** Heuristic: matches by distro display name (e.g. "Ubuntu-24.04"), since a WSL distro can't be
 * asked for its /etc/os-release without actually shelling into it — that's a separate concern
 * from this module's job of listing what's registered. */
export function isDebianFamilyDistroName(name: string): boolean {
  return DEBIAN_FAMILY_NAME.test(name);
}

/**
 * Parses the text output of `wsl --list --verbose`. Tolerant by design: a header line, or the
 * explanatory text WSL prints when no distributions are installed ("has no installed
 * distributions..."), both produce zero distros rather than a parse error — only lines that
 * actually look like "name state version" are treated as data.
 *
 * Assumes distro names never contain whitespace (true of every standard WSL distro name:
 * Ubuntu, Ubuntu-24.04, Debian, docker-desktop, kali-linux, ...) — unverified against real
 * `wsl.exe` output since this was built without access to a Windows machine; treat as needing
 * a real-Windows check before Phase 7 relies on it.
 */
export function parseWslDistros(rawOutput: string): WslDistro[] {
  const distros: WslDistro[] = [];

  for (const rawLine of rawOutput.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;
    if (/^\s*NAME\s+STATE\s+VERSION\s*$/i.test(line)) continue;

    const isDefault = line.startsWith("*");
    const fields = (isDefault ? line.slice(1) : line).trim().split(/\s+/);
    if (fields.length !== 3) continue; // not a data line — skip rather than misparse

    const [name, state] = fields;
    distros.push({ name, isDefault, running: state.toLowerCase() === "running" });
  }

  return distros;
}

function hasDebianFamilyDistro(distros: WslDistro[]): boolean {
  return distros.some((d) => isDebianFamilyDistroName(d.name));
}

/**
 * Pure decision logic over already-gathered inputs: whether the `wsl` command exists at all, and
 * (if so) the raw text of `wsl --list --verbose`. Tests can pass any combination directly, without
 * touching a real command or a real Windows machine.
 */
export function detectWslFrom(wslCommandAvailable: boolean, listOutput: string): WslInfo {
  if (!wslCommandAvailable) return { available: false, distros: [], hasDebianFamily: false };
  const distros = parseWslDistros(listOutput);
  return { available: true, distros, hasDebianFamily: hasDebianFamilyDistro(distros) };
}

/** Real wrapper: checks for the `wsl` command and, if present, runs and parses `wsl --list --verbose`. */
export async function detectWsl(): Promise<WslInfo> {
  const available = await commandExists("wsl");
  if (!available) return { available: false, distros: [], hasDebianFamily: false };

  try {
    const command = new Deno.Command("wsl", {
      args: ["--list", "--verbose"],
      stdout: "piped",
      stderr: "null",
    });
    const { stdout } = await command.output();
    // wsl.exe is documented to emit UTF-16LE — unverified here (no Windows machine available while
    // building this); confirm against a real `wsl --list --verbose` run before relying on it.
    const rawOutput = new TextDecoder("utf-16le").decode(stdout);
    return detectWslFrom(true, rawOutput);
  } catch {
    return { available: true, distros: [], hasDebianFamily: false };
  }
}
