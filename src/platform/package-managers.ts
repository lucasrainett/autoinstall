import { PACKAGE_MANAGERS, type PackageManager } from "./types.ts";
import { commandExists } from "./shell.ts";

const PACKAGE_MANAGER_COMMANDS: Record<PackageManager, string> = {
  apt: "apt",
  flatpak: "flatpak",
  brew: "brew",
  winget: "winget",
};

/**
 * Pure decision logic: given a `checkCommand` function (injected so tests can mock it trivially),
 * reports which package managers are usable on this machine. Real callers pass `commandExists`
 * from shell.ts; tests pass a fake that maps command names to booleans.
 */
export async function detectPackageManagers(
  checkCommand: (cmd: string) => Promise<boolean>,
): Promise<Record<PackageManager, boolean>> {
  const result = {} as Record<PackageManager, boolean>;
  for (const pm of PACKAGE_MANAGERS) {
    result[pm] = await checkCommand(PACKAGE_MANAGER_COMMANDS[pm]);
  }
  return result;
}

/** Real wrapper: checks actual command availability on this machine. */
export function detectAvailablePackageManagers(): Promise<Record<PackageManager, boolean>> {
  return detectPackageManagers(commandExists);
}
