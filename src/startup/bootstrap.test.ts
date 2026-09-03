import { assert, assertEquals } from "@std/assert";
import {
  bootstrapCatalog,
  catalogChangeNotices,
  missingPackageManagerWarnings,
  overlayDirName,
  syncOverlayRepos,
} from "./bootstrap.ts";
import type { GitRunner } from "../overlay/git.ts";
import { fromFileUrl } from "@std/path";

const BUNDLED_CATALOG = fromFileUrl(new URL("../../catalog", import.meta.url));
const BUNDLED_PROFILES = fromFileUrl(new URL("../../profiles", import.meta.url));

function recordingGit(
  fail: (args: string[]) => boolean = () => false,
): { git: GitRunner; calls: string[][] } {
  const calls: string[][] = [];
  const git: GitRunner = {
    run(args) {
      calls.push([...args]);
      return Promise.resolve(
        fail(args) ? { code: 1, stderr: "boom" } : { code: 0, stderr: "" },
      );
    },
  };
  return { git, calls };
}

Deno.test("overlayDirName - is stable for the same URL and different for different URLs", () => {
  assertEquals(
    overlayDirName("git@github.com:jane/cfg.git"),
    overlayDirName("git@github.com:jane/cfg.git"),
  );
  assert(
    overlayDirName("https://example.com/a.git") !== overlayDirName("https://example.com/b.git"),
  );
});

Deno.test("overlayDirName - two repos with the same trailing name do not collide", () => {
  // Both end in "dotfiles.git"; deriving the directory from the repo name alone would clobber one.
  const a = overlayDirName("https://github.com/alice/dotfiles.git");
  const b = overlayDirName("https://github.com/bob/dotfiles.git");
  assert(a !== b, `expected distinct directories, got ${a} twice`);
});

Deno.test("syncOverlayRepos - clones a repo that isn't present yet", async () => {
  const { git, calls } = recordingGit();
  const result = await syncOverlayRepos(
    [{ url: "https://example.com/cfg.git" }],
    "/tmp/overlays",
    { git, exists: () => Promise.resolve(false) },
  );
  assertEquals(result.errors, []);
  assertEquals(result.dirs.length, 1);
  assertEquals(calls[0][0], "clone");
});

Deno.test("syncOverlayRepos - pulls a repo that is already checked out", async () => {
  const { git, calls } = recordingGit();
  const result = await syncOverlayRepos(
    [{ url: "https://example.com/cfg.git" }],
    "/tmp/overlays",
    { git, exists: () => Promise.resolve(true) },
  );
  assertEquals(result.errors, []);
  assertEquals(calls[0][0], "pull");
});

Deno.test("syncOverlayRepos - checks out the pinned ref when one is configured", async () => {
  const { git, calls } = recordingGit();
  await syncOverlayRepos(
    [{ url: "https://example.com/cfg.git", ref: "v1.2.3" }],
    "/tmp/overlays",
    { git, exists: () => Promise.resolve(false) },
  );
  assert(
    calls.some((c) => c[0] === "checkout" && c[1] === "v1.2.3"),
    `expected a checkout of the pinned ref, got ${JSON.stringify(calls)}`,
  );
});

Deno.test("syncOverlayRepos - one failing repo does not stop the others", async () => {
  // A broken or unreachable overlay must never prevent the tool from starting.
  const { git } = recordingGit((args) => args.includes("https://broken.example.com/x.git"));
  const result = await syncOverlayRepos(
    [
      { url: "https://broken.example.com/x.git" },
      { url: "https://good.example.com/y.git" },
    ],
    "/tmp/overlays",
    { git, exists: () => Promise.resolve(false) },
  );
  assertEquals(result.errors.length, 1);
  assertEquals(result.dirs.length, 1, "the working repo should still be usable");
});

Deno.test("syncOverlayRepos - a failed pull still yields the existing checkout to work from", async () => {
  // Offline start: the pull fails, but the previously cloned copy is still perfectly usable.
  const { git } = recordingGit((args) => args[0] === "pull");
  const result = await syncOverlayRepos(
    [{ url: "https://example.com/cfg.git" }],
    "/tmp/overlays",
    { git, exists: () => Promise.resolve(true) },
  );
  assertEquals(result.errors.length, 1);
  assertEquals(result.dirs.length, 1);
});

Deno.test("bootstrapCatalog - loads the real bundled catalog and profiles with no warnings", async () => {
  const result = await bootstrapCatalog({
    catalogRoot: BUNDLED_CATALOG,
    profilesRoot: BUNDLED_PROFILES,
  });
  assertEquals(result.warnings, []);
  assert(result.entries.length > 0, "expected real catalog entries");
  assert(result.profiles.length > 0, "expected real profiles");
});

Deno.test("bootstrapCatalog - reports a profile that references an entry which doesn't exist", async () => {
  // This is the gap validateProfileAgainstCatalog was written for and which nothing ever called:
  // a stale key used to stay silent until the user picked the profile and quietly got less.
  const dir = await Deno.makeTempDir();
  await Deno.writeTextFile(
    `${dir}/broken.toml`,
    'name = "Broken"\ndescription = "references a missing entry"\nentries = ["nope/install/ghost"]\n',
  );
  const result = await bootstrapCatalog({
    catalogRoot: BUNDLED_CATALOG,
    profilesRoot: dir,
  });
  assert(
    result.warnings.some((w) => w.includes("ghost")),
    `expected a warning naming the missing entry, got ${JSON.stringify(result.warnings)}`,
  );
  await Deno.remove(dir, { recursive: true });
});

