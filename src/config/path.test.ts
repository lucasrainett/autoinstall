import { assertEquals } from "@std/assert";
import { resolveConfigPath } from "./path.ts";

function env(vars: Record<string, string>, platform: "linux" | "macos" | "windows" = "linux") {
  return { getEnv: (name: string) => vars[name], platform };
}

Deno.test("resolveConfigPath - AUTOINSTALL_CONFIG_PATH overrides everything, on every platform", () => {
  assertEquals(
    resolveConfigPath(env({ AUTOINSTALL_CONFIG_PATH: "/custom/path.toml" }, "windows")),
    "/custom/path.toml",
  );
});

Deno.test("resolveConfigPath - windows uses APPDATA", () => {
  assertEquals(
    resolveConfigPath(env({ APPDATA: "C:\\Users\\alice\\AppData\\Roaming" }, "windows")),
    "C:\\Users\\alice\\AppData\\Roaming\\autoinstall\\config.toml",
  );
});

Deno.test("resolveConfigPath - windows falls back to a fixed default if APPDATA is unset", () => {
  assertEquals(
    resolveConfigPath(env({}, "windows")),
    "C:\\Users\\Default\\AppData\\Roaming\\autoinstall\\config.toml",
  );
});

Deno.test("resolveConfigPath - linux/macos prefer XDG_CONFIG_HOME when set", () => {
  assertEquals(
    resolveConfigPath(env({ XDG_CONFIG_HOME: "/home/alice/.config", HOME: "/home/alice" })),
    "/home/alice/.config/autoinstall/config.toml",
  );
});

Deno.test("resolveConfigPath - linux/macos fall back to HOME/.config when XDG_CONFIG_HOME is unset", () => {
  assertEquals(
    resolveConfigPath(env({ HOME: "/home/alice" })),
    "/home/alice/.config/autoinstall/config.toml",
  );
  assertEquals(
    resolveConfigPath(env({ HOME: "/home/alice" }, "macos")),
    "/home/alice/.config/autoinstall/config.toml",
  );
});

Deno.test("resolveConfigPath - falls back to /root when even HOME is unset", () => {
  assertEquals(resolveConfigPath(env({})), "/root/.config/autoinstall/config.toml");
});
