import { useState } from "react";
import { Quote, Share2, BookOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHero } from "@/components/PageHero";
import { EmptyState } from "@/components/ui/empty-state";
import { CitacaoShareModal } from "@/components/CitacaoShareModal";
import { useCitacoes, type Citacao } from "@/hooks/useCitacoes";
import { cn } from "@/lib/utils";

export default function Citacoes() {
  const { data: citacoes = [], isLoading } = useCitacoes();
  const [shareTarget, setShareTarget] = useState<Citacao | null>(null);

  return (
    <div className="flex flex-col gap-5 pb-6">
      <PageHero
        icon={Quote}
        badge="Citações"
        title={
          <>
            Minhas <span className="text-gradient-warm">citações</span>
          </>
        }
        description="Trechos que você salvou durante as leituras."
      />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card-soft p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-4 bg-muted rounded w-full mb-2" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : citacoes.length === 0 ? (
        <EmptyState
          icon={Quote}
          title="Nenhuma citação ainda"
          description="Salve trechos durante suas leituras e eles aparecerão aqui."
          variant="page"
        />
      ) : (
        <div className="space-y-3">
          {citacoes.map((c) => (
            <CitacaoItem
              key={c.id}
              citacao={c}
              onShare={() => setShareTarget(c)}
            />
          ))}
        </div>
      )}

      <CitacaoShareModal
        citacao={shareTarget}
        open={!!shareTarget}
        onClose={() => setShareTarget(null)}
      />
    </div>
  );
}

function CitacaoItem({
  citacao,
  onShare,
}: {
  citacao: Citacao;
  onShare: () => void;
}) {
  return (
    <div
      className={cn(
        "card-soft p-4 flex flex-col gap-3",
        "border border-border/40 hover:border-primary/20 transition-colors"
      )}
    >
      {/* Quote text */}
      <div className="flex gap-3">
        <Quote className="w-4 h-4 text-primary/40 mt-0.5 flex-shrink-0" />
        <p className="text-sm leading-relaxed italic text-foreground line-clamp-4">
          {citacao.texto}
        </p>
      </div>

      {/* Attribution + actions */}
      <div className="flex items-end justify-between gap-2 pl-7">
        <div className="min-w-0">
          {/* Book cover + info */}
          <div className="flex items-center gap-2">
            {citacao.obra_capa ? (
              <img
                src={citacao.obra_capa}
                alt=""
                className="w-6 aspect-[2/3] rounded object-cover flex-shrink-0"
              />
            ) : (
              <BookOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground line-clamp-1">
                {citacao.obra_titulo}
              </p>
              {citacao.autor_nome && (
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  {citacao.autor_nome}
                  {citacao.pagina ? ` · p. ${citacao.pagina}` : ""}
                </p>
              )}
            </div>
          </div>
          {/* Date */}
          <p className="text-[10px] text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(citacao.created_at), {
              addSuffix: true,
              locale: ptBR,
            })}
          </p>
        </div>

        {/* Share button */}
        <button
          onClick={onShare}
          className={cn(
            "flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-medium flex-shrink-0",
            "border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary",
            "transition-colors"
          )}
        >
          <Share2 className="w-3 h-3" />
          Compartilhar
        </button>
      </div>
    </div>
  );
}
