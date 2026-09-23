"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, LoaderCircle, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QueryErrorState } from "@/components/ui/query-error-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { adminApi, uploadToPresignedUrl } from "@/lib/api/client";
import {
  compareAppVersions,
  getBannerFileError,
  RENDER_FIELDS,
} from "@/lib/banner-rules";
import { formatDateTime } from "@/lib/utils";
import type {
  Banner,
  BannerCreative,
  BannerLanguage,
  BannerNavigationKey,
  BannerPlacement,
  BannerUploadUrl,
} from "@/types/admin";
import { BANNER_LANGUAGES } from "@/types/admin";

type NavigationMode = "NONE" | "INTERNAL" | "EXTERNAL";

type BannerForm = {
  placement: string;
  mediaType: "IMAGE" | "VIDEO";
  labelType: string;
  paidAd: boolean;
  userTypeTarget: string;
  platform: string;
  targetCountryCode: string;
  minAppVersion: string;
  maxAppVersion: string;
  navigationMode: NavigationMode;
  navigationKey: string;
  navigationParam: string;
  externalUrl: string;
  priority: string;
  startAt: string;
  endAt: string;
};

type CreativeForm = {
  title: string;
  description: string;
  titleLine2: string;
  brand: string;
  modelName: string;
  priceMin: string;
  priceMax: string;
  disclaimer: string;
  altText: string;
};

const EMPTY_FORM: BannerForm = {
  placement: "",
  mediaType: "IMAGE",
  labelType: "",
  paidAd: false,
  userTypeTarget: "",
  platform: "",
  targetCountryCode: "",
  minAppVersion: "",
  maxAppVersion: "",
  navigationMode: "NONE",
  navigationKey: "",
  navigationParam: "",
  externalUrl: "",
  priority: "0",
  startAt: "",
  endAt: "",
};

const EMPTY_CREATIVE: CreativeForm = {
  title: "",
  description: "",
  titleLine2: "",
  brand: "",
  modelName: "",
  priceMin: "",
  priceMax: "",
  disclaimer: "",
  altText: "",
};

const APP_VERSION = /^\d+\.\d+\.\d+$/;
const BANNER_CODE = /^[A-Z][A-Z0-9_]{0,79}$/;

function placementLabel(value: string) {
  return value.replaceAll("_", " ");
}

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function initialForm(placement?: BannerPlacement): BannerForm {
  return {
    ...EMPTY_FORM,
    placement: placement?.placement ?? "",
    mediaType: placement?.allowedMediaTypes[0] ?? "IMAGE",
    labelType: "",
  };
}

function formFromBanner(banner: Banner): BannerForm {
  const requiredValue = banner.navigationKey
    ? (Object.values(banner.navigationParams ?? {})[0] ?? "")
    : "";
  return {
    placement: banner.placement,
    mediaType: banner.mediaType,
    labelType: banner.labelType ?? "",
    paidAd: banner.paidAd,
    userTypeTarget: banner.userTypeTarget ?? "",
    platform: banner.platform ?? "",
    targetCountryCode: banner.targetCountryCode ?? "",
    minAppVersion: banner.minAppVersion ?? "",
    maxAppVersion: banner.maxAppVersion ?? "",
    navigationMode: banner.navigationKey
      ? "INTERNAL"
      : banner.externalUrl
        ? "EXTERNAL"
        : "NONE",
    navigationKey: banner.navigationKey ?? "",
    navigationParam: requiredValue,
    externalUrl: banner.externalUrl ?? "",
    priority: String(banner.priority),
    startAt: localDateTime(banner.startAt),
    endAt: localDateTime(banner.endAt),
  };
}

function creativeFromBanner(creative?: BannerCreative): CreativeForm {
  if (!creative) return EMPTY_CREATIVE;
  return {
    title: creative.title ?? "",
    description: creative.description ?? "",
    titleLine2: creative.titleLine2 ?? "",
    brand: creative.brand ?? "",
    modelName: creative.modelName ?? "",
    priceMin: creative.priceMin === null ? "" : String(creative.priceMin),
    priceMax: creative.priceMax === null ? "" : String(creative.priceMax),
    disclaimer: creative.disclaimer ?? "",
    altText: creative.altText ?? "",
  };
}

function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);
  return url;
}

function optional(value: string) {
  const normalized = value.trim();
  return normalized || null;
}

function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="text-xs text-destructive-foreground">{children}</p>;
}

