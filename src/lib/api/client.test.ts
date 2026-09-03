import { describe, expect, it } from "vitest";
import { pageItems } from "./client";

describe("pageItems", () => {
  it("returns an array response unchanged", () => {
    expect(pageItems([{ id: 1 }])).toEqual([{ id: 1 }]);
  });

  it("extracts items from a Spring page response", () => {
    expect(pageItems({ content: [{ id: 2 }] })).toEqual([{ id: 2 }]);
  });

  it("returns an empty list for missing content", () => {
    expect(pageItems(undefined)).toEqual([]);
  });
});
