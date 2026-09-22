"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ImageIcon,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BannerEditorDialog } from "@/components/features/banner-editor-dialog";
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
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { QueryErrorState } from "@/components/ui/query-error-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminApi, pageItems } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";
import type {
  Banner,
  BannerListItem,
  BannerPlacement,
  PageResponse,
} from "@/types/admin";

type ActiveFilter = "ALL" | "true" | "false";

function placementLabel(value: string) {
  return value.replaceAll("_", " ");
}

function BannerStatus({ banner }: { banner: BannerListItem }) {
  if (!banner.active) return <Badge variant="neutral">비활성</Badge>;

  const now = Date.now();
  const startsAt = banner.startAt ? new Date(banner.startAt).getTime() : null;
  const endsAt = banner.endAt ? new Date(banner.endAt).getTime() : null;
  if (startsAt !== null && Number.isFinite(startsAt) && startsAt > now) {
    return <Badge variant="info">노출 예정</Badge>;
  }
  if (endsAt !== null && Number.isFinite(endsAt) && endsAt <= now) {
    return <Badge variant="neutral">노출 종료</Badge>;
  }
  return <Badge variant="success">노출 중</Badge>;
}

export function BannersManager() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [placement, setPlacement] = useState("ALL");
  const [active, setActive] = useState<ActiveFilter>("ALL");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BannerListItem | null>(null);
  const [activeTarget, setActiveTarget] = useState<BannerListItem | null>(null);

  const placementsQuery = useQuery({
    queryKey: ["banner-placements"],
    queryFn: () => adminApi.get<BannerPlacement[]>("banners/placements"),
  });
  const listQuery = useQuery({
    queryKey: ["banners", placement, active, page],
    queryFn: () =>
      adminApi.get<PageResponse<BannerListItem>>("banners", {
        placement: placement === "ALL" ? undefined : placement,
        active: active === "ALL" ? undefined : active,
        page,
        size: 20,
        sort: "id,desc",
      }),
  });
  const banners = pageItems(listQuery.data);
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["banners"] });

  const activeMutation = useMutation({
    mutationFn: (item: BannerListItem) =>
      adminApi.put<Banner>(`banners/${item.id}`, { active: !item.active }),
    onSuccess: async (banner) => {
      toast.success(
        banner.active
          ? "배너 노출을 활성화했습니다."
          : "배너 노출을 비활성화했습니다.",
      );
      setActiveTarget(null);
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      adminApi.delete<{ result: string }>(`banners/${id}`),
    onSuccess: async () => {
      toast.success("배너를 삭제했습니다.");
      setDeleteTarget(null);
      if (banners.length === 1 && page > 0) setPage((value) => value - 1);
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function openCreate() {
    setEditingId(null);
    setEditorOpen(true);
  }

  function openEdit(id: number) {
    setEditingId(id);
    setEditorOpen(true);
  }

  return (
    <div className="space-y-7">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus />
          배너 등록
        </Button>
      </div>

      <Card className="overflow-hidden">
        <FilterToolbar
          search={
            <Select
              value={placement}
              onValueChange={(value) => {
                setPlacement(value);
                setPage(0);
              }}
              disabled={placementsQuery.isLoading}
            >
              <SelectTrigger
                className="w-full xl:w-80"
                aria-label="배너 지면 필터"
              >
                <SelectValue placeholder="전체 지면" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체 지면</SelectItem>
                {(placementsQuery.data ?? []).map((item) => (
                  <SelectItem key={item.placement} value={item.placement}>
                    {placementLabel(item.placement)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          filter={
            <Select
              value={active}
              onValueChange={(value) => {
                setActive(value as ActiveFilter);
                setPage(0);
              }}
            >
              <SelectTrigger
                className="w-full sm:w-40"
                aria-label="배너 활성 상태 필터"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체 상태</SelectItem>
                <SelectItem value="true">활성</SelectItem>
                <SelectItem value="false">비활성</SelectItem>
              </SelectContent>
            </Select>
          }
          summary={`총 ${listQuery.data?.totalElements ?? banners.length}개`}
        />

        {listQuery.isLoading ? (
          <div className="space-y-2 p-6" aria-busy="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-16" />
            ))}
          </div>
        ) : listQuery.isError ? (
          <QueryErrorState onRetry={() => listQuery.refetch()} />
        ) : banners.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title="배너가 없습니다"
            description="선택한 조건에 맞는 배너가 없습니다. 새 배너를 등록해 주세요."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>상태</TableHead>
                <TableHead>지면</TableHead>
                <TableHead>미디어</TableHead>
                <TableHead>언어</TableHead>
                <TableHead>우선순위</TableHead>
                <TableHead>노출 기간</TableHead>
                <TableHead>생성일</TableHead>
                <TableHead className="w-14">
                  <span className="sr-only">작업</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banners.map((banner) => (
                <TableRow key={banner.id}>
                  <TableCell>
                    <BannerStatus banner={banner} />
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-zinc-900">
                      {placementLabel(banner.placement)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      #{banner.id}
                      {banner.labelType ? ` · ${banner.labelType}` : ""}
                    </p>
                  </TableCell>
                  <TableCell>{banner.mediaType}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(banner.creativeLangs ?? []).length ? (
                        banner.creativeLangs.map((lang) => (
                          <Badge key={lang} variant="outline">
                            {lang.toUpperCase()}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="warning">미등록</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{banner.priority}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs leading-5 text-zinc-500">
                    <span className="block">
                      {formatDateTime(banner.startAt)}
                    </span>
                    <span className="block">
                      ~ {formatDateTime(banner.endAt)}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(banner.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`배너 ${banner.id} 작업 열기`}
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => openEdit(banner.id)}>
                          <Pencil />
                          수정
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={
                            !banner.active && !banner.creativeLangs?.length
                          }
                          onSelect={() => setActiveTarget(banner)}
                        >
                          <Power />
                          {banner.active ? "비활성화" : "활성화"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          data-variant="destructive"
                          onSelect={() => setDeleteTarget(banner)}
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
          totalPages={listQuery.data?.totalPages ?? 1}
          onPageChange={setPage}
        />
      </Card>

      <BannerEditorDialog
        open={editorOpen}
        bannerId={editingId}
        onOpenChange={setEditorOpen}
        onChanged={invalidate}
      />

      <AlertDialog
        open={activeTarget !== null}
        onOpenChange={(open) => !open && setActiveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              배너를{" "}
              {activeTarget?.active ? "비활성화할까요?" : "활성화할까요?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {activeTarget?.active
                ? "배너가 공개 화면에서 즉시 사라집니다. 배너와 소재는 삭제되지 않습니다."
                : "설정한 기간과 타게팅 조건에 따라 배너가 공개 화면에 노출됩니다."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={activeMutation.isPending}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={activeMutation.isPending || !activeTarget}
              onClick={(event) => {
                event.preventDefault();
                if (activeTarget) activeMutation.mutate(activeTarget);
              }}
            >
              {activeMutation.isPending && (
                <LoaderCircle className="animate-spin" />
              )}
              {activeTarget?.active ? "비활성화" : "활성화"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>배너를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              배너 #{deleteTarget?.id}가 공개 목록에서 즉시 사라지고 언어별
              이미지와 영상 파일도 함께 삭제됩니다. 관리자 화면에서는 복구할 수
              없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive-hover"
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
