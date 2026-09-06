import { assertEquals } from "@std/assert";
import { capabilityCategory, categoriesFor } from "./capabilities.ts";

Deno.test("categoriesFor - deduplicates, so an entry never appears twice under one heading", () => {
  // The list emits one row per (entry, category); if this returned a category twice, the entry
  // would render twice under the same heading.
  assertEquals(categoriesFor(["web-browsing", "ai-chat", "news"]), ["browsers", "ai", "media"]);
  // messaging and video-calls are both communication — one category, not two.
  assertEquals(categoriesFor(["messaging", "video-calls"]), ["communication"]);
});

Deno.test("categoriesFor - keeps declaration order, so the first category is the meaningful one", () => {
  // Sorting made this alphabetical and filed Brave under "ai", where nobody looking for a browser
  // would find it. The first capability an author lists is their statement of what it is.
  assertEquals(categoriesFor(["web-browsing", "ai-chat"])[0], "browsers");
  assertEquals(capabilityCategory("web-browsing"), "browsers");
});
