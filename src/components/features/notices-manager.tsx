"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpenText,
  Eye,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { SearchField } from "@/components/ui/search-field";
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
import { adminApi, pageItems } from "@/lib/api/client";
import { formatDate } from "@/lib/utils";
import type { Notice, NoticeListItem, PageResponse } from "@/types/admin";

const previewStyle = `<style>body{font-family:system-ui,sans-serif;line-height:1.7;color:#27272a;padding:24px;margin:0}img{max-width:100%;height:auto}a{color:#b80f0a}</style>`;

export function NoticesManager() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NoticeListItem | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const query = useQuery({
    queryKey: ["notices", page],
    queryFn: () =>
      adminApi.get<PageResponse<NoticeListItem> | NoticeListItem[]>("notices", {
        page,
        size: 20,
        sort: "createdAt,desc",
      }),
  });
  const list = useMemo(
    () =>
      pageItems(query.data).filter((notice) =>
        notice.title.toLowerCase().includes(search.toLowerCase()),
      ),
    [query.data, search],
  );
  const totalPages = !Array.isArray(query.data)
    ? (query.data?.totalPages ?? 1)
    : 1;
  const saveMutation = useMutation({
    mutationFn: () =>
      editingId
        ? adminApi.put<Notice>(`notices/${editingId}`, { title, content })
        : adminApi.post<Notice>("notices", { title, content }),
    onSuccess: async () => {
      toast.success(
        editingId ? "공지사항을 수정했습니다." : "공지사항을 등록했습니다.",
      );
      setFormOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["notices"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      adminApi.delete<{ result: string }>(`notices/${id}`),
    onSuccess: async () => {
      toast.success("공지사항을 삭제했습니다.");
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["notices"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  async function openEdit(id: number) {
    try {
      const notice = await queryClient.fetchQuery({
        queryKey: ["notice", id],
        queryFn: () => adminApi.get<Notice>(`notices/${id}`),
      });
      setEditingId(id);
      setTitle(notice.title);
      setContent(notice.content);
      setFormOpen(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "공지를 불러오지 못했습니다.",
      );
    }
  }
  function openCreate() {
    setEditingId(null);
    setTitle("");
    setContent("");
    setFormOpen(true);
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="콘텐츠 관리"
        title="공지사항"
        description="고객에게 공개되는 공지를 작성하고 HTML 본문을 미리 확인합니다."
        actions={
          <Button onClick={openCreate}>
            <Plus />
            공지 등록
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="공지 제목 검색"
          />
          <p className="text-sm text-zinc-500">
            총{" "}
            {!Array.isArray(query.data)
              ? (query.data?.totalElements ?? list.length)
              : list.length}
            건
          </p>
        </div>
        {query.isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-14" />
            ))}
          </div>
        ) : query.isError ? (
          <QueryErrorState onRetry={() => query.refetch()} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={BookOpenText}
            title="공지사항이 없습니다"
            description="고객에게 전달할 첫 공지사항을 등록해주세요."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">번호</TableHead>
                <TableHead>제목</TableHead>
                <TableHead>조회수</TableHead>
                <TableHead>등록일</TableHead>
                <TableHead className="w-14">
                  <span className="sr-only">작업</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((notice) => (
                <TableRow key={notice.id}>
                  <TableCell className="font-medium text-zinc-500">
                    {notice.id}
                  </TableCell>
                  <TableCell className="max-w-[560px] truncate font-semibold text-zinc-900">
                    {notice.title}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      <Eye className="size-4 text-zinc-400" />
                      {notice.viewCount.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(notice.createdAt)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => openEdit(notice.id)}>
                          <Pencil />
                          수정
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          data-variant="destructive"
                          onSelect={() => setDeleteTarget(notice)}
                        >
                          <Trash2 />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <PaginationControls
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </Card>
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "공지사항 수정" : "공지사항 등록"}
            </DialogTitle>
            <DialogDescription>
              HTML은 별도 정제 없이 공개 페이지에 반영됩니다. 신뢰할 수 있는
              마크업만 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notice-title">제목</Label>
              <Input
                id="notice-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="notice-content">HTML 본문</Label>
                <Textarea
                  id="notice-content"
                  className="min-h-[420px] font-mono text-xs leading-6"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="<h2>공지 제목</h2>"
                />
              </div>
              <div className="space-y-2">
                <Label>안전한 미리보기</Label>
                <iframe
                  title="공지사항 미리보기"
                  sandbox=""
                  srcDoc={`${previewStyle}${content}`}
                  className="h-[420px] w-full rounded-md border bg-white"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              취소
            </Button>
            <Button
              disabled={
                !title.trim() || !content.trim() || saveMutation.isPending
              }
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending && (
                <LoaderCircle className="animate-spin" />
              )}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>공지사항을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.title}” 공지는 복구할 수 없으며 공개 목록에서도
              즉시 사라집니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending || !deleteTarget}
              onClick={(event) => {
                event.preventDefault();
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              }}
            >
              {deleteMutation.isPending && (
                <LoaderCircle className="animate-spin" />
              )}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
