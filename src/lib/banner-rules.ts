import type { BannerAssetType } from "@/types/admin";

const IMAGE_TYPES = new Set(["image/webp", "image/png", "image/jpeg"]);

export function compareAppVersions(left: string, right: string) {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

export function getBannerFileError(
  file: Pick<File, "name" | "size" | "type">,
  type: BannerAssetType,
) {
  if (file.size === 0) return `${file.name} 파일이 비어 있습니다.`;
  if (type === "IMAGE" && !IMAGE_TYPES.has(file.type)) {
    return `${file.name} 파일은 WebP, PNG, JPEG 형식만 사용할 수 있습니다.`;
  }
  if (type === "VIDEO" && file.type !== "video/mp4") {
    return `${file.name} 파일은 MP4 형식만 사용할 수 있습니다.`;
  }
  const limit = type === "IMAGE" ? 1024 * 1024 : 5 * 1024 * 1024;
  if (file.size > limit) {
    return `${file.name} 파일은 ${type === "IMAGE" ? "1MB" : "5MB"}를 초과합니다.`;
  }
  return null;
}

type FieldRule = "required" | "optional" | "none";

export type RenderFieldRule = {
  title: FieldRule;
  description: FieldRule;
  titleLine2: FieldRule;
  /** brand/modelName/priceMin/priceMax/disclaimer 묶음. 필수이거나 전부 null. */
  vehicle: boolean;
};

/** 광고 배너 조회 API 3항 "renderType별 필드 매핑" 표와 1:1로 대응한다. */
export const RENDER_FIELDS: Record<string, RenderFieldRule> = {
  HERO_IMAGE: {
    title: "none",
    description: "none",
    titleLine2: "none",
    vehicle: false,
  },
  FEED_ROW: {
    title: "required",
    description: "optional",
    titleLine2: "none",
    vehicle: false,
  },
  GRID_CARD: {
    title: "required",
    description: "optional",
    titleLine2: "none",
    vehicle: false,
  },
  MAIN_BANNER: {
    title: "required",
    description: "optional",
    titleLine2: "optional",
    vehicle: false,
  },
  VEHICLE_VIDEO_AD: {
    title: "none",
    description: "none",
    titleLine2: "none",
    vehicle: true,
  },
};

const ASPECT_TOLERANCE = 0.01;

export function getAspectRatioWarning(
  size: { width: number; height: number },
  aspectWidth: number,
  aspectHeight: number,
) {
  if (!size.width || !size.height) return "이미지 크기를 확인할 수 없습니다.";
  const expected = aspectWidth / aspectHeight;
  const actual = size.width / size.height;
  if (Math.abs(actual - expected) / expected <= ASPECT_TOLERANCE) return null;
  return `권장 비율 ${aspectWidth}:${aspectHeight}와 다릅니다. 선택한 이미지는 ${size.width}x${size.height} 입니다. 그대로 등록하면 지면에서 잘리거나 여백이 생길 수 있습니다.`;
}

export async function readImageSize(file: Blob) {
  const bitmap = await createImageBitmap(file);
  try {
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}
