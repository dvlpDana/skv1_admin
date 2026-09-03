import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QueryErrorState({
  title = "정보를 불러오지 못했습니다",
  description = "잠시 후 다시 시도해 주세요. 문제가 계속되면 관리자에게 문의해 주세요.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center"
      role="alert"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertTriangle className="size-5" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-zinc-900">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
        {description}
      </p>
      <Button variant="outline" className="mt-5" onClick={onRetry}>
        <RotateCcw />
        다시 시도
      </Button>
    </div>
  );
}
