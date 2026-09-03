// Dev-only tool: render the app shell and look at it. Not part of the engine or a unit test —
// terminal rendering is integration/manual per this project's testing convention.
// Usage: deno run --allow-all scripts/inspect-tui.tsx

import { render } from "ink";
import { AppShell } from "../src/tui/App.tsx";

const { unmount, waitUntilExit } = render(<AppShell />);

// Exit automatically after a moment when not attached to a real interactive terminal (this
// sandbox), so the tool is scriptable; a real terminal run can Ctrl+C to exit sooner.
if (!Deno.stdin.isTerminal()) {
  setTimeout(() => unmount(), 500);
}

await waitUntilExit();
