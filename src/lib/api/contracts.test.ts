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
        new URLSearchParams(
          "page=0&size=20&sort=createdAt,desc&status=PENDING",
        ),
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

  it("matches banner metadata and creative routes", () => {
    expect(matchAdminApiContract("banners/placements", "GET")).toMatchObject({
      ok: true,
    });
    expect(
      matchAdminApiContract("banners/12/creatives/ko/upload-url", "POST"),
    ).toMatchObject({ ok: true });
    expect(
      matchAdminApiContract("banners/12/creatives/ja/confirm", "POST"),
    ).toMatchObject({ ok: false, status: 404 });
  });

  it("validates banner list and upload queries", () => {
    const list = matchAdminApiContract("banners", "GET");
    const upload = matchAdminApiContract(
      "banners/12/creatives/en/upload-url",
      "POST",
    );
    if (!list.ok || !upload.ok) throw new Error("Expected contract match");

    expect(
      validateContractQuery(
        new URLSearchParams(
          "placement=BUYER_HOME_CAROUSEL&active=true&page=0&size=20&sort=id,desc",
        ),
        list.contract,
      ),
    ).toBe(true);
    expect(
      validateContractQuery(
        new URLSearchParams("assetType=VIDEO"),
        upload.contract,
      ),
    ).toBe(true);
    expect(
      validateContractQuery(
        new URLSearchParams("assetType=DOCUMENT"),
        upload.contract,
      ),
    ).toBe(false);
  });

  it("validates banner create and creative confirmation bodies", () => {
    const create = matchAdminApiContract("banners", "POST");
    const confirm = matchAdminApiContract(
      "banners/3/creatives/ru/confirm",
      "POST",
    );
    if (!create.ok || !confirm.ok) throw new Error("Expected contract match");

    expect(
      validateContractBody(
        JSON.stringify({
          placement: "WEB_HOME_WIDE_DESKTOP",
          mediaType: "IMAGE",
          labelType: null,
          paidAd: false,
          navigationParams: {},
          externalUrl: "https://example.com/banner",
          priority: 0,
          active: false,
          startAt: null,
          endAt: null,
        }),
        create.contract,
        "POST",
      ),
    ).toMatchObject({ ok: true });
    expect(
      validateContractBody(
        JSON.stringify({
          imageKey: "banner/image-key",
          mediaKey: null,
          title: "광고 제목",
          altText: "차량 광고 배너",
        }),
        confirm.contract,
        "POST",
      ),
    ).toMatchObject({ ok: true });
  });

  it("rejects unsafe banner values", () => {
    const create = matchAdminApiContract("banners", "POST");
    if (!create.ok) throw new Error("Expected contract match");

    expect(
      validateContractBody(
        JSON.stringify({
          placement: "WEB_HOME_WIDE_DESKTOP",
          mediaType: "IMAGE",
          paidAd: false,
          navigationParams: {},
          externalUrl: "http://example.com/banner",
          priority: 0,
          active: false,
        }),
        create.contract,
        "POST",
      ),
    ).toEqual({ ok: false });
    expect(
      validateContractBody(
        JSON.stringify({
          placement: "WEB_HOME_WIDE_DESKTOP",
          mediaType: "IMAGE",
          paidAd: false,
          navigationParams: {},
          externalUrl: "not-a-url",
          priority: 0,
          active: false,
        }),
        create.contract,
        "POST",
      ),
    ).toEqual({ ok: false });
  });
});
