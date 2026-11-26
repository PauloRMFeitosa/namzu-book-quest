import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Megaphone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApagarAviso, useAvisosClube } from "@/hooks/clubes/useAvisos";
import { mensagemDoAviso, quandoDoAviso, resumoDoAviso, textoDeAvisos, type AvisoDoClube } from "@/lib/avisos";
import { linkDoClube } from "@/lib/convite";
import { registrarEvento } from "@/services/analytics";

interface Props {
  clubeId: string;
  nomeClube: string;
  /** Organizador do clube ou admin. */
  podeGerir: boolean;
  /** Abre a lista de avisos assim que carregar (quem chegou pela notificação). */
  abrirLista?: boolean;
  onListaAberta?: () => void;
}

// Faixa de avisos no topo do clube (Fase 3). O membro vê o aviso mais recente
// e abre a lista; o organizador também envia, copia para o grupo e apaga.
export const AvisosClube = ({ clubeId, nomeClube, podeGerir, abrirLista, onListaAberta }: Props) => {
  const { data: avisos = [] } = useAvisosClube(clubeId);
  const apagar = useApagarAviso(clubeId);
  const [lista, setLista] = useState(false);
  const [paraApagar, setParaApagar] = useState<AvisoDoClube | null>(null);

  useEffect(() => {
    if (!abrirLista) return;
    setLista(true);
    onListaAberta?.();
  }, [abrirLista, onListaAberta]);

  const copiar = async (aviso: AvisoDoClube) => {
    const texto = mensagemDoAviso({
      nomeClube,
      titulo: aviso.titulo,
      mensagem: aviso.mensagem,
      link: linkDoClube(clubeId),
    });
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Aviso copiado. Cole no grupo do clube.");
      registrarEvento("aviso_copiado", { clubeId });
    } catch {
      toast.error("Não foi possível copiar. Tente de novo.");
    }
  };

  const recente = avisos[0];
  if (!recente && !podeGerir) return null;

  return (
    <section
      aria-label="Avisos do clube"
      className="card-soft px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 border border-accent/30"
    >
      <Megaphone className="w-5 h-5 text-accent shrink-0" />
      <div className="flex-1 min-w-[10rem]">
        {recente ? (
          <>
            <p className="text-xs text-muted-foreground">Aviso do organizador · {quandoDoAviso(recente.created_at)}</p>
            <p className="font-semibold text-sm leading-snug line-clamp-1">{recente.titulo}</p>
            <p className="text-sm text-muted-foreground line-clamp-1">{resumoDoAviso(recente.mensagem)}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum aviso enviado aos membros.</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {recente && (
          <Button size="sm" variant="outline" className="rounded-xl h-8" onClick={() => setLista(true)}>
            {avisos.length === 1 ? "Ler aviso" : `Ver ${textoDeAvisos(avisos.length)}`}
          </Button>
        )}
        {podeGerir && (
          <Button size="sm" variant={recente ? "ghost" : "outline"} asChild className="rounded-xl h-8">
            <Link to={`/clubes/${clubeId}/avisos/novo`}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Novo aviso
            </Link>
          </Button>
        )}
      </div>

      <Dialog open={lista} onOpenChange={setLista}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Avisos do clube</DialogTitle>
            <DialogDescription>Recados do organizador para todos os membros.</DialogDescription>
          </DialogHeader>
          {avisos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhum aviso por enquanto.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border/50">
              {avisos.map((a) => (
                <li key={a.id} className="py-3 flex flex-col gap-1.5">
                  <p className="text-xs text-muted-foreground">{quandoDoAviso(a.created_at)}</p>
                  <p className="font-semibold text-sm">{a.titulo}</p>
                  <p className="text-sm whitespace-pre-wrap break-words">{a.mensagem}</p>
                  {podeGerir && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <Button size="sm" variant="ghost" className="rounded-xl h-8" onClick={() => copiar(a)}>
                        <Copy className="w-3.5 h-3.5 mr-1" /> Copiar para o grupo
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-xl h-8 text-destructive hover:text-destructive"
                        onClick={() => setParaApagar(a)}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Apagar
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!paraApagar} onOpenChange={(aberto) => !aberto && setParaApagar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar este aviso?</AlertDialogTitle>
            <AlertDialogDescription>
              "{paraApagar?.titulo}" some da lista do clube. As notificações que os membros já receberam continuam com
              eles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (paraApagar) apagar.mutate(paraApagar.id);
                setParaApagar(null);
              }}
            >
              Apagar aviso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};
