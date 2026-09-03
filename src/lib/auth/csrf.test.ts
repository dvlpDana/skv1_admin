import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { assertSameOriginMutation, CsrfError } from "./csrf";

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3001/api/admin/faqs", {
    method: "POST",
    headers,
  });
}

describe("assertSameOriginMutation", () => {
  it("accepts a same-origin browser mutation", () => {
    expect(() =>
      assertSameOriginMutation(
        request({
          origin: "http://localhost:3001",
          "sec-fetch-site": "same-origin",
        }),
      ),
    ).not.toThrow();
  });

  it("rejects a missing origin", () => {
    expect(() => assertSameOriginMutation(request())).toThrow(CsrfError);
  });

  it("rejects a cross-site origin", () => {
    expect(() =>
      assertSameOriginMutation(
        request({
          origin: "https://attacker.example",
          "sec-fetch-site": "cross-site",
        }),
      ),
    ).toThrow(CsrfError);
  });

  it("does not require an origin for safe methods", () => {
    const safeRequest = new NextRequest(
      "http://localhost:3001/api/admin/faqs",
      { method: "GET" },
    );
    expect(() => assertSameOriginMutation(safeRequest)).not.toThrow();
  });
});
