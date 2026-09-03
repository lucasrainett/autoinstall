// Disk-encryption advisory — TASKS.md §Security ("disk-encryption status check, advisory, never
// silent").
//
// This deliberately is *not* a catalog entry. Enabling full-disk encryption on a machine that
// already has data on it is not something a tool should do behind a checkbox: on Linux it means
// re-installing or a careful offline migration, and on macOS and Windows it starts a lengthy
// conversion that needs a recovery key stored somewhere safe first. An entry implies "check this
// and I will do it", which would be a lie.
//
// What it can honestly do is notice, and say so once, with the command the user would run.

export type EncryptionStatus = "encrypted" | "unencrypted" | "unknown";

export interface EncryptionProbe {
  status: EncryptionStatus;
  /** Why the status could not be determined, when it could not be. */
  detail?: string;
}

/**
 * The advisory, or undefined when there is nothing worth saying.
 *
 * Silent when the disk *is* encrypted: a notice confirming that everything is fine is the kind of
 * noise that trains people to ignore the notices screen. Silent too when the answer is unknown on
 * a platform where the check needs privileges we deliberately do not take — an inconclusive probe
 * is not evidence of a problem, and crying wolf is worse than saying nothing.
 */
export function diskEncryptionNotice(
  probe: EncryptionProbe,
  platform: "linux" | "macos" | "windows",
): string | undefined {
  if (probe.status === "encrypted") return undefined;
  if (probe.status === "unknown") return undefined;

  const how: Record<typeof platform, string> = {
    linux:
      "Linux needs this set up at install time — enabling it later means a reinstall or an offline migration of the root filesystem.",
    macos: "Turn on FileVault in System Settings › Privacy & Security, and store the recovery key.",
    windows:
      "Turn on BitLocker in Settings › Privacy & security › Device encryption, and store the recovery key.",
  };

  return `This disk is not encrypted — anyone with physical access can read it. ${how[platform]}`;
}

/** Real probe: looks for a LUKS/dm-crypt layer under the root filesystem. */
export async function probeLinuxEncryption(
  run: (cmd: string, args: string[]) => Promise<{ code: number; stdout: string }>,
): Promise<EncryptionProbe> {
  try {
    // `lsblk` reports one line per block device; a `crypt` type anywhere means a dm-crypt mapping
    // exists. Checked rather than reading /etc/crypttab, which describes intent at boot rather
    // than what is actually mapped now.
    const { code, stdout } = await run("lsblk", ["-no", "TYPE"]);
    if (code !== 0) return { status: "unknown", detail: "lsblk failed" };
    return stdout.split("\n").some((l) => l.trim() === "crypt")
      ? { status: "encrypted" }
      : { status: "unencrypted" };
  } catch (err) {
    return { status: "unknown", detail: (err as Error).message };
  }
}

/** Real probe: FileVault's own status command, which needs no privileges to read. */
export async function probeMacosEncryption(
  run: (cmd: string, args: string[]) => Promise<{ code: number; stdout: string }>,
): Promise<EncryptionProbe> {
  try {
    const { code, stdout } = await run("fdesetup", ["status"]);
    if (code !== 0) return { status: "unknown", detail: "fdesetup failed" };
    if (/FileVault is On/i.test(stdout)) return { status: "encrypted" };
    if (/FileVault is Off/i.test(stdout)) return { status: "unencrypted" };
    return { status: "unknown", detail: "unrecognised fdesetup output" };
  } catch (err) {
    return { status: "unknown", detail: (err as Error).message };
  }
}

/** Real probe: BitLocker's protection status for the system drive. */
export async function probeWindowsEncryption(
  run: (cmd: string, args: string[]) => Promise<{ code: number; stdout: string }>,
): Promise<EncryptionProbe> {
  try {
    const { code, stdout } = await run("powershell.exe", [
      "-NoProfile",
      "-Command",
      "(Get-BitLockerVolume -MountPoint $env:SystemDrive).ProtectionStatus",
    ]);
    // Without administrator rights this cmdlet errors rather than answering. That is "unknown",
    // not "unencrypted" — the startup scan runs unelevated by design, and reporting an
    // unreadable state as a security problem would be a false alarm on every locked-down machine.
    if (code !== 0) return { status: "unknown", detail: "BitLocker status needs administrator" };
    const answer = stdout.trim();
    if (answer === "On" || answer === "1") return { status: "encrypted" };
    if (answer === "Off" || answer === "0") return { status: "unencrypted" };
    return { status: "unknown", detail: `unrecognised BitLocker status ${JSON.stringify(answer)}` };
  } catch (err) {
    return { status: "unknown", detail: (err as Error).message };
  }
}
