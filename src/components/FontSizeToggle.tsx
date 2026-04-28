import { useFontSize, FontSize } from "@/hooks/useFontSize";
import { cn } from "@/lib/utils";

const OPTIONS: { value: FontSize; label: string; className: string }[] = [
  { value: "P", label: "P", className: "text-xs" },
  { value: "M", label: "M", className: "text-sm" },
  { value: "G", label: "G", className: "text-base" },
];

export const FontSizeToggle = () => {
  const { size, setSize } = useFontSize();
  return (
    <div className="inline-flex rounded-xl border-2 border-input p-1 gap-1 bg-background">
      {OPTIONS.map((o) => {
        const active = size === o.value;
        return (
          <button
            key={o.value}
            onClick={() => setSize(o.value)}
            aria-pressed={active}
            className={cn(
              "h-9 min-w-[44px] px-3 rounded-lg font-semibold transition-colors",
              o.className,
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
};
