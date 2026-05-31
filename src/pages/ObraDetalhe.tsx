import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, BookOpen, Star, BookmarkPlus, CheckCheck, Loader2, Quote, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ShareModal } from "@/components/share/ShareModal";

const Stars = ({ value, size = 16 }: { value: number; size?: number }) => {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => {
        const filled = i < full || (i === full && half);
        return (
          <Star
            key={i}
            style={{ width: size, height: size }}
            className={filled ? "fill-primary text-primary" : "text-muted-foreground/40"}
          />
        );
      })}
    </div>
  );
};

const ObraDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [adicionando, setAdicionando] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const { data: obra, isLoading } = useQuery({
    queryKey: ["obra-detalhe", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obras")
        .select(
          `id, titulo_original, sinopse_padrao, capa_padrao_url, ano_primeira_publicacao, idioma_original,
           obra_autores(ordem, autores(id, nome_completo)),
           edicoes(id, editora, num_paginas, capa_url, isbn_13, idioma),
           obra_generos(generos(id, nome, slug))`,
        )
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

  });

  const autores = (obra?.obra_autores ?? [])
    .slice()
    .sort((a: any, b: any) => (a.ordem ?? 99) - (b.ordem ?? 99))
    .map((oa: any) => oa.autores)
    .filter(Boolean);
  const autorPrincipal = autores[0];
  const editora = obra?.edicoes?.[0]?.editora ?? null;
  const numPaginas = obra?.edicoes?.[0]?.num_paginas ?? null;
  const generos: { id: string; nome: string; slug: string }[] = ((obra as any)?.obra_generos ?? [])
    .map((og: any) => og.generos)
    .filter(Boolean);


  // Outras obras do autor
  const { data: outrasObras = [] } = useQuery({
    queryKey: ["obras-do-autor", autorPrincipal?.id, id],
    enabled: !!autorPrincipal?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("obra_autores")
        .select("obras(id, titulo_original, capa_padrao_url, ano_primeira_publicacao)")
        .eq("autor_id", autorPrincipal.id)
        .neq("obra_id", id!)
        .limit(12);
      return (data ?? []).map((r: any) => r.obras).filter(Boolean);
    },
  });

  // Estatísticas agregadas de TODOS os usuários (via edge function, bypassa RLS)
  const { data: estatisticas } = useQuery({
    queryKey: ["obra-estatisticas", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("obra-estatisticas", {
        body: { obra_id: id },
      });
      if (error) throw error;
      return data as {
        lidos: number;
        lendo: number;
        quero: number;
        total_avaliacoes: number;
        media_nota: number;
      };
    },
  });

  // Resenhas (limitado pela RLS — atualmente vê apenas as do próprio usuário)
  const { data: avaliacoes = [] } = useQuery({
    queryKey: ["obra-avaliacoes", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("usuario_livros")
        .select("id, nota, review_texto, updated_at, user_id, status")
        .eq("obra_id", id!);
      return data ?? [];
    },
  });

  const mediaNota = estatisticas?.media_nota ?? 0;
  const totalAvaliacoes = estatisticas?.total_avaliacoes ?? 0;
  const resenhas = avaliacoes.filter((a: any) => a.review_texto?.trim());
  const stats = {
    lidos: estatisticas?.lidos ?? 0,
    lendo: estatisticas?.lendo ?? 0,
    quero: estatisticas?.quero ?? 0,
  };

  // Citações
  const { data: citacoes = [] } = useQuery({
    queryKey: ["obra-citacoes", id, user?.id],
    enabled: !!id && !!user,
    queryFn: async () => {
      const { data: uls } = await supabase
        .from("usuario_livros")
        .select("id")
        .eq("obra_id", id!)
        .eq("user_id", user!.id);
      const ulIds = (uls ?? []).map((u: any) => u.id);
      if (ulIds.length === 0) return [];
      const { data: exps } = await supabase
        .from("usuario_leituras")
        .select("id")
        .in("usuario_livro_id", ulIds);
      const expIds = (exps ?? []).map((e: any) => e.id);
      if (expIds.length === 0) return [];
      const { data: leituras } = await supabase
        .from("leituras")
        .select("id")
        .in("usuario_leitura_id", expIds);
      const leituraIds = (leituras ?? []).map((l: any) => l.id);
      if (leituraIds.length === 0) return [];
      const { data: cits } = await supabase
        .from("leitura_citacoes")
        .select("id, texto, pagina")
        .in("leitura_id", leituraIds)
        .limit(20);
      return cits ?? [];
    },
  });

  // Verifica se já está na biblioteca do usuário
  const { data: meuLivro } = useQuery({
    queryKey: ["meu-livro-obra", user?.id, id],
    enabled: !!user && !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("usuario_livros")
        .select("id, status")
        .eq("user_id", user!.id)
        .eq("obra_id", id!)
        .maybeSingle();
      return data;
    },
  });

  const adicionar = async (status: "quero_ler" | "lido") => {
    if (!user) return;
    setAdicionando(true);
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("usuario_livros").insert({
      user_id: user.id,
      obra_id: id!,
      status,
      ...(status === "lido" ? { data_fim: today } : {}),
    });
    setAdicionando(false);
    if (error) {
      if (error.code === "23505") return toast.info("Já está na sua lista");
      return toast.error(error.message);
    }
    toast.success(status === "lido" ? "Marcado como lido (+100 XP)" : "Adicionado em Quero ler");
    qc.invalidateQueries({ queryKey: ["meu-livro-obra", user.id, id] });
    qc.invalidateQueries({ queryKey: ["meus-livros"] });
    qc.invalidateQueries({ queryKey: ["ultimas-leituras"] });
  };

  if (isLoading) return <p className="text-muted-foreground">Carregando…</p>;
  if (!obra) return <p className="text-muted-foreground">Livro não encontrado.</p>;

  const capa = obra.edicoes?.[0]?.capa_url || obra.capa_padrao_url;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between -mx-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-muted-foreground p-2"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <Button onClick={() => setShareOpen(true)} variant="ghost" size="sm" className="rounded-xl">
          <Share2 className="w-4 h-4" /> Compartilhar
        </Button>
      </div>

      <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        data={{
          titulo: obra.titulo_original,
          autor: autores.map((a: any) => a.nome_completo).join(", ") || undefined,
          capaUrl: capa,
          nota: mediaNota > 0 ? mediaNota : null,
          link: `${window.location.origin}/obras/${id}`,
        }}
        templates={["recommend"]}
        defaultTemplate="recommend"
      />

      {/* Cabeçalho */}
      <div className="flex gap-4">
        {capa ? (
          <img src={capa} alt="" className="w-32 h-48 rounded-xl object-cover shadow-elevated" />
        ) : (
          <div className="w-32 h-48 rounded-xl bg-secondary flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <h1 className="text-xl font-bold leading-tight">{obra.titulo_original}</h1>
          {autores.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {autores.map((a: any) => a.nome_completo).join(", ")}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {[obra.ano_primeira_publicacao, editora, numPaginas && `${numPaginas} pág.`]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Stars value={mediaNota} />
            <span className="text-xs text-muted-foreground">
              {totalAvaliacoes > 0 ? `${mediaNota.toFixed(1)} (${totalAvaliacoes})` : "Sem avaliações"}
            </span>
          </div>
          {generos.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {generos.map((g) => (
                <span
                  key={g.id}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                >
                  {g.nome}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>


      {/* Sinopse */}
      {obra.sinopse_padrao && (
        <section className="card-soft p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Sinopse
          </h2>
          <p className="text-sm leading-relaxed whitespace-pre-line">{obra.sinopse_padrao}</p>
        </section>
      )}

      {/* Estatísticas */}
      <section className="grid grid-cols-3 gap-2">
        <div className="card-soft p-3 text-center">
          <p className="text-2xl font-bold">{stats.lidos}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Leram</p>
        </div>
        <div className="card-soft p-3 text-center">
          <p className="text-2xl font-bold">{stats.lendo}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Lendo</p>
        </div>
        <div className="card-soft p-3 text-center">
          <p className="text-2xl font-bold">{stats.quero}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Querem ler</p>
        </div>
      </section>

      {/* Minha biblioteca */}
      <section className="card-soft p-4 flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Minha biblioteca
        </h2>
        {meuLivro ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium capitalize">
              Status: {meuLivro.status.replace("_", " ")}
            </span>
            <Button
              onClick={async () => {
                // Busca experiência ativa para essa estante
                const { data: exp } = await supabase
                  .from("usuario_leituras")
                  .select("id")
                  .eq("usuario_livro_id", meuLivro.id)
                  .order("updated_at", { ascending: false })
                  .limit(1)
                  .maybeSingle();
                if (exp?.id) navigate(`/leituras/${exp.id}`);
                else {
                  const { criarUsuarioLeitura } = await import("@/hooks/leituras/useLeituraActions");
                  try {
                    const novoId = await criarUsuarioLeitura({ usuario_livro_id: meuLivro.id });
                    navigate(`/leituras/${novoId}`);
                  } catch (e: any) { toast.error(e.message); }
                }
              }}
              className="rounded-xl bg-primary hover:bg-primary-hover"
            >
              Abrir minha leitura
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => adicionar("quero_ler")}
              disabled={adicionando}
              variant="outline"
              className="rounded-xl border-2"
            >
              {adicionando ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkPlus className="w-4 h-4 mr-1" />}
              Quero ler
            </Button>
            <Button
              onClick={() => adicionar("lido")}
              disabled={adicionando}
              className="rounded-xl bg-primary hover:bg-primary-hover"
            >
              {adicionando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4 mr-1" />}
              Já li
            </Button>
          </div>
        )}
      </section>

      {/* Outras obras do autor */}
      {outrasObras.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Outras obras de {autorPrincipal?.nome_completo}
          </h2>
          <div className="flex gap-3 overflow-x-auto -mx-1 px-1 pb-2">
            {outrasObras.map((o: any) => (
              <Link
                key={o.id}
                to={`/obras/${o.id}`}
                className="flex-shrink-0 w-24 hover-lift flex flex-col"
              >
                {o.capa_padrao_url ? (
                  <img
                    src={o.capa_padrao_url}
                    alt=""
                    className="w-24 h-32 rounded-lg object-cover shadow-soft"
                  />
                ) : (
                  <div className="w-24 h-32 rounded-lg bg-secondary flex items-center justify-center shadow-soft">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                )}
                <p className="text-xs mt-1 line-clamp-2 break-words font-medium min-h-[2rem] text-left">
                  {o.titulo_original}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Citações */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Citações
        </h2>
        {citacoes.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma citação registrada ainda.</p>
        ) : (
          citacoes.map((c: any) => (
            <div key={c.id} className="card-soft p-4 flex gap-3">
              <Quote className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm italic leading-relaxed">"{c.texto}"</p>
                {c.pagina && (
                  <p className="text-[10px] text-muted-foreground mt-1">pág. {c.pagina}</p>
                )}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Resenhas */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Resenhas
        </h2>
        {resenhas.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma resenha ainda.</p>
        ) : (
          resenhas
            .slice()
            .sort((a: any, b: any) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
            .map((r: any) => (
              <div key={r.id} className="card-soft p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Stars value={Number(r.nota ?? 0)} size={14} />
                  {r.updated_at && (
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(r.updated_at).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-line">{r.review_texto}</p>
              </div>
            ))
        )}
      </section>
    </div>
  );
};

export default ObraDetalhe;
