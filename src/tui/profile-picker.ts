// Profile picker input parsing — TASKS.md §2, PROJECT_DEFINITION.md §4/§5: a profile can be chosen
// by name or loaded ad hoc from a pasted URL. Deliberately simple: only an explicit http(s) scheme
// prefix counts as a URL — anything else is treated as a name, even if it superficially resembles
// part of a URL (e.g. "https-setup" or "example.com" have no scheme, so they're names). Whether a
// URL actually resolves to something valid is a separate, later concern handled by
// profiles/store.ts's loadProfileFromUrl — this function only classifies the input, it doesn't
// validate reachability.

export type ProfilePickerInput =
  | { kind: "url"; url: string }
  | { kind: "name"; name: string };

const URL_SCHEME = /^https?:\/\//i;

export function parseProfilePickerInput(raw: string): ProfilePickerInput {
  const trimmed = raw.trim();
  return URL_SCHEME.test(trimmed) ? { kind: "url", url: trimmed } : { kind: "name", name: trimmed };
}
