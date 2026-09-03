import { assertEquals } from "@std/assert";
import { detectOS } from "./os.ts";

const UBUNTU_OS_RELEASE = `NAME="Ubuntu"\nID=ubuntu\nID_LIKE=debian\nVERSION_ID="24.04"\n`;
const DEBIAN_OS_RELEASE = `NAME="Debian GNU/Linux"\nID=debian\nVERSION_ID="12"\n`;
const FEDORA_OS_RELEASE = `NAME="Fedora Linux"\nID=fedora\nVERSION_ID="40"\n`;
const ZORIN_OS_RELEASE = `NAME="Zorin OS"\nID=zorin\nID_LIKE="ubuntu debian"\nVERSION_ID="17"\n`;

Deno.test("detectOS - macOS", () => {
  assertEquals(detectOS("darwin"), { kind: "macos" });
});

Deno.test("detectOS - Windows", () => {
  assertEquals(detectOS("windows"), { kind: "windows" });
});

Deno.test("detectOS - Ubuntu is debian family via ID", () => {
  assertEquals(detectOS("linux", UBUNTU_OS_RELEASE), {
    kind: "linux",
    linuxFamily: "debian",
    distroId: "ubuntu",
  });
});

Deno.test("detectOS - Debian is debian family via ID", () => {
  assertEquals(detectOS("linux", DEBIAN_OS_RELEASE), {
    kind: "linux",
    linuxFamily: "debian",
    distroId: "debian",
  });
});

Deno.test("detectOS - a derivative distro is debian family via ID_LIKE, not just ID", () => {
  assertEquals(detectOS("linux", ZORIN_OS_RELEASE), {
    kind: "linux",
    linuxFamily: "debian",
    distroId: "zorin",
  });
});

Deno.test("detectOS - Fedora is an unsupported Linux family", () => {
  assertEquals(detectOS("linux", FEDORA_OS_RELEASE), {
    kind: "linux",
    linuxFamily: "unsupported",
    distroId: "fedora",
  });
});

Deno.test("detectOS - missing/unreadable os-release is treated as unsupported, not a crash", () => {
  assertEquals(detectOS("linux", undefined), {
    kind: "linux",
    linuxFamily: "unsupported",
    distroId: undefined,
  });
});
