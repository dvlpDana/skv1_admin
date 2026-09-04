"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  ImagePlus,
  LoaderCircle,
  Mail,
  MessageSquareText,
  Paperclip,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { InquiryStatusBadge } from "@/components/features/inquiry-status-badge";
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { SearchField } from "@/components/ui/search-field";
import { SegmentedFilter } from "@/components/ui/segmented-filter";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { adminApi, pageItems, uploadToPresignedUrl } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";
import type {
  Inquiry,
  InquiryListItem,
  InquiryStatus,
  PageResponse,
  UploadUrlItem,
} from "@/types/admin";

function uploadItems(
  data:
    UploadUrlItem[] | { files?: UploadUrlItem[]; uploadUrls?: UploadUrlItem[] },
) {
  return Array.isArray(data) ? data : (data.files ?? data.uploadUrls ?? []);
}

const statusFilters: Array<{
  value: InquiryStatus | "ALL";
  label: string;
}> = [
  { value: "ALL", label: "전체" },
  { value: "PENDING", label: "답변 대기" },
  { value: "ANSWERED", label: "답변 완료" },
];

export function InquiriesManager() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<InquiryStatus | "ALL">("PENDING");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [answerConfirmationOpen, setAnswerConfirmationOpen] = useState(false);
  const listQuery = useQuery({
    queryKey: ["inquiries", status, page],
    queryFn: () =>
      adminApi.get<PageResponse<InquiryListItem>>("inquiries", {
        status: status === "ALL" ? undefined : status,
        page,
        size: 20,
        sort: "createdAt,desc",
      }),
  });
  const detailQuery = useQuery({
    queryKey: ["inquiry", selectedId],
    queryFn: () => adminApi.get<Inquiry>(`inquiries/${selectedId}`),
    enabled: selectedId !== null,
  });
  const inquiries = useMemo(
    () =>
      pageItems(listQuery.data).filter((item) =>
        `${item.title} ${item.categoryName}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [listQuery.data, search],
  );
  useEffect(() => {
    if (detailQuery.data) setAnswer(detailQuery.data.answer ?? "");
  }, [detailQuery.data]);
  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["inquiries"] }),
      queryClient.invalidateQueries({ queryKey: ["inquiry", selectedId] }),
    ]);
  };
  const answerMutation = useMutation({
    mutationFn: () =>
      adminApi.put<Inquiry>(`inquiries/${selectedId}/answer`, { answer }),
    onSuccess: async () => {
      toast.success("답변을 저장했습니다.");
      setAnswerConfirmationOpen(false);
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId || !files.length) return;
      const invalid = files.find((file) => file.size > 10 * 1024 * 1024);
      if (invalid) throw new Error(`${invalid.name} 파일은 10MB를 초과합니다.`);
      const requested = await adminApi.post<
        | UploadUrlItem[]
        | { files?: UploadUrlItem[]; uploadUrls?: UploadUrlItem[] }
      >(`inquiries/${selectedId}/answer/attachments/upload-urls`, {
        files: files.map((file) => ({
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
        })),
      });
      const urls = uploadItems(requested);
      if (urls.length !== files.length)
        throw new Error("업로드 URL 수가 선택한 파일 수와 일치하지 않습니다.");
      await Promise.all(
        urls.map((item, index) =>
          uploadToPresignedUrl(item.presignedUrl, files[index]),
        ),
      );
      await adminApi.put<{ result?: string }>(
        `inquiries/${selectedId}/answer/attachments/confirm`,
      );
    },
    onSuccess: async () => {
      toast.success("답변 이미지를 업로드했습니다.");
      setFiles([]);
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  function onFilesChange(next: FileList | null) {
    if (!next) return;
    const selected = Array.from(next);
    if (selected.length > 10) {
      toast.error("이미지는 최대 10개까지 첨부할 수 있습니다.");
      return;
    }
    const unsupported = selected.find(
      (file) => !file.type.startsWith("image/") || file.size === 0,
    );
    if (unsupported) {
      toast.error(`${unsupported.name} 파일은 올바른 이미지가 아닙니다.`);
      return;
    }
    const oversized = selected.find((file) => file.size > 10 * 1024 * 1024);
    if (oversized) {
      toast.error(`${oversized.name} 파일은 10MB를 초과합니다.`);
      return;
    }
    setFiles(selected);
  }

  function submitAnswer() {
    const previousAnswer = detailQuery.data?.answer?.trim() ?? "";
    if (
      detailQuery.data?.status === "ANSWERED" &&
      answer.trim() !== previousAnswer
    ) {
      setAnswerConfirmationOpen(true);
      return;
    }
    answerMutation.mutate();
  }

  function changeStatus(nextStatus: InquiryStatus | "ALL") {
    setStatus(nextStatus);
    setPage(0);
  }

  return (
    <div className="space-y-7">
      <Card className="overflow-hidden">
        <FilterToolbar
          search={
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="문의 제목 또는 문의 항목 검색"
            />
          }
          filter={
            <SegmentedFilter
              value={status}
              options={statusFilters}
              onValueChange={changeStatus}
              ariaLabel="문의 상태 필터"
            />
          }
          summary={
            search
              ? `${inquiries.length}건 표시`
              : `총 ${listQuery.data?.totalElements ?? inquiries.length}건`
          }
        />
        {listQuery.isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-14" />
            ))}
          </div>
        ) : listQuery.isError ? (
          <QueryErrorState onRetry={() => listQuery.refetch()} />
        ) : inquiries.length === 0 ? (
          <EmptyState
            icon={MessageSquareText}
            title={search ? "검색 결과가 없습니다" : "문의가 없습니다"}
            description={
              search
                ? "검색어를 바꾸거나 검색 조건을 초기화해 주세요."
                : "선택한 상태에 해당하는 고객 문의가 없습니다."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>상태</TableHead>
                <TableHead>문의 항목</TableHead>
                <TableHead>제목</TableHead>
                <TableHead>접수일</TableHead>
                <TableHead className="w-14">
                  <span className="sr-only">열기</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inquiries.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedId(item.id);
                    }
                  }}
                >
                  <TableCell>
                    <InquiryStatusBadge status={item.status} />
                  </TableCell>
                  <TableCell>{item.categoryName}</TableCell>
                  <TableCell className="max-w-[560px] truncate font-semibold text-zinc-900">
                    {item.title}
                  </TableCell>
                  <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                  <TableCell>
                    <ArrowUpRight className="size-4 text-zinc-400" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <PaginationControls
          page={page}
          totalPages={listQuery.data?.totalPages ?? 1}
          onPageChange={setPage}
        />
      </Card>
      <Dialog
        open={selectedId !== null}
        onOpenChange={(open) => {
          if (!open && !uploadMutation.isPending && !answerMutation.isPending) {
            setSelectedId(null);
            setFiles([]);
          }
        }}
      >
        <DialogContent className="max-w-5xl">
          {detailQuery.isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-32" />
              <Skeleton className="h-48" />
            </div>
          ) : detailQuery.isError || !detailQuery.data ? (
            <QueryErrorState
              title="문의 내용을 불러오지 못했습니다"
              onRetry={() => detailQuery.refetch()}
            />
          ) : (
            <>
              <DialogHeader>
                <div className="mb-2 flex items-center gap-2">
                  <InquiryStatusBadge status={detailQuery.data.status} />
                  <span className="text-xs text-zinc-400">
                    문의 #{detailQuery.data.id}
                  </span>
                </div>
                <DialogTitle>{detailQuery.data.title}</DialogTitle>
                <DialogDescription>
                  {detailQuery.data.categoryName} ·{" "}
                  {formatDateTime(detailQuery.data.createdAt)}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
                <section className="rounded-xl border bg-zinc-50 p-5">
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-500">
                    <span className="flex items-center gap-1.5">
                      <UserRound className="size-4" />
                      {detailQuery.data.requesterName}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Mail className="size-4" />
                      {detailQuery.data.requesterEmail}
                    </span>
                  </div>
                  <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-zinc-700">
                    {detailQuery.data.content}
                  </p>
                  {detailQuery.data.questionImages.length > 0 && (
                    <div className="mt-5 grid grid-cols-3 gap-2">
                      {detailQuery.data.questionImages.map((image) => (
                        <a
                          key={image.id}
                          href={image.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative aspect-square overflow-hidden rounded-lg bg-zinc-200"
                        >
                          <Image
                            src={image.fileUrl}
                            alt="고객 첨부 이미지"
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </section>
                <section className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="inquiry-answer">관리자 답변</Label>
                    <Textarea
                      id="inquiry-answer"
                      className="min-h-52"
                      value={answer}
                      onChange={(event) => setAnswer(event.target.value)}
                      placeholder="고객에게 전달할 답변을 입력해주세요."
                    />
                  </div>
                  {detailQuery.data.answerImages.length > 0 && (
                    <div className="grid grid-cols-5 gap-2">
                      {detailQuery.data.answerImages.map((image) => (
                        <a
                          key={image.id}
                          href={image.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative aspect-square overflow-hidden rounded-lg bg-zinc-200"
                        >
                          <Image
                            src={image.fileUrl}
                            alt="답변 첨부 이미지"
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="rounded-lg border border-dashed p-4">
                    <Label
                      htmlFor="answer-images"
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <ImagePlus className="size-4 text-zinc-500" />
                      답변 이미지 추가
                    </Label>
                    <Input
                      id="answer-images"
                      type="file"
                      accept="image/*"
                      multiple
                      className="mt-3 h-auto py-2"
                      onChange={(event) => onFilesChange(event.target.files)}
                    />
                    <p className="mt-2 text-xs text-zinc-400">
                      최대 10개, 파일당 10MB
                    </p>
                    {files.length > 0 && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-zinc-600">
                        <Paperclip className="size-3.5" />
                        {files.length}개 선택됨
                      </p>
                    )}
                  </div>
                </section>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  disabled={
                    !files.length ||
                    uploadMutation.isPending ||
                    answerMutation.isPending
                  }
                  onClick={() => uploadMutation.mutate()}
                >
                  {uploadMutation.isPending && (
                    <LoaderCircle className="animate-spin" />
                  )}
                  이미지 업로드
                </Button>
                <Button
                  disabled={
                    !answer.trim() ||
                    answerMutation.isPending ||
                    uploadMutation.isPending
                  }
                  onClick={submitAnswer}
                >
                  {answerMutation.isPending && (
                    <LoaderCircle className="animate-spin" />
                  )}
                  {detailQuery.data.status === "ANSWERED"
                    ? "답변 수정"
                    : "답변 등록"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={answerConfirmationOpen}
        onOpenChange={setAnswerConfirmationOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>기존 답변을 수정할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              새 답변을 저장하면 고객에게 표시되는 기존 답변이 즉시 교체됩니다.
              이전 답변은 이 화면에서 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={answerMutation.isPending}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={answerMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                answerMutation.mutate();
              }}
            >
              {answerMutation.isPending && (
                <LoaderCircle className="animate-spin" />
              )}
              답변 수정
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
