// Turns WSL detection into something a user can act on.
//
// `platform/wsl` could describe the machine but nothing ever asked it, so the offer described in
// PROJECT_DEFINITION §7 — set up a Debian/Ubuntu environment inside WSL — was never made. This is
// the decision half, kept pure so it is testable without a Windows box: it takes the detected
// state and returns the message, if any, that should be shown.
//
// Deliberately advisory. Installing WSL reboots the machine and changes virtualisation settings,
// which is far beyond what a catalog entry should do behind a confirm screen — so the tool says
// what is possible and leaves the command to the user.

import type { WslInfo } from "../platform/types.ts";

export function wslNotice(platform: string, info: WslInfo): string | undefined {
  // Only relevant on Windows: WSL is a Windows feature, and mentioning it anywhere else is noise.
  if (platform !== "windows") return undefined;

  if (!info.available) {
    return "WSL is not installed. Installing it (`wsl --install`) gives you a Debian/Ubuntu " +
      "environment where this tool's much larger Linux catalog applies. It requires a reboot, " +
      "so it is left for you to run.";
  }

  if (info.distros.length === 0) {
    return "WSL is available but has no distributions installed. `wsl --install -d Ubuntu` adds " +
      "one, after which this tool's Linux catalog can be used inside it.";
  }

  if (!info.hasDebianFamily) {
    const names = info.distros.map((d) => d.name).join(", ");
    return `WSL is installed, but none of its distributions are Debian/Ubuntu-family (${names}). ` +
      "This tool's Linux catalog targets apt-based systems; `wsl --install -d Ubuntu` adds a " +
      "compatible one alongside what you already have.";
  }

  const compatible = info.distros.filter((d) => d.name).map((d) => d.name).join(", ");
  return `WSL is available with a Debian/Ubuntu-family distribution (${compatible}). ` +
    "Run this tool inside it to apply the Linux catalog there.";
}
