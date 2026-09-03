import { assertEquals } from "@std/assert";
import {
  checkDiskSpace,
  checkInternetConnectivity,
  checkInternetConnectivityReal,
  runSystemRequirementChecks,
} from "./requirements.ts";

Deno.test("checkInternetConnectivity - reachable passes", () => {
  assertEquals(checkInternetConnectivity(true), { name: "internet", passed: true });
});

Deno.test("checkInternetConnectivity - unreachable fails with a specific reason", () => {
  const result = checkInternetConnectivity(false);
  assertEquals(result.passed, false);
  assertEquals(result.reason, "no internet connection detected");
});

Deno.test("checkDiskSpace - enough space passes", () => {
  assertEquals(checkDiskSpace(50), { name: "disk-space", passed: true });
});

Deno.test("checkDiskSpace - not enough space fails with a specific reason naming the shortfall", () => {
  const result = checkDiskSpace(3);
  assertEquals(result.passed, false);
  assertEquals(result.reason, "less than 10GB free (3.0GB available)");
});

Deno.test("checkDiskSpace - exactly at the minimum passes (not a strict inequality)", () => {
  assertEquals(checkDiskSpace(10).passed, true);
});

Deno.test("checkDiskSpace - a custom minimum is honored", () => {
  assertEquals(checkDiskSpace(3, 2).passed, true);
  assertEquals(checkDiskSpace(1, 2).passed, false);
});

Deno.test("runSystemRequirementChecks - each check is independent, both can fail at once with distinct reasons", () => {
  const results = runSystemRequirementChecks({ internetReachable: false, availableDiskGB: 1 });
  assertEquals(results.length, 2);
  assertEquals(results[0].passed, false);
  assertEquals(results[1].passed, false);
  assertEquals(results[0].reason !== results[1].reason, true);
});

Deno.test("runSystemRequirementChecks - all pass", () => {
  const results = runSystemRequirementChecks({ internetReachable: true, availableDiskGB: 100 });
  assertEquals(results.every((r) => r.passed), true);
});

Deno.test("checkInternetConnectivity - a denied network permission is not reported as being offline", () => {
  // Reported by the user: the tool said "no internet access" on a machine that plainly had it.
  // The cause was `deno task start` running without --allow-net, so every fetch was denied and
  // flattened into an offline verdict — a statement about their network that was simply false.
  const check = checkInternetConnectivity({
    reachable: false,
    reason: "network access is not permitted for this process — run with --allow-net",
  });
  assertEquals(check.passed, false);
  assertEquals(check.reason?.includes("--allow-net"), true);
  assertEquals(check.reason?.includes("no internet connection"), false);
});

Deno.test("checkInternetConnectivity - genuinely being offline still says so", () => {
  assertEquals(
    checkInternetConnectivity({ reachable: false }).reason,
    "no internet connection detected",
  );
  assertEquals(checkInternetConnectivity(false).reason, "no internet connection detected");
});

Deno.test("checkInternetConnectivity - a reachable probe passes either shape", () => {
  assertEquals(checkInternetConnectivity(true).passed, true);
  assertEquals(checkInternetConnectivity({ reachable: true }).passed, true);
});

Deno.test("checkInternetConnectivityReal - a denied permission reports the configuration, not the network", async () => {
  // Deno's actual error here is `NotCapable`, verified against a real run with net denied — not
  // `PermissionDenied`, which is what the first attempt guessed and which never matched.
  const notCapable = Object.assign(
    new Error('Requires net access to "example.com:443", run again with the --allow-net flag'),
    { name: "NotCapable" },
  );
  const denied = () => Promise.reject(notCapable);
  const probe = await checkInternetConnectivityReal("https://example.com", 1000, denied);
  assertEquals(probe.reachable, false);
  assertEquals(probe.reason?.includes("--allow-net"), true);
});

Deno.test("checkInternetConnectivityReal - a timeout says it timed out rather than claiming offline", async () => {
  const hang = () => Promise.reject(new DOMException("aborted", "AbortError"));
  const probe = await checkInternetConnectivityReal("https://example.com", 1234, hang);
  assertEquals(probe.reachable, false);
  assertEquals(probe.reason?.includes("1234ms"), true);
});

Deno.test("checkInternetConnectivityReal - a genuine network error is reported as being offline", async () => {
  const offline = () => Promise.reject(new TypeError("error sending request"));
  const probe = await checkInternetConnectivityReal("https://example.com", 1000, offline);
  assertEquals(probe, { reachable: false, reason: "no internet connection detected" });
});

Deno.test("checkInternetConnectivityReal - any response at all counts as reachable", async () => {
  const ok = () => Promise.resolve(new Response(null, { status: 500 }));
  assertEquals(await checkInternetConnectivityReal("https://example.com", 1000, ok), {
    reachable: true,
  });
});
