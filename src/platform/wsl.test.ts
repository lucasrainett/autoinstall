import { assertEquals } from "@std/assert";
import { detectWslFrom, isDebianFamilyDistroName, parseWslDistros } from "./wsl.ts";

const UBUNTU_LIST_OUTPUT = `  NAME      STATE           VERSION\n* Ubuntu    Running         2\n`;
const UNSUPPORTED_LIST_OUTPUT =
  `  NAME              STATE           VERSION\n* Fedora-Remix     Stopped         2\n`;
const NOT_CONFIGURED_OUTPUT =
  `Windows Subsystem for Linux has no installed distributions.\nUse 'wsl.exe --list --online' to list available distributions\nand 'wsl.exe --install <Distro>' to install.\n`;
const MULTI_DISTRO_OUTPUT =
  `  NAME              STATE           VERSION\n  Ubuntu-24.04      Stopped         2\n* Debian            Running         2\n  docker-desktop    Running         2\n`;

Deno.test("parseWslDistros - a single running default distro", () => {
  assertEquals(parseWslDistros(UBUNTU_LIST_OUTPUT), [
    { name: "Ubuntu", isDefault: true, running: true },
  ]);
});

Deno.test("parseWslDistros - the 'no distributions installed' message parses to an empty list, not an error", () => {
  assertEquals(parseWslDistros(NOT_CONFIGURED_OUTPUT), []);
});

Deno.test("parseWslDistros - multiple distros, default and running tracked independently", () => {
  assertEquals(parseWslDistros(MULTI_DISTRO_OUTPUT), [
    { name: "Ubuntu-24.04", isDefault: false, running: false },
    { name: "Debian", isDefault: true, running: true },
    { name: "docker-desktop", isDefault: false, running: true },
  ]);
});

Deno.test("isDebianFamilyDistroName - matches Ubuntu and Debian variants, not others", () => {
  assertEquals(isDebianFamilyDistroName("Ubuntu"), true);
  assertEquals(isDebianFamilyDistroName("Ubuntu-24.04"), true);
  assertEquals(isDebianFamilyDistroName("Debian"), true);
  assertEquals(isDebianFamilyDistroName("Fedora-Remix"), false);
  assertEquals(isDebianFamilyDistroName("docker-desktop"), false);
});

Deno.test("detectWslFrom - no WSL: the wsl command itself isn't available", () => {
  assertEquals(detectWslFrom(false, ""), { available: false, distros: [], hasDebianFamily: false });
});

Deno.test("detectWslFrom - WSL + Ubuntu: available and debian-family", () => {
  const info = detectWslFrom(true, UBUNTU_LIST_OUTPUT);
  assertEquals(info.available, true);
  assertEquals(info.hasDebianFamily, true);
  assertEquals(info.distros.length, 1);
});

Deno.test("detectWslFrom - WSL + unsupported distro: available but not debian-family", () => {
  const info = detectWslFrom(true, UNSUPPORTED_LIST_OUTPUT);
  assertEquals(info.available, true);
  assertEquals(info.hasDebianFamily, false);
  assertEquals(info.distros, [{ name: "Fedora-Remix", isDefault: true, running: false }]);
});

Deno.test("detectWslFrom - WSL not yet configured: available, but no distros and not debian-family", () => {
  const info = detectWslFrom(true, NOT_CONFIGURED_OUTPUT);
  assertEquals(info, { available: true, distros: [], hasDebianFamily: false });
});
