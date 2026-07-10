import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lightbulb, Target, Quote, BookOpenCheck, Plus, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InsightDialog } from "./dialogs/InsightDialog";
import { AplicacaoDialog } from "./dialogs/AplicacaoDialog";
import { CitacaoDialog } from "./dialogs/CitacaoDialog";
import { ResenhaDialog } from "./dialogs/ResenhaDialog";
import { CitacaoShareModal } from "@/components/CitacaoShareModal";
import { supabase } from "@/integrations/supabase/client";
import { resolverCapa } from "@/lib/capaLivro";
import type { LivroDetalhe } from "@/hooks/leituras/useLivroDetalhe";
import type { Citacao } from "@/hooks/useCitacoes";

type Tipo = "insight" | "aplicacao" | "citacao" | "resenha" | null;

export const AprendizadosBlock = ({ livro }: { livro: LivroDetalhe }) => {
  const [active, setActive] = useState<Tipo>(null);
  const [citacaoParaCompartilhar, setCitacaoParaCompartilhar] = useState<Citacao | null>(null);

  // Monta o objeto Citacao esperado pelo CitacaoShareModal a partir dos dados do livro
  const montarCitacao = (c: LivroDetalhe["leituras"][number]["leitura_citacoes"][number]): Citacao => ({
    id: c.id,
    texto: c.texto,
    pagina: c.pagina,
    created_at: c.created_at,
    obra_id: livro.obra_id ?? "",
    obra_titulo: livro.obras?.titulo_original ?? "",
    obra_capa: resolverCapa(livro.obras?.capa_padrao_url, livro.edicoes?.capa_url),
    autor_nome: livro.autores.map((a) => a.nome).join(", ") || null,
  });

  const { data: clubeNome } = useQuery({
    queryKey: ["clube-nome", livro.clube_id],
    enabled: !!livro.clube_id,
    queryFn: async () => {
      const { data } = await supabase.from("clubes").select("nome").eq("id", livro.clube_id!).single();
      return data?.nome ?? null;
    },
  });

  // Agrega tudo de todas as leituras (container + sessões antigas)
  const todosInsights = livro.leituras.flatMap((l) => l.leitura_conteudo.map((c) => ({ ...c, _leitura: l })));
  const todasAplicacoes = livro.leituras.flatMap((l) => l.leitura_aplicacoes);
  const todasCitacoes = livro.leituras.flatMap((l) => l.leitura_citacoes);
  const temResenha = !!livro.leitura_pos?.resenha;

  const cards: { key: string; label: string; count: number; icon: React.ReactNode; sectionValue: string }[] = [
    { key: "insights", label: "Insights", count: todosInsights.length, icon: <Lightbulb className="w-4 h-4 text-primary" />, sectionValue: "insights" },
    { key: "aplicacoes", label: "Aplicações", count: todasAplicacoes.length, icon: <Target className="w-4 h-4 text-primary" />, sectionValue: "aplicacoes" },
    { key: "citacoes", label: "Citações", count: todasCitacoes.length, icon: <Quote className="w-4 h-4 text-primary" />, sectionValue: "citacoes" },
    { key: "resenhas", label: "Resenhas", count: temResenha ? 1 : 0, icon: <BookOpenCheck className="w-4 h-4 text-primary" />, sectionValue: "resenhas" },
  ];

  const [openSection, setOpenSection] = useState<string[]>([]);

  return (
    <section className="card-soft p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Aprendizados</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="rounded-xl h-9">
              <Plus className="w-3.5 h-3.5" /> Adicionar conteúdo
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setActive("insight")}><Lightbulb className="w-4 h-4" /> Insight</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActive("aplicacao")}><Target className="w-4 h-4" /> Aplicação</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActive("citacao")}><Quote className="w-4 h-4" /> Citação</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActive("resenha")}><BookOpenCheck className="w-4 h-4" /> Resenha</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {cards.map((c) => (
          <button
            key={c.key}
            onClick={() => setOpenSection((prev) => prev.includes(c.sectionValue) ? prev.filter(v => v !== c.sectionValue) : [...prev, c.sectionValue])}
            className="card-soft p-3 flex flex-col gap-1 text-left hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              {c.icon}
              <span className="text-2xl font-bold leading-none">{c.count}</span>
            </div>
            <span className="text-xs text-muted-foreground">{c.label}</span>
          </button>
        ))}
      </div>

      <Accordion type="multiple" value={openSection} onValueChange={setOpenSection} className="flex flex-col gap-2">
        <AccordionItem value="insights" className="card-soft border-none px-3">
          <AccordionTrigger className="hover:no-underline py-2.5 text-sm">Insights ({todosInsights.length})</AccordionTrigger>
          <AccordionContent className="pb-3 flex flex-col gap-2">
            {todosInsights.length === 0 && <p className="text-xs text-muted-foreground">Nenhum insight ainda.</p>}
            {todosInsights.map((i) => (
              <div key={i.id} className="p-2 rounded-lg bg-muted/30">
                {i.resumo && <p className="text-sm">{i.resumo}</p>}
                {i.conceito_principal && <p className="text-xs text-muted-foreground mt-1">{i.conceito_principal}</p>}
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="aplicacoes" className="card-soft border-none px-3">
          <AccordionTrigger className="hover:no-underline py-2.5 text-sm">Aplicações ({todasAplicacoes.length})</AccordionTrigger>
          <AccordionContent className="pb-3 flex flex-col gap-2">
            {todasAplicacoes.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma aplicação ainda.</p>}
            {todasAplicacoes.map((a: any) => (
              <div key={a.id} className="p-2 rounded-lg bg-muted/30">
                <p className="text-sm">{a.descricao}</p>
                {a.plano_acao?.categoria && (
                  <span className="inline-block text-[10px] uppercase tracking-wider bg-secondary px-2 py-0.5 rounded-full mt-1">
                    {a.plano_acao.categoria}
                  </span>
                )}
                {a.plano_acao?.prazo && (
                  <p className="text-xs text-muted-foreground mt-1">Prazo: {new Date(a.plano_acao.prazo).toLocaleDateString("pt-BR")}</p>
                )}
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="citacoes" className="card-soft border-none px-3">
          <AccordionTrigger className="hover:no-underline py-2.5 text-sm">Citações ({todasCitacoes.length})</AccordionTrigger>
          <AccordionContent className="pb-3 flex flex-col gap-2">
            {todasCitacoes.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma citação ainda.</p>}
            {todasCitacoes.map((c) => (
              <div key={c.id} className="flex items-start gap-1.5">
                <div className="flex-1 min-w-0 text-sm border-l-2 border-primary pl-2 italic whitespace-pre-wrap">
                  "{c.texto}"{c.pagina ? <span className="text-xs not-italic text-muted-foreground"> · pg {c.pagina}</span> : null}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-primary"
                  title="Compartilhar citação"
                  aria-label="Compartilhar citação"
                  onClick={() => setCitacaoParaCompartilhar(montarCitacao(c))}
                >
                  <Share2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="resenhas" className="card-soft border-none px-3">
          <AccordionTrigger className="hover:no-underline py-2.5 text-sm">Resenhas ({temResenha ? 1 : 0})</AccordionTrigger>
          <AccordionContent className="pb-3">
            {temResenha ? (
              <div className="p-2 rounded-lg bg-muted/30 whitespace-pre-wrap text-sm">{livro.leitura_pos!.resenha}</div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma resenha ainda.</p>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <InsightDialog livro={livro} open={active === "insight"} onOpenChange={(o) => !o && setActive(null)} clubeId={livro.clube_id} clubeNome={clubeNome ?? null} />
      <AplicacaoDialog livro={livro} open={active === "aplicacao"} onOpenChange={(o) => !o && setActive(null)} clubeId={livro.clube_id} clubeNome={clubeNome ?? null} />
      <CitacaoDialog livro={livro} open={active === "citacao"} onOpenChange={(o) => !o && setActive(null)} clubeId={livro.clube_id} clubeNome={clubeNome ?? null} />
      <ResenhaDialog livro={livro} open={active === "resenha"} onOpenChange={(o) => !o && setActive(null)} clubeId={livro.clube_id} clubeNome={clubeNome ?? null} />

      <CitacaoShareModal
        citacao={citacaoParaCompartilhar}
        open={!!citacaoParaCompartilhar}
        onClose={() => setCitacaoParaCompartilhar(null)}
      />
    </section>
  );
};
