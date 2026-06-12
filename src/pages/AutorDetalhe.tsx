import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, BookOpen, User, ExternalLink } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtAno = (d: string | null) => (d ? d.slice(0, 4) : null);

// ─── Page ─────────────────────────────────────────────────────────────────────

const AutorDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: autor, isLoading } = useQuery({
    queryKey: ["autor-detalhe", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("autores")
        .select(
          `id, nome_completo, nome_ordenacao, nacionalidade,
           data_nascimento, data_falecimento, foto_url, descricao`
        )
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Obras do autor (via obra_autores)
  const { data: obras = [] } = useQuery({
    queryKey: ["autor-obras", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("obra_autores")
        .select("ordem, obras(id, titulo_original, capa_padrao_url, ano_primeira_publicacao)")
        .eq("autor_id", id!)
        .order("ordem", { ascending: true });
      return ((data ?? []) as any[])
        .map((r: any) => r.obras)
        .filter(Boolean)
        .sort((a: any, b: any) =>
          (a.ano_primeira_publicacao ?? 9999) - (b.ano_primeira_publicacao ?? 9999)
        );
    },
  });

  // ── Loading / not found ──────────────────────────────────────────────────────
  if (isLoading) return <p className="text-muted-foreground">Carregando…</p>;
  if (!autor) return <p className="text-muted-foreground">Autor não encontrado.</p>;

  const nascimento = fmtAno(autor.data_nascimento);
  const falecimento = fmtAno(autor.data_falecimento);
  const datas =
    nascimento || falecimento
      ? `${nascimento ?? "?"}${falecimento ? ` – ${falecimento}` : ""}`
      : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Voltar */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-muted-foreground -mx-2 p-2 w-fit"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      {/* Cabeçalho */}
      <div className="flex gap-4">
        {/* Avatar */}
        {autor.foto_url ? (
          <img
            src={autor.foto_url}
            alt={autor.nome_completo}
            className="w-24 h-32 rounded-xl object-cover shadow-elevated shrink-0"
          />
        ) : (
          <div className="w-24 h-32 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <User className="w-10 h-10 text-primary" />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <h1 className="text-xl font-bold leading-tight">{autor.nome_completo}</h1>
          {autor.nacionalidade && (
            <p className="text-sm text-muted-foreground">{autor.nacionalidade}</p>
          )}
          {datas && (
            <p className="text-xs text-muted-foreground">{datas}</p>
          )}
          {obras.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {obras.length} obra{obras.length !== 1 ? "s" : ""} no catálogo
            </p>
          )}
        </div>
      </div>

      {/* Biografia */}
      {autor.descricao && (
        <section className="card-soft p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Biografia
          </h2>
          <p className="text-sm leading-relaxed whitespace-pre-line">{autor.descricao}</p>
        </section>
      )}

      {/* Obras */}
      {obras.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Obras no catálogo
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {obras.map((o: any) => (
              <Link
                key={o.id}
                to={`/obras/${o.id}`}
                className="flex flex-col hover-lift"
              >
                {o.capa_padrao_url ? (
                  <img
                    src={o.capa_padrao_url}
                    alt=""
                    className="w-full aspect-[2/3] rounded-lg object-cover shadow-soft"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] rounded-lg bg-secondary flex items-center justify-center shadow-soft">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                )}
                <p className="text-xs mt-1.5 line-clamp-2 font-medium leading-snug">
                  {o.titulo_original}
                </p>
                {o.ano_primeira_publicacao && (
                  <p className="text-[10px] text-muted-foreground">{o.ano_primeira_publicacao}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default AutorDetalhe;