export function BannerEditorDialog({
  open,
  bannerId,
  onOpenChange,
  onChanged,
}: {
  open: boolean;
  bannerId: number | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void | Promise<unknown>;
}) {
  const queryClient = useQueryClient();
  const [resolvedId, setResolvedId] = useState<number | null>(bannerId);
  const [form, setForm] = useState<BannerForm>(EMPTY_FORM);
  const [initialValue, setInitialValue] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [discardCreativeOpen, setDiscardCreativeOpen] = useState(false);
  const [creativeLanguage, setCreativeLanguage] =
    useState<BannerLanguage | null>(null);
  const [creativeForm, setCreativeForm] =
    useState<CreativeForm>(EMPTY_CREATIVE);
  const [creativeInitialValue, setCreativeInitialValue] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploadStage, setUploadStage] = useState<string | null>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [creativeError, setCreativeError] = useState<string | null>(null);
  const [deleteLanguage, setDeleteLanguage] = useState<BannerLanguage | null>(
    null,
  );
  const imagePreview = useObjectUrl(imageFile);

  const placementsQuery = useQuery({
    queryKey: ["banner-placements"],
    queryFn: () => adminApi.get<BannerPlacement[]>("banners/placements"),
    enabled: open,
  });
  const navigationQuery = useQuery({
    queryKey: ["banner-navigation-keys"],
    queryFn: () =>
      adminApi.get<BannerNavigationKey[]>("banners/navigation-keys"),
    enabled: open,
  });
  const detailQuery = useQuery({
    queryKey: ["banner", resolvedId],
    queryFn: () => adminApi.get<Banner>(`banners/${resolvedId}`),
    enabled: open && resolvedId !== null,
  });

  useEffect(() => {
    if (!open) {
      setResolvedId(bannerId);
      setInitialized(false);
      setCreativeLanguage(null);
      setImageFile(null);
      setVideoFile(null);
      setMetadataError(null);
      setCreativeError(null);
      return;
    }
    setResolvedId(bannerId);
    setInitialized(false);
  }, [bannerId, open]);

  useEffect(() => {
    if (
      open &&
      resolvedId === null &&
      !initialized &&
      placementsQuery.data?.length
    ) {
      const next = initialForm(placementsQuery.data[0]);
      setForm(next);
      setInitialValue(JSON.stringify(next));
      setInitialized(true);
    }
  }, [initialized, open, placementsQuery.data, resolvedId]);

  useEffect(() => {
    if (!open || !detailQuery.data || initialized) return;
    const next = formFromBanner(detailQuery.data);
    setForm(next);
    setInitialValue(JSON.stringify(next));
    setInitialized(true);
  }, [detailQuery.data, initialized, open]);

  const currentPlacement = useMemo(
    () =>
      placementsQuery.data?.find((item) => item.placement === form.placement),
    [form.placement, placementsQuery.data],
  );
  const currentNavigation = navigationQuery.data?.find(
    (item) => item.key === form.navigationKey,
  );
  const dirty = initialized && JSON.stringify(form) !== initialValue;
  const creativeDirty =
    creativeLanguage !== null &&
    (JSON.stringify(creativeForm) !== creativeInitialValue ||
      imageFile !== null ||
      videoFile !== null);
  const hasUnsavedChanges = dirty || creativeDirty;

  useEffect(() => {
    if (!open || !hasUnsavedChanges) return;
    const preventUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", preventUnload);
    return () => window.removeEventListener("beforeunload", preventUnload);
  }, [hasUnsavedChanges, open]);

  function validateMetadata() {
    if (!currentPlacement) return "지면을 선택해 주세요.";
    if (!currentPlacement.allowedMediaTypes.includes(form.mediaType)) {
      return "선택한 지면에서 지원하지 않는 미디어 형식입니다.";
    }
    if (
      form.labelType &&
      !currentPlacement.allowedLabelTypes.includes(form.labelType)
    ) {
      return "선택한 지면에서 지원하지 않는 광고 라벨입니다.";
    }
    if (form.paidAd && !form.labelType) {
      return "유료 광고는 광고 라벨을 선택해야 합니다.";
    }
    if (form.userTypeTarget && !BANNER_CODE.test(form.userTypeTarget.trim())) {
      return "사용자 유형 코드는 영문 대문자와 숫자, 밑줄만 사용할 수 있습니다.";
    }
    if (form.platform && !BANNER_CODE.test(form.platform.trim())) {
      return "플랫폼 코드는 영문 대문자와 숫자, 밑줄만 사용할 수 있습니다.";
    }
    if (
      form.targetCountryCode &&
      !/^[A-Z]{2}$/.test(form.targetCountryCode.trim())
    ) {
      return "국가 코드는 영문 대문자 2자로 입력해 주세요.";
    }
    if (currentPlacement.clientType === "WEB") {
      if (form.platform || form.minAppVersion || form.maxAppVersion) {
        return "웹 지면에는 플랫폼과 앱 버전을 설정할 수 없습니다.";
      }
    } else {
      if (form.minAppVersion && !APP_VERSION.test(form.minAppVersion)) {
        return "최소 앱 버전은 x.y.z 형식으로 입력해 주세요.";
      }
      if (form.maxAppVersion && !APP_VERSION.test(form.maxAppVersion)) {
        return "최대 앱 버전은 x.y.z 형식으로 입력해 주세요.";
      }
      if (form.mediaType === "VIDEO" && !form.minAppVersion) {
        return "앱 영상 배너는 최소 앱 버전이 필요합니다.";
      }
      if (
        form.minAppVersion &&
        form.maxAppVersion &&
        compareAppVersions(form.minAppVersion, form.maxAppVersion) > 0
      ) {
        return "최소 앱 버전은 최대 앱 버전보다 클 수 없습니다.";
      }
    }
    if (form.navigationMode === "INTERNAL") {
      if (!form.navigationKey) return "앱 내 이동 위치를 선택해 주세요.";
      if (!currentNavigation) {
        return "선택한 앱 내 이동 위치의 설정 정보를 찾을 수 없습니다.";
      }
      if (currentNavigation?.requiredParam && !form.navigationParam.trim()) {
        return `${currentNavigation.requiredParam} 값을 입력해 주세요.`;
      }
    }
    if (form.navigationMode === "EXTERNAL") {
      try {
        if (new URL(form.externalUrl).protocol !== "https:") throw new Error();
      } catch {
        return "외부 URL은 https://로 시작하는 올바른 주소여야 합니다.";
      }
    }
    const priority = Number(form.priority);
    if (!Number.isInteger(priority) || priority < 0) {
      return "우선순위는 0 이상의 정수로 입력해 주세요.";
    }
    const startAt = form.startAt ? new Date(form.startAt) : null;
    const endAt = form.endAt ? new Date(form.endAt) : null;
    if (startAt && Number.isNaN(startAt.getTime()))
      return "시작 시각을 확인해 주세요.";
    if (endAt && Number.isNaN(endAt.getTime()))
      return "종료 시각을 확인해 주세요.";
    if (startAt && endAt && startAt >= endAt) {
      return "노출 시작 시각은 종료 시각보다 빨라야 합니다.";
    }

    const original = detailQuery.data;
    if (original) {
      if (
        original.creatives.length > 0 &&
        (original.placement !== form.placement ||
          original.mediaType !== form.mediaType)
      ) {
        return "소재가 등록된 배너는 지면이나 미디어 형식을 변경할 수 없습니다. 소재를 먼저 삭제해 주세요.";
      }
      const cleared = [
        [original.labelType, form.labelType, "광고 라벨"],
        [original.userTypeTarget, form.userTypeTarget, "사용자 유형"],
        [original.platform, form.platform, "플랫폼"],
        [original.targetCountryCode, form.targetCountryCode, "국가 제한"],
        [original.minAppVersion, form.minAppVersion, "최소 앱 버전"],
        [original.maxAppVersion, form.maxAppVersion, "최대 앱 버전"],
        [original.startAt, form.startAt, "노출 시작 시각"],
        [original.endAt, form.endAt, "노출 종료 시각"],
      ].find(([previous, next]) => previous && !next);
      if (cleared) {
        return `${cleared[2]}은 현재 API에서 설정 후 제거할 수 없습니다. 다른 값으로 변경해 주세요.`;
      }
      const originalMode: NavigationMode = original.navigationKey
        ? "INTERNAL"
        : original.externalUrl
          ? "EXTERNAL"
          : "NONE";
      if (originalMode !== "NONE" && originalMode !== form.navigationMode) {
        return "현재 API에서는 설정된 연결 방식을 제거하거나 다른 방식으로 전환할 수 없습니다.";
      }
    }
    return null;
  }

  function metadataPayload(isCreate: boolean) {
    const requiredParam =
      form.navigationMode === "INTERNAL"
        ? currentNavigation?.requiredParam
        : null;
    const dateValue = (value: string, original: string | null | undefined) => {
      if (!value) return null;
      if (original && localDateTime(original) === value) return original;
      return new Date(value).toISOString();
    };
    return {
      placement: form.placement,
      mediaType: form.mediaType,
      labelType: optional(form.labelType),
      paidAd: form.paidAd,
      userTypeTarget: optional(form.userTypeTarget),
      platform:
        currentPlacement?.clientType === "WEB" ? null : optional(form.platform),
      targetCountryCode: optional(form.targetCountryCode.toUpperCase()),
      minAppVersion:
        currentPlacement?.clientType === "WEB"
          ? null
          : optional(form.minAppVersion),
      maxAppVersion:
        currentPlacement?.clientType === "WEB"
          ? null
          : optional(form.maxAppVersion),
      navigationKey:
        form.navigationMode === "INTERNAL" ? form.navigationKey : null,
      navigationParams:
        form.navigationMode === "INTERNAL" && requiredParam
          ? { [requiredParam]: form.navigationParam.trim() }
          : {},
      externalUrl:
        form.navigationMode === "EXTERNAL" ? form.externalUrl.trim() : null,
      priority: Number(form.priority),
      ...(isCreate ? { active: false } : {}),
      startAt: dateValue(form.startAt, detailQuery.data?.startAt),
      endAt: dateValue(form.endAt, detailQuery.data?.endAt),
    };
  }

  function validateCreative() {
    const detail = detailQuery.data;
    if (!detail) return "배너 정보를 먼저 저장해 주세요.";
    const rule = RENDER_FIELDS[detail.renderType];
    if (!rule) return `지원하지 않는 렌더 형식입니다: ${detail.renderType}`;
    if (!imageFile) return "이미지 파일을 선택해 주세요.";
    const imageError = getBannerFileError(imageFile, "IMAGE");
    if (imageError) return imageError;
    if (detail.mediaType === "VIDEO" && !videoFile) {
      return "영상 배너는 MP4 영상 파일이 필요합니다.";
    }
    if (videoFile) {
      const videoError = getBannerFileError(videoFile, "VIDEO");
      if (videoError) return videoError;
    }
    if (!creativeForm.altText.trim()) return "대체 텍스트를 입력해 주세요.";
    if (rule.title === "required" && !creativeForm.title.trim()) {
      return "이 지면은 소재 제목이 필요합니다.";
    }
    if (!rule.vehicle) return null;

    const missing = (
      [
        ["brand", "브랜드"],
        ["modelName", "모델명"],
        ["disclaimer", "고지 문구"],
        ["priceMin", "최소 가격"],
        ["priceMax", "최대 가격"],
      ] as const
    ).find(([field]) => !creativeForm[field].trim());
    if (missing) return `${missing[1]}을(를) 입력해 주세요.`;
    const priceMin = Number(creativeForm.priceMin);
    const priceMax = Number(creativeForm.priceMax);
    if (
      [priceMin, priceMax].some(
        (price) => !Number.isInteger(price) || price < 0,
      )
    ) {
      return "가격은 0 이상의 정수로 입력해 주세요.";
    }
    if (priceMin > priceMax) {
      return "최소 가격은 최대 가격보다 클 수 없습니다.";
    }
    return null;
  }

  /** 스펙 3항 매핑표에 없는 필드는 항상 null로 보낸다. */
  function creativeFieldPayload() {
    const rule = RENDER_FIELDS[detailQuery.data?.renderType ?? ""];
    const value = (field: keyof CreativeForm, allowed: boolean) =>
      allowed ? optional(creativeForm[field]) : null;
    return {
      title: value("title", rule?.title !== "none"),
      description: value("description", rule?.description !== "none"),
      titleLine2: value("titleLine2", rule?.titleLine2 !== "none"),
      brand: value("brand", Boolean(rule?.vehicle)),
      modelName: value("modelName", Boolean(rule?.vehicle)),
      disclaimer: value("disclaimer", Boolean(rule?.vehicle)),
      priceMin: rule?.vehicle ? Number(creativeForm.priceMin) : null,
      priceMax: rule?.vehicle ? Number(creativeForm.priceMax) : null,
    };
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const error = validateMetadata();
      if (error) throw new Error(error);
      return resolvedId === null
        ? adminApi.post<Banner>("banners", metadataPayload(true))
        : adminApi.put<Banner>(`banners/${resolvedId}`, metadataPayload(false));
    },
    onMutate: () => setMetadataError(null),
    onSuccess: async (banner) => {
      const created = resolvedId === null;
      setResolvedId(banner.id);
      const next = formFromBanner(banner);
      setForm(next);
      setInitialValue(JSON.stringify(next));
      toast.success(
        created
          ? "배너 정보를 저장했습니다. 언어별 소재를 등록해 주세요."
          : "배너 정보를 수정했습니다.",
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["banner", banner.id] }),
        onChanged(),
      ]);
    },
    onError: (error: Error) => {
      setMetadataError(error.message);
      toast.error(error.message);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!resolvedId || !creativeLanguage || !detailQuery.data) {
        throw new Error("배너 정보를 먼저 저장해 주세요.");
      }
      const error = validateCreative();
      if (error) throw new Error(error);
      if (!imageFile) throw new Error("이미지 파일을 선택해 주세요.");
      setUploadStage("이미지 업로드 URL을 발급하고 있습니다.");
      const imageUpload = await adminApi.post<BannerUploadUrl>(
        `banners/${resolvedId}/creatives/${creativeLanguage}/upload-url?assetType=IMAGE`,
      );
      setUploadStage("이미지를 업로드하고 있습니다.");
      await uploadToPresignedUrl(imageUpload.presignedUrl, imageFile);

      let mediaKey: string | null = null;
      if (detailQuery.data.mediaType === "VIDEO" && videoFile) {
        setUploadStage("영상 업로드 URL을 발급하고 있습니다.");
        const videoUpload = await adminApi.post<BannerUploadUrl>(
          `banners/${resolvedId}/creatives/${creativeLanguage}/upload-url?assetType=VIDEO`,
        );
        setUploadStage("영상을 업로드하고 있습니다.");
        await uploadToPresignedUrl(videoUpload.presignedUrl, videoFile);
        mediaKey = videoUpload.key;
      }

      setUploadStage("업로드한 소재를 검증하고 있습니다.");
      return adminApi.post<Banner>(
        `banners/${resolvedId}/creatives/${creativeLanguage}/confirm`,
        {
          imageKey: imageUpload.key,
          mediaKey,
          ...creativeFieldPayload(),
          altText: creativeForm.altText.trim(),
        },
      );
    },
    onMutate: () => setCreativeError(null),
    onSuccess: async () => {
      toast.success(`${creativeLanguage?.toUpperCase()} 소재를 저장했습니다.`);
      setCreativeLanguage(null);
      setImageFile(null);
      setVideoFile(null);
      setFileInputKey((value) => value + 1);
      await Promise.all([detailQuery.refetch(), onChanged()]);
    },
    onError: (error: Error) => {
      setCreativeError(error.message);
      toast.error(error.message);
    },
    onSettled: () => setUploadStage(null),
  });

  const deleteCreativeMutation = useMutation({
    mutationFn: (language: BannerLanguage) => {
      if (!resolvedId) throw new Error("배너 정보를 찾을 수 없습니다.");
      return adminApi.delete<{ result: string }>(
        `banners/${resolvedId}/creatives/${language}`,
      );
    },
    onSuccess: async () => {
      toast.success(`${deleteLanguage?.toUpperCase()} 소재를 삭제했습니다.`);
      setDeleteLanguage(null);
      setCreativeLanguage(null);
      await Promise.all([detailQuery.refetch(), onChanged()]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const isBusy =
    saveMutation.isPending ||
    uploadMutation.isPending ||
    deleteCreativeMutation.isPending;

  function requestClose() {
    if (isBusy) return;
    if (hasUnsavedChanges) setDiscardOpen(true);
    else onOpenChange(false);
  }

  function openCreative(language: BannerLanguage) {
    const creative = detailQuery.data?.creatives.find(
      (item) => item.lang === language,
    );
    const next = creativeFromBanner(creative);
    setCreativeLanguage(language);
    setCreativeForm(next);
    setCreativeInitialValue(JSON.stringify(next));
    setImageFile(null);
    setVideoFile(null);
    setCreativeError(null);
    setFileInputKey((value) => value + 1);
  }

  function closeCreative() {
    if (creativeDirty) {
      setDiscardCreativeOpen(true);
      return;
    }
    setCreativeLanguage(null);
  }

  function updateForm<Key extends keyof BannerForm>(
    key: Key,
    value: BannerForm[Key],
  ) {
    setMetadataError(null);
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateCreative<Key extends keyof CreativeForm>(
    key: Key,
    value: CreativeForm[Key],
  ) {
    setCreativeError(null);
    setCreativeForm((current) => ({ ...current, [key]: value }));
  }

  function changePlacement(value: string) {
    const placement = placementsQuery.data?.find(
      (item) => item.placement === value,
    );
    if (!placement) return;
    setMetadataError(null);
    setForm((current) => ({
      ...current,
      placement: value,
      mediaType: placement.allowedMediaTypes.includes(current.mediaType)
        ? current.mediaType
        : (placement.allowedMediaTypes[0] ?? "IMAGE"),
      labelType: placement.allowedLabelTypes.includes(current.labelType)
        ? current.labelType
        : "",
      ...(placement.clientType === "WEB"
        ? { platform: "", minAppVersion: "", maxAppVersion: "" }
        : {}),
    }));
  }

  const metadataUnavailable =
    placementsQuery.isError || navigationQuery.isError;
  const loading =
    placementsQuery.isLoading ||
    navigationQuery.isLoading ||
    (resolvedId !== null && detailQuery.isLoading);
  const detail = detailQuery.data;
  const existingCreative = detail?.creatives.find(
    (item) => item.lang === creativeLanguage,
  );
  const renderRule = detail ? RENDER_FIELDS[detail.renderType] : undefined;
  const creativeIssue = creativeLanguage ? validateCreative() : null;

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && requestClose()}>
        <DialogContent className="max-w-6xl" aria-busy={isBusy}>
          <DialogHeader>
            <DialogTitle>
              {resolvedId ? `배너 #${resolvedId} 관리` : "배너 등록"}
            </DialogTitle>
            <DialogDescription>
              배너 정보를 먼저 저장한 뒤 언어별 이미지와 영상을 등록합니다. 새
              배너는 소재가 없는 노출을 막기 위해 비활성으로 생성됩니다.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-36" />
              <Skeleton className="h-52" />
              <Skeleton className="h-40" />
            </div>
          ) : metadataUnavailable ? (
            <QueryErrorState
              title="배너 설정 정보를 불러오지 못했습니다"
              onRetry={() => {
                void placementsQuery.refetch();
                void navigationQuery.refetch();
              }}
            />
          ) : resolvedId !== null && (detailQuery.isError || !detail) ? (
            <QueryErrorState
              title="배너 정보를 불러오지 못했습니다"
              onRetry={() => detailQuery.refetch()}
            />
          ) : (
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle>배너 설정</CardTitle>
                  <CardDescription>
                    지면 정책에 맞는 미디어, 타게팅, 연결 동작과 노출 기간을
                    입력합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="space-y-2 lg:col-span-2">
                      <Label htmlFor="banner-placement">지면</Label>
                      <Select
                        value={form.placement}
                        onValueChange={changePlacement}
                      >
                        <SelectTrigger id="banner-placement">
                          <SelectValue placeholder="지면 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {(placementsQuery.data ?? []).map((item) => (
                            <SelectItem
                              key={item.placement}
                              value={item.placement}
                            >
                              {placementLabel(item.placement)} ·{" "}
                              {item.clientType}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {currentPlacement && (
                        <p className="text-xs text-zinc-500">
                          {currentPlacement.renderType} · 권장 비율{" "}
                          {currentPlacement.aspectWidth}:
                          {currentPlacement.aspectHeight} · 최대{" "}
                          {currentPlacement.maxItems}개
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="banner-media-type">미디어 형식</Label>
                      <Select
                        value={form.mediaType}
                        onValueChange={(value) =>
                          updateForm("mediaType", value as "IMAGE" | "VIDEO")
                        }
                      >
                        <SelectTrigger id="banner-media-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(currentPlacement?.allowedMediaTypes ?? []).map(
                            (value) => (
                              <SelectItem key={value} value={value}>
                                {value === "IMAGE" ? "이미지" : "영상"}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="banner-label">광고 라벨</Label>
                      <Select
                        value={form.labelType || "NONE"}
                        onValueChange={(value) =>
                          updateForm("labelType", value === "NONE" ? "" : value)
                        }
                      >
                        <SelectTrigger id="banner-label">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">없음</SelectItem>
                          {(currentPlacement?.allowedLabelTypes ?? []).map(
                            (value) => (
                              <SelectItem key={value} value={value}>
                                {value}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="banner-user-target">
                        사용자 유형 코드
                      </Label>
                      <Input
                        id="banner-user-target"
                        value={form.userTypeTarget}
                        onChange={(event) =>
                          updateForm(
                            "userTypeTarget",
                            event.target.value.toUpperCase(),
                          )
                        }
                        placeholder="SELLERBUSINESS"
                        maxLength={80}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="banner-country">국가 코드</Label>
                      <Input
                        id="banner-country"
                        value={form.targetCountryCode}
                        onChange={(event) =>
                          updateForm(
                            "targetCountryCode",
                            event.target.value.toUpperCase(),
                          )
                        }
                        placeholder="KR"
                        maxLength={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="banner-priority">우선순위</Label>
                      <Input
                        id="banner-priority"
                        type="number"
                        min={0}
                        step={1}
                        value={form.priority}
                        onChange={(event) =>
                          updateForm("priority", event.target.value)
                        }
                      />
                    </div>
                  </div>

                  <label className="flex items-start gap-3 rounded-lg border bg-zinc-50 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={form.paidAd}
                      onChange={(event) =>
                        updateForm("paidAd", event.target.checked)
                      }
                      className="mt-0.5 size-4 accent-primary"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-zinc-900">
                        유료 광고
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-zinc-500">
                        유료 광고로 표시하면 지면에서 허용하는 광고 라벨이
                        반드시 필요합니다.
                      </span>
                    </span>
                  </label>

                  {currentPlacement?.clientType !== "WEB" && (
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="banner-platform">플랫폼</Label>
                        <Input
                          id="banner-platform"
                          value={form.platform}
                          onChange={(event) =>
                            updateForm(
                              "platform",
                              event.target.value.toUpperCase(),
                            )
                          }
                          placeholder="전체 또는 IOS"
                          maxLength={80}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="banner-min-version">최소 앱 버전</Label>
                        <Input
                          id="banner-min-version"
                          value={form.minAppVersion}
                          onChange={(event) =>
                            updateForm("minAppVersion", event.target.value)
                          }
                          placeholder="1.0.0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="banner-max-version">최대 앱 버전</Label>
                        <Input
                          id="banner-max-version"
                          value={form.maxAppVersion}
                          onChange={(event) =>
                            updateForm("maxAppVersion", event.target.value)
                          }
                          placeholder="2.0.0"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="banner-navigation-mode">연결 동작</Label>
                      <Select
                        value={form.navigationMode}
                        onValueChange={(value) =>
                          updateForm("navigationMode", value as NavigationMode)
                        }
                      >
                        <SelectTrigger id="banner-navigation-mode">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">연결 없음</SelectItem>
                          <SelectItem value="INTERNAL">앱 내 이동</SelectItem>
                          <SelectItem value="EXTERNAL">
                            외부 웹사이트
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {form.navigationMode === "INTERNAL" && (
                      <div className="space-y-2">
                        <Label htmlFor="banner-navigation-key">
                          앱 내 이동 위치
                        </Label>
                        <Select
                          value={form.navigationKey}
                          onValueChange={(value) => {
                            updateForm("navigationKey", value);
                            updateForm("navigationParam", "");
                          }}
                        >
                          <SelectTrigger id="banner-navigation-key">
                            <SelectValue placeholder="이동 위치 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {(navigationQuery.data ?? []).map((item) => (
                              <SelectItem key={item.key} value={item.key}>
                                {item.key.replaceAll("_", " ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {form.navigationMode === "EXTERNAL" && (
                      <div className="space-y-2">
                        <Label htmlFor="banner-external-url">외부 URL</Label>
                        <Input
                          id="banner-external-url"
                          type="url"
                          value={form.externalUrl}
                          onChange={(event) =>
                            updateForm("externalUrl", event.target.value)
                          }
                          placeholder="https://example.com"
                        />
                      </div>
                    )}
                  </div>
                  {form.navigationMode === "INTERNAL" &&
                    currentNavigation?.requiredParam && (
                      <div className="space-y-2">
                        <Label htmlFor="banner-navigation-param">
                          {currentNavigation.requiredParam}
                        </Label>
                        <Input
                          id="banner-navigation-param"
                          value={form.navigationParam}
                          onChange={(event) =>
                            updateForm("navigationParam", event.target.value)
                          }
                        />
                      </div>
                    )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="banner-start-at">노출 시작</Label>
                      <Input
                        id="banner-start-at"
                        type="datetime-local"
                        value={form.startAt}
                        onChange={(event) =>
                          updateForm("startAt", event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="banner-end-at">노출 종료</Label>
                      <Input
                        id="banner-end-at"
                        type="datetime-local"
                        value={form.endAt}
                        onChange={(event) =>
                          updateForm("endAt", event.target.value)
                        }
                      />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">
                    노출 시각은 브라우저의 현지 시간 기준으로 입력합니다.
                  </p>

                  {metadataError && (
                    <p
                      role="alert"
                      className="rounded-lg border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-foreground"
                    >
                      {metadataError}
                    </p>
                  )}

                  <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-5 text-zinc-500">
                      {resolvedId
                        ? "설정된 값을 비우는 기능은 현재 API에서 지원하지 않습니다. 기존 값은 다른 값으로만 변경할 수 있습니다."
                        : "저장 후 언어별 소재를 등록하고 목록에서 노출을 활성화해 주세요."}
                    </p>
                    <Button
                      onClick={() => saveMutation.mutate()}
                      disabled={
                        (resolvedId !== null && !dirty) ||
                        saveMutation.isPending
                      }
                    >
                      {saveMutation.isPending && (
                        <LoaderCircle className="animate-spin" />
                      )}
                      {resolvedId ? "배너 정보 저장" : "배너 생성"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {resolvedId && detail && (
                <Card>
                  <CardHeader>
                    <CardTitle>언어별 소재</CardTitle>
                    <CardDescription>
                      이미지 URL은 교체할 때마다 변경됩니다. 기존 소재를 수정할
                      때도 이미지{detail.mediaType === "VIDEO" ? "와 영상" : ""}{" "}
                      파일을 다시 선택해야 합니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {creativeLanguage === null ? (
                      <div className="grid gap-3 md:grid-cols-3">
                        {BANNER_LANGUAGES.map((language) => {
                          const creative = detail.creatives.find(
                            (item) => item.lang === language,
                          );
                          return (
                            <div
                              key={language}
                              className="rounded-lg border bg-zinc-50 p-4"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-semibold text-zinc-900">
                                  {language.toUpperCase()}
                                </span>
                                <Badge
                                  variant={creative ? "success" : "warning"}
                                >
                                  {creative ? "등록됨" : "미등록"}
                                </Badge>
                              </div>
                              {creative?.imageUrl && (
                                <div className="relative mt-3 aspect-video overflow-hidden rounded-md border bg-white">
                                  <Image
                                    src={creative.imageUrl}
                                    alt={
                                      creative.altText ||
                                      `${language} 배너 소재`
                                    }
                                    fill
                                    unoptimized
                                    className="object-contain"
                                  />
                                </div>
                              )}
                              <div className="mt-4 flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => openCreative(language)}
                                >
                                  {creative ? "교체" : "등록"}
                                </Button>
                                {creative && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`${language.toUpperCase()} 소재 삭제`}
                                    disabled={
                                      detail.active &&
                                      detail.creatives.length === 1
                                    }
                                    onClick={() => setDeleteLanguage(language)}
                                  >
                                    <Trash2 />
                                  </Button>
                                )}
                              </div>
                              {creative &&
                                detail.active &&
                                detail.creatives.length === 1 && (
                                  <p className="mt-2 text-xs leading-5 text-warning-foreground">
                                    마지막 소재를 삭제하려면 배너를 먼저
                                    비활성화해 주세요.
                                  </p>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="font-semibold text-zinc-900">
                              {creativeLanguage.toUpperCase()} 소재
                            </h3>
                            <p className="mt-1 text-xs text-zinc-500">
                              이미지 1MB 이하
                              {detail.mediaType === "VIDEO"
                                ? " · MP4 영상 5MB 이하"
                                : ""}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={closeCreative}
                            disabled={uploadMutation.isPending}
                          >
                            언어 목록으로
                          </Button>
                        </div>

                        {existingCreative?.imageUrl && !imagePreview && (
                          <div className="relative aspect-[3/1] overflow-hidden rounded-lg border bg-zinc-50">
                            <Image
                              src={existingCreative.imageUrl}
                              alt={existingCreative.altText || "현재 배너 소재"}
                              fill
                              unoptimized
                              className="object-contain"
                            />
                          </div>
                        )}
                        {imagePreview && (
                          <div className="relative aspect-[3/1] overflow-hidden rounded-lg border bg-zinc-50">
                            <Image
                              src={imagePreview}
                              alt="선택한 배너 이미지 미리보기"
                              fill
                              unoptimized
                              className="object-contain"
                            />
                          </div>
                        )}

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="banner-image-file">
                              {detail.mediaType === "VIDEO"
                                ? "포스터 이미지"
                                : "배너 이미지"}
                            </Label>
                            <Input
                              key={`image-${fileInputKey}`}
                              id="banner-image-file"
                              type="file"
                              accept="image/webp,image/png,image/jpeg"
                              onChange={(event) =>
                                setImageFile(event.target.files?.[0] ?? null)
                              }
                            />
                            <FieldError>
                              {imageFile
                                ? (getBannerFileError(imageFile, "IMAGE") ??
                                  undefined)
                                : undefined}
                            </FieldError>
                          </div>
                          {detail.mediaType === "VIDEO" && (
                            <div className="space-y-2">
                              <Label htmlFor="banner-video-file">
                                MP4 영상
                              </Label>
                              <Input
                                key={`video-${fileInputKey}`}
                                id="banner-video-file"
                                type="file"
                                accept="video/mp4"
                                onChange={(event) =>
                                  setVideoFile(event.target.files?.[0] ?? null)
                                }
                              />
                              <FieldError>
                                {videoFile
                                  ? (getBannerFileError(videoFile, "VIDEO") ??
                                    undefined)
                                  : undefined}
                              </FieldError>
                              {existingCreative?.mediaUrl && (
                                <a
                                  href={existingCreative.mediaUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex text-xs font-medium text-info hover:underline"
                                >
                                  현재 영상 새 창에서 확인
                                </a>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="banner-alt-text">대체 텍스트</Label>
                          <Input
                            id="banner-alt-text"
                            value={creativeForm.altText}
                            onChange={(event) =>
                              updateCreative("altText", event.target.value)
                            }
                            maxLength={500}
                            placeholder="배너가 전달하는 내용을 설명해 주세요."
                          />
                        </div>

                        {renderRule && renderRule.title !== "none" && (
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="banner-creative-title">
                                제목
                                {renderRule.title === "required"
                                  ? " (필수)"
                                  : ""}
                              </Label>
                              <Input
                                id="banner-creative-title"
                                value={creativeForm.title}
                                onChange={(event) =>
                                  updateCreative("title", event.target.value)
                                }
                                maxLength={500}
                              />
                            </div>
                            {renderRule.titleLine2 !== "none" && (
                              <div className="space-y-2">
                                <Label htmlFor="banner-title-line-2">
                                  두 번째 제목
                                </Label>
                                <Input
                                  id="banner-title-line-2"
                                  value={creativeForm.titleLine2}
                                  onChange={(event) =>
                                    updateCreative(
                                      "titleLine2",
                                      event.target.value,
                                    )
                                  }
                                  maxLength={500}
                                />
                              </div>
                            )}
                            {renderRule.description !== "none" && (
                              <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="banner-description">설명</Label>
                                <Textarea
                                  id="banner-description"
                                  value={creativeForm.description}
                                  onChange={(event) =>
                                    updateCreative(
                                      "description",
                                      event.target.value,
                                    )
                                  }
                                  maxLength={500}
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {renderRule?.vehicle && (
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-2">
                              <Label htmlFor="banner-brand">브랜드</Label>
                              <Input
                                id="banner-brand"
                                value={creativeForm.brand}
                                onChange={(event) =>
                                  updateCreative("brand", event.target.value)
                                }
                                maxLength={500}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="banner-model">모델명</Label>
                              <Input
                                id="banner-model"
                                value={creativeForm.modelName}
                                onChange={(event) =>
                                  updateCreative(
                                    "modelName",
                                    event.target.value,
                                  )
                                }
                                maxLength={500}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="banner-price-min">
                                최소 가격(원)
                              </Label>
                              <Input
                                id="banner-price-min"
                                type="number"
                                min={0}
                                step={1}
                                value={creativeForm.priceMin}
                                onChange={(event) =>
                                  updateCreative("priceMin", event.target.value)
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="banner-price-max">
                                최대 가격(원)
                              </Label>
                              <Input
                                id="banner-price-max"
                                type="number"
                                min={0}
                                step={1}
                                value={creativeForm.priceMax}
                                onChange={(event) =>
                                  updateCreative("priceMax", event.target.value)
                                }
                              />
                            </div>
                          </div>
                        )}

                        {renderRule?.vehicle && (
                          <div className="space-y-2">
                            <Label htmlFor="banner-disclaimer">고지 문구</Label>
                            <Textarea
                              id="banner-disclaimer"
                              value={creativeForm.disclaimer}
                              onChange={(event) =>
                                updateCreative("disclaimer", event.target.value)
                              }
                              maxLength={500}
                            />
                          </div>
                        )}

                        <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-2">
                            <p
                              className="text-xs text-zinc-500"
                              aria-live="polite"
                            >
                              {uploadStage ??
                                creativeIssue ??
                                "저장하면 파일 업로드와 서버 검증을 순서대로 진행합니다."}
                            </p>
                            {creativeError && (
                              <p
                                role="alert"
                                className="text-sm text-destructive-foreground"
                              >
                                {creativeError}
                              </p>
                            )}
                          </div>
                          <Button
                            onClick={() => uploadMutation.mutate()}
                            disabled={
                              uploadMutation.isPending || creativeIssue !== null
                            }
                          >
                            {uploadMutation.isPending ? (
                              <LoaderCircle className="animate-spin" />
                            ) : existingCreative ? (
                              <Upload />
                            ) : (
                              <ImagePlus />
                            )}
                            {existingCreative ? "소재 교체" : "소재 등록"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {detail && (
                <p className="text-xs text-zinc-400">
                  생성 {formatDateTime(detail.createdAt)} · 최근 수정{" "}
                  {formatDateTime(detail.updatedAt)}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={requestClose} disabled={isBusy}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              저장하지 않은 변경사항을 버릴까요?
            </AlertDialogTitle>
            <AlertDialogDescription>
              입력한 배너 정보와 선택한 파일은 저장되지 않습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>계속 편집</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive-hover"
              onClick={() => {
                setDiscardOpen(false);
                onOpenChange(false);
              }}
            >
              변경사항 버리기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={discardCreativeOpen}
        onOpenChange={setDiscardCreativeOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>소재 변경사항을 버릴까요?</AlertDialogTitle>
            <AlertDialogDescription>
              입력한 소재 정보와 선택한 파일은 저장되지 않습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>계속 편집</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive-hover"
              onClick={() => {
                setDiscardCreativeOpen(false);
                setCreativeLanguage(null);
                setImageFile(null);
                setVideoFile(null);
              }}
            >
              변경사항 버리기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteLanguage !== null}
        onOpenChange={(next) => !next && setDeleteLanguage(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteLanguage?.toUpperCase()} 소재를 삭제할까요?
            </AlertDialogTitle>
            <AlertDialogDescription>
              다른 언어의 소재와 배너 설정은 유지되지만 이 언어가 참조하는
              이미지와 영상 파일은 함께 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCreativeMutation.isPending}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive-hover"
              disabled={deleteCreativeMutation.isPending || !deleteLanguage}
              onClick={(event) => {
                event.preventDefault();
                if (deleteLanguage)
                  deleteCreativeMutation.mutate(deleteLanguage);
              }}
            >
              {deleteCreativeMutation.isPending && (
                <LoaderCircle className="animate-spin" />
              )}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
