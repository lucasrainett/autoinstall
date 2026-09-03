import { assertEquals } from "@std/assert";
import { detectPackageManagers } from "./package-managers.ts";

function fakeChecker(available: string[]) {
  return (cmd: string) => Promise.resolve(available.includes(cmd));
}

Deno.test("detectPackageManagers - reports each manager as available/unavailable per the injected checker", async () => {
  const result = await detectPackageManagers(fakeChecker(["apt", "flatpak"]));
  assertEquals(result, {
    apt: true,
    flatpak: true,
    brew: false,
    winget: false,
  });
});

Deno.test("detectPackageManagers - a macOS-shaped machine (brew only)", async () => {
  const result = await detectPackageManagers(fakeChecker(["brew"]));
  assertEquals(result, {
    apt: false,
    flatpak: false,
    brew: true,
    winget: false,
  });
});

Deno.test("detectPackageManagers - a Windows-shaped machine (winget only — no choco/scoop, by design)", async () => {
  const result = await detectPackageManagers(fakeChecker(["winget"]));
  assertEquals(result, {
    apt: false,
    flatpak: false,
    brew: false,
    winget: true,
  });
});

Deno.test("detectPackageManagers - none available", async () => {
  const result = await detectPackageManagers(fakeChecker([]));
  assertEquals(Object.values(result).every((v) => v === false), true);
});
