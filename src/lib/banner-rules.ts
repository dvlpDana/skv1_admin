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
