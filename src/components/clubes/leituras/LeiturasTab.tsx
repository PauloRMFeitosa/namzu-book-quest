import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Calendar, CheckCircle2, Users, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { PercentualProgressoControl } from "@/components/leituras/PercentualProgressoControl";
import {
  TrilhaItem,
  useClubeLeituras,
  useSalvarProgresso,
} from "@/hooks/clubes/useClubeLeituras";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  clubeId: string;
  isMembro: boolean;
}

export const LeiturasTab = ({ clubeId, isMembro }: Props) => {
  const { data: trilhas, isLoading } = useClubeLeituras(clubeId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-[var(--radius)]" />
        ))}
      </div>
    );
  }

  if (!trilhas?.length) {
    return (
      <div className="card-soft p-10 flex flex-col items-center text-center gap-2 border border-dashed border-border/60">
        <Sparkles className="w-6 h-6 text-accent" />
        <h3 className="font-display text-lg font-semibold">
          Nenhuma trilha definida
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          O curador ainda não publicou a trilha de leituras deste clube.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-baseline justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Trilha de leituras</h2>
          <p className="text-sm text-muted-foreground">
            {trilhas.length} {trilhas.length === 1 ? "obra" : "obras"} na jornada coletiva
          </p>
        </div>
      </header>

      <ol className="relative flex flex-col gap-5 pl-6 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-px before:bg-border">
        {trilhas.map((t, idx) => (
          <TrilhaCard key={t.id} trilha={t} index={idx} clubeId={clubeId} canEdit={isMembro} />
        ))}
      </ol>
    </div>
  );
};

