// Terminal restoration — the one thing that must never be skipped on the way out.
//
// This project has already shipped a terminal-wrecking bug once: a crash while Ink held stdin in
// raw mode left the screen full of garbage, beeping on mouse movement, and unresponsive to Ctrl+C,
// because Ink's own cleanup never ran. Everything here is deliberately dependency-free and
// synchronous so it can run from an error handler or at process exit without needing the React
// tree, the event loop, or anything else to still be healthy.

/** The four SGR mouse tracking modes @ink-tools/ink-mouse's MouseProvider enables unconditionally
 * (click, drag, any-motion, extended coordinates). The library exposes no API to scope or disable
 * them — confirmed by reading its compiled source — so they are toggled directly. */
const MOUSE_TRACKING_MODES = ["1000", "1002", "1003", "1006"];

const SHOW_CURSOR = "\x1b[?25h";
const ENTER_ALT_SCREEN = "\x1b[?1049h";
const EXIT_ALT_SCREEN = "\x1b[?1049l";

function write(sequence: string): void {
  try {
    Deno.stdout.writeSync(new TextEncoder().encode(sequence));
  } catch {
    // stdout may not be a terminal (piped output), or may already be closed during shutdown —
    // failing to restore a terminal that isn't there is not an error worth propagating.
  }
}

/**
 * Switches to the alternate screen buffer, so the interface draws on a scratch screen and quitting
 * restores whatever the terminal showed beforehand — the behaviour of every full-screen terminal
 * program (vim, htop, less).
 *
 * This used to be missing while `restoreTerminal` still *exited* the alternate screen, an asymmetry
 * that did nothing on the way in and left the entire interface printed in the scrollback on the way
 * out. Reported by the user: "when I quit, the interface left-over is still visible."
 */
export function enterAltScreen(): void {
  write(ENTER_ALT_SCREEN);
}

/** Turns mouse reporting on or off. Off is also what makes a sudo password prompt safe: with
 * tracking left on, moving the mouse injects escape sequences straight into the prompt. */
export function setMouseTracking(enabled: boolean): void {
  const suffix = enabled ? "h" : "l";
  write(MOUSE_TRACKING_MODES.map((m) => `\x1b[?${m}${suffix}`).join(""));
}

/**
 * Puts the terminal back into a usable state: mouse reporting off, cursor visible, alternate
 * screen exited. Safe to call more than once, and safe to call when nothing needs restoring.
 *
 * Known limitation, measured rather than assumed: this cannot be driven from a signal handler
 * while Ink holds raw mode. `Deno.addSignalListener("SIGTERM", ...)` fires normally in a plain
 * script but never fires once Ink has enabled raw mode — the same interaction that stops SIGWINCH
 * from working (see App.tsx's resize polling). So an external `kill` still leaves the terminal
 * dirty; `reset` fixes it. Ctrl+C is unaffected, because Ink reads it from stdin itself rather
 * than relying on a signal.
 */
export function restoreTerminal(): void {
  setMouseTracking(false);
  write(SHOW_CURSOR);
  write(EXIT_ALT_SCREEN);
}
