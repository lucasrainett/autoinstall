// Selection-model migration — see TASKS.md §"Desired-state selection model".
//
// The meaning of `selectedKeys` changed. Under the original model a checked box was a *queue of
// things to install*, so a config listing six entries meant "install these six". Under the
// desired-state model the same six entries mean "these six, and nothing else, should be on this
// machine" — which turns every other installed entry into a planned removal.
//
// A config written before the change therefore reads as a request to strip the machine. This was
// found the worst way: a real run proposed 41 actions (one install, forty removals) for a user who
// had checked a single entry. First-run seeding did not catch it, because that only triggers on an
// *empty* selection and these configs are not empty.
//
// The fix is to record which model a config was written under, and to treat an unmarked config as
// what it actually is — a list of things the user wanted present, not an exhaustive one.

/** Written into every config saved by the desired-state model. Its absence is the migration signal. */
export const DESIRED_STATE_MODEL = "desired-state";

export interface InitialSelectionInput {
  /** `selectedKeys` as read from disk. */
  savedKeys: readonly string[];
  /** `selectionModel` as read from disk; undefined for any config written before this field. */
  selectionModel: string | undefined;
  /** Keys the diagnostic scan found actually present (installed, or installed-with-an-update). */
  presentKeys: readonly string[];
  /**
   * Keys that exist in the catalog now but did not the last time this ran — entries the user has
   * never been shown, so their absence from the saved selection means nothing.
   *
   * Without this, every catalog update proposes removing newly-added software the user already
   * has: the entry is unchecked (never seen) and installed (already there), which reads as
   * "remove it". Adding three entries produced exactly that — a plan offering to uninstall
   * Grayjay, Minder and the power profile from the machine they were written on.
   */
  newlyKnownKeys?: readonly string[];
}

export interface InitialSelectionResult {
  selection: Set<string>;
  /** Messages for the notices screen. Empty when nothing unusual happened. */
  notices: string[];
  /** True when the config needs rewriting to record the model it now follows. */
  needsPersist: boolean;
}

/**
 * Decides what the selection should be at the end of startup, given the config on disk and what
 * the machine actually has. Pure, so the three cases can be tested without a real config or scan.
 */
export function resolveInitialSelection(input: InitialSelectionInput): InitialSelectionResult {
  const saved = new Set(input.savedKeys);
  const present = new Set(input.presentKeys);

  // Already on the current model: the saved selection is authoritative and is used as-is.
  // Re-seeding here would silently undo a deliberate uncheck, which is the whole point of
  // remembering the selection at all.
  if (input.selectionModel === DESIRED_STATE_MODEL) {
    // Entries the catalog has only just gained are seeded from live state, exactly as a first run
    // seeds everything: the user has never been offered the choice, so their silence is not a
    // decision to remove. Only an entry that has been *shown* and left unchecked is a removal.
    const unseenAndPresent = (input.newlyKnownKeys ?? []).filter((k) =>
      present.has(k) && !saved.has(k)
    );
    if (unseenAndPresent.length === 0) {
      return { selection: saved, notices: [], needsPersist: false };
    }
    return {
      selection: new Set([...saved, ...unseenAndPresent]),
      notices: [
        `${unseenAndPresent.length} newly added catalog entr${
          unseenAndPresent.length === 1 ? "y is" : "ies are"
        } already installed here, so ${
          unseenAndPresent.length === 1 ? "it has" : "they have"
        } been checked rather than proposed for removal: ${unseenAndPresent.join(", ")}.`,
      ],
      needsPersist: true,
    };
  }

  // No saved selection: a genuine first run. Seed from what is installed so that an empty
  // selection on a full machine never reads as "remove all of it".
  if (saved.size === 0) {
    const notices = present.size > 0
      ? [
        `First run: ${present.size} already-installed entr${
          present.size === 1 ? "y was" : "ies were"
        } pre-selected, so nothing is removed unless you uncheck it.`,
      ]
      : [];
    return { selection: present, notices, needsPersist: true };
  }

  // A config from before the model changed. Its keys were things the user wanted *installed*, and
  // it says nothing at all about what they wanted removed — so it is unioned with what is present
  // rather than treated as exhaustive. The union is the only reading that cannot destroy anything:
  // it preserves every deliberate choice while adding no removals.
  const selection = new Set([...saved, ...present]);
  const wouldHaveBeenRemoved = [...present].filter((k) => !saved.has(k));
  const notices = [
    `Your saved selection predates the desired-state model, where a checked box means "this should be on my machine" rather than "install this".`,
    wouldHaveBeenRemoved.length > 0
      ? `Read literally it would have proposed removing ${wouldHaveBeenRemoved.length} installed entr${
        wouldHaveBeenRemoved.length === 1 ? "y" : "ies"
      } you never asked to remove, so they have been kept checked instead. Uncheck anything you genuinely want gone.`
      : `Nothing installed was at risk, and your selection is unchanged.`,
  ];
  return { selection, notices, needsPersist: true };
}
