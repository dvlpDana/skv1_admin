export type OrgType = "SKV1" | "MADEINLEMON";
export type AuthMethod = "PASSWORD" | "SOCIAL";
export type InquiryStatus = "PENDING" | "ANSWERED";
export type FaqCategory = "MEMBER_INFO" | "MY_CAR" | "CHAT_PURCHASE" | "SELLER";

export interface AdminAccount {
  id: number;
  email: string;
  name: string;
  orgType: OrgType;
  authMethod: AuthMethod;
  active: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface Faq {
  id: number;
  category: FaqCategory;
  displayOrder: number;
  question: string;
  answer: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoticeListItem {
  id: number;
  title: string;
  viewCount: number;
  createdAt: string;
}

export interface Notice extends NoticeListItem {
  content: string;
  updatedAt: string;
}

export interface InquiryListItem {
  id: number;
  categoryName: string;
  title: string;
  status: InquiryStatus;
  createdAt: string;
}

export interface InquiryImage {
  id: number;
  fileUrl: string;
  status: string;
  orderIndex: number;
  createdAt: string;
}

export interface Inquiry extends InquiryListItem {
  categoryId: number;
  content: string;
  requesterName: string;
  requesterEmail: string;
  answer: string | null;
  answeredAt: string | null;
  answeredByAdminName: string | null;
  questionImages: InquiryImage[];
  answerImages: InquiryImage[];
}

export interface InquiryCategory {
  id: number;
  name: string;
  displayOrder: number;
  active: boolean;
}

export interface AuditLog {
  id: number;
  adminId: number;
  adminName: string;
  orgType: OrgType;
  action: string;
  targetType: string;
  targetId: number | null;
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  number?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
  first?: boolean;
  last?: boolean;
}

export interface UploadFileRequest {
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface UploadUrlItem {
  attachmentId?: number;
  id?: number;
  presignedUrl: string;
  fileName?: string;
}

export const FAQ_CATEGORY_LABELS: Record<FaqCategory, string> = {
  MEMBER_INFO: "회원 정보",
  MY_CAR: "내 차 관리",
  CHAT_PURCHASE: "채팅·구매",
  SELLER: "판매자",
};

export const FAQ_CATEGORIES = Object.keys(FAQ_CATEGORY_LABELS) as FaqCategory[];
