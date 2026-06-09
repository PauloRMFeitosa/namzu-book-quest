import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Props {
  value: string;
  obraId: string | null;
  onChange: (titulo: string, obraId: string | null) => void;
}

export const ObraAutocomplete = ({ value, obraId, onChange }: Props) => {
  const [results, setResults] = useState<{ id: string; titulo_original: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const lastTerm = useRef("");

  useEffect(() => {
    const term = value.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      if (term === lastTerm.current) return;
      lastTerm.current = term;
      setLoading(true);
      const { data } = await supabase
        .from("obras")
        .select("id, titulo_original")
        .ilike("titulo_ordenacao", `%${term.toLowerCase()}%`)
        .limit(8);
      setResults(data ?? []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value, null);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="Buscar obra existente"
        className="h-11 rounded-xl"
      />
      {obraId && (
        <p className="text-[10px] text-muted-foreground mt-1">Obra selecionada ✓</p>
      )}
      {open && (results.length > 0 || loading) && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-elevated overflow-hidden">
          {loading && (
            <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Buscando…
            </div>
          )}
          {results.map((o) => (
            <button
              key={o.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(o.titulo_original, o.id);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
            >
              {o.titulo_original}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
