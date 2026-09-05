// Opens a URL in the user's browser.
//
// Injectable and non-throwing on purpose: this runs from a failure screen, and a report helper
// that crashes the app while reporting a crash would be a poor joke. Every failure path ends in
// "here is the URL, open it yourself", which always works — including over SSH, where there is no
// browser to open.

export type Spawn = (cmd: string, args: string[]) => Promise<{ success: boolean }>;

const defaultSpawn: Spawn = async (cmd, args) => {
  const { success } = await new Deno.Command(cmd, {
    args,
    stdin: "null",
    stdout: "null",
    stderr: "null",
  }).output();
  return { success };
};

/** The opener for each platform, in the order they should be tried. */
export function openerFor(os: string): Array<{ cmd: string; args: (url: string) => string[] }> {
  if (os === "darwin") return [{ cmd: "open", args: (u) => [u] }];
  if (os === "windows") {
    // `start` is a cmd builtin, not a program, so it has to go through cmd itself. The empty
    // string is cmd's window-title argument: without it, a quoted URL is taken *as* the title and
    // nothing opens.
    return [{ cmd: "cmd", args: (u) => ["/c", "start", "", u] }];
  }
  return [
    { cmd: "xdg-open", args: (u) => [u] },
    // Falls back for minimal desktops and WSL, where xdg-open is often absent or broken.
    { cmd: "wslview", args: (u) => [u] },
    { cmd: "sensible-browser", args: (u) => [u] },
  ];
}

/** True when the URL was handed to something that accepted it. Never throws. */
export async function openInBrowser(
  url: string,
  os: string = Deno.build.os,
  spawn: Spawn = defaultSpawn,
): Promise<boolean> {
  for (const opener of openerFor(os)) {
    try {
      const { success } = await spawn(opener.cmd, opener.args(url));
      if (success) return true;
    } catch {
      // Missing binary, or --allow-run withheld. Try the next, then give up quietly.
    }
  }
  return false;
}
