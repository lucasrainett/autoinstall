import { assertEquals } from "@std/assert";
import { parseProfilePickerInput } from "./profile-picker.ts";

Deno.test("parseProfilePickerInput - a plain word is a name", () => {
  assertEquals(parseProfilePickerInput("developer"), { kind: "name", name: "developer" });
});

Deno.test("parseProfilePickerInput - an http:// URL is a url", () => {
  assertEquals(parseProfilePickerInput("http://example.com/profile.toml"), {
    kind: "url",
    url: "http://example.com/profile.toml",
  });
});

Deno.test("parseProfilePickerInput - an https:// URL is a url", () => {
  assertEquals(parseProfilePickerInput("https://example.com/profile.toml"), {
    kind: "url",
    url: "https://example.com/profile.toml",
  });
});

Deno.test("parseProfilePickerInput - is case-insensitive on the scheme", () => {
  assertEquals(parseProfilePickerInput("HTTPS://example.com/profile.toml").kind, "url");
});

Deno.test("parseProfilePickerInput - trims surrounding whitespace before classifying", () => {
  assertEquals(parseProfilePickerInput("  developer  "), { kind: "name", name: "developer" });
  assertEquals(parseProfilePickerInput("  https://example.com/x.toml  "), {
    kind: "url",
    url: "https://example.com/x.toml",
  });
});

Deno.test("parseProfilePickerInput - a name that superficially resembles a URL, but has no scheme, is still a name", () => {
  assertEquals(parseProfilePickerInput("https-setup").kind, "name");
  assertEquals(parseProfilePickerInput("example.com").kind, "name");
  assertEquals(parseProfilePickerInput("http-tools").kind, "name");
  assertEquals(parseProfilePickerInput("www.example.com/profile.toml").kind, "name");
});

Deno.test("parseProfilePickerInput - a scheme prefix with nothing else is still classified as a url (validity is a separate concern)", () => {
  assertEquals(parseProfilePickerInput("https://").kind, "url");
});

Deno.test("parseProfilePickerInput - an empty input is a name (an empty one)", () => {
  assertEquals(parseProfilePickerInput(""), { kind: "name", name: "" });
  assertEquals(parseProfilePickerInput("   "), { kind: "name", name: "" });
});
