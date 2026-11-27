import { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Megaphone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bloco } from "@/components/painel/PartesDoPainel";
import { useApagarAviso, useAvisosClube } from "@/hooks/clubes/useAvisos";
import { mensagemDoAviso, quandoDoAviso, textoDeAvisos, type AvisoDoClube } from "@/lib/avisos";
import { linkDoClube } from "@/lib/convite";
import { registrarEvento } from "@/services/analytics";
import { GrupoDoPainel } from "@/components/clubes/shared/GrupoDoClube";
import { EnviarNoWhatsApp } from "@/components/clubes/shared/EnviarNoWhatsApp";

// Avisos do organizador: enviar, reler, copiar para o grupo e apagar.
export const ComunicacaoDoPainel = ({ clubeId, nomeClube }: { clubeId: string; nomeClube: string }) => {
  const { data: avisos, isLoading } = useAvisosClube(clubeId);
  const apagar = useApagarAviso(clubeId);
  const [paraApagar, setParaApagar] = useState<AvisoDoClube | null>(null);

  const textoDoAviso = (aviso: AvisoDoClube) =>
    mensagemDoAviso({ nomeClube, titulo: aviso.titulo, mensagem: aviso.mensagem, link: linkDoClube(clubeId) });

  const copiar = async (aviso: AvisoDoClube) => {
    const texto = textoDoAviso(aviso);
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Aviso copiado. Cole no grupo do clube.");
      registrarEvento("aviso_copiado", { clubeId });
    } catch {
      toast.error("Não foi possível copiar. Tente de novo.");
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <GrupoDoPainel clubeId={clubeId} />

      <Bloco
        titulo="Avisos enviados"
        descricao="Cada aviso vira uma notificação no app para todos os membros ativos e fica guardado no clube."
        acao={
          <Button asChild size="sm" className="gap-1.5 shrink-0">
            <Link to={`/clubes/${clubeId}/avisos/novo`}>
              <Plus className="w-4 h-4" /> Novo aviso
            </Link>
          </Button>
        }
      >
        {isLoading ? (
          <Skeleton className="h-24 rounded-lg" />
        ) : !avisos?.length ? (
          <div className="py-8 flex flex-col items-center text-center gap-2">
            <Megaphone className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum aviso enviado ainda.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{textoDeAvisos(avisos.length)}</p>
            <ul className="flex flex-col divide-y divide-border/60">
              {avisos.map((a) => (
                <li key={a.id} className="py-3 flex flex-col gap-1.5">
                  <p className="text-xs text-muted-foreground">{quandoDoAviso(a.created_at)}</p>
                  <p className="font-semibold text-sm">{a.titulo}</p>
                  <p className="text-sm whitespace-pre-wrap break-words">{a.mensagem}</p>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => copiar(a)}>
                      <Copy className="w-3.5 h-3.5 mr-1" /> Copiar para o grupo
                    </Button>
                    <EnviarNoWhatsApp
                      texto={textoDoAviso(a)}
                      aoEnviar={() => registrarEvento("aviso_copiado", { clubeId, props: { canal: "whatsapp" } })}
                    />
                    <Button size="sm" variant="ghost" className="h-8 text-destructive hover:text-destructive" onClick={() => setParaApagar(a)}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Apagar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Bloco>

      <AlertDialog open={!!paraApagar} onOpenChange={(aberto) => !aberto && setParaApagar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar este aviso?</AlertDialogTitle>
            <AlertDialogDescription>
              "{paraApagar?.titulo}" some da lista do clube. As notificações que os membros já receberam continuam com eles.
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
    </div>
  );
};
