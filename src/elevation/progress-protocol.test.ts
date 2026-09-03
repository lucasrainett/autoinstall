import { assertEquals } from "@std/assert";
import {
  parseProgressMessage,
  parseProgressStream,
  type ProgressMessage,
  serializeProgressMessage,
} from "./progress-protocol.ts";

Deno.test("serializeProgressMessage / parseProgressMessage - round-trips exactly", () => {
  const msg: ProgressMessage = { entryId: "communication/install/signal", status: "success" };
  const parsed = parseProgressMessage(serializeProgressMessage(msg).trim());
  assertEquals(parsed, msg);
});

Deno.test("serializeProgressMessage / parseProgressMessage - round-trips with a message field", () => {
  const msg: ProgressMessage = {
    entryId: "communication/install/signal",
    status: "failed",
    message: "winget exited with code 1",
  };
  const parsed = parseProgressMessage(serializeProgressMessage(msg).trim());
  assertEquals(parsed, msg);
});

Deno.test("parseProgressMessage - rejects non-JSON, missing fields, and invalid status, without throwing", () => {
  assertEquals(parseProgressMessage("not json at all"), null);
  assertEquals(parseProgressMessage("{}"), null);
  assertEquals(parseProgressMessage(JSON.stringify({ entryId: "x" })), null);
  assertEquals(
    parseProgressMessage(JSON.stringify({ entryId: "x", status: "not-a-status" })),
    null,
  );
  assertEquals(
    parseProgressMessage(JSON.stringify({ entryId: "x", status: "running", message: 5 })),
    null,
  );
  assertEquals(parseProgressMessage("null"), null);
  assertEquals(parseProgressMessage("42"), null);
});

Deno.test("parseProgressStream - parses every well-formed line, skipping blanks and malformed ones", () => {
  const chunk = [
    serializeProgressMessage({ entryId: "a", status: "running" }).trim(),
    "",
    "garbage",
    serializeProgressMessage({ entryId: "b", status: "success" }).trim(),
  ].join("\n");

  assertEquals(parseProgressStream(chunk), [
    { entryId: "a", status: "running" },
    { entryId: "b", status: "success" },
  ]);
});
