# Troubleshooting

Every item here is a failure that has actually happened, not a hypothetical.

## The terminal is full of garbage, beeps when I move the mouse, and ignores Ctrl+C

Run `reset`. It restores the terminal.

This happens when the process is killed from outside (`kill`, a closed SSH session, a crash) while
the interface holds the terminal in raw mode. Signal handlers do not fire in that state — measured,
not assumed — so the tool cannot restore the terminal on the way out. Ctrl+C is unaffected, because
that is read from stdin rather than delivered as a signal.

## It asked for my password and then said nothing was installed

The plan needed elevated access and the `sudo` prompt was declined or timed out. The tool treats
that as "do nothing" rather than running a half-privileged plan. Re-run and enter the password, or
uncheck the entries marked `requires sudo`.

## It says there is no internet, but there obviously is

Fixed as of 2026-09-02. The cause was not your network: `deno task start` ran without Deno's
`--allow-net` permission, so the connectivity probe's request was refused by the runtime and the
result was reported as "no internet connection detected" — a statement about your machine that was
simply untrue. The task now grants the permission, and a refused request says so explicitly
instead of blaming the network.

If you launch the tool with your own `deno run` command rather than `deno task start`, include
`--allow-net`.

## Every flatpak app fails with "No remote chosen to resolve matches for …"

Fixed as of 2026-09-03, and the message is misleading: it does not mean *no* remote, it means
**more than one**. Flathub is commonly configured in two installations at once — Zorin OS ships a
system-wide flathub alongside the per-user one — and an unscoped `flatpak install` then has no way
to choose. Interactively flatpak asks; under `--noninteractive` it gives up with that error.

Every flatpak command in the catalog now names its installation explicitly, so there is nothing to
resolve. You can see the difference yourself:

```bash
flatpak remote-info --cached flathub org.gimp.GIMP           # Remote 'flathub' found in multiple installations
flatpak remote-info --system --cached flathub org.gimp.GIMP  # works
```

Installs go to the per-user installation (`--user`), which needs no root and cannot collide with
what your distribution ships system-wide. Removal looks for the app in both and uninstalls from
whichever actually has it.

## An entry says "flatpak is not installed"

Install flatpak and add the Flathub remote:

```bash
sudo apt install flatpak
sudo flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
```

This affects AppImage entries too — those install through Gear Lever, which is itself a flatpak.
The notices screen (`n`) warns at startup when a package manager the catalog needs is missing.

## An install failed, but the box is still checked

Intentional. The checkbox means "this should be on my machine", and a failed attempt does not
change that — unchecking it would mean "I no longer want this", and the next run would then plan to
*remove* it, which is the opposite of what you want.

What the failure does change: the entry shows a red ✗ instead of a ✓, it appears on the notices
screen (`n`) as "last run failed", and it is recorded in history (`h`) with the script's actual
error. Pressing Enter again retries it.

## An entry failed. What now?

Press `n` for notices and `h` for history — the failure is recorded with the script's actual error
output, not a generic message. A failed entry never blocks the others in the same run.

Because every operation is an ordinary script, you can run the failing one by hand and see
everything it does:

```bash
bash catalog/dev-tools/install/git/linux/install.sh
bash catalog/dev-tools/install/git/linux/detect.sh; echo $?   # 0 installed · 1 missing · 2 update
```

## An entry says it succeeded but reports "declined — left installed"

Working as intended, and the removal genuinely did not happen. Removing that package would have
taken unrelated software with it, so the script declined and exited with code `3` ("declined,
nothing changed") rather than pretending to have removed it. The run counts it as a success
because refusing was the correct outcome, and the yellow `!` line is there so you do not walk away
believing the software is gone.

## An entry says "reported success but the entry is still not present afterwards"

Every action is verified by re-running that entry's `detect.sh` once it finishes, because a script
exiting `0` only means it *ran* — an installer can print a warning, skip the real work and still
exit clean. This message means the script claimed success and the machine disagrees.

Run the two scripts by hand to see which is wrong:

```bash
bash catalog/<category>/<kind>/<id>/linux/install.sh
bash catalog/<category>/<kind>/<id>/linux/detect.sh; echo $?   # 0 installed · 1 missing · 2 update
```

Either the installer is silently failing, or that entry's `detect.sh` is looking for the wrong
thing. Both are bugs worth reporting.

## Something says "Skipping removal … apt would also remove"

Working as intended. Removing that package would have taken unrelated software with it — on a real
machine, removing `curl` also removes Steam — so the tool declined rather than doing it quietly.
The message lists exactly what would have gone. Remove those explicitly first if you genuinely
want that.

## It wants to remove something I never asked it to touch

The checkbox means *desired state*: unchecked and present means "remove this". Anything unchecked
that is installed will be planned for removal.

If a run proposes removals you did not intend, cancel at the confirm screen — nothing has run yet
— and check the entry. This can happen when software was installed outside the tool after your
selection was saved; the notices screen reports that as a disagreement between the saved selection
and the live machine.

## "could not read config"

The config file exists but could not be read (permissions, or a corrupt/partially-written file).
The tool deliberately does **not** carry on with an empty selection, because it would then save
that empty selection over your real one and the next run would propose removing everything.

Fix the permissions, or move the file aside to start fresh:

```bash
mv ~/.config/autoinstall/config.toml ~/.config/autoinstall/config.toml.bak
```

Selections are also exportable with `e` and importable with `i`, which is the safer way to move a
setup between machines.

## An install hangs

Actions are bounded at 30 minutes, detects at 60 seconds, after which they are killed and reported
as timed out. If something appears stuck before then it is genuinely still working — large
downloads (LibreOffice, an IDE) legitimately take minutes.

A script that survived a timeout kill can leave an orphaned process behind; the tool reports the
timeout rather than waiting on it. `ps` and `kill` it if it is still running.

## Nothing happens when I press Enter

Either nothing is selected that needs an action — everything checked is already installed and
everything unchecked is already absent — or the search field still has focus. Press `Esc` to leave
the search field first. The status line says which.

## macOS or Windows behaves differently from the docs

Entries for those platforms are verified against package registries and vendor documentation, but
**have not been executed** on a real machine. Treat them with more caution than Linux entries, and
please report what happened — that is exactly the gap the cross-OS CI workflow exists to close.
