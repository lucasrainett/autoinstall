// Shared keyboard/mouse input handling — TASKS.md §2. Pure and generic on purpose: this replaces
// the ad-hoc if/else key-handling chain that was duplicated locally in CheckboxList.tsx (see its
// history) with one tested mapping every interactive screen can share.

import type { PaneRect } from "./layout.ts";

export type InputAction =
  | "moveUp"
  | "moveDown"
  | "toggleSelect"
  | "selectAll"
  | "confirm"
  | "cancel"
  | "backspace"
  | "quit";

export interface KeyEvent {
  /** The typed character, or "" for a special key (arrows, enter, escape, backspace). */
  input: string;
  upArrow?: boolean;
  downArrow?: boolean;
  return?: boolean;
  escape?: boolean;
  backspace?: boolean;
  delete?: boolean;
  ctrl?: boolean;
  meta?: boolean;
}

export interface ResolveKeyActionOptions {
  /** Enables the single-character list bindings (space→toggleSelect, a→selectAll,
   * a→selectAll). Off by default: a plain text-entry screen (profile name/URL input) needs
   * those characters typeable, so it must opt in explicitly rather than have them silently
   * swallowed. A checkbox-style list passes true. */
  listActions?: boolean;
}

/** Returns undefined for anything not explicitly bound. With `listActions` off (the default),
 * only the universal, never-a-literal-character bindings apply (arrows/enter/escape/backspace/
 * ctrl+c) — safe for any free-text input field, since nothing here consumes a printable
 * character a caller might want typed. */
export function resolveKeyAction(
  event: KeyEvent,
  options: ResolveKeyActionOptions = {},
): InputAction | undefined {
  if (event.upArrow) return "moveUp";
  if (event.downArrow) return "moveDown";
  if (event.escape) return "cancel";
  if (event.return) return "confirm";
  if (event.backspace || event.delete) return "backspace";
  if (event.ctrl && event.input.toLowerCase() === "c") return "quit";
  if (options.listActions && !event.ctrl && !event.meta) {
    if (event.input === " ") return "toggleSelect";
    if (event.input === "a") return "selectAll";
  }
  return undefined;
}

export interface ClickPoint {
  x: number;
  y: number;
}

export interface ClickToIndexOptions {
  /** Accounts for a scrolled list — added to the in-pane row before returning. Default 0. */
  scrollOffset?: number;
  /** Non-item rows at the top of the pane (e.g. a search box) that never map to a list index.
   * A click landing on one of these returns undefined rather than a bogus negative index. Default 0. */
  headerRows?: number;
}

/** Maps a click point to a list index, or undefined if the click landed outside the pane or on a
 * header row. Deliberately generic over `PaneRect` (layout.ts) rather than any specific screen's
 * rendering details — a screen with category-header rows interspersed among items needs its own
 * further mapping from "row within the pane" to "which item", this only gets you that far. */
export function mouseClickToListIndex(
  click: ClickPoint,
  pane: PaneRect,
  options: ClickToIndexOptions = {},
): number | undefined {
  const { scrollOffset = 0, headerRows = 0 } = options;

  if (click.x < pane.x || click.x >= pane.x + pane.width) return undefined;
  if (click.y < pane.y || click.y >= pane.y + pane.height) return undefined;

  const rowWithinPane = click.y - pane.y - headerRows;
  if (rowWithinPane < 0) return undefined;

  return rowWithinPane + scrollOffset;
}
