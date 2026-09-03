// Profile schema — TASKS.md §1.8, PROJECT_DEFINITION.md §2. A profile lives in its own TOML file
// under a top-level `profiles/` directory, separate from `catalog/` (a profile spans multiple
// categories/kinds and isn't itself a catalog entry).

export interface Profile {
  /** Filename without ".toml" for a local profile; the source URL itself for a URL-loaded one. */
  id: string;
  name: string;
  description: string;
  /** "category/kind/id" keys into the catalog. */
  entryKeys: string[];
}

/** A profile loaded ad hoc from a pasted URL (§4/§13 of PROJECT_DEFINITION.md) rather than picked
 * by name from a configured source — always untrusted, unconditionally, regardless of contents. */
export interface UntrustedProfile extends Profile {
  untrusted: true;
  sourceUrl: string;
  /** The exact raw TOML text fetched, kept for verbatim display before anything from it can run. */
  rawContents: string;
}
