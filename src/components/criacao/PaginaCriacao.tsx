import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// Moldura das páginas de criação (ver "Criação em Página" no CLAUDE.md):
// voltar e título no topo, seções numeradas e os botões no fim.

export const PaginaCriacao = ({
  titulo,
  subtitulo,
  voltarPara,
  rotuloVoltar,
  children,
}: {
  titulo: string;
  subtitulo?: string | null;
  voltarPara: string;
  rotuloVoltar: string;
  children: ReactNode;
}) => (
  <div className="flex flex-col gap-5 max-w-2xl w-full mx-auto pb-6">
    <header className="flex items-start gap-2">
      <Button variant="ghost" size="icon" asChild className="rounded-xl shrink-0" aria-label={rotuloVoltar}>
        <Link to={voltarPara}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
      </Button>
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold leading-tight">{titulo}</h1>
        {subtitulo && <p className="text-sm text-muted-foreground truncate">{subtitulo}</p>}
      </div>
    </header>
    {children}
  </div>
);

export const SecaoCriacao = ({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: ReactNode;
}) => (
  <section className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
    <div>
      <h2 className="font-display text-base font-semibold">{titulo}</h2>
      {descricao && <p className="text-sm text-muted-foreground">{descricao}</p>}
    </div>
    {children}
  </section>
);

/** Erro do formulário, mostrado só depois da primeira tentativa de salvar. */
export const ErroCriacao = ({ erro }: { erro: string | null | false }) =>
  erro ? (
    <p role="alert" className="text-sm text-destructive">
      {erro}
    </p>
  ) : null;

export const AcoesCriacao = ({ cancelarPara, children }: { cancelarPara: string; children: ReactNode }) => (
  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
    <Button variant="ghost" asChild className="rounded-xl">
      <Link to={cancelarPara}>Cancelar</Link>
    </Button>
    {children}
  </div>
);
