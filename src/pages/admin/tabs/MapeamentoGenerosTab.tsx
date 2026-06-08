import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Genero = { id: string; nome: string };
type Interesse = { id: string; nome: string };
type Mapeamento = { id: string; interesse_id: string; genero_id: string; peso: number };

type Filtro = "todos" | "mapeados" | "pendentes";

export const MapeamentoGenerosTab = () => {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [generoSelId, setGeneroSelId] = useState<string | null>(null);

  const { data: generos = [] } = useQuery({
    queryKey: ["admin-generos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("generos").select("id, nome").order("nome");
      if (error) throw error;
      return data as Genero[];
    },
  });

  const { data: interesses = [] } = useQuery({
    queryKey: ["admin-interesses-tema"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("interesses")
        .select("id, nome")
        .eq("categoria", "tema")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data as Interesse[];
    },
  });

  const { data: mapeamentos = [] } = useQuery({
    queryKey: ["admin-interesses-generos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("interesses_generos")
        .select("id, interesse_id, genero_id, peso");
      if (error) throw error;
      return data as Mapeamento[];
    },
  });

  const { data: obrasPorGenero = {} } = useQuery({
    queryKey: ["admin-obra-genero-counts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("obra_generos").select("genero_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => { counts[r.genero_id] = (counts[r.genero_id] || 0) + 1; });
      return counts;
    },
  });

  const interessesById = useMemo(() => Object.fromEntries(interesses.map(i => [i.id, i])), [interesses]);

  const linhas = useMemo(() => {
    return generos.map(g => {
      const maps = mapeamentos.filter(m => m.genero_id === g.id);
      return {
        genero: g,
        obras: obrasPorGenero[g.id] || 0,
        mapeamentos: maps,
        status: maps.length > 0 ? "mapeado" : "pendente" as "mapeado" | "pendente",
      };
    });
  }, [generos, mapeamentos, obrasPorGenero]);

  const linhasFiltradas = useMemo(() => {
    let arr = linhas;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      arr = arr.filter(l => l.genero.nome.toLowerCase().includes(q));
    }
    if (filtro !== "todos") {
      arr = arr.filter(l => (filtro === "mapeados" ? l.status === "mapeado" : l.status === "pendente"));
    }
    return [...arr].sort((a, b) => {
      if (a.status !== b.status) return a.status === "pendente" ? -1 : 1;
      return b.obras - a.obras;
    });
  }, [linhas, busca, filtro]);

  const totalGeneros = generos.length;
  const totalInteresses = interesses.length;
  const totalMaps = mapeamentos.length;
  const generosMapeados = linhas.filter(l => l.status === "mapeado").length;
  const generosPendentes = totalGeneros - generosMapeados;

  const generoSel = generos.find(g => g.id === generoSelId) || null;
  const mapsDoGenero = mapeamentos.filter(m => m.genero_id === generoSelId);

  const refetchAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-interesses-generos"] });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Gêneros" value={totalGeneros} />
        <StatCard label="Interesses" value={totalInteresses} />
        <StatCard label="Mapeamentos" value={totalMaps} />
        <StatCard label="Mapeados" value={generosMapeados} tone="success" />
        <StatCard label="Pendentes" value={generosPendentes} tone="warn" />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar gênero..."
            className="pl-9"
          />
        </div>
        <Select value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="mapeados">Mapeados</SelectItem>
            <SelectItem value="pendentes">Pendentes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gênero</TableHead>
              <TableHead className="text-right">Obras</TableHead>
              <TableHead>Interesses mapeados</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhasFiltradas.map(l => (
              <TableRow
                key={l.genero.id}
                className="cursor-pointer"
                onClick={() => setGeneroSelId(l.genero.id)}
              >
                <TableCell className="font-medium">{l.genero.nome}</TableCell>
                <TableCell className="text-right">{l.obras}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {l.mapeamentos.length === 0 && (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                    {l.mapeamentos.map(m => (
                      <Badge key={m.id} variant="secondary" className="font-normal">
                        {interessesById[m.interesse_id]?.nome ?? "?"} ({m.peso})
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={l.status === "mapeado" ? "default" : "outline"}>
                    {l.status === "mapeado" ? "Mapeado" : "Pendente"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {linhasFiltradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Nenhum gênero encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!generoSel} onOpenChange={(o) => !o && setGeneroSelId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {generoSel && (
            <DetalheGenero
              genero={generoSel}
              obrasCount={obrasPorGenero[generoSel.id] || 0}
              mapeamentos={mapsDoGenero}
              interesses={interesses}
              onChanged={refetchAll}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const StatCard = ({ label, value, tone }: { label: string; value: number; tone?: "success" | "warn" }) => (
  <div className={cn(
    "border rounded-md p-3 bg-card",
    tone === "success" && "border-primary/30",
    tone === "warn" && "border-destructive/30",
  )}>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-2xl font-semibold">{value}</div>
  </div>
);

const DetalheGenero = ({
  genero, obrasCount, mapeamentos, interesses, onChanged,
}: {
  genero: Genero;
  obrasCount: number;
  mapeamentos: Mapeamento[];
  interesses: Interesse[];
  onChanged: () => void;
}) => {
  const [adicionando, setAdicionando] = useState(false);
  const [novoInteresseId, setNovoInteresseId] = useState<string | null>(null);
  const [novoPeso, setNovoPeso] = useState<number>(50);
  const [pesos, setPesos] = useState<Record<string, number>>({});
  const [pickerOpen, setPickerOpen] = useState(false);

  const interessesById = Object.fromEntries(interesses.map(i => [i.id, i]));
  const usados = new Set(mapeamentos.map(m => m.interesse_id));
  const disponiveis = interesses.filter(i => !usados.has(i.id));

  const salvarPeso = async (m: Mapeamento) => {
    const novo = pesos[m.id] ?? m.peso;
    if (novo === m.peso) return;
    const { error } = await (supabase as any)
      .from("interesses_generos")
      .update({ peso: novo, updated_at: new Date().toISOString() })
      .eq("id", m.id);
    if (error) return toast.error("Erro ao salvar peso", { description: error.message });
    toast.success("Peso atualizado");
    onChanged();
  };

  const remover = async (m: Mapeamento) => {
    const { error } = await (supabase as any).from("interesses_generos").delete().eq("id", m.id);
    if (error) return toast.error("Erro ao remover", { description: error.message });
    toast.success("Interesse removido");
    onChanged();
  };

  const adicionar = async () => {
    if (!novoInteresseId) return;
    setAdicionando(true);
    const { error } = await (supabase as any).from("interesses_generos").insert({
      genero_id: genero.id,
      interesse_id: novoInteresseId,
      peso: novoPeso,
    });
    setAdicionando(false);
    if (error) return toast.error("Erro ao adicionar", { description: error.message });
    toast.success("Interesse associado");
    setNovoInteresseId(null);
    setNovoPeso(50);
    onChanged();
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>{genero.nome}</SheetTitle>
        <SheetDescription>{obrasCount} obras associadas</SheetDescription>
      </SheetHeader>

      <div className="mt-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-2">Interesses relacionados</h3>
          {mapeamentos.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum interesse associado.</p>
          )}
          <div className="space-y-2">
            {mapeamentos.map(m => (
              <div key={m.id} className="flex items-center gap-2 border rounded-md p-2">
                <div className="flex-1 text-sm">{interessesById[m.interesse_id]?.nome ?? "?"}</div>
                <Input
                  type="number" min={0} max={100}
                  className="w-20 h-8"
                  value={pesos[m.id] ?? m.peso}
                  onChange={(e) => setPesos(p => ({ ...p, [m.id]: Number(e.target.value) }))}
                  onBlur={() => salvarPeso(m)}
                />
                <Button size="icon" variant="ghost" onClick={() => remover(m)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-2">Adicionar interesse</h3>
          <div className="flex items-center gap-2">
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex-1 justify-between">
                  {novoInteresseId ? interessesById[novoInteresseId]?.nome : "Selecionar interesse..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[300px]" align="start">
                <Command>
                  <CommandInput placeholder="Buscar..." />
                  <CommandList>
                    <CommandEmpty>Nenhum interesse disponível.</CommandEmpty>
                    <CommandGroup>
                      {disponiveis.map(i => (
                        <CommandItem
                          key={i.id}
                          value={i.nome}
                          onSelect={() => { setNovoInteresseId(i.id); setPickerOpen(false); }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", novoInteresseId === i.id ? "opacity-100" : "opacity-0")} />
                          {i.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Input
              type="number" min={0} max={100}
              className="w-20"
              value={novoPeso}
              onChange={(e) => setNovoPeso(Number(e.target.value))}
            />
            <Button onClick={adicionar} disabled={!novoInteresseId || adicionando}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Peso de 0 a 100. Não é necessário somar 100.
          </p>
        </div>
      </div>
    </>
  );
};
