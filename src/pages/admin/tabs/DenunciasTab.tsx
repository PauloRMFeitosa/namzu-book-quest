import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flag, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Denuncia {
  id: string;
  created_at: string;
  denunciante_id: string;
  denunciado_user_id: string | null;
  tipo_conteudo: string;
  conteudo_id: string | null;
  contexto_url: string | null;
  motivo: string;
  status: string;
  observacao_admin: string | null;
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pendente: { label: "Pendente", variant: "destructive" },
  resolvida: { label: "Resolvida", variant: "secondary" },
  rejeitada: { label: "Rejeitada", variant: "outline" },
};

// Tipos vindos do FeedbackDialog (canal geral do cabeçalho); demais valores
// (citacao, insight, resenha, leitura, perfil) vêm do ReportarConteudoDialog.
const TIPO_BADGE: Record<string, { label: string; className: string }> = {
  denuncia: { label: "Denúncia", className: "bg-destructive/10 text-destructive border-destructive/30" },
  erro: { label: "Erro", className: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
  sugestao: { label: "Sugestão", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
};

type Filtro = "todas" | "denuncias" | "erros" | "sugestoes";

const FILTROS: { value: Filtro; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "denuncias", label: "Denúncias" },
  { value: "erros", label: "Erros" },
  { value: "sugestoes", label: "Sugestões" },
];

const passaFiltro = (d: Denuncia, filtro: Filtro) => {
  if (filtro === "todas") return true;
  if (filtro === "erros") return d.tipo_conteudo === "erro";
  if (filtro === "sugestoes") return d.tipo_conteudo === "sugestao";
  // "denuncias": tipo 'denuncia' do canal geral + denúncias de conteúdo (citacao, insight etc.)
  return d.tipo_conteudo !== "erro" && d.tipo_conteudo !== "sugestao";
};

export const DenunciasTab = () => {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const { data: denuncias = [], isLoading } = useQuery({
    queryKey: ["admin-denuncias"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("denuncias_conteudo")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Denuncia[];
    },
  });

  const { data: perfis = {} } = useQuery({
    queryKey: ["admin-denuncias-perfis", denuncias.length],
    enabled: denuncias.length > 0,
    queryFn: async () => {
      const ids = Array.from(new Set(
        denuncias.flatMap((d) => [d.denunciante_id, d.denunciado_user_id]).filter(Boolean)
      )) as string[];
      const { data } = await supabase
        .from("perfis")
        .select("user_id, nome_exibicao, username")
        .in("user_id", ids);
      const mapa: Record<string, string> = {};
      for (const p of data ?? []) mapa[p.user_id] = `${p.nome_exibicao} (@${p.username})`;
      return mapa;
    },
  });

  const atualizarStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any)
        .from("denuncias_conteudo")
        .update({ status, resolvido_em: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro atualizado");
      qc.invalidateQueries({ queryKey: ["admin-denuncias"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!denuncias.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <Flag className="w-10 h-10 text-muted-foreground/40" />
        <p className="font-semibold text-sm">Nenhum registro</p>
        <p className="text-xs text-muted-foreground max-w-sm">
          Denúncias, comunicados de erro e sugestões enviados pelos usuários aparecerão aqui.
        </p>
      </div>
    );
  }

  const filtradas = denuncias.filter((d) => passaFiltro(d, filtro));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTROS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFiltro(value)}
            className={cn(
              "rounded-lg px-3 py-1 text-xs font-medium transition-colors border",
              filtro === value
                ? "bg-secondary text-primary border-primary/30"
                : "text-muted-foreground border-border hover:bg-muted"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {!filtradas.length && (
        <p className="text-xs text-muted-foreground py-8 text-center">
          Nenhum registro nesse filtro.
        </p>
      )}

      {filtradas.map((d) => {
        const badge = STATUS_BADGE[d.status] ?? { label: d.status, variant: "outline" as const };
        const tipoBadge = TIPO_BADGE[d.tipo_conteudo];
        const ehFeedbackGeral = d.tipo_conteudo === "erro" || d.tipo_conteudo === "sugestao";
        return (
          <div key={d.id} className="rounded-xl border border-border p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={badge.variant}>{badge.label}</Badge>
              {tipoBadge ? (
                <Badge variant="outline" className={tipoBadge.className}>{tipoBadge.label}</Badge>
              ) : (
                <Badge variant="outline">{d.tipo_conteudo}</Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(d.created_at).toLocaleString("pt-BR")}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{d.motivo}</p>
            <div className="text-xs text-muted-foreground flex flex-col gap-0.5">
              <span>{ehFeedbackGeral ? "Enviado por" : "Denunciante"}: {perfis[d.denunciante_id] ?? d.denunciante_id}</span>
              {d.denunciado_user_id && (
                <span>Conteúdo de: {perfis[d.denunciado_user_id] ?? d.denunciado_user_id}</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {d.contexto_url && (
                <Button asChild variant="outline" size="sm" className="rounded-lg h-8 text-xs">
                  <Link to={d.contexto_url}>
                    <ExternalLink className="w-3.5 h-3.5" /> {ehFeedbackGeral ? "Ver página" : "Ver conteúdo"}
                  </Link>
                </Button>
              )}
              {d.status === "pendente" && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-lg h-8 text-xs"
                    disabled={atualizarStatus.isPending}
                    onClick={() => atualizarStatus.mutate({ id: d.id, status: "resolvida" })}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Marcar resolvida
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-lg h-8 text-xs text-muted-foreground"
                    disabled={atualizarStatus.isPending}
                    onClick={() => atualizarStatus.mutate({ id: d.id, status: "rejeitada" })}
                  >
                    <XCircle className="w-3.5 h-3.5" /> Rejeitar
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
