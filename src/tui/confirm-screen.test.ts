import { assertEquals } from "@std/assert";
import { classifyConfirmInput, createConfirmScreenController } from "./confirm-screen.ts";

Deno.test("classifyConfirmInput - Enter and 'y'/'Y' classify as confirm", () => {
  assertEquals(classifyConfirmInput("", { return: true }), "confirm");
  assertEquals(classifyConfirmInput("y", {}), "confirm");
  assertEquals(classifyConfirmInput("Y", {}), "confirm");
});

Deno.test("classifyConfirmInput - Escape and 'n'/'N' classify as cancel", () => {
  assertEquals(classifyConfirmInput("", { escape: true }), "cancel");
  assertEquals(classifyConfirmInput("n", {}), "cancel");
  assertEquals(classifyConfirmInput("N", {}), "cancel");
});

Deno.test("classifyConfirmInput - an arbitrary key is neither confirm nor cancel", () => {
  assertEquals(classifyConfirmInput("x", {}), undefined);
  assertEquals(classifyConfirmInput("q", {}), undefined);
});

Deno.test("confirm screen controller - only proceeds (calls the spy) after explicit confirmation input, not on an arbitrary key", () => {
  let confirmCalls = 0;
  const controller = createConfirmScreenController(() => confirmCalls++, () => {});

  controller.handleInput("x", {}); // arbitrary key first
  assertEquals(confirmCalls, 0);

  controller.handleInput("y", {});
  assertEquals(confirmCalls, 1);
});

Deno.test("confirm screen controller - cancel results in zero calls to the confirm spy (i.e. zero calls into the script runner)", () => {
  let confirmCalls = 0;
  let cancelCalls = 0;
  const controller = createConfirmScreenController(() => confirmCalls++, () => cancelCalls++);

  controller.handleInput("n", {});
  assertEquals(confirmCalls, 0);
  assertEquals(cancelCalls, 1);
});

Deno.test("confirm screen controller - once settled (confirmed), further input never fires the spy again", () => {
  let confirmCalls = 0;
  const controller = createConfirmScreenController(() => confirmCalls++, () => {});

  controller.handleInput("y", {});
  controller.handleInput("y", {});
  controller.handleInput("", { return: true });
  assertEquals(confirmCalls, 1);
});

Deno.test("confirm screen controller - once settled (cancelled), further input never fires confirm", () => {
  let confirmCalls = 0;
  let cancelCalls = 0;
  const controller = createConfirmScreenController(() => confirmCalls++, () => cancelCalls++);

  controller.handleInput("n", {});
  controller.handleInput("y", {}); // too late — already cancelled
  assertEquals(confirmCalls, 0);
  assertEquals(cancelCalls, 1);
});

Deno.test("confirm screen controller - Escape cancels the same as 'n'", () => {
  let cancelCalls = 0;
  const controller = createConfirmScreenController(() => {}, () => cancelCalls++);
  controller.handleInput("", { escape: true });
  assertEquals(cancelCalls, 1);
});
