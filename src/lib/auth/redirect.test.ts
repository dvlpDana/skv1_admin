import { describe, expect, it } from "vitest";
import { getSafeInternalRedirect } from "./redirect";

describe("getSafeInternalRedirect", () => {
  it("preserves a valid internal path", () => {
    expect(getSafeInternalRedirect("/inquiries?page=2#answer")).toBe(
      "/inquiries?page=2#answer",
    );
  });

  it.each([
    undefined,
    null,
    "",
    "https://example.com",
    "//example.com",
    "/api/admin/faqs",
    "/login",
  ])("falls back for an unsafe destination: %s", (value) => {
    expect(getSafeInternalRedirect(value)).toBe("/dashboard");
  });
});
