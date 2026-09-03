import { assertEquals } from "@std/assert";
import { mouseClickToListIndex, resolveKeyAction } from "./input.ts";
import type { PaneRect } from "./layout.ts";

function key(
  overrides: Partial<Parameters<typeof resolveKeyAction>[0]>,
  options?: Parameters<typeof resolveKeyAction>[1],
) {
  return resolveKeyAction({ input: "", ...overrides }, options);
}

Deno.test("resolveKeyAction - arrow keys route to move actions", () => {
  assertEquals(key({ upArrow: true }), "moveUp");
  assertEquals(key({ downArrow: true }), "moveDown");
});

Deno.test("resolveKeyAction - escape routes to cancel, return routes to confirm", () => {
  assertEquals(key({ escape: true }), "cancel");
  assertEquals(key({ return: true }), "confirm");
});

Deno.test("resolveKeyAction - backspace and delete both route to backspace", () => {
  assertEquals(key({ backspace: true }), "backspace");
  assertEquals(key({ delete: true }), "backspace");
});

Deno.test("resolveKeyAction - ctrl+c routes to quit regardless of case", () => {
  assertEquals(key({ input: "c", ctrl: true }), "quit");
  assertEquals(key({ input: "C", ctrl: true }), "quit");
});

Deno.test("resolveKeyAction - universal bindings apply even without listActions (safe for text entry)", () => {
  assertEquals(key({ upArrow: true }, { listActions: false }), "moveUp");
  assertEquals(key({ return: true }, { listActions: false }), "confirm");
  assertEquals(key({ escape: true }, { listActions: false }), "cancel");
});

Deno.test("resolveKeyAction - without listActions, space/a/N are left unbound for literal text entry", () => {
  assertEquals(key({ input: " " }), undefined);
  assertEquals(key({ input: "a" }), undefined);
  assertEquals(key({ input: "N" }), undefined);
});

Deno.test("resolveKeyAction - with listActions, space toggles and 'a' selects all", () => {
  assertEquals(resolveKeyAction({ input: " " }, { listActions: true }), "toggleSelect");
  assertEquals(resolveKeyAction({ input: "a" }, { listActions: true }), "selectAll");
});

Deno.test("resolveKeyAction - there is deliberately no deselect-all binding", () => {
  // Removed when the checkbox came to mean desired state rather than a queued action: one
  // keystroke clearing every visible box would queue the removal of everything on screen.
  // "N" must now fall through as ordinary input rather than resolving to an action.
  assertEquals(resolveKeyAction({ input: "N" }, { listActions: true }), undefined);
});

Deno.test("resolveKeyAction - with listActions, lowercase 'n' is still left unbound for search text", () => {
  assertEquals(key({ input: "n" }, { listActions: true }), undefined);
});

Deno.test("resolveKeyAction - with listActions, ctrl or meta combos with bound letters are not hijacked", () => {
  assertEquals(key({ input: "a", ctrl: true }, { listActions: true }), undefined);
  assertEquals(key({ input: "a", meta: true }, { listActions: true }), undefined);
});

Deno.test("resolveKeyAction - an ordinary printable character is unbound (falls through to text entry)", () => {
  assertEquals(key({ input: "s" }, { listActions: true }), undefined);
  assertEquals(key({ input: "5" }, { listActions: true }), undefined);
});

const PANE: PaneRect = { x: 10, y: 5, width: 20, height: 8 };

Deno.test("mouseClickToListIndex - a click inside the pane maps to a zero-based row index", () => {
  assertEquals(mouseClickToListIndex({ x: 12, y: 5 }, PANE), 0);
  assertEquals(mouseClickToListIndex({ x: 12, y: 8 }, PANE), 3);
});

Deno.test("mouseClickToListIndex - clicks outside the pane's bounds return undefined", () => {
  assertEquals(mouseClickToListIndex({ x: 9, y: 5 }, PANE), undefined); // left of pane
  assertEquals(mouseClickToListIndex({ x: 30, y: 5 }, PANE), undefined); // right of pane (x==x+width)
  assertEquals(mouseClickToListIndex({ x: 12, y: 4 }, PANE), undefined); // above pane
  assertEquals(mouseClickToListIndex({ x: 12, y: 13 }, PANE), undefined); // below pane (y==y+height)
});

Deno.test("mouseClickToListIndex - scrollOffset shifts the resulting index", () => {
  assertEquals(mouseClickToListIndex({ x: 12, y: 5 }, PANE, { scrollOffset: 7 }), 7);
});

Deno.test("mouseClickToListIndex - headerRows are excluded from the index and swallow clicks landing on them", () => {
  assertEquals(mouseClickToListIndex({ x: 12, y: 5 }, PANE, { headerRows: 2 }), undefined); // on header row 0
  assertEquals(mouseClickToListIndex({ x: 12, y: 6 }, PANE, { headerRows: 2 }), undefined); // on header row 1
  assertEquals(mouseClickToListIndex({ x: 12, y: 7 }, PANE, { headerRows: 2 }), 0); // first real item row
});

Deno.test("mouseClickToListIndex - headerRows and scrollOffset combine", () => {
  assertEquals(mouseClickToListIndex({ x: 12, y: 9 }, PANE, { headerRows: 2, scrollOffset: 5 }), 7);
});
