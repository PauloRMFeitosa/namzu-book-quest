import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X } from "lucide-react";

export type FilterColumn = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean";
};

export type FilterValue = { key: string; value: string } | null;

interface Props {
  columns: FilterColumn[];
  value: FilterValue;
  onChange: (v: FilterValue) => void;
}

export const FilterBar = ({ columns, value, onChange }: Props) => {
  const [field, setField] = useState<string>(value?.key ?? columns[0]?.key ?? "");
  const [val, setVal] = useState<string>(value?.value ?? "");

  const col = columns.find((c) => c.key === field);

  const apply = () => {
    if (!field || val === "") return onChange(null);
    onChange({ key: field, value: val });
  };
  const clear = () => {
    setVal("");
    onChange(null);
  };

  return (
    <div className="flex flex-wrap items-end gap-2 p-3 border rounded-md bg-muted/30">
      <div className="flex-1 min-w-[140px]">
        <label className="text-xs text-muted-foreground">Campo</label>
        <Select value={field} onValueChange={setField}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {columns.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1 min-w-[140px]">
        <label className="text-xs text-muted-foreground">Valor</label>
        {col?.type === "boolean" ? (
          <Select value={val} onValueChange={setVal}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Sim</SelectItem>
              <SelectItem value="false">Não</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Input
            type={col?.type === "number" ? "number" : "text"}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") apply(); }}
            placeholder="Digite o valor"
          />
        )}
      </div>
      <Button size="sm" onClick={apply}><Filter className="w-4 h-4" />Filtrar</Button>
      {value && <Button size="sm" variant="ghost" onClick={clear}><X className="w-4 h-4" />Limpar</Button>}
    </div>
  );
};
