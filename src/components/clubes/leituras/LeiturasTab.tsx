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

  /**
   * Garante registro em usuario_livros seguindo regras de negócio:
   *  - Cenário 1: não existe → cria com status='quero_ler'
   *  - Cenários 2/3: já existe (quero_ler ou lendo) → reusa
   *  - Cenário 4: já existe com status='lido' → caller trata como releitura
   */
  const ensureUsuarioLivro = async (): Promise<{ id: string; status: string }> => {
    if (!user) throw new Error("Não autenticado");
    const { data: ul } = await supabase
      .from("usuario_livros")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("obra_id", trilha.obra_id)
      .maybeSingle();
    if (ul?.id) return { id: ul.id as string, status: ul.status as string };
    const { data: novo, error } = await supabase
      .from("usuario_livros")
      .insert({ user_id: user.id, obra_id: trilha.obra_id, status: "quero_ler" })
      .select("id, status")
      .single();
    if (error) throw error;
    return { id: novo.id as string, status: novo.status as string };
  };

  const abrirLivro = async () => {
    if (!user || !trilha.obra) return;
    setNavLoading(true);
    try {
      const { id: usuarioLivroId, status: livroStatus } = await ensureUsuarioLivro();
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

      // Cenário 3: leitura individual em aberto → associa ao clube
      const abertaIndividual = leituras?.find(
        (l) => l.status !== "concluido" && !l.clube_id,
      );
      if (abertaIndividual) {
        const { error } = await supabase
          .from("usuario_leituras")
          .update({ clube_id: clubeId, tipo_origem: "clube" })
          .eq("id", abertaIndividual.id);
        if (error) throw error;
        if (livroStatus !== "lendo" && livroStatus !== "lido") {
          await supabase
            .from("usuario_livros")
            .update({ status: "lendo" })
            .eq("id", usuarioLivroId);
        }
        qc.invalidateQueries({ queryKey: ["clube-leituras", clubeId] });
        navigate(`/leituras/${abertaIndividual.id}`);
        return;
      }

      // Cenário 4: livro já foi lido → pergunta associar concluído ou reler
      const concluidaExistente = leituras?.find((l) => l.status === "concluido");
      if (livroStatus === "lido" || concluidaExistente) {
        setLeituraConcluidaId(concluidaExistente?.id ?? null);
        setEscolhaOpen(true);
        return;
      }

      // Cenário 1/2: cria nova leitura vinculada ao clube
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
      await supabase
        .from("usuario_livros")
        .update({ status: "lendo" })
        .eq("id", usuarioLivroId);
      navigate(`/leituras/${novaUL.id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao abrir livro");
    } finally {
      setNavLoading(false);
    }
  };

  /**
   * Associa uma leitura já concluída ao clube: cria/atualiza usuario_leitura
   * vinculado ao clube com status=concluido. Não escreve em clube_progresso.
   */
  const associarConcluida = async () => {
    if (!user || !usuarioLivroIdCache) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      // Se já existe leitura concluída sem clube, associa-a; senão cria uma nova
      const { data: existente } = await supabase
        .from("usuario_leituras")
        .select("id, clube_id, status")
        .eq("usuario_livro_id", usuarioLivroIdCache)
        .eq("status", "concluido")
        .is("clube_id", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let leituraIdAlvo = leituraConcluidaId;
      if (existente?.id) {
        const { error } = await supabase
          .from("usuario_leituras")
          .update({ clube_id: clubeId, tipo_origem: "clube" })
          .eq("id", existente.id);
        if (error) throw error;
        leituraIdAlvo = existente.id;
      } else {
        const { data: nova, error } = await supabase
          .from("usuario_leituras")
          .insert({
            usuario_livro_id: usuarioLivroIdCache,
            tipo_origem: "clube",
            clube_id: clubeId,
            status: "concluido",
            data_inicio: today,
            data_fim: today,
          })
          .select("id")
          .single();
        if (error) throw error;
        leituraIdAlvo = nova.id;
      }
      toast.success("Leitura associada ao clube como concluída");
      qc.invalidateQueries({ queryKey: ["clube-leituras", clubeId] });
      setEscolhaOpen(false);
      if (leituraIdAlvo) navigate(`/leituras/${leituraIdAlvo}`);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao associar");
    }
  };

  /**
   * Cenário 4: relê o livro. Marca usuario_livros como 'relendo' e cria nova
   * usuario_leitura vinculada ao clube. Histórico anterior é preservado.
   */
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
        .update({ status: "relendo" })
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

      <Dialog open={escolhaOpen} onOpenChange={setEscolhaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Você já leu este livro</DialogTitle>
            <DialogDescription>
              Quer associar essa leitura concluída ao clube (a obra entra como concluída na sua trilha) ou prefere começar uma releitura?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEscolhaOpen(false)}>
              Cancelar
            </Button>
            <Button variant="outline" onClick={relerLivro}>
              Reler
            </Button>
            <Button onClick={associarConcluida} className="bg-primary hover:bg-primary-hover">
              Associar como concluído
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  return (
    <>
      <span onClick={() => setOpen(true)} className="contents">{trigger}</span>
      <ReadingProgressModal
        open={open}
        onOpenChange={setOpen}
        obraId={trilha.obra_id}
        clubeId={clubeId}
        totalPaginas={trilha.total_paginas ?? null}
        ultimaPagina={trilha.meu_progresso?.pagina_atual ?? 0}
      />
    </>
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
