import { assert, assertEquals } from "@std/assert";
import { entriesNeedingIdentity, identityIsConfigured, identityNotice } from "./identity-notice.ts";
import type { CatalogEntry } from "../catalog/types.ts";

function entry(id: string, scripts: Record<string, string>): CatalogEntry {
  return {
    categories: ["quality-of-life"],
    kind: "configure",
    id,
    meta: { kind: "install", name: id, description: "d" },
    path: `/catalog/quality-of-life/configure/${id}`,
    platforms: { linux: scripts },
  } as CatalogEntry;
}

const reader = (files: Record<string, string>) => (path: string) =>
  path in files ? Promise.resolve(files[path]) : Promise.reject(new Error("missing"));

Deno.test("identityIsConfigured - needs both halves, and neither may be blank", () => {
  assertEquals(identityIsConfigured(undefined), false);
  assertEquals(identityIsConfigured({ name: "Ada" }), false);
  assertEquals(identityIsConfigured({ email: "ada@example.com" }), false);
  // Whitespace is not an identity — script-env.ts omits blank values, so the script would still
  // see nothing and the entry would still be unsatisfiable.
  assertEquals(identityIsConfigured({ name: "  ", email: "ada@example.com" }), false);
  assertEquals(identityIsConfigured({ name: "Ada", email: "ada@example.com" }), true);
});

Deno.test("entriesNeedingIdentity - finds entries whose scripts read the identity variables", async () => {
  const catalog = [
    entry("git-identity", { detect: "/a/detect.sh", install: "/a/install.sh" }),
    entry("dark-mode", { detect: "/b/detect.sh", install: "/b/install.sh" }),
  ];
  const needing = await entriesNeedingIdentity(
    catalog,
    "linux",
    reader({
      "/a/detect.sh": 'test "$AUTOINSTALL_IDENTITY_NAME" = x',
      "/a/install.sh": "git config user.name",
      "/b/detect.sh": "gsettings get org.gnome.desktop.interface color-scheme",
      "/b/install.sh": "gsettings set org.gnome.desktop.interface color-scheme prefer-dark",
    }),
  );
  assertEquals(needing, ["git-identity"]);
});

Deno.test("entriesNeedingIdentity - ignores entries that do not apply to this platform", async () => {
  const macOnly = {
    categories: ["quality-of-life"],
    kind: "configure",
    id: "mac-thing",
    meta: { kind: "install", name: "m", description: "d" },
    path: "/p",
    platforms: { macos: { detect: "/m/detect.sh" } },
  } as unknown as CatalogEntry;
  const needing = await entriesNeedingIdentity(
    [macOnly],
    "linux",
    reader({
      "/m/detect.sh": "$AUTOINSTALL_IDENTITY_EMAIL",
    }),
  );
  assertEquals(needing, []);
});

Deno.test("entriesNeedingIdentity - an unreadable script is not a crash", async () => {
  const catalog = [entry("git-identity", { detect: "/nope/detect.sh" })];
  assertEquals(await entriesNeedingIdentity(catalog, "linux", reader({})), []);
});

Deno.test("identityNotice - names the entries and the file to edit", () => {
  const msg = identityNotice("/home/u/.config/autoinstall/config.toml", [
    "git-identity",
    "ssh-key",
  ]);
  assert(msg?.includes("git-identity"));
  assert(msg?.includes("ssh-key"));
  assert(msg?.includes("[identity]"), "must say which section to add");
  assert(msg?.includes("config.toml"), "must name the file");
});

Deno.test("identityNotice - says nothing when no entry needs an identity", () => {
  assertEquals(identityNotice("/x/config.toml", []), undefined);
});
