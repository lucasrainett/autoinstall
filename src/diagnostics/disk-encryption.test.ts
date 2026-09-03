import { assert, assertEquals } from "@std/assert";
import {
  diskEncryptionNotice,
  probeLinuxEncryption,
  probeMacosEncryption,
  probeWindowsEncryption,
} from "./disk-encryption.ts";

const runner = (code: number, stdout: string) => () => Promise.resolve({ code, stdout });

Deno.test("diskEncryptionNotice - warns, and says what to do, when the disk is not encrypted", () => {
  const linux = diskEncryptionNotice({ status: "unencrypted" }, "linux");
  assert(linux?.includes("not encrypted"));
  assert(linux?.includes("reinstall"), "Linux cannot be converted in place; say so");

  assert(diskEncryptionNotice({ status: "unencrypted" }, "macos")?.includes("FileVault"));
  assert(diskEncryptionNotice({ status: "unencrypted" }, "windows")?.includes("BitLocker"));
});

Deno.test("diskEncryptionNotice - says nothing when the disk is encrypted", () => {
  // A notice confirming all is well is the noise that trains people to ignore the notices screen.
  assertEquals(diskEncryptionNotice({ status: "encrypted" }, "linux"), undefined);
});

Deno.test("diskEncryptionNotice - says nothing when the answer is unknown", () => {
  // An inconclusive probe is not evidence of a problem. Reporting it as one would cry wolf on
  // every machine where the check needs privileges the startup scan deliberately does not take.
  assertEquals(
    diskEncryptionNotice({ status: "unknown", detail: "needs admin" }, "windows"),
    undefined,
  );
});

Deno.test("probeLinuxEncryption - a dm-crypt layer anywhere means encrypted", async () => {
  assertEquals(
    (await probeLinuxEncryption(runner(0, "disk\npart\ncrypt\nlvm\n"))).status,
    "encrypted",
  );
});

Deno.test("probeLinuxEncryption - no crypt layer means unencrypted", async () => {
  assertEquals((await probeLinuxEncryption(runner(0, "disk\npart\npart\n"))).status, "unencrypted");
});

Deno.test("probeLinuxEncryption - a failed lsblk is unknown, not unencrypted", async () => {
  assertEquals((await probeLinuxEncryption(runner(1, ""))).status, "unknown");
});

Deno.test("probeLinuxEncryption - a thrown error is unknown, not a crash", async () => {
  const throwing = () => Promise.reject(new Error("no such command"));
  assertEquals((await probeLinuxEncryption(throwing)).status, "unknown");
});

Deno.test("probeMacosEncryption - reads FileVault's own wording, both ways", async () => {
  assertEquals((await probeMacosEncryption(runner(0, "FileVault is On.\n"))).status, "encrypted");
  assertEquals(
    (await probeMacosEncryption(runner(0, "FileVault is Off.\n"))).status,
    "unencrypted",
  );
  assertEquals((await probeMacosEncryption(runner(0, "something else"))).status, "unknown");
});

Deno.test("probeWindowsEncryption - accepts both the word and the numeric form", async () => {
  assertEquals((await probeWindowsEncryption(runner(0, "On\n"))).status, "encrypted");
  assertEquals((await probeWindowsEncryption(runner(0, "1\n"))).status, "encrypted");
  assertEquals((await probeWindowsEncryption(runner(0, "Off\n"))).status, "unencrypted");
  assertEquals((await probeWindowsEncryption(runner(0, "0\n"))).status, "unencrypted");
});

Deno.test("probeWindowsEncryption - lacking administrator is unknown, never 'unencrypted'", async () => {
  // The startup scan runs unelevated by design. Treating an unreadable state as a security
  // problem would raise a false alarm on every properly locked-down machine.
  const probe = await probeWindowsEncryption(runner(1, ""));
  assertEquals(probe.status, "unknown");
  assert(probe.detail?.includes("administrator"));
});
