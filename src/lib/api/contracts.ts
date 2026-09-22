import { z } from "zod";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface AdminApiContract {
  id: string;
  pattern: RegExp;
  methods: readonly HttpMethod[];
  query?: Record<string, (value: string) => boolean>;
  bodyMethods?: readonly HttpMethod[];
  bodySchemas?: Partial<Record<HttpMethod, z.ZodType>>;
}

const isPage = (value: string) => /^\d+$/.test(value);
const isSize = (value: string) => {
  if (!/^\d+$/.test(value)) return false;
  const parsed = Number(value);
  return parsed >= 1 && parsed <= 100;
};
const isPositiveId = (value: string) => /^[1-9]\d*$/.test(value);
const isSort = (value: string) =>
  /^[A-Za-z][A-Za-z0-9]*(,(asc|desc))?$/.test(value);
const isFaqCategory = (value: string) =>
  ["MEMBER_INFO", "MY_CAR", "CHAT_PURCHASE", "SELLER"].includes(value);
const isInquiryStatus = (value: string) =>
  ["PENDING", "ANSWERED"].includes(value);
const isAuditTarget = (value: string) =>
  ["FAQ", "NOTICE", "INQUIRY", "INQUIRY_CATEGORY", "ADMIN_ACCOUNT"].includes(
    value,
  );
const isBoolean = (value: string) => ["true", "false"].includes(value);
const isBannerValue = (value: string) => /^[A-Z][A-Z0-9_]{0,79}$/.test(value);
const isBannerAssetType = (value: string) => ["IMAGE", "VIDEO"].includes(value);

const paginationQuery = {
  page: isPage,
  size: isSize,
  sort: isSort,
};

const nonEmptyText = z.string().trim().min(1);
const positiveInteger = z.number().int().positive();
const faqCategorySchema = z.enum([
  "MEMBER_INFO",
  "MY_CAR",
  "CHAT_PURCHASE",
  "SELLER",
]);
const faqPayloadSchema = z
  .object({
    category: faqCategorySchema,
    displayOrder: positiveInteger,
    question: nonEmptyText,
    answer: nonEmptyText,
  })
  .strict();
const noticePayloadSchema = z
  .object({ title: nonEmptyText, content: nonEmptyText })
  .strict();
const optionalBannerText = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .nullable()
  .optional();
const bannerEnum = z.string().regex(/^[A-Z][A-Z0-9_]{0,79}$/);
const appVersion = z.string().regex(/^\d+\.\d+\.\d+$/);
const dateTime = z.string().datetime({ offset: true });
const navigationParams = z.record(
  z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,79}$/),
  z.string().trim().min(1).max(500),
);
const bannerFields = {
  placement: bannerEnum,
  mediaType: z.enum(["IMAGE", "VIDEO"]),
  labelType: bannerEnum.nullable().optional(),
  paidAd: z.boolean(),
  userTypeTarget: bannerEnum.nullable().optional(),
  platform: bannerEnum.nullable().optional(),
  targetCountryCode: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .nullable()
    .optional(),
  minAppVersion: appVersion.nullable().optional(),
  maxAppVersion: appVersion.nullable().optional(),
  navigationKey: bannerEnum.nullable().optional(),
  navigationParams: navigationParams.optional(),
  externalUrl: z
    .string()
    .max(2048)
    .refine((value) => {
      try {
        return new URL(value).protocol === "https:";
      } catch {
        return false;
      }
    })
    .nullable()
    .optional(),
  priority: z.number().int().nonnegative(),
  active: z.boolean(),
  startAt: dateTime.nullable().optional(),
  endAt: dateTime.nullable().optional(),
};
const bannerCreateSchema = z.object(bannerFields).strict();
const bannerUpdateSchema = z.object(bannerFields).partial().strict();
const bannerCreativeSchema = z
  .object({
    imageKey: nonEmptyText,
    mediaKey: optionalBannerText,
    title: optionalBannerText,
    description: optionalBannerText,
    titleLine2: optionalBannerText,
    brand: optionalBannerText,
    modelName: optionalBannerText,
    priceMin: z.number().int().nonnegative().nullable().optional(),
    priceMax: z.number().int().nonnegative().nullable().optional(),
    disclaimer: optionalBannerText,
    altText: nonEmptyText.max(500),
  })
  .strict();

