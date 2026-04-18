import { Sparkles } from "lucide-react";

interface Props {
  pre: { intencao: string; dominio_previo: string | null; observacao: string | null };
}

export const PreLeituraView = ({ pre }: Props) => (
  <div className="card-soft p-4 flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <Sparkles className="w-4 h-4 text-primary" />
      <h3 className="font-semibold">Pré-leitura</h3>
    </div>
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Intenção</p>
      <p className="text-sm">{pre.intencao}</p>
    </div>
    {pre.dominio_previo && (
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Domínio prévio</p>
        <p className="text-sm">{pre.dominio_previo}</p>
      </div>
    )}
    {pre.observacao && (
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Observação</p>
        <p className="text-sm">{pre.observacao}</p>
      </div>
    )}
  </div>
);
