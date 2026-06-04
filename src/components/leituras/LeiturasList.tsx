import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LeituraFull } from "@/hooks/leituras/useLivroDetalhe";
import { BookOpen, ExternalLink, Pencil, Quote, Tag, Target, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { RegistrarLeituraDialog } from "./RegistrarLeituraDialog";
import { invalidateLeituras } from "@/lib/queryInvalidation";

interface Props {
  leituras: LeituraFull[];
  usuarioLeituraId: string;
  totalPaginas: number | null;
}

export const LeiturasList = ({ leituras, usuarioLeituraId, totalPaginas }: Props) => {
  const qc = useQueryClient();
  const items = leituras.filter((l) => l.tipo === "leitura");
  const [editing, setEditing] = useState<LeituraFull | null>(null);
  const [deleting, setDeleting] = useState<LeituraFull | null>(null);
  const [removing, setRemoving] = useState(false);

  const confirmarExcluir = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      // Apaga filhos antes (sem ON DELETE CASCADE garantido)
      await Promise.all([
        supabase.from("leitura_conteudo").delete().eq("leitura_id", deleting.id),
        supabase.from("leitura_citacoes").delete().eq("leitura_id", deleting.id),
        supabase.from("leitura_aplicacoes").delete().eq("leitura_id", deleting.id),
        supabase.from("leitura_links").delete().eq("leitura_id", deleting.id),
        supabase.from("leitura_tags").delete().eq("leitura_id", deleting.id),
      ]);
      const { error } = await supabase.from("leituras").delete().eq("id", deleting.id);
      if (error) throw error;
      toast.success("Sessão excluída");
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["livro-detalhe", usuarioLeituraId] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRemoving(false);
    }
  };

  if (!items.length) {
    return <p className="text-sm text-muted-foreground text-center py-4">Nenhuma leitura registrada ainda.</p>;
  }

  return (
    <>
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
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button size="sm" variant="outline" className="rounded-xl flex-1" onClick={() => setEditing(l)}>
                    <Pencil className="w-3 h-3" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-xl text-destructive hover:text-destructive" onClick={() => setDeleting(l)}>
                    <Trash2 className="w-3 h-3" /> Excluir
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {editing && (
        <RegistrarLeituraDialog
          key={editing.id}
          usuarioLeituraId={usuarioLeituraId}
          totalPaginas={totalPaginas}
          leitura={editing}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          hideTrigger
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir sessão de leitura?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove permanentemente o resumo, citações, aplicações, tags e links desta sessão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExcluir} disabled={removing} className="bg-destructive hover:bg-destructive/90">
              {removing ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
