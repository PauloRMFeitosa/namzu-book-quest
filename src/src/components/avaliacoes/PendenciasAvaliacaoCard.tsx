import { useState } from "react";
import { BookOpen, ChevronRight, X, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAvaliacoesPendentes, PendenciaAvaliacao } from "@/hooks/useAvaliacoesPendentes";
import { AvaliacaoModal } from "@/components/avaliacoes/AvaliacaoModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const LIMITE_HOME = 3;

// -----------------------------------------------------------------
// Botão de dispensar com dropdown (Lembrar mais tarde / Não avaliar)
// -----------------------------------------------------------------
const DispensarButton = ({ usuarioLivroId }: { usuarioLivroId: string }) => {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  const dispensar = async (definitivo: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc("dispensar_avaliacao", {
        p_usuario_livro_id: usuarioLivroId,
        p_definitivo: definitivo,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["pendencias-avaliacao"] });
      toast.success(definitivo ? "Avaliação removida da lista." : "Lembraremos em 7 dias.");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao dispensar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={loading}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Dispensar"
        >
          <X className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => dispensar(false)} className="gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          Lembrar mais tarde
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => dispensar(true)} className="gap-2 text-muted-foreground">
          <XCircle className="w-4 h-4" />
          Não quero avaliar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// -----------------------------------------------------------------
// Card de um único livro pendente
// -----------------------------------------------------------------
const ItemPendente = ({ item }: { item: PendenciaAvaliacao }) => {
  const [avaliacaoOpen, setAvaliacaoOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3">
        {item.capa_padrao_url ? (
          <img src={item.capa_padrao_url} alt="" className="w-12 h-16 rounded-lg object-cover shadow-soft flex-shrink-0" />
        ) : (
          <div className="w-12 h-16 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm line-clamp-2 leading-tight">{item.titulo_original}</p>
          <p className="text-xs text-muted-foreground mt-0.5">O que você achou?</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            onClick={() => setAvaliacaoOpen(true)}
            className="rounded-xl bg-primary hover:bg-primary-hover h-8 px-3 text-xs"
          >
            Avaliar
          </Button>
          <DispensarButton usuarioLivroId={item.usuario_livro_id} />
        </div>
      </div>

      <AvaliacaoModal
        open={avaliacaoOpen}
        onOpenChange={setAvaliacaoOpen}
        usuarioLivroId={item.usuario_livro_id}
        titulo={item.titulo_original}
        capaUrl={item.capa_padrao_url}
      />
    </>
  );
};

// -----------------------------------------------------------------
// Sheet com todas as pendências (quando total > LIMITE_HOME)
// -----------------------------------------------------------------
const TodasPendenciasSheet = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const { data: todas = [] } = useAvaliacoesPendentes(50);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="mb-4">
          <SheetTitle>Avaliações pendentes</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 pb-6">
          {todas.map((item) => (
            <ItemPendente key={item.usuario_livro_id} item={item} />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

// -----------------------------------------------------------------
// Componente principal — exibido na Home
// -----------------------------------------------------------------
export const PendenciasAvaliacaoCard = () => {
  const { data: pendencias = [], isLoading } = useAvaliacoesPendentes(LIMITE_HOME);
  const [todasOpen, setTodasOpen] = useState(false);

  if (isLoading || pendencias.length === 0) return null;

  const total = pendencias[0]?.total_pendencias ?? pendencias.length;
  const maisQue3 = total > LIMITE_HOME;

  return (
    <>
      <section className="card-soft p-4 flex flex-col gap-3 border-l-4 border-primary">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-primary font-semibold">
            {maisQue3 ? `${total} leituras aguardando avaliação` : "Awaiting your review"}
          </p>
          {maisQue3 && (
            <button
              onClick={() => setTodasOpen(true)}
              className="text-xs text-primary font-medium flex items-center gap-0.5"
            >
              Ver todas <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {maisQue3 ? (
          /* Mais de 3: mostra mensagem resumida + botão */
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Você possui <span className="font-semibold text-foreground">{total}</span> leituras aguardando avaliação.
            </p>
            <Button
              size="sm"
              onClick={() => setTodasOpen(true)}
              className="rounded-xl bg-primary hover:bg-primary-hover h-9 px-4 shrink-0"
            >
              Ver todas
            </Button>
          </div>
        ) : (
          /* 1 a 3: mostra lista de itens */
          <div className="flex flex-col gap-3 divide-y divide-border/40">
            {pendencias.map((item, i) => (
              <div key={item.usuario_livro_id} className={i > 0 ? "pt-3" : ""}>
                <ItemPendente item={item} />
              </div>
            ))}
          </div>
        )}
      </section>

      <TodasPendenciasSheet open={todasOpen} onOpenChange={setTodasOpen} />
    </>
  );
};
