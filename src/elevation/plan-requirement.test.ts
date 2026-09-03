import { assertEquals } from "@std/assert";
import { planRequiresElevation } from "./plan-requirement.ts";

Deno.test("planRequiresElevation - zero elevation-flagged actions means no prompt is ever needed", () => {
  assertEquals(
    planRequiresElevation([{ requiresElevation: false }, { requiresElevation: false }]),
    false,
  );
});

Deno.test("planRequiresElevation - an empty plan needs no elevation", () => {
  assertEquals(planRequiresElevation([]), false);
});

Deno.test("planRequiresElevation - a single elevation-flagged action is enough to require it", () => {
  assertEquals(
    planRequiresElevation([{ requiresElevation: false }, { requiresElevation: true }]),
    true,
  );
});
