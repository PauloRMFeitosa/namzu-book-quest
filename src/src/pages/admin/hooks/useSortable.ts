import { useState, useMemo } from "react";

export type SortDir = "asc" | "desc";

export interface SortState {
  col: string;
  dir: SortDir;
}

/**
 * Generic client-side sorting hook.
 * - Pass `rows` (already filtered) and an optional `getVal` accessor.
 * - Returns `sorted` (stable copy), `sort` (current state), and `toggle(col)`.
 * - Clicking the same column cycles: asc → desc → unsorted.
 */
export function useSortable<T>(
  rows: T[],
  getVal?: (row: T, col: string) => any
) {
  const [sort, setSort] = useState<SortState | null>(null);

  const toggle = (col: string) => {
    setSort((prev) => {
      if (!prev || prev.col !== col) return { col, dir: "asc" };
      if (prev.dir === "asc") return { col, dir: "desc" };
      return null; // third click resets to original order
    });
  };

  const sorted = useMemo(() => {
    if (!sort) return rows;
    return [...rows].sort((a, b) => {
      const va = getVal ? getVal(a, sort.col) : (a as any)[sort.col] ?? "";
      const vb = getVal ? getVal(b, sort.col) : (b as any)[sort.col] ?? "";
      let cmp: number;
      if (typeof va === "boolean" || typeof vb === "boolean") {
        cmp = (va ? 1 : 0) - (vb ? 1 : 0);
      } else if (typeof va === "number" && typeof vb === "number") {
        cmp = va - vb;
      } else {
        cmp = String(va ?? "").localeCompare(String(vb ?? ""), "pt-BR", { sensitivity: "base" });
      }
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sort, getVal]);

  return { sorted, sort, toggle };
}
