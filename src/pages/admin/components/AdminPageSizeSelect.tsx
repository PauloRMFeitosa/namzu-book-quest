import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PAGE_SIZES = [10, 100, 500] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

interface AdminPageSizeSelectProps {
  value: PageSize;
  onChange: (value: PageSize) => void;
}

/**
 * Compact row-limit selector. Place in the summary footer row aligned to the right.
 * Renders as: "Exibir: [10▾]"
 */
export const AdminPageSizeSelect = ({ value, onChange }: AdminPageSizeSelectProps) => (
  <div className="flex items-center gap-1.5 ml-auto">
    <span className="text-xs text-muted-foreground">Exibir</span>
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v) as PageSize)}>
      <SelectTrigger className="h-6 w-16 text-xs px-2 py-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PAGE_SIZES.map((n) => (
          <SelectItem key={n} value={String(n)} className="text-xs">
            {n}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);
