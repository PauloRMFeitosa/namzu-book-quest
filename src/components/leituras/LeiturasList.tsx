import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LeituraFull } from "@/hooks/leituras/useLivroDetalhe";
import { BookOpen, ExternalLink, Quote, Target, Tag } from "lucide-react";

export const LeiturasList = ({ leituras }: { leituras: LeituraFull[] }) => {
  const items = leituras.filter((l) => l.tipo === "leitura");
  if (!items.length) {
    return <p className="text-sm text-muted-foreground text-center py-4">Nenhuma leitura registrada ainda.</p>;
  }
  return (
    <Accordion type="multiple" className="flex flex-col gap-2">
      {items.map((l, idx) => {
        const c = l.leitura_conteudo[0];
        return (
          <AccordionItem key={l.id} value={l.id} className="card-soft border-none px-3">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex flex-col items-start gap-0.5 text-left">
                <span className="text-sm font-medium">Sessão #{idx + 1}{l.paginas_lidas ? ` · ${l.paginas_lidas} pgs` : ""}</span>
                <span className="text-xs text-muted-foreground">
                  {l.created_at ? new Date(l.created_at).toLocaleDateString("pt-BR") : ""}
                  {c?.conceito_principal ? ` · ${c.conceito_principal}` : ""}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-3 pb-3">
              {c?.resumo && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1"><BookOpen className="w-3 h-3" /> Resumo</p>
                  <p className="text-sm mt-1">{c.resumo}</p>
                </div>
              )}
              {l.leitura_citacoes.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Quote className="w-3 h-3" /> Citações</p>
                  <ul className="flex flex-col gap-1 mt-1">
                    {l.leitura_citacoes.map((q) => (
                      <li key={q.id} className="text-sm border-l-2 border-primary pl-2 italic">
                        "{q.texto}"{q.pagina ? <span className="text-xs text-muted-foreground not-italic"> · pg {q.pagina}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {l.leitura_aplicacoes.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3" /> Aplicações</p>
                  <ul className="flex flex-col gap-1 mt-1">
                    {l.leitura_aplicacoes.map((a) => (
                      <li key={a.id} className="text-sm">
                        {a.descricao}
                        {a.plano_acao?.passos && (
                          <ol className="text-xs text-muted-foreground list-decimal pl-5 mt-1">
                            {a.plano_acao.passos.map((p: any) => <li key={p.ordem}>{p.texto}</li>)}
                          </ol>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {l.leitura_links.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Links</p>
                  <ul className="flex flex-col gap-1 mt-1">
                    {l.leitura_links.map((lk) => (
                      <li key={lk.id} className="text-sm">
                        <a href={lk.url} target="_blank" rel="noreferrer" className="text-primary underline">{lk.descricao || lk.url}</a>
                        {lk.tipo && <span className="text-xs text-muted-foreground ml-1">({lk.tipo})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {l.leitura_tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {l.leitura_tags.map((t) => t.tags && (
                    <span key={t.tag_id} className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs">
                      <Tag className="w-3 h-3" /> {t.tags.nome}
                    </span>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};
