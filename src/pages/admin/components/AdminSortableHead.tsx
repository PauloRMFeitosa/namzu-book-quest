import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { SortState } from "../hooks/useSortable";

interface AdminSortableHeadProps {
  col: string;
  label: string;
  sort: SortState | null;
  onToggle: (col: string) => void;
  className?: string;
}

/**
 * TableHead that shows asc/desc/unsorted icon and handles click to sort.
 * Passes col + current sort state down; parent owns the sort state via useSortable.
 */
export const AdminSortableHead = ({
  col,
  label,
  sort,
  onToggle,
  className,
}: AdminSortableHeadProps) => {
  const active = sort?.col === col;
  return (
    <TableHead
      className={cn("cursor-pointer select-none whitespace-nowrap", className)}
      onClick={() => onToggle(col)}
    >
      <div className="flex items-center gap-1 hover:text-foreground transition-colors">
        {label}
        {active ? (
          sort!.dir === "asc" ? (
            <ArrowUp className="h-3 w-3 text-foreground" />
          ) : (
            <ArrowDown className="h-3 w-3 text-foreground" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );
};