const contracts: readonly AdminApiContract[] = [
  { id: "me", pattern: /^me$/, methods: ["GET"] },
  {
    id: "change-password",
    pattern: /^me\/password$/,
    methods: ["PUT"],
    bodyMethods: ["PUT"],
    bodySchemas: {
      PUT: z
        .object({ currentPassword: nonEmptyText, newPassword: nonEmptyText })
        .strict(),
    },
  },
  {
    id: "accounts",
    pattern: /^accounts$/,
    methods: ["GET", "POST"],
    bodyMethods: ["POST"],
    bodySchemas: {
      POST: z
        .object({
          email: z.string().trim().email(),
          name: nonEmptyText,
          orgType: z.enum(["SKV1", "MADEINLEMON"]),
          authMethod: z.literal("PASSWORD"),
          password: nonEmptyText,
        })
        .strict(),
    },
  },
  {
    id: "account-active",
    pattern: /^accounts\/[1-9]\d*\/active$/,
    methods: ["PATCH"],
    bodyMethods: ["PATCH"],
    bodySchemas: { PATCH: z.object({ active: z.boolean() }).strict() },
  },
  {
    id: "account-reset-password",
    pattern: /^accounts\/[1-9]\d*\/reset-password$/,
    methods: ["POST"],
  },
  {
    id: "faqs",
    pattern: /^faqs$/,
    methods: ["GET", "POST"],
    query: { category: isFaqCategory },
    bodyMethods: ["POST"],
    bodySchemas: { POST: faqPayloadSchema },
  },
  {
    id: "faq-reorder",
    pattern: /^faqs\/reorder$/,
    methods: ["PUT"],
    bodyMethods: ["PUT"],
    bodySchemas: {
      PUT: z
        .object({
          category: faqCategorySchema,
          orderedIds: z.array(positiveInteger).min(1),
        })
        .strict()
        .refine(
          (value) => new Set(value.orderedIds).size === value.orderedIds.length,
          { message: "orderedIds must not contain duplicates" },
        ),
    },
  },
  {
    id: "faq-detail",
    pattern: /^faqs\/[1-9]\d*$/,
    methods: ["GET", "PUT", "DELETE"],
    bodyMethods: ["PUT"],
    bodySchemas: {
      PUT: z
        .object({
          category: faqCategorySchema.nullable().optional(),
          displayOrder: positiveInteger.nullable().optional(),
          question: nonEmptyText.nullable().optional(),
          answer: nonEmptyText.nullable().optional(),
        })
        .strict(),
    },
  },
  {
    id: "notices",
    pattern: /^notices$/,
    methods: ["GET", "POST"],
    query: paginationQuery,
    bodyMethods: ["POST"],
    bodySchemas: { POST: noticePayloadSchema },
  },
  {
    id: "notice-detail",
    pattern: /^notices\/[1-9]\d*$/,
    methods: ["GET", "PUT", "DELETE"],
    bodyMethods: ["PUT"],
    bodySchemas: {
      PUT: z
        .object({
          title: nonEmptyText.nullable().optional(),
          content: nonEmptyText.nullable().optional(),
        })
        .strict(),
    },
  },
  {
    id: "inquiries",
    pattern: /^inquiries$/,
    methods: ["GET"],
    query: { ...paginationQuery, status: isInquiryStatus },
  },
  {
    id: "inquiry-detail",
    pattern: /^inquiries\/[1-9]\d*$/,
    methods: ["GET"],
  },
  {
    id: "inquiry-answer",
    pattern: /^inquiries\/[1-9]\d*\/answer$/,
    methods: ["PUT"],
    bodyMethods: ["PUT"],
    bodySchemas: {
      PUT: z.object({ answer: nonEmptyText }).strict(),
    },
  },
  {
    id: "inquiry-answer-upload-urls",
    pattern: /^inquiries\/[1-9]\d*\/answer\/attachments\/upload-urls$/,
    methods: ["POST"],
    bodyMethods: ["POST"],
    bodySchemas: {
      POST: z
        .object({
          files: z
            .array(
              z
                .object({
                  fileName: nonEmptyText,
                  mimeType: z.string().regex(/^image\//),
                  fileSize: positiveInteger.max(10 * 1024 * 1024),
                })
                .strict(),
            )
            .min(1)
            .max(10),
        })
        .strict(),
    },
  },
  {
    id: "inquiry-answer-confirm",
    pattern: /^inquiries\/[1-9]\d*\/answer\/attachments\/confirm$/,
    methods: ["PUT"],
  },
  {
    id: "inquiry-categories",
    pattern: /^inquiry-categories$/,
    methods: ["GET", "POST"],
    bodyMethods: ["POST"],
    bodySchemas: {
      POST: z
        .object({ name: nonEmptyText, displayOrder: positiveInteger })
        .strict(),
    },
  },
  {
    id: "inquiry-category-detail",
    pattern: /^inquiry-categories\/[1-9]\d*$/,
    methods: ["PUT"],
    bodyMethods: ["PUT"],
    bodySchemas: {
      PUT: z
        .object({
          name: nonEmptyText.nullable().optional(),
          displayOrder: positiveInteger.nullable().optional(),
        })
        .strict(),
    },
  },
  {
    id: "inquiry-category-active",
    pattern: /^inquiry-categories\/[1-9]\d*\/active$/,
    methods: ["PATCH"],
    bodyMethods: ["PATCH"],
    bodySchemas: { PATCH: z.object({ active: z.boolean() }).strict() },
  },
  {
    id: "banners",
    pattern: /^banners$/,
    methods: ["GET", "POST"],
    query: { ...paginationQuery, placement: isBannerValue, active: isBoolean },
    bodyMethods: ["POST"],
    bodySchemas: { POST: bannerCreateSchema },
  },
  {
    id: "banner-placements",
    pattern: /^banners\/placements$/,
    methods: ["GET"],
  },
  {
    id: "banner-navigation-keys",
    pattern: /^banners\/navigation-keys$/,
    methods: ["GET"],
  },
  {
    id: "banner-detail",
    pattern: /^banners\/[1-9]\d*$/,
    methods: ["GET", "PUT", "DELETE"],
    bodyMethods: ["PUT"],
    bodySchemas: { PUT: bannerUpdateSchema },
  },
  {
    id: "banner-creative-upload-url",
    pattern: /^banners\/[1-9]\d*\/creatives\/(ko|en|ru)\/upload-url$/,
    methods: ["POST"],
    query: { assetType: isBannerAssetType },
  },
  {
    id: "banner-creative-confirm",
    pattern: /^banners\/[1-9]\d*\/creatives\/(ko|en|ru)\/confirm$/,
    methods: ["POST"],
    bodyMethods: ["POST"],
    bodySchemas: { POST: bannerCreativeSchema },
  },
  {
    id: "banner-creative-detail",
    pattern: /^banners\/[1-9]\d*\/creatives\/(ko|en|ru)$/,
    methods: ["DELETE"],
  },
  {
    id: "audit-logs",
    pattern: /^audit-logs$/,
    methods: ["GET"],
    query: {
      ...paginationQuery,
      targetType: isAuditTarget,
      adminId: isPositiveId,
    },
  },
] as const;

export type ContractMatch =
  | { ok: true; contract: AdminApiContract }
  | { ok: false; status: 404 | 405; allowedMethods?: readonly HttpMethod[] };

export function matchAdminApiContract(
  path: string,
  method: string,
): ContractMatch {
  if (
    !path ||
    path.length > 240 ||
    path.includes("..") ||
    path.includes("\\") ||
    path.includes("//")
  ) {
    return { ok: false, status: 404 };
  }

  const contract = contracts.find((item) => item.pattern.test(path));
  if (!contract) return { ok: false, status: 404 };

  const normalizedMethod = method.toUpperCase() as HttpMethod;
  if (!contract.methods.includes(normalizedMethod)) {
    return {
      ok: false,
      status: 405,
      allowedMethods: contract.methods,
    };
  }

  return { ok: true, contract };
}

export function validateContractQuery(
  searchParams: URLSearchParams,
  contract: AdminApiContract,
): boolean {
  const validators = contract.query ?? {};

  for (const key of new Set(searchParams.keys())) {
    const validator = validators[key];
    const values = searchParams.getAll(key);

    if (
      !validator ||
      values.length !== 1 ||
      values[0].length > 100 ||
      !validator(values[0])
    ) {
      return false;
    }
  }

  return true;
}

export function validateContractBody(
  body: string,
  contract: AdminApiContract,
  method: string,
): { ok: true; normalizedBody: string } | { ok: false } {
  const schema = contract.bodySchemas?.[method.toUpperCase() as HttpMethod];
  if (!schema) return { ok: false };

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(body);
  } catch {
    return { ok: false };
  }

  const parsed = schema.safeParse(parsedJson);
  return parsed.success
    ? { ok: true, normalizedBody: JSON.stringify(parsed.data) }
    : { ok: false };
}
