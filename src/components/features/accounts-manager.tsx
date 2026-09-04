"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  KeyRound,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  Power,
  UserRoundX,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAdmin } from "@/components/auth/admin-context";
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
  DialogTrigger,
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
import { SearchField } from "@/components/ui/search-field";
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
import { adminApi } from "@/lib/api/client";
import { formatDate } from "@/lib/utils";
import type { AdminAccount, OrgType } from "@/types/admin";

type CreateValues = {
  email: string;
  name: string;
  orgType: OrgType;
  password: string;
};
const emptyValues: CreateValues = {
  email: "",
  name: "",
  orgType: "SKV1",
  password: "",
};

export function AccountsManager() {
  const currentAdmin = useAdmin();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [values, setValues] = useState<CreateValues>(emptyValues);
  const [activeTarget, setActiveTarget] = useState<AdminAccount | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminAccount | null>(null);
  const [temporaryCredential, setTemporaryCredential] = useState<{
    admin: AdminAccount;
    password: string;
  } | null>(null);
  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: () => adminApi.get<AdminAccount[]>("accounts"),
  });
  const accounts = useMemo(
    () =>
      (accountsQuery.data ?? []).filter((account) =>
        `${account.name} ${account.email}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [accountsQuery.data, search],
  );
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.post<AdminAccount>("accounts", {
        ...values,
        email: values.email.trim().toLowerCase(),
        name: values.name.trim(),
        authMethod: "PASSWORD",
      }),
    onSuccess: () => {
      toast.success("관리자 계정을 생성했습니다.");
      setCreateOpen(false);
      setValues(emptyValues);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const activeMutation = useMutation({
    mutationFn: (account: AdminAccount) =>
      adminApi.patch<AdminAccount>(`accounts/${account.id}/active`, {
        active: !account.active,
      }),
    onSuccess: (account) => {
      toast.success(
        `${account.name} 계정을 ${account.active ? "활성화" : "비활성화"}했습니다.`,
      );
      setActiveTarget(null);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const resetMutation = useMutation({
    mutationFn: (account: AdminAccount) =>
      adminApi.post<{ admin: AdminAccount; temporaryPassword: string }>(
        `accounts/${account.id}/reset-password`,
      ),
    onSuccess: (result) => {
      setTemporaryCredential({
        admin: result.admin,
        password: result.temporaryPassword,
      });
      setResetTarget(null);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const valid =
    values.email.includes("@") &&
    values.name.trim().length > 0 &&
    values.password.length >= 8;

  return (
    <div className="space-y-7">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus />
              계정 생성
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>관리자 계정 생성</DialogTitle>
              <DialogDescription>
                이메일과 비밀번호로 로그인하는 계정을 만듭니다. 초기 비밀번호는
                대상자에게 직접 전달해 주세요.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="account-email">이메일(아이디)</Label>
                <Input
                  id="account-email"
                  type="email"
                  value={values.email}
                  onChange={(event) =>
                    setValues({ ...values, email: event.target.value })
                  }
                  placeholder="name@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-name">이름</Label>
                <Input
                  id="account-name"
                  value={values.name}
                  onChange={(event) =>
                    setValues({ ...values, name: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>조직</Label>
                <Select
                  value={values.orgType}
                  onValueChange={(value: OrgType) =>
                    setValues({ ...values, orgType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SKV1">SKV1</SelectItem>
                    <SelectItem value="MADEINLEMON">MADEINLEMON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="account-password">초기 비밀번호</Label>
                <Input
                  id="account-password"
                  type="password"
                  value={values.password}
                  onChange={(event) =>
                    setValues({ ...values, password: event.target.value })
                  }
                  placeholder="8자 이상"
                />
                <p className="text-xs leading-5 text-zinc-500">
                  대상자는 이 비밀번호로 처음 로그인한 뒤 새 비밀번호로 변경해야
                  합니다.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                취소
              </Button>
              <Button
                disabled={!valid || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending && (
                  <LoaderCircle className="animate-spin" />
                )}
                계정 만들기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="이름 또는 이메일 검색"
          />
          <p className="text-sm text-zinc-500">
            총{" "}
            <strong className="text-zinc-900">
              {accountsQuery.data?.length ?? 0}
            </strong>
            명
          </p>
        </div>
        {accountsQuery.isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : accountsQuery.isError ? (
          <QueryErrorState onRetry={() => accountsQuery.refetch()} />
        ) : accounts.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="관리자 계정이 없습니다"
            description="검색 조건을 바꾸거나 새 관리자 계정을 만들어주세요."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>관리자</TableHead>
                <TableHead>조직</TableHead>
                <TableHead>로그인 방법</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>비밀번호 변경</TableHead>
                <TableHead>생성일</TableHead>
                <TableHead className="w-14">
                  <span className="sr-only">작업</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <div>
                      <p className="font-semibold text-zinc-900">
                        {account.name}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {account.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        account.orgType === "MADEINLEMON"
                          ? "default"
                          : "outline"
                      }
                    >
                      {account.orgType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {account.authMethod === "PASSWORD"
                      ? "이메일·비밀번호"
                      : "소셜 로그인"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={account.active ? "success" : "destructive"}>
                      {account.active ? "이용 가능" : "이용 중지"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {account.mustChangePassword ? (
                      <Badge variant="warning">변경 필요</Badge>
                    ) : (
                      "완료"
                    )}
                  </TableCell>
                  <TableCell>{formatDate(account.createdAt)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal />
                          <span className="sr-only">계정 작업</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          disabled={
                            account.id === currentAdmin.id && account.active
                          }
                          onSelect={() => setActiveTarget(account)}
                        >
                          {account.active ? <UserRoundX /> : <Power />}
                          {account.id === currentAdmin.id && account.active
                            ? "현재 로그인 계정"
                            : account.active
                              ? "이용 중지"
                              : "다시 이용"}
                        </DropdownMenuItem>
                        {account.authMethod === "PASSWORD" && (
                          <DropdownMenuItem
                            onSelect={() => setResetTarget(account)}
                          >
                            <KeyRound />
                            비밀번호 초기화
                          </DropdownMenuItem>
                        )}
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
                ? "이 계정의 이용을 중지할까요?"
                : "이 계정을 다시 이용할 수 있게 할까요?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  <strong className="text-zinc-900">
                    {activeTarget?.name} · {activeTarget?.email}
                  </strong>
                </p>
                <p>
                  {activeTarget?.active
                    ? "이용을 중지하면 해당 관리자는 다음 요청부터 관리자 페이지를 사용할 수 없습니다."
                    : "계정을 다시 이용 상태로 바꾸면 해당 관리자가 로그인할 수 있습니다."}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={activeMutation.isPending}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              className={
                activeTarget?.active
                  ? "bg-destructive text-white hover:bg-destructive-hover"
                  : undefined
              }
              disabled={activeMutation.isPending || !activeTarget}
              onClick={(event) => {
                event.preventDefault();
                if (activeTarget) activeMutation.mutate(activeTarget);
              }}
            >
              {activeMutation.isPending && (
                <LoaderCircle className="animate-spin" />
              )}
              {activeTarget?.active ? "이용 중지" : "다시 이용"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={resetTarget !== null}
        onOpenChange={(open) => !open && setResetTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>비밀번호를 초기화할까요?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  <strong className="text-zinc-900">
                    {resetTarget?.name} · {resetTarget?.email}
                  </strong>
                </p>
                <p>
                  기존 비밀번호는 즉시 사용할 수 없게 되며 로그인 실패로 인한
                  잠금도 해제됩니다. 새 임시 비밀번호는 다음 화면에서 한 번만
                  확인할 수 있습니다.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetMutation.isPending}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive-hover"
              disabled={resetMutation.isPending || !resetTarget}
              onClick={(event) => {
                event.preventDefault();
                if (resetTarget) resetMutation.mutate(resetTarget);
              }}
            >
              {resetMutation.isPending && (
                <LoaderCircle className="animate-spin" />
              )}
              비밀번호 초기화
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={temporaryCredential !== null}
        onOpenChange={(open) => !open && setTemporaryCredential(null)}
      >
        <DialogContent
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>임시 비밀번호가 발급되었습니다</DialogTitle>
            <DialogDescription>
              {temporaryCredential?.admin.name} 관리자에게 전달할 임시
              비밀번호입니다. 이 화면을 닫으면 다시 확인할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg border bg-zinc-50 p-3">
            <code className="min-w-0 flex-1 break-all text-sm font-semibold text-zinc-900">
              {temporaryCredential?.password}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={async () => {
                try {
                  if (temporaryCredential) {
                    await navigator.clipboard.writeText(
                      temporaryCredential.password,
                    );
                    toast.success("임시 비밀번호를 복사했습니다.");
                  }
                } catch {
                  toast.error(
                    "복사하지 못했습니다. 비밀번호를 직접 선택해 주세요.",
                  );
                }
              }}
              aria-label="임시 비밀번호 복사"
            >
              <Copy />
            </Button>
          </div>
          <div className="rounded-lg bg-warning-soft px-4 py-3 text-xs leading-5 text-warning-foreground">
            대상자는 임시 비밀번호로 로그인한 뒤 새 비밀번호로 변경해야 다른
            기능을 사용할 수 있습니다.
          </div>
          <DialogFooter>
            <Button onClick={() => setTemporaryCredential(null)}>
              전달 내용을 확인했습니다
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
