import { cn } from "@/lib/utils";

export type SegmentedFilterOption<T extends string> = {
  value: T;
  label: string;
  count?: number;
};

export function SegmentedFilter<T extends string>({
  value,
  options,
  onValueChange,
  ariaLabel,
  className,
}: {
  value: T;
  options: Array<SegmentedFilterOption<T>>;
  onValueChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <div
        className="flex w-max min-w-full gap-1 rounded-lg bg-zinc-100 p-1 sm:min-w-0"
        role="group"
        aria-label={ariaLabel}
      >
        {options.map((option) => {
          const selected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              className={cn(
                "flex h-9 min-w-20 flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900",
              )}
              aria-label={
                option.count === undefined
                  ? option.label
                  : `${option.label} ${option.count}개`
              }
              aria-pressed={selected}
              onClick={() => onValueChange(option.value)}
            >
              <span>{option.label}</span>
              {option.count !== undefined && (
                <span className="text-xs tabular-nums text-zinc-500">
                  {option.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
