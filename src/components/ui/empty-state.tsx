import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
        <Icon className="size-5" />
      </div>
      <h3 className="font-semibold text-zinc-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-zinc-500">
        {description}
      </p>
    </div>
  );
}
