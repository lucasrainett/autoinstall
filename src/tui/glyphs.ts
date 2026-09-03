// Every non-ASCII glyph the interface draws, in one place, so the safety rule below can be
// enforced mechanically instead of remembered.
//
// The rule exists because emoji width is where terminal UIs break. Ink lays out with
// `string-width`, which reports 2 columns for an emoji; if the terminal disagrees, the row is
// wider than the layout believes and wraps. In this app that is not cosmetic — the list draws
// exactly one screen row per entry and the viewport math counts on it, so a wrapped row makes the
// pane render more lines than it has, which is the same class of bug that once pushed the whole
// interface off screen.
//
// Terminals disagree specifically about *sequences*:
//   - ZWJ sequences (👨‍💻) render as two emoji when the ligature is unsupported — 4 columns, not 2.
//   - Regional-indicator flags (🇧🇷) render as two letter boxes for the same reason.
//   - Skin-tone modifiers (👍🏽) render as base + swatch.
//   - Variation-selector emoji (⚠️) sit on a *narrow* base character, so a terminal ignoring
//     VS16 draws 1 column where the layout reserved 2.
// A single code point that is East-Asian Wide has none of those failure modes: the layout says 2
// and every terminal draws 2. That is the whole rule.

/**
 * Code points that are a single character, East-Asian Wide, and emoji-presentation by default.
 *
 * The two ranges are the emoji planes proper; the explicit list covers the handful of older BMP
 * symbols that are nonetheless `Emoji_Presentation=Yes` (so they need no VS16) and Wide. Anything
 * outside this is rejected rather than trusted — being conservative costs a nicer glyph, while
 * being wrong costs a broken layout.
 */
const SAFE_BMP_EMOJI = new Set([
  0x231A,
  0x231B,
  0x23E9,
  0x23EA,
  0x23EB,
  0x23EC,
  0x23F0,
  0x23F3,
  0x25FD,
  0x25FE,
  0x2614,
  0x2615,
  0x2648,
  0x2649,
  0x264A,
  0x264B,
  0x264C,
  0x264D,
  0x264E,
  0x264F,
  0x2650,
  0x2651,
  0x2652,
  0x2653,
  0x267F,
  0x2693,
  0x26A1,
  0x26AA,
  0x26AB,
  0x26BD,
  0x26BE,
  0x26C4,
  0x26C5,
  0x26CE,
  0x26D4,
  0x26EA,
  0x26F2,
  0x26F3,
  0x26F5,
  0x26FA,
  0x26FD,
  0x2705,
  0x270A,
  0x270B,
  0x2728,
  0x274C,
  0x274E,
  0x2753,
  0x2754,
  0x2755,
  0x2757,
  0x2795,
  0x2796,
  0x2797,
  0x27B0,
  0x27BF,
  0x2B1B,
  0x2B1C,
  0x2B50,
  0x2B55,
]);

/** True when a glyph is safe to draw in a fixed-width layout — see the rule at the top. */
export function isSafeTerminalEmoji(glyph: string): boolean {
  const points = [...glyph];
  if (points.length !== 1) return false; // ZWJ, flags, skin tones, VS16 all fail here
  const code = points[0].codePointAt(0);
  if (code === undefined) return false;
  if (SAFE_BMP_EMOJI.has(code)) return true;
  // Deliberately stops at U+1F6FF rather than covering the whole emoji planes. Everything above
  // that is Unicode 10 or newer (U+1F900+ is 2017 onwards), and a font without the glyph
  // substitutes something of a different width — the layout still reserves two columns, so the
  // row silently shifts. Reported by the user: the privacy row was a character out of alignment,
  // and its icon was 🥷 (U+1F977, Unicode 13). Width-correctness here depends on the *font*, not
  // just the code point, so the rule only admits emoji old enough to be everywhere.
  //
  // The cutoff is a range rather than a per-code-point table, so it is conservative in both
  // directions: it also rejects a handful of genuinely old emoji that happen to live in the
  // U+1F900 block (🤖 is Unicode 8). That costs nothing but a different icon choice, whereas the
  // opposite error costs a misaligned row on someone else's machine.
  return code >= 0x1F300 && code <= 0x1F6FF;
}

/** One icon per catalog category. Purely decorative — the category name is still spelled out. */
export const CATEGORY_ICONS: Readonly<Record<string, string>> = {
  "3d-printing": "📐",
  ai: "🔮",
  browsers: "🌐",
  communication: "💬",
  creative: "🎨",
  "dev-tools": "🔧",
  gaming: "🎮",
  media: "🎬",
  privacy: "🔐",
  productivity: "📄",
  "quality-of-life": "✨",
  security: "🔒",
  "system-utilities": "🔌",
};

/** Categories come from directory names, so an overlay repo can introduce one we have no icon for. */
export const DEFAULT_CATEGORY_ICON = "📁";

export function categoryIcon(category: string): string {
  return CATEGORY_ICONS[category] ?? DEFAULT_CATEGORY_ICON;
}

/**
 * Checkbox states. Every one is exactly two columns, so rows stay aligned whichever is drawn —
 * a set where one state was a different width would make the list ripple as you selected things.
 */
export const CHECKBOX = {
  checked: "✅",
  unchecked: "⬜",
  /** Some of a category selected, but not all. */
  partial: "🔶",
} as const;

/** Columns a checkbox occupies. Mouse hit-testing depends on this matching what is drawn. */
export const CHECKBOX_WIDTH = 2;

/**
 * Status markers. There is deliberately no "installed" glyph: that is derivable from the checkbox
 * plus bold (see CheckboxList), and drawing it restated what the row already said.
 */
export const STATUS_EMOJI = {
  satisfied: "",
  "needs-update": "⏫",
  failed: "❌",
  unknown: "❓",
  unsatisfied: "",
} as const;

/**
 * Outcome markers shared by the progress view, the run summary, the history screen and the
 * pre-flight list, so one run reads the same way wherever you look at it.
 *
 * `pending` and `running` stay as plain narrow characters on purpose: they sit in a column of
 * their own next to wide markers, and a run in progress should not make every row jump sideways
 * as each entry finishes.
 */
export const OUTCOME = {
  success: "✅",
  failed: "❌",
  skipped: "⏩",
  warning: "❗",
} as const;

/** Icons for the pane titles. Decorative — every title is still spelled out in words. */
export const PANE_ICONS = {
  catalog: "📚",
  details: "📋",
  status: "⚡",
  help: "❓",
  history: "🕘",
  profiles: "🎁",
  notices: "🔔",
  plan: "📋",
  progress: "🔩",
  done: "🏁",
} as const;
