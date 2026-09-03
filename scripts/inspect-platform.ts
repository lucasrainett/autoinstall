// Dev-only tool: run the real platform-detection wrappers against this machine and print the result.
// Usage: deno run --allow-read --allow-run scripts/inspect-platform.ts

import { detectCurrentOS } from "../src/platform/os.ts";
import { detectAvailablePackageManagers } from "../src/platform/package-managers.ts";
import { detectWsl } from "../src/platform/wsl.ts";

console.log("OS:", await detectCurrentOS());
console.log("Package managers:", await detectAvailablePackageManagers());
if (Deno.build.os === "windows") {
  console.log("WSL:", await detectWsl());
} else {
  console.log("WSL: skipped (only relevant on Windows)");
}
