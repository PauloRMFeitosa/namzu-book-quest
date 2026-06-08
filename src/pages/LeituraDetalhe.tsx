import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLivroDetalhe } from "@/hooks/leituras/useLivroDetalhe";
import { LivroHeader } from "@/components/leituras/LivroHeader";
import { ProgressoBlock } from "@/components/leituras/jornada/ProgressoBlock";
import { JornadaBlock } from "@/components/leituras/jornada/JornadaBlock";
import { AprendizadosBlock } from "@/components/leituras/jornada/AprendizadosBlock";
import { OrganizacaoBlock } from "@/components/leituras/jornada/OrganizacaoBlock";
import { TimelineBlock } from "@/components/leituras/jornada/TimelineBlock";

const LeituraDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: livro, isLoading } = useLivroDetalhe(id);

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
      <button onClick={() => navigate(-1)} className="self-start flex items-center gap-1 text-muted-foreground -ml-2 p-2">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      {isLoading && <p className="text-muted-foreground">Carregando…</p>}
      {!isLoading && !livro && <p className="text-muted-foreground">Leitura não encontrada.</p>}

      {livro && user && (
        <>
          <LivroHeader usuarioLivroId={livro.usuario_livro_id} />
          <ProgressoBlock livro={livro} />
          <JornadaBlock livro={livro} />
          <AprendizadosBlock livro={livro} />
          <OrganizacaoBlock livro={livro} />
          <TimelineBlock livro={livro} />
        </>
      )}
    </div>
  );
};

export default LeituraDetalhe;
