import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, BookOpen, Check, Play } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

const LeiturasList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data = [] } = useQuery({
    queryKey: ["leituras-ativas", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("usuario_livros")
        .select("*, obras(*)")
        .eq("user_id", user!.id)
        .in("status", ["lendo", "quero_ler"])
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Minhas leituras</h1>
      {data.length === 0 ? (
        <div className="card-soft p-8 text-center">
          <BookOpen className="w-10 h-10 mx-auto text-primary mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Comece sua primeira leitura</p>
          <Button onClick={() => navigate("/busca")} className="rounded-2xl bg-primary hover:bg-primary-hover">Buscar livros</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((l: any) => (
            <button key={l.id} onClick={() => navigate(`/leituras/${l.id}`)} className="card-soft p-3 flex gap-3 hover-lift text-left">
              {l.obras?.capa_padrao_url ? (
                <img src={l.obras.capa_padrao_url} alt="" className="w-14 h-20 rounded-md object-cover" />
              ) : (
                <div className="w-14 h-20 rounded-md bg-secondary flex items-center justify-center"><BookOpen className="w-5 h-5 text-primary" /></div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold line-clamp-2">{l.obras?.titulo_original}</p>
                <p className="text-xs text-muted-foreground capitalize mt-1">{l.status.replace("_", " ")}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const LeituraDetalhe = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [nota, setNota] = useState<string>("");
  const [review, setReview] = useState("");

  const { data: l, isLoading } = useQuery({
    queryKey: ["leitura", id],
    enabled: !!id && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("usuario_livros")
        .select("*, obras(*)")
        .eq("id", id!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (l) {
      setNota(l.nota?.toString() ?? "");
      setReview(l.review_texto ?? "");
    }
  }, [l]);

  const updateStatus = async (status: string) => {
    const patch: any = { status };
    if (status === "lendo" && !l?.data_inicio) patch.data_inicio = new Date().toISOString().slice(0, 10);
    if (status === "lido" || status === "concluido") patch.data_fim = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("usuario_livros").update(patch).eq("id", id!);
    if (error) return toast.error(error.message);
    toast.success("Atualizado!");
    qc.invalidateQueries();
  };

  const salvarNotas = async () => {
    const { error } = await supabase
      .from("usuario_livros")
      .update({ nota: nota ? Number(nota) : null, review_texto: review || null })
      .eq("id", id!);
    if (error) return toast.error(error.message);
    toast.success("Notas salvas");
  };

  if (isLoading) return <p className="text-muted-foreground">Carregando…</p>;
  if (!l) return <p className="text-muted-foreground">Leitura não encontrada.</p>;

  return (
    <div className="flex flex-col gap-5">
      <button onClick={() => navigate(-1)} className="self-start flex items-center gap-1 text-muted-foreground -ml-2 p-2">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="flex gap-4">
        {l.obras?.capa_padrao_url ? (
          <img src={l.obras.capa_padrao_url} alt="" className="w-28 h-40 rounded-xl object-cover shadow-elevated" />
        ) : (
          <div className="w-28 h-40 rounded-xl bg-secondary flex items-center justify-center"><BookOpen className="w-10 h-10 text-primary" /></div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold leading-tight">{l.obras?.titulo_original}</h1>
          {l.obras?.ano_primeira_publicacao && <p className="text-sm text-muted-foreground mt-1">{l.obras.ano_primeira_publicacao}</p>}
          <p className="text-xs uppercase tracking-wider text-primary font-semibold mt-2">{l.status.replace("_", " ")}</p>
        </div>
      </div>

      {l.obras?.sinopse_padrao && (
        <p className="text-sm text-muted-foreground leading-relaxed">{l.obras.sinopse_padrao}</p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {l.status !== "lendo" && (
          <Button onClick={() => updateStatus("lendo")} className="h-12 rounded-2xl bg-primary hover:bg-primary-hover">
            <Play className="w-4 h-4" /> Começar
          </Button>
        )}
        {l.status !== "lido" && l.status !== "concluido" && (
          <Button onClick={() => updateStatus("concluido")} variant="outline" className="h-12 rounded-2xl border-2">
            <Check className="w-4 h-4" /> Concluir
          </Button>
        )}
      </div>

      <div className="card-soft p-4 flex flex-col gap-3">
        <h3 className="font-semibold">Minhas notas</h3>
        <div>
          <label className="text-xs text-muted-foreground">Nota (0–10)</label>
          <Input type="number" min={0} max={10} step={0.5} value={nota} onChange={(e) => setNota(e.target.value)} className="h-12 rounded-xl mt-1" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Resenha</label>
          <Textarea value={review} onChange={(e) => setReview(e.target.value)} rows={4} className="rounded-xl mt-1" />
        </div>
        <Button onClick={salvarNotas} className="h-12 rounded-2xl bg-primary hover:bg-primary-hover">Salvar</Button>
      </div>
    </div>
  );
};

const Leituras = () => {
  const { id } = useParams();
  return id ? <LeituraDetalhe /> : <LeiturasList />;
};

export default Leituras;
