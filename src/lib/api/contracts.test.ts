import { describe, expect, it } from "vitest";
import {
  matchAdminApiContract,
  validateContractBody,
  validateContractQuery,
} from "./contracts";

describe("admin API contracts", () => {
  it("matches an exact path and method", () => {
    const result = matchAdminApiContract("faqs/12", "DELETE");
    expect(result.ok).toBe(true);
  });

  it("returns method not allowed for a known path", () => {
    const result = matchAdminApiContract("audit-logs", "DELETE");
    expect(result).toMatchObject({ ok: false, status: 405 });
  });

  it.each([
    "accounts/0/active",
    "accounts/-1/active",
    "faqs/abc",
    "faqs/../accounts",
    "https://example.com",
    "unknown",
  ])("rejects an unsafe or unknown path: %s", (path) => {
    expect(matchAdminApiContract(path, "GET")).toMatchObject({
      ok: false,
      status: 404,
    });
  });

  it("validates and normalizes an allowed request body", () => {
    const result = matchAdminApiContract("accounts", "POST");
    if (!result.ok) throw new Error("Expected contract match");

    expect(
      validateContractBody(
        JSON.stringify({
          email: "admin@example.com",
          name: "Admin",
          orgType: "SKV1",
          authMethod: "PASSWORD",
          password: "temporary-password",
        }),
        result.contract,
        "POST",
      ),
    ).toMatchObject({ ok: true });
  });

  it("rejects unknown fields and unsupported account methods", () => {
    const result = matchAdminApiContract("accounts", "POST");
    if (!result.ok) throw new Error("Expected contract match");

    expect(
      validateContractBody(
        JSON.stringify({
          email: "admin@example.com",
          name: "Admin",
          orgType: "SKV1",
          authMethod: "SOCIAL",
          provider: "GOOGLE",
        }),
        result.contract,
        "POST",
      ),
    ).toEqual({ ok: false });
  });

  it("validates allowed pagination queries", () => {
    const result = matchAdminApiContract("inquiries", "GET");
    if (!result.ok) throw new Error("Expected contract match");
    expect(
      validateContractQuery(
        new URLSearchParams("page=0&size=20&sort=createdAt,desc&status=PENDING"),
        result.contract,
      ),
    ).toBe(true);
  });

  it.each([
    "page=-1",
    "size=0",
    "size=1000",
    "status=UNKNOWN",
    "unexpected=true",
    "page=1&page=2",
  ])("rejects an invalid query: %s", (query) => {
    const result = matchAdminApiContract("inquiries", "GET");
    if (!result.ok) throw new Error("Expected contract match");
    expect(
      validateContractQuery(new URLSearchParams(query), result.contract),
    ).toBe(false);
  });
});