const TrilhaCard = ({
  trilha,
  index,
  clubeId,
  canEdit,
}: {
  trilha: TrilhaItem;
  index: number;
  clubeId: string;
  canEdit: boolean;
}) => {
  const meu = trilha.meu_progresso;
  const concluido = meu?.status === "concluido";
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [navLoading, setNavLoading] = useState(false);
  const [escolhaOpen, setEscolhaOpen] = useState(false);
  const [leituraConcluidaId, setLeituraConcluidaId] = useState<string | null>(null);
  const [usuarioLivroIdCache, setUsuarioLivroIdCache] = useState<string | null>(null);

  const ensureUsuarioLivro = async () => {
    if (!user) throw new Error("Não autenticado");
    const { data: ul } = await supabase
      .from("usuario_livros")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("obra_id", trilha.obra_id)
      .maybeSingle();
    if (ul?.id) return ul.id as string;
    const { data: novo, error } = await supabase
      .from("usuario_livros")
      .insert({ user_id: user.id, obra_id: trilha.obra_id, status: "lendo" })
      .select("id")
      .single();
    if (error) throw error;
    return novo.id as string;
  };

  const abrirLivro = async () => {
    if (!user || !trilha.obra) return;
    setNavLoading(true);
    try {
      const usuarioLivroId = await ensureUsuarioLivro();
      setUsuarioLivroIdCache(usuarioLivroId);

      const { data: leituras } = await supabase
        .from("usuario_leituras")
        .select("id, status, clube_id, data_fim, created_at")
        .eq("usuario_livro_id", usuarioLivroId)
        .order("created_at", { ascending: false });

      // Já existe leitura para este clube → abre direto
      const desteClube = leituras?.find((l) => l.clube_id === clubeId);
      if (desteClube) {
        navigate(`/leituras/${desteClube.id}`);
        return;
      }

      // Leitura individual em aberto → associa ao clube em vez de criar nova
      const abertaIndividual = leituras?.find(
        (l) => l.status !== "concluido" && !l.clube_id,
      );
      if (abertaIndividual) {
        const { error } = await supabase
          .from("usuario_leituras")
          .update({ clube_id: clubeId, tipo_origem: "clube" })
          .eq("id", abertaIndividual.id);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["clube-leituras", clubeId] });
        navigate(`/leituras/${abertaIndividual.id}`);
        return;
      }

      // Já leu este livro antes → pergunta se associa ou se relê
      const concluidaExistente = leituras?.find((l) => l.status === "concluido");
      if (concluidaExistente) {
        setLeituraConcluidaId(concluidaExistente.id);
        setEscolhaOpen(true);
        return;
      }

      // Caso novo: cria leitura nova vinculada ao clube
      const today = new Date().toISOString().slice(0, 10);
      const { data: novaUL, error } = await supabase
        .from("usuario_leituras")
        .insert({
          usuario_livro_id: usuarioLivroId,
          tipo_origem: "clube",
          clube_id: clubeId,
          status: "lendo",
          data_inicio: today,
        })
        .select("id")
        .single();
      if (error) throw error;
      navigate(`/leituras/${novaUL.id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao abrir livro");
    } finally {
      setNavLoading(false);
    }
  };

  const associarConcluida = async () => {
    if (!user || !leituraConcluidaId) return;
    try {
      const { error } = await supabase.from("clube_progresso").upsert(
        {
          user_id: user.id,
          clube_id: clubeId,
          obra_id: trilha.obra_id,
          percentual: 100,
          status: "concluido",
          data_conclusao: new Date().toISOString(),
        },
        { onConflict: "user_id,clube_id,obra_id" },
      );
      if (error) throw error;
      toast.success("Leitura marcada como concluída para o clube");
      qc.invalidateQueries({ queryKey: ["clube-leituras", clubeId] });
      setEscolhaOpen(false);
      navigate(`/leituras/${leituraConcluidaId}`);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao associar");
    }
  };

  const relerLivro = async () => {
    if (!user || !usuarioLivroIdCache) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { data: novaUL, error } = await supabase
        .from("usuario_leituras")
        .insert({
          usuario_livro_id: usuarioLivroIdCache,
          tipo_origem: "clube",
          clube_id: clubeId,
          status: "lendo",
          data_inicio: today,
        })
        .select("id")
        .single();
      if (error) throw error;
      await supabase
        .from("usuario_livros")
        .update({ status: "lendo" })
        .eq("id", usuarioLivroIdCache);
      qc.invalidateQueries({ queryKey: ["clube-leituras", clubeId] });
      setEscolhaOpen(false);
      navigate(`/leituras/${novaUL.id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao iniciar releitura");
    }
  };

  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative"
    >
      <span
        className={`absolute -left-[18px] top-4 w-4 h-4 rounded-full border-2 ${
          concluido
            ? "bg-success border-success"
            : meu
            ? "bg-accent border-accent"
            : "bg-background border-border"
        }`}
      />
      <article className="card-soft p-4 flex gap-4">
        <button
          type="button"
          onClick={abrirLivro}
          disabled={navLoading || !canEdit}
          className="flex-shrink-0 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-70"
          aria-label={`Abrir ${trilha.obra?.titulo_original ?? "obra"}`}
        >
          {trilha.obra?.capa_padrao_url ? (
            <img
              src={trilha.obra.capa_padrao_url}
              alt={trilha.obra.titulo_original}
              className="w-20 h-28 sm:w-24 sm:h-32 rounded-md object-cover shadow-sm"
            />
          ) : (
            <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-md bg-secondary flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
          )}
        </button>

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-accent font-semibold">
                Etapa {trilha.ordem}
              </p>
              <h3
                onClick={canEdit ? abrirLivro : undefined}
                className={`font-display text-base sm:text-lg font-semibold leading-tight line-clamp-2 ${canEdit ? "cursor-pointer hover:text-primary transition-colors" : ""}`}
              >
                {trilha.obra?.titulo_original ?? "Obra"}
              </h3>
            </div>
            {concluido && <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />}
          </div>

          {(trilha.data_inicio_sugerida || trilha.data_fim_sugerida) && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatRange(trilha.data_inicio_sugerida, trilha.data_fim_sugerida)}
            </p>
          )}

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3" /> Coletivo
              </span>
              <span className="font-medium">
                {trilha.progresso_coletivo}%
                {trilha.total_membros > 0 && (
                  <span className="text-muted-foreground font-normal">
                    {" "}· {trilha.concluidos}/{trilha.total_membros} concluíram
                  </span>
                )}
              </span>
            </div>
            <Progress value={trilha.progresso_coletivo} className="h-1.5" />
          </div>

          {canEdit && (
            <div className="flex flex-col gap-1 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Meu progresso</span>
                <span className="font-medium text-primary">
                  {meu?.percentual ?? 0}%
                </span>
              </div>
              <Progress value={meu?.percentual ?? 0} className="h-1.5" />
              <ProgressoDialog
                trilha={trilha}
                clubeId={clubeId}
                trigger={
                  <Button size="sm" variant="outline" className="rounded-xl mt-2 self-start h-8 text-xs">
                    {meu ? "Atualizar progresso" : "Iniciar leitura"}
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </article>
    </motion.li>
  );
};

const ProgressoDialog = ({
  trilha,
  clubeId,
  trigger,
}: {
  trilha: TrilhaItem;
  clubeId: string;
  trigger: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const [percentual, setPercentual] = useState<number>(0);
  const [capitulo, setCapitulo] = useState<string>("");
  const [pagina, setPagina] = useState<string>("");
  const totalPaginas = trilha.total_paginas ?? null;
  const salvar = useSalvarProgresso(clubeId);

  // Sempre que abrir o diálogo, limpa os campos (em branco)
  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) {
      setPercentual(0);
      setCapitulo("");
      setPagina("");
    }
  };

  const handleSave = async () => {
    await salvar.mutateAsync({
      obra_id: trilha.obra_id,
      percentual,
      capitulo_atual: capitulo || null,
      pagina_atual: pagina ? Number(pagina) : null,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {trilha.obra?.titulo_original}
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <PercentualProgressoControl
            percentual={percentual}
            onPercentualChange={setPercentual}
            pagina={pagina}
            onPaginaChange={setPagina}
            totalPaginas={totalPaginas}
            capitulo={capitulo}
            onCapituloChange={setCapitulo}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={salvar.isPending}
            className="bg-primary hover:bg-primary-hover"
          >
            {salvar.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const formatRange = (ini: string | null, fim: string | null) => {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  if (ini && fim) return `${fmt(ini)} – ${fmt(fim)}`;
  if (ini) return `A partir de ${fmt(ini)}`;
  if (fim) return `Até ${fmt(fim)}`;
  return "";
};
