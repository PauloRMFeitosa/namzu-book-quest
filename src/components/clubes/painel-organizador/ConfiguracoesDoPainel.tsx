import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Globe, Lock, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Bloco } from "@/components/painel/PartesDoPainel";
import { PlanoDoPainel } from "@/components/clubes/painel-organizador/PlanoDoPainel";
import { EditarClubeDialog } from "@/components/clubes/gestao/EditarClubeDialog";
import { CATEGORIAS } from "@/hooks/clubes/useClubes";
import type { ClubeDetalhe } from "@/hooks/clubes/useClube";
import { explicarVisibilidade } from "@/lib/criacao";
import { MAXIMO_CO_CURADORES } from "@/lib/papeis";

const Linha = ({ rotulo, children }: { rotulo: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-1 sm:gap-3 py-2.5 border-b border-border/60 last:border-0">
    <dt className="text-sm text-muted-foreground">{rotulo}</dt>
    <dd className="text-sm min-w-0 break-words">{children}</dd>
  </div>
);

// Dados do clube e quem ajuda a organizar.
export const ConfiguracoesDoPainel = ({
  clube,
  podeEditar,
  onIrPara,
  roteiroDispensado,
  onReabrirRoteiro,
}: {
  clube: ClubeDetalhe;
  /** Só o organizador e o admin editam o clube e nomeiam co-curadores. */
  podeEditar: boolean;
  onIrPara: (secao: string) => void;
  /** O roteiro "Primeiros passos" foi dispensado neste aparelho. */
  roteiroDispensado?: boolean;
  onReabrirRoteiro?: () => void;
}) => {
  const [editando, setEditando] = useState(false);
  const privado = clube.visibilidade === "privado";
  const categoria = CATEGORIAS.find((c) => c.value === clube.categoria)?.label;

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <Bloco
        titulo="Dados do clube"
        descricao={podeEditar ? "Como o clube aparece para quem recebe o convite." : "Só quem criou o clube pode alterar estes dados."}
        acao={
          podeEditar ? (
            <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => setEditando(true)}>
              <Settings className="w-4 h-4" /> Editar clube
            </Button>
          ) : undefined
        }
      >
        <dl>
          <Linha rotulo="Nome">{clube.nome}</Linha>
          <Linha rotulo="Descrição">{clube.descricao || <span className="text-muted-foreground">Sem descrição</span>}</Linha>
          <Linha rotulo="Objetivo">{clube.objetivo || <span className="text-muted-foreground">Sem objetivo</span>}</Linha>
          <Linha rotulo="Categoria">{categoria ?? <span className="text-muted-foreground">Sem categoria</span>}</Linha>
          <Linha rotulo="Quem pode entrar">
            <span className="flex items-start gap-1.5">
              {privado ? <Lock className="w-4 h-4 shrink-0 mt-0.5" /> : <Globe className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>
                <span className="font-medium">{privado ? "Privado" : "Público"}.</span> {explicarVisibilidade(privado ? "privado" : "publico")}
              </span>
            </span>
          </Linha>
        </dl>
      </Bloco>

      <PlanoDoPainel clubeId={clube.id} />

      <Bloco
        titulo="Quem ajuda a organizar"
        descricao={`Um co-curador gere membros, leitura, encontros e avisos junto com você. O clube aceita até ${MAXIMO_CO_CURADORES}.`}
        acao={
          <Button size="sm" variant="outline" className="shrink-0" onClick={() => onIrPara("membros")}>
            Ver membros
          </Button>
        }
      >
        <p className="text-sm text-muted-foreground">
          {podeEditar
            ? "Para nomear ou retirar um co-curador, abra Membros e mude o papel da pessoa."
            : "Só quem criou o clube nomeia co-curadores."}
        </p>
      </Bloco>

      {roteiroDispensado && onReabrirRoteiro && (
        <Bloco titulo="Primeiros passos" descricao="O roteiro com o que fazer para deixar o clube pronto: livro, cronograma, encontro, página e convite.">
          <Button variant="outline" size="sm" className="self-start" onClick={onReabrirRoteiro}>
            Mostrar o roteiro de novo
          </Button>
        </Bloco>
      )}

      <Bloco titulo="Ver como os membros veem">
        <Button asChild variant="outline" size="sm" className="gap-1.5 self-start">
          <Link to={`/clubes/${clube.id}`}>
            <ExternalLink className="w-4 h-4" /> Abrir a página do clube
          </Link>
        </Button>
      </Bloco>

      {podeEditar && <EditarClubeDialog clube={clube} open={editando} onOpenChange={setEditando} />}
    </div>
  );
};
