import { describe, expect, it } from "vitest";
import {
  compareAppVersions,
  getBannerFileError,
  RENDER_FIELDS,
} from "./banner-rules";

describe("banner rules", () => {
  it("compares semantic app versions by numeric segment", () => {
    expect(compareAppVersions("1.10.0", "1.2.9")).toBeGreaterThan(0);
    expect(compareAppVersions("2.0.0", "2.0.0")).toBe(0);
  });

  it("rejects unsupported or oversized creative files", () => {
    expect(
      getBannerFileError(
        { name: "banner.gif", type: "image/gif", size: 100 },
        "IMAGE",
      ),
    ).toContain("WebP, PNG, JPEG");
    expect(
      getBannerFileError(
        { name: "banner.mp4", type: "video/mp4", size: 5 * 1024 * 1024 },
        "VIDEO",
      ),
    ).toBeNull();
  });

  it("maps every renderType to the documented creative fields", () => {
    expect(RENDER_FIELDS.HERO_IMAGE).toEqual({
      title: "none",
      description: "none",
      titleLine2: "none",
      vehicle: false,
    });
    expect(RENDER_FIELDS.FEED_ROW).toEqual(RENDER_FIELDS.GRID_CARD);
    expect(RENDER_FIELDS.FEED_ROW.title).toBe("required");
    expect(RENDER_FIELDS.MAIN_BANNER.titleLine2).toBe("optional");
    expect(RENDER_FIELDS.VEHICLE_VIDEO_AD.vehicle).toBe(true);
    expect(
      Object.values(RENDER_FIELDS).filter((rule) => rule.vehicle),
    ).toHaveLength(1);
  });
});
