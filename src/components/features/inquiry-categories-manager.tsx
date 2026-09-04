"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Layers3,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
} from "lucide-react";
import { useState } from "react";
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
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminApi } from "@/lib/api/client";
import type { InquiryCategory } from "@/types/admin";

export function InquiryCategoriesManager() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeTarget, setActiveTarget] = useState<InquiryCategory | null>(
    null,
  );
  const [name, setName] = useState("");
  const [displayOrder, setDisplayOrder] = useState(1);
  const query = useQuery({
    queryKey: ["inquiry-categories"],
    queryFn: () => adminApi.get<InquiryCategory[]>("inquiry-categories"),
  });
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["inquiry-categories"] });
  const saveMutation = useMutation({
    mutationFn: () =>
      editingId
        ? adminApi.put<InquiryCategory>(`inquiry-categories/${editingId}`, {
            name,
            displayOrder,
          })
        : adminApi.post<InquiryCategory>("inquiry-categories", {
            name,
            displayOrder,
          }),
    onSuccess: async () => {
      toast.success(
        editingId ? "문의 항목을 수정했습니다." : "문의 항목을 추가했습니다.",
      );
      setFormOpen(false);
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const activeMutation = useMutation({
    mutationFn: (item: InquiryCategory) =>
      adminApi.patch<InquiryCategory>(`inquiry-categories/${item.id}/active`, {
        active: !item.active,
      }),
    onSuccess: async (item) => {
      toast.success(
        `${item.name} 항목을 ${item.active ? "다시 표시합니다." : "숨겼습니다."}`,
      );
      setActiveTarget(null);
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  function openCreate() {
    setEditingId(null);
    setName("");
    setDisplayOrder((query.data?.length ?? 0) + 1);
    setFormOpen(true);
  }
  function openEdit(item: InquiryCategory) {
    setEditingId(item.id);
    setName(item.name);
    setDisplayOrder(item.displayOrder);
    setFormOpen(true);
  }

  return (
    <div className="space-y-7">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus />
          문의 항목 추가
        </Button>
      </div>
      <Card className="overflow-hidden">
        {query.isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-14" />
            ))}
          </div>
        ) : query.isError ? (
          <QueryErrorState onRetry={() => query.refetch()} />
        ) : !query.data?.length ? (
          <EmptyState
            icon={Layers3}
            title="등록된 문의 항목이 없습니다"
            description="고객이 선택할 문의 항목을 추가해주세요."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>노출 순서</TableHead>
                <TableHead>문의 항목</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>고객 노출</TableHead>
                <TableHead className="w-14">
                  <span className="sr-only">작업</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...query.data]
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-semibold text-zinc-500">
                      {item.displayOrder}
                    </TableCell>
                    <TableCell className="font-semibold text-zinc-900">
                      {item.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.active ? "success" : "neutral"}>
                        {item.active ? "활성" : "비활성"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500">
                      {item.active
                        ? "문의 등록 폼에 표시"
                        : "신규 문의에서 숨김"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openEdit(item)}>
                            <Pencil />
                            수정
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => setActiveTarget(item)}
                          >
                            <Power />
                            {item.active ? "비활성화" : "활성화"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <AlertDialog
        open={activeTarget !== null}
        onOpenChange={(open) => !open && setActiveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {activeTarget?.active
                ? "이 문의 항목을 숨길까요?"
                : "이 문의 항목을 다시 표시할까요?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {activeTarget?.active
                ? `“${activeTarget?.name}” 항목은 고객의 새 문의 등록 화면에서 즉시 사라집니다. 기존 문의 내용은 그대로 유지됩니다.`
                : `“${activeTarget?.name}” 항목이 고객의 새 문의 등록 화면에 다시 표시됩니다.`}
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
              {activeTarget?.active ? "문의 화면에서 숨기기" : "다시 표시"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "문의 항목 수정" : "문의 항목 추가"}
            </DialogTitle>
            <DialogDescription>
              고객이 문의 내용을 구분하기 쉽도록 짧고 명확한 이름을
              사용해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <div className="space-y-2">
              <Label htmlFor="category-name">문의 항목 이름</Label>
              <Input
                id="category-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-order">노출 순서</Label>
              <Input
                id="category-order"
                type="number"
                min={1}
                value={displayOrder}
                onChange={(event) =>
                  setDisplayOrder(Number(event.target.value))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              취소
            </Button>
            <Button
              disabled={
                !name.trim() || displayOrder < 1 || saveMutation.isPending
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
    </div>
  );
}
