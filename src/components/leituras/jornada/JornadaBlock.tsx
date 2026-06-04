import { useState } from "react";
import { Sparkles, BookOpen, Award, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { LivroDetalhe } from "@/hooks/leituras/useLivroDetalhe";
import { getSessoes } from "@/hooks/leituras/useContainerLeitura";
import { PreLeituraForm } from "@/components/leituras/PreLeituraForm";
import { PreLeituraView } from "@/components/leituras/PreLeituraView";
import { SessoesList } from "./SessoesList";
import { PosLeituraSimples } from "./PosLeituraSimples";

type Status = "nao_iniciada" | "em_andamento" | "concluida";

const StatusBadge = ({ status }: { status: Status }) => {
  const label = status === "concluida" ? "Concluída" : status === "em_andamento" ? "Em andamento" : "Não iniciada";
  const cls = status === "concluida"
    ? "bg-primary/15 text-primary"
    : status === "em_andamento"
      ? "bg-secondary text-secondary-foreground"
      : "bg-muted text-muted-foreground";
  return <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${cls}`}>{label}</span>;
};

export const JornadaBlock = ({ livro }: { livro: LivroDetalhe }) => {
  const preLeitura = livro.leituras.find((l) => l.tipo === "pre_leitura");
  const hasPre = !!preLeitura?.leitura_pre;
  const sessoes = getSessoes(livro);
  const isLido = livro.status === "concluido";

  const [showPreForm, setShowPreForm] = useState(false);

  const statusPre: Status = hasPre ? "concluida" : "nao_iniciada";
  const statusSessoes: Status = isLido ? "concluida" : sessoes.length ? "em_andamento" : "nao_iniciada";
  const statusPos: Status = livro.leitura_pos ? "concluida" : isLido ? "em_andamento" : "nao_iniciada";

  return (
    <section className="card-soft p-4 flex flex-col gap-3">
      <h2 className="text-sm font-semibold">Jornada</h2>

      <Accordion type="multiple" defaultValue={["pre", "sessoes"]} className="flex flex-col gap-2">
        {/* Pré */}
        <AccordionItem value="pre" className="card-soft border-none px-3">
          <AccordionTrigger className="hover:no-underline py-2.5">
            <div className="flex items-center justify-between w-full pr-2">
              <span className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Pré-leitura
              </span>
              <StatusBadge status={statusPre} />
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            {hasPre ? (
              <PreLeituraView pre={preLeitura!.leitura_pre!} leituraId={preLeitura!.id} usuarioLeituraId={livro.id} />
            ) : showPreForm ? (
              <PreLeituraForm usuarioLeituraId={livro.id} onCancel={() => setShowPreForm(false)} onSaved={() => setShowPreForm(false)} />
            ) : (
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setShowPreForm(true)}>
                <Plus className="w-3 h-3" /> Iniciar pré-leitura
              </Button>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Sessões */}
        <AccordionItem value="sessoes" className="card-soft border-none px-3">
          <AccordionTrigger className="hover:no-underline py-2.5">
            <div className="flex items-center justify-between w-full pr-2">
              <span className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" /> Sessões de leitura
              </span>
              <StatusBadge status={statusSessoes} />
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <SessoesList sessoes={sessoes} usuarioLeituraId={livro.id} />
          </AccordionContent>
        </AccordionItem>

        {/* Pós */}
        <AccordionItem value="pos" className="card-soft border-none px-3">
          <AccordionTrigger className="hover:no-underline py-2.5">
            <div className="flex items-center justify-between w-full pr-2">
              <span className="text-sm font-semibold flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" /> Pós-leitura
              </span>
              <StatusBadge status={statusPos} />
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <PosLeituraSimples livro={livro} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
};
