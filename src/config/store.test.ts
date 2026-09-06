import { assertEquals } from "@std/assert";
import { parseUserConfig, readUserConfig, serializeUserConfig, writeUserConfig } from "./store.ts";
import type { UserConfig } from "./types.ts";

Deno.test("serializeUserConfig / parseUserConfig - round-trips a full config exactly", () => {
  const config: UserConfig = {
    identity: { name: "Jane Doe", email: "jane@example.com" },
    selectedKeys: ["signal", "disable-telemetry"],
    overlayRepos: [
      { url: "git@github.com:jane/my-config.git", ref: "main" },
      { url: "https://example.com/other.git" },
    ],
  };
  assertEquals(parseUserConfig(serializeUserConfig(config)), config);
});

Deno.test("serializeUserConfig / parseUserConfig - round-trips a minimal (default) config", () => {
  const config: UserConfig = { selectedKeys: [], overlayRepos: [] };
  assertEquals(parseUserConfig(serializeUserConfig(config)), config);
});

Deno.test("readUserConfig / writeUserConfig - round-trips through a real file", async () => {
  const path = await Deno.makeTempFile();
  const config: UserConfig = {
    identity: { name: "Jane Doe" },
    selectedKeys: ["signal"],
    overlayRepos: [],
  };
  await writeUserConfig(path, config);
  assertEquals(await readUserConfig(path), config);
  await Deno.remove(path);
});

Deno.test("readUserConfig - a missing config file initializes documented defaults", async () => {
  assertEquals(await readUserConfig("/tmp/does-not-exist-autoinstall-config.toml"), {
    selectedKeys: [],
    overlayRepos: [],
  });
});

Deno.test("writeUserConfig - creates a missing parent directory rather than throwing (a real first-run crash this project hit)", async () => {
  const dir = await Deno.makeTempDir();
  const path = `${dir}/nested/does/not/exist/config.toml`;
  const config: UserConfig = { selectedKeys: ["signal"], overlayRepos: [] };
  await writeUserConfig(path, config); // must not throw NotFound
  assertEquals(await readUserConfig(path), config);
  await Deno.remove(dir, { recursive: true });
});

Deno.test("parseUserConfig - rejects malformed TOML with a specific error, not a crash", () => {
  let threw = false;
  try {
    parseUserConfig("this is not = valid [[[ toml");
  } catch (err) {
    threw = true;
    assertEquals((err as Error).message.includes("TOML"), true);
  }
  assertEquals(threw, true);
});

Deno.test("parseUserConfig - rejects an unrecognized top-level field", () => {
  let threw = false;
  try {
    parseUserConfig('selectedKeys = []\noverlayRepos = []\nfooBar = "typo"\n');
  } catch (err) {
    threw = true;
    assertEquals((err as Error).message.includes("fooBar"), true);
  }
  assertEquals(threw, true);
});

Deno.test("parseUserConfig - rejects an unrecognized identity field", () => {
  let threw = false;
  try {
    parseUserConfig('[identity]\nname = "Jane"\nnickname = "J"\n');
  } catch (err) {
    threw = true;
    assertEquals((err as Error).message.includes("nickname"), true);
  }
  assertEquals(threw, true);
});

Deno.test("parseUserConfig - rejects an overlay repo entry missing url", () => {
  let threw = false;
  try {
    parseUserConfig('[[overlayRepos]]\nref = "main"\n');
  } catch (err) {
    threw = true;
    assertEquals((err as Error).message.includes("url"), true);
  }
  assertEquals(threw, true);
});

Deno.test({
  name:
    "readUserConfig - an unreadable (not missing) config is an error, never silently empty defaults",
  // Deno.chmod throws outright on Windows, and a 0o000 mode would not deny the owner there
  // anyway — NTFS permissions are ACLs, not a POSIX mode. The behaviour under test (a read error
  // must not be swallowed into empty defaults) is platform-independent and covered on the two
  // platforms that can actually produce an unreadable file.
  ignore: Deno.build.os === "windows",
  fn: async () => {
    // Regression: swallowing every read error turned an unreadable config into an empty one, and
    // the app's persist-on-change would then overwrite the user's real selections with nothing.
    const dir = await Deno.makeTempDir();
    const path = `${dir}/config.toml`;
    await Deno.writeTextFile(path, 'selectedKeys = ["b"]\noverlayRepos = []\n');
    await Deno.chmod(path, 0o000);

    let threw = false;
    try {
      await readUserConfig(path);
    } catch (err) {
      threw = true;
      assertEquals((err as Error).message.includes("could not read config"), true);
    }
    await Deno.chmod(path, 0o644);
    await Deno.remove(dir, { recursive: true });
    assertEquals(threw, true, "an unreadable config must not masquerade as defaults");
  },
});
