import { describe, expect, it } from "vitest";
import { ADMIN_API_MAX_RESPONSE_BYTES } from "@/lib/auth/constants";
import { readUpstreamJson } from "./response";

describe("readUpstreamJson", () => {
  it("reads a valid JSON response", async () => {
    await expect(readUpstreamJson(Response.json({ ok: true }))).resolves.toEqual({
      ok: true,
    });
  });

  it("rejects invalid JSON", async () => {
    await expect(
      readUpstreamJson(new Response("not-json")),
    ).rejects.toMatchObject({
      kind: "INVALID_JSON",
    });
  });

  it("rejects a declared response larger than the limit", async () => {
    const response = new Response("{}", {
      headers: {
        "Content-Length": String(ADMIN_API_MAX_RESPONSE_BYTES + 1),
      },
    });

    await expect(readUpstreamJson(response)).rejects.toMatchObject({
      kind: "TOO_LARGE",
    });
  });
});
