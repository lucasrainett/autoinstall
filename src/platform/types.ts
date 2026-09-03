// Platform detection — TASKS.md §1.2. Kept separate from src/catalog's Platform union: that one
// is the catalog's on-disk folder name ("linux"/"macos"/"windows"); this module is about what's
// actually true of the running machine (distro family, which package managers work, WSL state).

export type OSKind = "macos" | "windows" | "linux";

export interface OSInfo {
  kind: OSKind;
  /** Only meaningful when kind === "linux": is this within the tool's supported Debian/Ubuntu scope? */
  linuxFamily?: "debian" | "unsupported";
  /** Best-effort distro id from /etc/os-release (e.g. "ubuntu", "fedora"), for diagnostics/logging. */
  distroId?: string;
}

export const PACKAGE_MANAGERS = ["apt", "flatpak", "brew", "winget"] as const;
export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

export interface WslDistro {
  name: string;
  isDefault: boolean;
  running: boolean;
}

export interface WslInfo {
  /** Is the `wsl` command itself present (i.e. the Windows feature is enabled)? */
  available: boolean;
  distros: WslDistro[];
  /** Convenience: does at least one installed distro match this tool's supported Linux scope? */
  hasDebianFamily: boolean;
}
