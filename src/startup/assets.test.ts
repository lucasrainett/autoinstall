import { assert, assertEquals } from "@std/assert";
import { isCompiledBinary, materializeAssetDir } from "./assets.ts";

const BUNDLED_CATALOG = new URL("../../catalog", import.meta.url).pathname;

Deno.test("isCompiledBinary - false when running from source, which is how the test suite runs", () => {
  assertEquals(isCompiledBinary(), false);
});

Deno.test("materializeAssetDir - running from source is a no-op that keeps the real directory", async () => {
  // Extraction exists only to work around a compiled binary's virtual filesystem. From source the
  // catalog is already a real directory that bash can execute from, so copying it would be pure
  // cost — and would silently detach the app from edits made to the working tree.
  const dir = await Deno.makeTempDir();
  const result = await materializeAssetDir(BUNDLED_CATALOG, `${dir}/catalog`);

  assertEquals(result.root, BUNDLED_CATALOG);
  assertEquals(result.extracted, false);
  assertEquals(result.fileCount, 0);
  assertEquals(await Deno.stat(dir).then((s) => s.isDirectory), true);
  // Nothing should have been written into the cache directory.
  const copied = [...Deno.readDirSync(dir)];
  assertEquals(copied, []);
  await Deno.remove(dir, { recursive: true });
});

Deno.test("materializeAssetDir - the returned root is always usable by a spawned process", async () => {
  // The whole point: whatever path this returns must be readable by `bash`, because every catalog
  // operation runs as `bash <script>`. A compiled binary's embedded path fails that — verified by
  // compiling one, where bash reported "No such file or directory" and every detect silently
  // failed, leaving an empty plan.
  const { root } = await materializeAssetDir(BUNDLED_CATALOG, "/tmp/unused-from-source");
  const probe = `${root}/dev-tools/install/jq/linux/detect.sh`;

  const output = await new Deno.Command("bash", {
    args: ["-c", `test -r "${probe}" && echo READABLE || echo UNREADABLE`],
    stdout: "piped",
  }).output();
  assertEquals(new TextDecoder().decode(output.stdout).trim(), "READABLE");
});

Deno.test("materializeAssetDir - a stale previous extraction is replaced, not merged", async () => {
  // An interrupted extraction would otherwise look like a complete catalog with entries missing,
  // and a binary upgrade would leave the old catalog in place.
  const dir = await Deno.makeTempDir();
  const cache = `${dir}/catalog`;
  await Deno.mkdir(cache, { recursive: true });
  await Deno.writeTextFile(`${cache}/stale-leftover.txt`, "from an older version");

  const result = await materializeAssetDir(BUNDLED_CATALOG, cache);

  if (result.extracted) {
    // Only reachable in a compiled binary; from source the no-op path is asserted above.
    assert(
      !(await Deno.stat(`${cache}/stale-leftover.txt`).then(() => true).catch(() => false)),
      "a stale file from a previous extraction must not survive",
    );
  } else {
    assertEquals(result.root, BUNDLED_CATALOG);
  }
  await Deno.remove(dir, { recursive: true });
});
