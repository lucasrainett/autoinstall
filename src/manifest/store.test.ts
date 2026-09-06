import { assertEquals } from "@std/assert";
import { parseManifest, readManifest, serializeManifest, writeManifest } from "./store.ts";
import type { Manifest } from "./types.ts";

Deno.test("serializeManifest / parseManifest - round-trips exactly", () => {
  const manifest: Manifest = {
    selectedKeys: ["signal", "disable-telemetry"],
    overlayRepos: [{ url: "git@github.com:jane/my-config.git", ref: "main" }],
  };
  assertEquals(parseManifest(serializeManifest(manifest)), manifest);
});

Deno.test("serializeManifest / parseManifest - round-trips with no overlay repos", () => {
  const manifest: Manifest = { selectedKeys: ["signal"], overlayRepos: [] };
  assertEquals(parseManifest(serializeManifest(manifest)), manifest);
});

Deno.test("readManifest / writeManifest - round-trips through a real file", async () => {
  const path = await Deno.makeTempFile();
  const manifest: Manifest = { selectedKeys: ["signal"], overlayRepos: [] };
  await writeManifest(path, manifest);
  assertEquals(await readManifest(path), manifest);
  await Deno.remove(path);
});

Deno.test("writeManifest - creates a missing parent directory rather than throwing", async () => {
  const dir = await Deno.makeTempDir();
  const path = `${dir}/nested/does/not/exist/manifest.toml`;
  const manifest: Manifest = { selectedKeys: ["signal"], overlayRepos: [] };
  await writeManifest(path, manifest); // must not throw NotFound
  assertEquals(await readManifest(path), manifest);
  await Deno.remove(dir, { recursive: true });
});

Deno.test("parseManifest - rejects malformed TOML", () => {
  let threw = false;
  try {
    parseManifest("not = valid [[[ toml");
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("parseManifest - rejects an unrecognized field", () => {
  let threw = false;
  try {
    parseManifest('selectedKeys = []\nfooBar = "typo"\n');
  } catch (err) {
    threw = true;
    assertEquals((err as Error).message.includes("fooBar"), true);
  }
  assertEquals(threw, true);
});

Deno.test("parseManifest - requires selectedKeys", () => {
  let threw = false;
  try {
    parseManifest("overlayRepos = []\n");
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});
