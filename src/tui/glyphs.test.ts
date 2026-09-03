import { assert, assertEquals } from "@std/assert";
import {
  CATEGORY_ICONS,
  categoryIcon,
  CHECKBOX,
  CHECKBOX_WIDTH,
  DEFAULT_CATEGORY_ICON,
  isSafeTerminalEmoji,
  OUTCOME,
  PANE_ICONS,
  STATUS_EMOJI,
} from "./glyphs.ts";

Deno.test("isSafeTerminalEmoji - rejects every sequence form that terminals disagree about", () => {
  assert(!isSafeTerminalEmoji("👨‍💻"), "ZWJ sequences render as two emoji without ligature support");
  assert(!isSafeTerminalEmoji("🇧🇷"), "flags render as two regional-indicator boxes");
  assert(!isSafeTerminalEmoji("👍🏽"), "skin tones render as base plus swatch");
  assert(!isSafeTerminalEmoji("⚠️"), "VS16 on a narrow base is 1 column where layout reserves 2");
  assert(!isSafeTerminalEmoji("🛡️"), "same, on a shield");
});

Deno.test("isSafeTerminalEmoji - rejects narrow single characters that are not emoji at all", () => {
  // These are the glyphs the UI already uses for structure; they must not be mistaken for emoji.
  for (const glyph of ["✓", "✗", "│", "┃", "·", "↑", "⠹"]) {
    assert(!isSafeTerminalEmoji(glyph), `${glyph} is not a wide emoji`);
  }
});

Deno.test("isSafeTerminalEmoji - accepts single wide code points from the emoji planes", () => {
  for (const glyph of ["📦", "🔒", "🎮", "🔌", "🔐", "📐"]) {
    assert(isSafeTerminalEmoji(glyph), `${glyph} should be safe`);
  }
});

Deno.test("isSafeTerminalEmoji - accepts the older BMP emoji that need no variation selector", () => {
  for (const glyph of ["✅", "❌", "❓", "✨", "⏫", "⬜"]) {
    assert(isSafeTerminalEmoji(glyph), `${glyph} should be safe`);
  }
});

Deno.test("isSafeTerminalEmoji - the empty string is not a glyph", () => {
  assertEquals(isSafeTerminalEmoji(""), false);
});

Deno.test("every glyph the interface draws satisfies the safety rule", () => {
  // The point of centralising them: this cannot be forgotten when a new icon is added.
  const all = [
    ...Object.values(CATEGORY_ICONS),
    DEFAULT_CATEGORY_ICON,
    ...Object.values(CHECKBOX),
    ...Object.values(OUTCOME),
    ...Object.values(PANE_ICONS),
    ...Object.values(STATUS_EMOJI).filter((g) => g !== ""),
  ];
  for (const glyph of all) {
    assert(isSafeTerminalEmoji(glyph), `${glyph} would break fixed-width layout`);
  }
});

Deno.test("every checkbox state is the same width, so rows cannot ripple as you select", () => {
  const widths = new Set(Object.values(CHECKBOX).map((g) => [...g].length));
  assertEquals(widths.size, 1, "checkbox states differ in code-point count");
  assertEquals(CHECKBOX_WIDTH, 2);
});

Deno.test("categoryIcon - falls back for a category an overlay repo invented", () => {
  assertEquals(categoryIcon("browsers"), "🌐");
  assertEquals(categoryIcon("something-nobody-anticipated"), DEFAULT_CATEGORY_ICON);
});

Deno.test("isSafeTerminalEmoji - rejects emoji newer than Unicode 9, however well-formed", () => {
  // These are all single wide code points and pass every other part of the rule, but a font
  // without the glyph substitutes one of a different width while the layout still reserves two
  // columns — which is what put the privacy row a character out of alignment.
  for (const glyph of ["🥷", "🧊", "🧰", "🟨", "🪟", "🩹"]) {
    assert(!isSafeTerminalEmoji(glyph), `${glyph} is too new to rely on`);
  }
});

Deno.test("isSafeTerminalEmoji - still accepts the long-established emoji", () => {
  for (const glyph of ["📐", "🔐", "🔌", "🔶", "📚", "📋", "🎮", "🔧"]) {
    assert(isSafeTerminalEmoji(glyph), `${glyph} should be safe`);
  }
});
