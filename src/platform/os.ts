import type { OSInfo, OSKind } from "./types.ts";
import type { Platform } from "../catalog/types.ts";

const DEBIAN_FAMILY_IDS = new Set(["debian", "ubuntu"]);

function parseOsRelease(content: string): { id?: string; idLike: string[] } {
  const fields: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    fields[key] = value;
  }
  return { id: fields["ID"], idLike: fields["ID_LIKE"]?.split(/\s+/).filter(Boolean) ?? [] };
}

/**
 * Pure decision logic: given the raw platform name (Deno.build.os's "darwin"/"windows"/"linux")
 * and, for Linux, the raw contents of /etc/os-release, decides the OS and — for Linux — whether
 * it's within this tool's supported Debian/Ubuntu scope (PROJECT_DEFINITION.md §1).
 */
export function detectOS(platform: string, osReleaseContent?: string): OSInfo {
  if (platform === "darwin") return { kind: "macos" };
  if (platform === "windows") return { kind: "windows" };

  const { id, idLike } = parseOsRelease(osReleaseContent ?? "");
  const isDebianFamily = (id !== undefined && DEBIAN_FAMILY_IDS.has(id)) ||
    idLike.some((l) => DEBIAN_FAMILY_IDS.has(l));

  return { kind: "linux", linuxFamily: isDebianFamily ? "debian" : "unsupported", distroId: id };
}

/** Real wrapper: reads the actual running OS and, on Linux, /etc/os-release. */
export async function detectCurrentOS(): Promise<OSInfo> {
  const platform = Deno.build.os;
  if (platform !== "linux") return detectOS(platform);

  let osRelease: string | undefined;
  try {
    osRelease = await Deno.readTextFile("/etc/os-release");
  } catch {
    osRelease = undefined;
  }
  return detectOS(platform, osRelease);
}

/** Maps a detected OSKind to the catalog's on-disk Platform folder name. Currently the same three
 * values either way, but kept as an explicit mapping rather than a cast: OSKind (what's actually
 * true of the running machine) and Platform (the catalog's folder-name vocabulary) are
 * deliberately separate types representing different concerns — see this file's neighboring
 * types.ts header comment — so nothing here assumes they'll always line up. */
export function osKindToPlatform(kind: OSKind): Platform {
  return kind === "macos" ? "macos" : kind === "windows" ? "windows" : "linux";
}
