import type { ReactNode } from "react";

export function FilterToolbar({
  search,
  filter,
  summary,
  actions,
}: {
  search: ReactNode;
  filter: ReactNode;
  summary: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="border-b p-4 sm:px-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="w-full xl:w-auto">{search}</div>
        <div className="min-w-0 flex-1">{filter}</div>
        <div className="flex min-h-9 shrink-0 items-center justify-between gap-3 xl:ml-auto">
          <div className="text-sm text-zinc-500">{summary}</div>
          {actions}
        </div>
      </div>
    </div>
  );
}
