"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  CircleHelp,
  GripVertical,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { SearchField } from "@/components/ui/search-field";
import { SegmentedFilter } from "@/components/ui/segmented-filter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { adminApi } from "@/lib/api/client";
import {
  FAQ_CATEGORIES,
  FAQ_CATEGORY_LABELS,
  type Faq,
  type FaqCategory,
} from "@/types/admin";

type Values = {
  category: FaqCategory;
  displayOrder: number;
  question: string;
  answer: string;
};
const emptyValues: Values = {
  category: "MEMBER_INFO",
  displayOrder: 1,
  question: "",
  answer: "",
};

export function FaqsManager() {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<FaqCategory>("MEMBER_INFO");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Faq | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [draftOrder, setDraftOrder] = useState<number[] | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [values, setValues] = useState<Values>(emptyValues);
  const query = useQuery({
    queryKey: ["faqs"],
    queryFn: () => adminApi.get<Faq[]>("faqs"),
  });
  const categoryItems = useMemo(
    () =>
      (query.data ?? [])
        .filter((faq) => faq.category === category)
        .sort((a, b) => a.displayOrder - b.displayOrder),
    [query.data, category],
  );
  const order = draftOrder ?? categoryItems.map((faq) => faq.id);
  const orderedItems = order
    .map((id) => categoryItems.find((faq) => faq.id === id))
    .filter((faq): faq is Faq => !!faq)
    .filter((faq) =>
      `${faq.question} ${faq.answer}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  const invalidate = async () => {
    setDraftOrder(null);
    await queryClient.invalidateQueries({ queryKey: ["faqs"] });
  };
  const saveMutation = useMutation({
    mutationFn: () =>
      editingId
        ? adminApi.put<Faq>(`faqs/${editingId}`, values)
        : adminApi.post<Faq>("faqs", values),
    onSuccess: async () => {
      toast.success(editingId ? "FAQ를 수정했습니다." : "FAQ를 등록했습니다.");
      setFormOpen(false);
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      adminApi.delete<{ result: string }>(`faqs/${id}`),
    onSuccess: async () => {
      toast.success("FAQ를 삭제했습니다.");
      setDeleteTarget(null);
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const reorderMutation = useMutation({
    mutationFn: () =>
      adminApi.put<Faq[]>("faqs/reorder", { category, orderedIds: order }),
    onSuccess: async () => {
      toast.success("노출 순서를 저장했습니다.");
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  function openCreate() {
    setEditingId(null);
    setValues({
      ...emptyValues,
      category,
      displayOrder: categoryItems.length + 1,
    });
    setFormOpen(true);
  }
  function openEdit(faq: Faq) {
    setEditingId(faq.id);
    setValues({
      category: faq.category,
      displayOrder: faq.displayOrder,
      question: faq.question,
      answer: faq.answer,
    });
    setFormOpen(true);
  }
  function moveItem(sourceId: number, targetId: number) {
    const next = [...order];
    const sourceIndex = next.indexOf(sourceId);
    const targetIndex = next.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, sourceId);
    setDraftOrder(next);
  }
  function moveBy(id: number, offset: number) {
    const target = order[order.indexOf(id) + offset];
    if (target) moveItem(id, target);
  }
  const duplicateOrder = (query.data ?? []).some(
    (faq) =>
      faq.category === values.category &&
      faq.displayOrder === values.displayOrder &&
      faq.id !== editingId,
  );
  const valid =
    values.question.trim() &&
    values.answer.trim() &&
    values.displayOrder > 0 &&
    !duplicateOrder;

  return (
    <div className="space-y-7">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus />
          FAQ 등록
        </Button>
      </div>
      <Card className="overflow-hidden">
        <FilterToolbar
          search={
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="질문 또는 답변 검색"
            />
          }
          filter={
            <SegmentedFilter
              value={category}
              options={FAQ_CATEGORIES.map((item) => ({
                value: item,
                label: FAQ_CATEGORY_LABELS[item],
                count: (query.data ?? []).filter((faq) => faq.category === item)
                  .length,
              }))}
              onValueChange={(nextCategory) => {
                setCategory(nextCategory);
                setDraftOrder(null);
              }}
              ariaLabel="FAQ 카테고리 필터"
            />
          }
          summary={
            search
              ? `${orderedItems.length}개 표시`
              : `총 ${categoryItems.length}개`
          }
          actions={
            draftOrder ? (
              <Button
                size="sm"
                onClick={() => reorderMutation.mutate()}
                disabled={reorderMutation.isPending}
              >
                <Save />
                순서 저장
              </Button>
            ) : undefined
          }
        />
        {query.isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20" />
            ))}
          </div>
        ) : query.isError ? (
          <QueryErrorState onRetry={() => query.refetch()} />
        ) : orderedItems.length === 0 ? (
          <EmptyState
            icon={CircleHelp}
            title="FAQ가 없습니다"
            description="선택한 카테고리에 첫 FAQ를 등록해주세요."
          />
        ) : (
          <div className="divide-y">
            {orderedItems.map((faq, index) => {
              const expanded = expandedIds.has(faq.id);
              return (
                <article
                  key={faq.id}
                  draggable={!search}
                  onDragStart={() => setDraggedId(faq.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (draggedId && draggedId !== faq.id)
                      moveItem(draggedId, faq.id);
                    setDraggedId(null);
                  }}
                  className="group bg-white transition hover:bg-zinc-50/60"
                >
                  <div className="flex items-start gap-3 px-4 py-4 sm:px-6">
                    <button
                      className="mt-1 hidden rounded p-1 text-zinc-300 hover:text-zinc-700 sm:block"
                      aria-label="순서 드래그"
                    >
                      <GripVertical className="size-4" />
                    </button>
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-xs font-semibold text-zinc-500">
                      {index + 1}
                    </span>
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() =>
                        setExpandedIds((previous) => {
                          const next = new Set(previous);
                          if (expanded) next.delete(faq.id);
                          else next.add(faq.id);
                          return next;
                        })
                      }
                    >
                      <p className="font-semibold leading-6 text-zinc-900">
                        {faq.question}
                      </p>
                      {expanded && (
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-600">
                          {faq.answer}
                        </p>
                      )}
                    </button>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="sm:hidden"
                        onClick={() => moveBy(faq.id, -1)}
                        disabled={!!search || index === 0}
                        aria-label={`${faq.question} 위로 이동`}
                      >
                        <ChevronUp />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="sm:hidden"
                        onClick={() => moveBy(faq.id, 1)}
                        disabled={!!search || index === orderedItems.length - 1}
                        aria-label={`${faq.question} 아래로 이동`}
                      >
                        <ChevronDown />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setExpandedIds((previous) => {
                            const next = new Set(previous);
                            if (expanded) next.delete(faq.id);
                            else next.add(faq.id);
                            return next;
                          })
                        }
                      >
                        {expanded ? <ChevronUp /> : <ChevronDown />}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openEdit(faq)}>
                            <Pencil />
                            수정
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            data-variant="destructive"
                            onSelect={() => setDeleteTarget(faq)}
                          >
                            <Trash2 />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "FAQ 수정" : "FAQ 등록"}</DialogTitle>
            <DialogDescription>
              저장 즉시 공개 FAQ에 반영됩니다. 노출 순서 중복 여부를
              확인해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <div className="space-y-2">
              <Label>카테고리</Label>
              <Select
                value={values.category}
                onValueChange={(value: FaqCategory) =>
                  setValues({ ...values, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FAQ_CATEGORIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {FAQ_CATEGORY_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="faq-order">노출 순서</Label>
              <Input
                id="faq-order"
                type="number"
                min={1}
                value={values.displayOrder}
                onChange={(event) =>
                  setValues({
                    ...values,
                    displayOrder: Number(event.target.value),
                  })
                }
              />
              {duplicateOrder && (
                <p className="text-xs leading-5 text-destructive-foreground">
                  같은 카테고리에 이미 사용 중인 노출 순서입니다. 다른 번호를
                  입력해 주세요.
                </p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="faq-question">질문</Label>
              <Input
                id="faq-question"
                value={values.question}
                onChange={(event) =>
                  setValues({ ...values, question: event.target.value })
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="faq-answer">답변</Label>
              <Textarea
                id="faq-answer"
                className="min-h-48"
                value={values.answer}
                onChange={(event) =>
                  setValues({ ...values, answer: event.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              취소
            </Button>
            <Button
              disabled={!valid || saveMutation.isPending}
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
            <AlertDialogTitle>FAQ를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제한 FAQ는 복구할 수 없으며 공개 화면에서도 즉시 사라집니다.
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
