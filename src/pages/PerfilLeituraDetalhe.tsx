import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { resolverCapa } from "@/lib/capaLivro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, BookOpen, BookOpenCheck, CalendarDays, Lightbulb,
  Lock, Quote, Star, Target,
} from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  lendo: "Lendo",
  concluido: "Concluído",
  lido: "Concluído",
  quero_ler: "Quero ler",
  abandonado: "Abandonado",
};

const formatarData = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—";

// Página somente-leitura: jornada de leitura de um livro de outro usuário,
// acessada a partir das prateleiras do perfil. A visibilidade segue a regra
// do perfil (público para todos; privado apenas para o dono e admins) e é
// garantida também no banco pelas políticas de SELECT (pode_ver_leituras_de).
export default function PerfilLeituraDetalhe() {
  const { usuarioLivroId } = useParams<{ id: string; usuarioLivroId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  const { data: livro, isLoading: carregandoLivro } = useQuery({
    queryKey: ["perfil-livro", usuarioLivroId],
    enabled: !!usuarioLivroId,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("usuario_livros")
        .select("id, user_id, status, favorito, nota, obras(titulo_original, capa_padrao_url, obra_autores(ordem, autores(id, nome_completo))), edicoes(capa_url, titulo_edicao, num_paginas)")
        .eq("id", usuarioLivroId!)
        .maybeSingle();
      return data as any;
    },
  });

  const { data: dono, isLoading: carregandoDono } = useQuery({
    queryKey: ["perfil-livro-dono", livro?.user_id],
    enabled: !!livro?.user_id,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("perfis")
        .select("user_id, nome_exibicao, username, slug, perfil_publico")
        .eq("user_id", livro!.user_id)
        .maybeSingle();
      return data as any;
    },
  });

  const ehDono = !!user && !!livro && user.id === livro.user_id;
  const podeVer = ehDono || isAdmin || dono?.perfil_publico === true;

  const { data: jornada, isLoading: carregandoJornada } = useQuery({
    queryKey: ["perfil-livro-jornada", usuarioLivroId],
    enabled: !!usuarioLivroId && !!dono && !adminLoading && podeVer,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data: experiencias } = await supabase
        .from("usuario_leituras")
        .select("id")
        .eq("usuario_livro_id", usuarioLivroId!);
      const ids = (experiencias ?? []).map((e: any) => e.id);
      if (!ids.length) {
        return { sessoes: [], insights: [], citacoes: [], aplicacoes: [], resenha: null };
      }

      const { data: leituras } = await supabase
        .from("leituras")
        .select(`id, tipo, created_at,
          leitura_conteudo(id, resumo, conceito_principal),
          leitura_citacoes(id, texto, pagina),
          leitura_aplicacoes(id, descricao),
          leitura_progresso(paginas_lidas)`)
        .in("usuario_leitura_id", ids)
        .order("created_at", { ascending: true });

      const todas = leituras ?? [];

      // Página alcançada em cada sessão → páginas lidas por sessão (cumulativo)
      let anterior = 0;
      const sessoes = todas
        .filter((l: any) => l.tipo === "leitura")
        .map((l: any) => {
          const alcancada = (l.leitura_progresso ?? []).reduce(
            (m: number, p: any) => Math.max(m, Number(p.paginas_lidas ?? 0)), 0
          );
          const lidas = Math.max(0, alcancada - anterior);
          if (alcancada > 0) anterior = alcancada;
          return { id: l.id, data: l.created_at as string | null, alcancada, lidas };
        });

      const insights = todas.flatMap((l: any) => l.leitura_conteudo ?? []);
      const citacoes = todas.flatMap((l: any) => l.leitura_citacoes ?? []);
      const aplicacoes = todas.flatMap((l: any) => l.leitura_aplicacoes ?? []);

      let resenha: string | null = null;
      const posIds = todas.filter((l: any) => l.tipo === "pos_leitura").map((l: any) => l.id);
      if (posIds.length) {
        const { data: pos } = await supabase
          .from("leitura_pos")
          .select("leitura_id, resenha")
          .in("leitura_id", posIds);
        resenha = (pos ?? []).map((p: any) => p.resenha).find(Boolean) ?? null;
      }

      return { sessoes: [...sessoes].reverse(), insights, citacoes, aplicacoes, resenha };
    },
  });

  if (carregandoLivro || (livro && carregandoDono) || (livro && !podeVer && adminLoading)) {
    return (
      <div className="flex flex-col gap-4 animate-pulse max-w-2xl mx-auto w-full">
        <div className="h-8 w-24 rounded-lg bg-muted" />
        <div className="h-40 rounded-2xl bg-muted" />
        <div className="h-28 rounded-2xl bg-muted" />
        <div className="h-28 rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!livro) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <BookOpen className="w-12 h-12 text-muted-foreground/40" />
        <p className="font-semibold">Leitura não encontrada</p>
        <Button variant="outline" onClick={() => navigate(-1)} className="rounded-xl">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  // Regra do perfil: privado bloqueia para quem não é dono nem admin
  if (!podeVer) {
    return (
      <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 w-fit">
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <div className="card-soft p-8 flex flex-col items-center gap-3 text-center">
          <Lock className="w-8 h-8 text-muted-foreground" />
          <p className="font-semibold">Este perfil é privado</p>
          <p className="text-sm text-muted-foreground">
            As leituras deste usuário não estão disponíveis.
          </p>
        </div>
      </div>
    );
  }

  const titulo = livro.edicoes?.titulo_edicao ?? livro.obras?.titulo_original ?? "—";
  const capa = resolverCapa(livro.obras?.capa_padrao_url, livro.edicoes?.capa_url);
  const autores = (livro.obras?.obra_autores ?? [])
    .slice()
    .sort((a: any, b: any) => (a.ordem ?? 0) - (b.ordem ?? 0))
    .map((oa: any) => oa.autores?.nome_completo)
    .filter(Boolean)
    .join(", ");

  const sessoes = jornada?.sessoes ?? [];
  const insights = jornada?.insights ?? [];
  const citacoes = jornada?.citacoes ?? [];
  const aplicacoes = jornada?.aplicacoes ?? [];
  const resenha = jornada?.resenha ?? null;

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 w-fit">
        <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
      </Button>

      {/* Cabeçalho do livro */}
      <section className="card-soft p-4 flex gap-4">
        <div className="w-20 shrink-0">
          <div className="aspect-[2/3] rounded-md overflow-hidden bg-muted border border-border/60">
            {capa ? (
              <img src={capa} alt={titulo} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-lg font-semibold leading-tight">{titulo}</h1>
          {autores && <p className="text-sm text-muted-foreground mt-0.5">{autores}</p>}
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <Badge variant="secondary">{STATUS_LABEL[livro.status] ?? livro.status}</Badge>
            {livro.nota != null && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                {Number(livro.nota)}
              </span>
            )}
          </div>
          {dono && (
            <button
              onClick={() => navigate(`/perfis/${dono.slug ?? dono.user_id}`)}
              className="text-xs text-primary font-medium mt-2"
            >
              Leitura de {dono.nome_exibicao}
            </button>
          )}
        </div>
      </section>

      {carregandoJornada ? (
        <div className="flex flex-col gap-3 animate-pulse">
          <div className="h-28 rounded-2xl bg-muted" />
          <div className="h-28 rounded-2xl bg-muted" />
        </div>
      ) : (
        <>
          {/* Sessões de leitura */}
          <section className="card-soft p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Sessões de leitura</h2>
              <span className="text-xs text-muted-foreground ml-auto">{sessoes.length}</span>
            </div>
            {sessoes.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma sessão registrada.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {sessoes.map((s: any, idx: number) => (
                  <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/40">
                    <span className="text-sm font-medium">
                      Sessão #{sessoes.length - idx}
                      {s.lidas > 0 ? ` · ${s.lidas} pgs` : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatarData(s.data)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Insights */}
          <section className="card-soft p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Insights</h2>
              <span className="text-xs text-muted-foreground ml-auto">{insights.length}</span>
            </div>
            {insights.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum insight registrado.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {insights.map((i: any) => (
                  <div key={i.id} className="px-3 py-2 rounded-xl bg-muted/40">
                    {i.conceito_principal && (
                      <p className="text-sm font-semibold">{i.conceito_principal}</p>
                    )}
                    {i.resumo && (
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap">{i.resumo}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Citações */}
          <section className="card-soft p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Quote className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Citações</h2>
              <span className="text-xs text-muted-foreground ml-auto">{citacoes.length}</span>
            </div>
            {citacoes.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma citação registrada.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {citacoes.map((c: any) => (
                  <blockquote key={c.id} className="px-3 py-2 rounded-xl bg-muted/40 border-l-2 border-primary/40">
                    <p className="text-sm italic whitespace-pre-wrap">"{c.texto}"</p>
                    {c.pagina != null && (
                      <p className="text-xs text-muted-foreground mt-1">Página {c.pagina}</p>
                    )}
                  </blockquote>
                ))}
              </div>
            )}
          </section>

          {/* Aplicações */}
          <section className="card-soft p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Aplicações</h2>
              <span className="text-xs text-muted-foreground ml-auto">{aplicacoes.length}</span>
            </div>
            {aplicacoes.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma aplicação registrada.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {aplicacoes.map((a: any) => (
                  <div key={a.id} className="px-3 py-2 rounded-xl bg-muted/40">
                    <p className="text-sm whitespace-pre-wrap">{a.descricao}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Resenha */}
          {resenha && (
            <section className="card-soft p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <BookOpenCheck className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold">Resenha</h2>
              </div>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">{resenha}</p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
