import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Props {
  value: string;
  onChange: (nome: string, autorId?: string) => void;
  placeholder?: string;
}

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export const AutorAutocomplete = ({ value, onChange, placeholder }: Props) => {
  const [results, setResults] = useState<{ id: string; nome_completo: string }[]>([]);
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
        .from("autores")
        .select("id, nome_completo")
        .ilike("nome_ordenacao", `%${normalize(term)}%`)
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
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder={placeholder ?? "Nome do autor"}
        className="h-11 rounded-xl"
      />
      {open && (results.length > 0 || loading) && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-elevated overflow-hidden">
          {loading && (
            <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Buscando…
            </div>
          )}
          {results.map((a) => (
            <button
              key={a.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(a.nome_completo, a.id);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
            >
              {a.nome_completo}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
