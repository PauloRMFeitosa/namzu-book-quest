import { useQuery } from "@tanstack/react-query";
import { BookOpen, Calendar, FileText, Building2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  usuarioLivroId: string;
}

export const LivroHeader = ({ usuarioLivroId }: Props) => {
  const { data } = useQuery({
    queryKey: ["livro-header", usuarioLivroId],
    enabled: !!usuarioLivroId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuario_livros")
        .select(
          "obras(*, obra_autores(ordem, autores(id, nome))), edicoes(num_paginas, capa_url, editora)"
        )
        .eq("id", usuarioLivroId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  if (!data) return null;
  const obra = data.obras;
  const edicao = data.edicoes;
  const autores = (obra?.obra_autores ?? [])
    .slice()
    .sort((a: any, b: any) => (a.ordem ?? 0) - (b.ordem ?? 0))
    .map((oa: any) => oa.autores?.nome)
    .filter(Boolean);
  const ano = edicao?.ano_publicacao ?? obra?.ano_primeira_publicacao;
  const capa = edicao?.capa_url || obra?.capa_padrao_url;

  return (
    <div className="card-soft p-4 flex gap-4">
      {capa ? (
        <img src={capa} alt={obra?.titulo_original ?? ""} className="w-28 h-40 rounded-xl object-cover shadow-elevated flex-shrink-0" />
      ) : (
        <div className="w-28 h-40 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-10 h-10 text-primary" />
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5 justify-center">
        <h1 className="text-lg font-bold leading-tight">{obra?.titulo_original}</h1>
        {autores.length > 0 && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> {autores.join(", ")}
          </p>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
          {ano && (
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {ano}</span>
          )}
          {edicao?.num_paginas && (
            <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {edicao.num_paginas} págs</span>
          )}
          {edicao?.editora && (
            <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {edicao.editora}</span>
          )}
        </div>
      </div>
    </div>
  );
};
