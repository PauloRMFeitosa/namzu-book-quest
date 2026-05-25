import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LeituraExperienciaCard } from "@/components/leituras/LeituraExperienciaCard";

/**
 * Página de detalhe que agrupa TODAS as experiências de leitura (usuario_leituras)
 * do livro associado ao id atual.
 */
const LeituraDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["livro-experiencias", id, user?.id],
    enabled: !!id && !!user,
    queryFn: async () => {
      // 1. Descobre o usuario_livro_id a partir do id da rota
      const { data: ulBase, error } = await supabase
        .from("usuario_leituras")
        .select("usuario_livro_id, usuario_livros!inner(user_id)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!ulBase || (ulBase as any).usuario_livros?.user_id !== user!.id) return null;

      const usuarioLivroId = (ulBase as any).usuario_livro_id as string;

      // 2. Busca todas as experiências (usuario_leituras) desse livro
      const { data: rows, error: e2 } = await supabase
        .from("usuario_leituras")
        .select("id, data_inicio, created_at")
        .eq("usuario_livro_id", usuarioLivroId)
        .order("created_at", { ascending: false });
      if (e2) throw e2;

      return { usuarioLivroId, ids: (rows ?? []).map((r) => r.id) };
    },
  });

  return (
    <div className="flex flex-col gap-5">
      <button onClick={() => navigate(-1)} className="self-start flex items-center gap-1 text-muted-foreground -ml-2 p-2">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      {isLoading && <p className="text-muted-foreground">Carregando…</p>}
      {!isLoading && !data && <p className="text-muted-foreground">Leitura não encontrada.</p>}

      {data?.ids.map((ulId, idx) => (
        <LeituraExperienciaCard key={ulId} usuarioLeituraId={ulId} showLivroHeader={idx === 0} />
      ))}
    </div>
  );
};

export default LeituraDetalhe;
