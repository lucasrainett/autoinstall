// Plan/review screen — TASKS.md §2. Renders src/plan/render.ts's output and gates proceeding on
// src/tui/confirm-screen.ts's controller — that module is what's actually unit-tested; this file
// is integration/manual, per this project's convention.
//
// The plan is *windowed*, not printed whole. Reported by the user: a long list of pending actions
// broke the layout. It was worse than cosmetic — the pane has no height limit of its own, so a
// plan taller than the terminal pushed the rest of the interface off screen and silently hid
// actions the user was being asked to approve. Since "you see everything before it runs" is the
// core safety promise (PROJECT_DEFINITION.md §14), a plan that cannot be read in full is a safety
// defect, so this screen clips to the space it has and makes the remainder reachable.

import { useInput } from "ink";
import { Box, Text } from "ink";
import { useMemo, useRef, useState } from "react";
import { renderPlan, type UntrustedSource } from "../plan/render.ts";
import { createConfirmScreenController } from "./confirm-screen.ts";
import { scrollbarColumn } from "./scrollbar.ts";
import { clampPlanScroll, planViewport } from "./plan-viewport.ts";
import type { Plan } from "../plan/compute.ts";
import type { CatalogEntry } from "../catalog/types.ts";

export interface PlanReviewScreenProps {
  plan: Plan;
  catalog: readonly CatalogEntry[];
  untrustedSources?: readonly UntrustedSource[];
  /** Content rows this screen may occupy, excluding its host pane's border. */
  availableRows?: number;
  /**
   * Whether this is the live preview (browse) or the actual confirm gate.
   *
   * The pane is on screen the whole time so the plan is always visible, which means the component
   * is mounted the whole time too — and an always-mounted `useInput` would swallow the list's own
   * keys. Input is registered only while confirming, and the y/N prompt only appears then.
   */
  confirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PlanReviewScreen(
  {
    plan,
    catalog,
    untrustedSources = [],
    availableRows = 20,
    confirming = true,
    onConfirm,
    onCancel,
  }: PlanReviewScreenProps,
) {
  const [decision, setDecision] = useState<"pending" | "confirmed" | "cancelled">("pending");
  const [scroll, setScroll] = useState(0);

  const lines = useMemo(
    () => renderPlan(plan, catalog, untrustedSources).split("\n"),
    [plan, catalog, untrustedSources],
  );

  const view = planViewport(lines.length, availableRows);
  const offset = clampPlanScroll(scroll, lines.length, view.contentRows);
  const windowed = lines.slice(offset, offset + view.contentRows);

  // Latest callbacks live in refs so the controller (created once, below) never calls a stale
  // closure even if the parent re-renders this screen with new onConfirm/onCancel references.
  const onConfirmRef = useRef(onConfirm);
  const onCancelRef = useRef(onCancel);
  onConfirmRef.current = onConfirm;
  onCancelRef.current = onCancel;

  // Created once per mount, not per render — this is what makes "settle once, ignore everything
  // after" actually hold across the component's re-renders, not just within a single call.
  const controller = useMemo(
    () =>
      createConfirmScreenController(
        () => {
          setDecision("confirmed");
          onConfirmRef.current();
        },
        () => {
          setDecision("cancelled");
          onCancelRef.current();
        },
      ),
    [],
  );

  useInput((input, key) => {
    if (!confirming) return;
    if (decision !== "pending") return;

    // Scrolling is handled before the controller sees the key. Safe by construction: the
    // controller classifies only Enter/y/Escape/n and ignores everything else, so an arrow key
    // could never have confirmed or cancelled — and now it cannot reach the controller at all.
    if (view.scrollable) {
      if (key.upArrow) return setScroll(offset - 1);
      if (key.downArrow) return setScroll(offset + 1);
      if (key.pageUp) return setScroll(offset - view.contentRows);
      if (key.pageDown) return setScroll(offset + view.contentRows);
    }

    controller.handleInput(input, key);
    // Ink only delivers keys to this hook while it is active, so during browse the list keeps
    // every binding it has — including Enter, which is what opens this gate in the first place.
  }, { isActive: confirming });

  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Box flexDirection="column" flexGrow={1}>
          {windowed.map((line, i) => <Text key={offset + i} wrap="truncate">{line}</Text>)}
        </Box>
        {view.scrollable
          ? (
            <Box flexDirection="column">
              {scrollbarColumn(lines.length, view.contentRows, offset, windowed.length).map(
                (char: string, i: number) => (
                  <Text key={i} dimColor={char !== "┃"} color={char === "┃" ? "cyan" : undefined}>
                    {char}
                  </Text>
                ),
              )}
            </Box>
          )
          : null}
      </Box>
      {view.scrollable && (
        <Text dimColor>
          {`showing ${offset + 1}–${offset + windowed.length} of ${lines.length} · ↑↓ PgUp/PgDn`}
        </Text>
      )}
      <Box marginTop={view.scrollable ? 0 : 1}>
        {!confirming && (
          <Text dimColor>
            {plan.actions.length === 0 ? "nothing to apply" : "press Enter to review and apply"}
          </Text>
        )}
        {confirming && decision === "pending" && <Text>Proceed? [y/N]</Text>}
        {confirming && decision === "confirmed" && (
          <Text color="green">Confirmed — applying plan...</Text>
        )}
        {confirming && decision === "cancelled" && (
          <Text color="red">Cancelled — no changes made.</Text>
        )}
      </Box>
    </Box>
  );
}