Deno.test("bootstrapCatalog - a broken overlay repo degrades to the bundled catalog instead of failing", async () => {
  const { git } = recordingGit(() => true); // every git command fails
  const result = await bootstrapCatalog({
    catalogRoot: BUNDLED_CATALOG,
    profilesRoot: BUNDLED_PROFILES,
    overlayRepos: [{ url: "https://unreachable.example.com/cfg.git" }],
    overlaysDir: "/tmp/overlays-test",
    git,
    exists: () => Promise.resolve(false),
  });
  assert(result.warnings.some((w) => w.includes("unreachable.example.com")));
  assert(result.entries.length > 0, "the bundled catalog must still load");
});

Deno.test("bootstrapCatalog - skips overlay syncing entirely when none are configured", async () => {
  const { git, calls } = recordingGit();
  await bootstrapCatalog({
    catalogRoot: BUNDLED_CATALOG,
    profilesRoot: BUNDLED_PROFILES,
    overlayRepos: [],
    overlaysDir: "/tmp/overlays-test",
    git,
  });
  assertEquals(calls, [], "git must not be invoked when there are no overlay repos");
});

Deno.test("missingPackageManagerWarnings - warns once per missing manager, not once per entry", async () => {
  const { entries } = await bootstrapCatalog({
    catalogRoot: BUNDLED_CATALOG,
    profilesRoot: BUNDLED_PROFILES,
  });
  const warnings = missingPackageManagerWarnings(entries, "linux", {
    apt: true,
    flatpak: false,
    brew: true,
    winget: true,
  });
  assertEquals(
    warnings.length,
    1,
    `expected a single flatpak warning, got ${JSON.stringify(warnings)}`,
  );
  assert(warnings[0].includes("flatpak"));
});

Deno.test("missingPackageManagerWarnings - AppImage entries count as needing flatpak (Gear Lever is a flatpak)", async () => {
  const { entries } = await bootstrapCatalog({
    catalogRoot: BUNDLED_CATALOG,
    profilesRoot: BUNDLED_PROFILES,
  });
  const appImageOnly = entries.filter((e) => e.meta.platforms?.linux?.installMethod === "appimage");
  assert(
    appImageOnly.length > 0,
    "expected the catalog to have AppImage entries to prove this with",
  );
  const warnings = missingPackageManagerWarnings(appImageOnly, "linux", {
    apt: true,
    flatpak: false,
    brew: true,
    winget: true,
  });
  assertEquals(warnings.length, 1);
  assert(warnings[0].includes("flatpak"));
});

Deno.test("missingPackageManagerWarnings - says nothing when every needed manager is present", async () => {
  const { entries } = await bootstrapCatalog({
    catalogRoot: BUNDLED_CATALOG,
    profilesRoot: BUNDLED_PROFILES,
  });
  assertEquals(
    missingPackageManagerWarnings(entries, "linux", {
      apt: true,
      flatpak: true,
      brew: true,
      winget: true,
    }),
    [],
  );
});

Deno.test("catalogChangeNotices - reports added and removed entries", () => {
  const notices = catalogChangeNotices(
    new Set(["a/install/one", "a/install/gone"]),
    new Set(["a/install/one", "a/install/new"]),
  );
  assertEquals(notices.length, 2);
  assert(notices[0].includes("a/install/new"));
  assert(notices[1].includes("a/install/gone"));
});

Deno.test("catalogChangeNotices - a first run reports nothing, since everything would be 'new'", () => {
  assertEquals(catalogChangeNotices(new Set(), new Set(["a/install/one"])), []);
});

Deno.test("bootstrapCatalog - reports the catalog as complete when every source loaded", async () => {
  // `catalogComplete` gates pruning stale keys from the saved selection. It must only be true when
  // a missing entry genuinely means "gone", never merely "could not be fetched right now".
  const result = await bootstrapCatalog({
    catalogRoot: BUNDLED_CATALOG,
    profilesRoot: BUNDLED_PROFILES,
  });
  assertEquals(result.catalogComplete, true);
});

Deno.test("bootstrapCatalog - an overlay that fails to sync marks the catalog incomplete", async () => {
  // The dangerous case: an overlay repo that fails to clone takes its entries with it. Pruning the
  // selection on that basis would silently discard choices for software that still exists.
  const result = await bootstrapCatalog({
    catalogRoot: BUNDLED_CATALOG,
    profilesRoot: BUNDLED_PROFILES,
    overlayRepos: [{ url: "https://example.invalid/repo.git" }],
    overlaysDir: await Deno.makeTempDir(),
    git: { run: () => Promise.resolve({ code: 1, stderr: "network unreachable" }) },
    exists: () => Promise.resolve(false),
  });
  assertEquals(result.catalogComplete, false);
  assert(result.warnings.length > 0, "a failed overlay must also be reported");
});
