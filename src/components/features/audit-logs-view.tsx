"use client";

import { useQuery } from "@tanstack/react-query";
import { FileClock } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
import type { AdminAccount, AuditLog, PageResponse } from "@/types/admin";

const targetLabels: Record<string, string> = {
  FAQ: "FAQ",
  NOTICE: "공지사항",
  INQUIRY: "1:1 문의",
  INQUIRY_CATEGORY: "문의 카테고리",
  ADMIN_ACCOUNT: "관리자 계정",
};
const actionLabels: Record<string, string> = {
  CREATE: "생성",
  UPDATE: "수정",
  DELETE: "삭제",
  REORDER: "순서 변경",
  ANSWER: "답변",
  SET_ACTIVE: "활성 상태 변경",
  RESET_PASSWORD: "비밀번호 초기화",
};

export function AuditLogsView() {
  const [page, setPage] = useState(0);
  const [targetType, setTargetType] = useState("ALL");
  const [adminId, setAdminId] = useState("ALL");
  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: () => adminApi.get<AdminAccount[]>("accounts"),
  });
  const logsQuery = useQuery({
    queryKey: ["audit-logs", targetType, adminId, page],
    queryFn: () =>
      adminApi.get<PageResponse<AuditLog>>("audit-logs", {
        targetType: targetType === "ALL" ? undefined : targetType,
        adminId: adminId === "ALL" ? undefined : adminId,
        page,
        size: 20,
        sort: "createdAt,desc",
      }),
  });
  const logs = pageItems(logsQuery.data);
  return (
    <div className="space-y-7">
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:px-6">
          <Select
            value={targetType}
            onValueChange={(value) => {
              setTargetType(value);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">전체 대상</SelectItem>
              {Object.entries(targetLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={adminId}
            onValueChange={(value) => {
              setAdminId(value);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="전체 관리자" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">전체 관리자</SelectItem>
              {accountsQuery.data?.map((account) => (
                <SelectItem key={account.id} value={String(account.id)}>
                  {account.name} · {account.orgType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-zinc-500 sm:ml-auto">
            총 {logsQuery.data?.totalElements ?? logs.length}건
          </p>
        </div>
        {logsQuery.isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-14" />
            ))}
          </div>
        ) : logsQuery.isError ? (
          <QueryErrorState onRetry={() => logsQuery.refetch()} />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={FileClock}
            title="관리 작업 기록이 없습니다"
            description="선택한 조건에 기록된 관리자 활동이 없습니다."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>일시</TableHead>
                <TableHead>관리자</TableHead>
                <TableHead>조직</TableHead>
                <TableHead>작업</TableHead>
                <TableHead>대상</TableHead>
                <TableHead>대상 ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{formatDateTime(log.createdAt)}</TableCell>
                  <TableCell className="font-semibold text-zinc-900">
                    {log.adminName}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        log.orgType === "MADEINLEMON" ? "default" : "outline"
                      }
                    >
                      {log.orgType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        log.action === "DELETE" ? "destructive" : "neutral"
                      }
                    >
                      {actionLabels[log.action] ?? log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {targetLabels[log.targetType] ?? log.targetType}
                  </TableCell>
                  <TableCell>{log.targetId ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <PaginationControls
          page={page}
          totalPages={logsQuery.data?.totalPages ?? 1}
          onPageChange={setPage}
        />
      </Card>
    </div>
  );
}
