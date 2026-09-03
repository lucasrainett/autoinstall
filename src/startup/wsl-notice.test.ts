import { assert, assertEquals } from "@std/assert";
import { wslNotice } from "./wsl-notice.ts";

const distro = (name: string) => ({ name, isDefault: false, running: true });

Deno.test("wslNotice - says nothing on Linux or macOS, where WSL is meaningless", () => {
  assertEquals(
    wslNotice("linux", { available: true, distros: [distro("Ubuntu")], hasDebianFamily: true }),
    undefined,
  );
  assertEquals(
    wslNotice("macos", { available: false, distros: [], hasDebianFamily: false }),
    undefined,
  );
});

Deno.test("wslNotice - offers WSL when it isn't installed, and says why it isn't automatic", () => {
  const msg = wslNotice("windows", { available: false, distros: [], hasDebianFamily: false });
  assert(msg?.includes("wsl --install"));
  // Installing WSL reboots the machine, which is far beyond what belongs behind a confirm screen,
  // so the notice has to make clear the user runs it themselves.
  assert(msg?.includes("reboot"));
});

Deno.test("wslNotice - available but with no distributions suggests adding one", () => {
  const msg = wslNotice("windows", { available: true, distros: [], hasDebianFamily: false });
  assert(msg?.includes("no distributions"));
  assert(msg?.includes("-d Ubuntu"));
});

Deno.test("wslNotice - a non-Debian distro is reported by name, not treated as compatible", () => {
  // The Linux catalog is apt-based; silently assuming an Alpine or Fedora WSL distro would work
  // would produce a run where nearly every entry fails.
  const msg = wslNotice("windows", {
    available: true,
    distros: [distro("Alpine"), distro("kali-linux")],
    hasDebianFamily: false,
  });
  assert(msg?.includes("Alpine"));
  assert(msg?.includes("kali-linux"));
  assert(msg?.includes("apt-based"));
});

Deno.test("wslNotice - a Debian-family distro is reported as usable", () => {
  const msg = wslNotice("windows", {
    available: true,
    distros: [distro("Ubuntu-24.04")],
    hasDebianFamily: true,
  });
  assert(msg?.includes("Ubuntu-24.04"));
  assert(msg?.includes("Linux catalog"));
});
