import { useState } from "react";
import { CalendarCheck, Copy, Vote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useCancelarVotacao, useEncerrarVotacao, useVotarData } from "@/hooks/clubes/useVotacaoData";
import { quandoDoEncontro } from "@/lib/encontros";
import { linkDoClube } from "@/lib/convite";
import { registrarEvento } from "@/services/analytics";
import {
  alternarVoto,
  mensagemDaVotacao,
  opcaoMaisVotada,
  opcoesEmOrdem,
  textoDeVotantes,
  textoDeVotos,
  totalDeVotantes,
  votosDe,
  type OpcaoDeData,
  type VotacaoDeData,
} from "@/lib/votacaoData";
import { cn } from "@/lib/utils";
import { EnviarNoWhatsApp } from "@/components/clubes/shared/EnviarNoWhatsApp";

interface Props {
  clubeId: string;
  nomeClube: string;
  votacao: VotacaoDeData;
  userId: string | undefined;
  /** Membro ativo ou organizador: pode votar. */
  podeVotar: boolean;
  /** Organizador do clube ou admin. */
  podeGerir: boolean;
}

const comMaiuscula = (texto: string) => `${texto.charAt(0).toUpperCase()}${texto.slice(1)}`;

// Votação de data aberta no clube (Fase 3): membros marcam quando podem e o
// organizador escolhe a data do encontro.
export const VotacaoDataCard = ({ clubeId, nomeClube, votacao, userId, podeVotar, podeGerir }: Props) => {
  const votar = useVotarData(clubeId);
  const encerrar = useEncerrarVotacao(clubeId);
  const cancelar = useCancelarVotacao(clubeId);
  const [escolhida, setEscolhida] = useState<OpcaoDeData | null>(null);
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false);

  const opcoes = opcoesEmOrdem(votacao);
  const meus = votosDe(votacao, userId);
  const maisVotada = opcaoMaisVotada(votacao);
  const ocupado = votar.isPending || encerrar.isPending || cancelar.isPending;

  const textoDaVotacao = () => mensagemDaVotacao({ nomeClube, votacao, link: linkDoClube(clubeId, "eventos") });

  const copiarMensagem = async () => {
    const texto = textoDaVotacao();
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Mensagem copiada. Cole no grupo do clube.");
      registrarEvento("lembrete_encontro_copiado", { clubeId, props: { origem: "votacao" } });
    } catch {
      toast.error("Não foi possível copiar. Tente de novo.");
    }
  };

  return (
    <section className="card-soft p-4 flex flex-col gap-3 border border-primary/30" aria-label="Votação de data">
      <div className="flex flex-col gap-0.5">
        <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-primary font-semibold">
          <Vote className="w-4 h-4" /> Votação de data
        </p>
        <h3 className="font-display text-base font-semibold">{votacao.titulo}</h3>
        <p className="text-xs text-muted-foreground">
          {textoDeVotantes(totalDeVotantes(votacao))}.
          {podeVotar ? " Marque todas as datas em que você pode." : ""}
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {opcoes.map((o) => {
          const idCampo = `voto-${o.id}`;
          const marcado = meus.includes(o.id);
          return (
            <li
              key={o.id}
              className={cn(
                "rounded-xl border px-3 py-2 flex items-center gap-3",
                marcado ? "border-primary/50 bg-primary/5" : "border-border/70",
              )}
            >
              {podeVotar && (
                <Checkbox
                  id={idCampo}
                  checked={marcado}
                  disabled={ocupado}
                  onCheckedChange={() =>
                    votar.mutate({ votacaoId: votacao.id, opcoes: alternarVoto(meus, o.id) })
                  }
                />
              )}
              <label htmlFor={podeVotar ? idCampo : undefined} className={cn("flex-1 min-w-0", podeVotar && "cursor-pointer")}>
                <span className="block text-sm font-medium">{comMaiuscula(quandoDoEncontro(o.inicio_em))}</span>
                <span className="block text-xs text-muted-foreground">
                  {textoDeVotos(o.votos.length)}
                  {maisVotada?.id === o.id ? " · mais votada" : ""}
                </span>
              </label>
              {podeGerir && (
                <Button
                  size="sm"
                  variant={maisVotada?.id === o.id ? "default" : "outline"}
                  className="rounded-xl h-8 shrink-0"
                  disabled={ocupado}
                  aria-label={`Marcar o encontro para ${quandoDoEncontro(o.inicio_em)}`}
                  onClick={() => setEscolhida(o)}
                >
                  <CalendarCheck className="w-3.5 h-3.5 mr-1" /> Marcar
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {podeGerir && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="ghost" className="rounded-xl h-8" onClick={copiarMensagem}>
            <Copy className="w-3.5 h-3.5 mr-1" /> Copiar mensagem para o grupo
          </Button>
          <EnviarNoWhatsApp
            className="rounded-xl"
            texto={textoDaVotacao()}
            aoEnviar={() => registrarEvento("lembrete_encontro_copiado", { clubeId, props: { origem: "votacao", canal: "whatsapp" } })}
          />
          <Button
            size="sm"
            variant="ghost"
            className="rounded-xl h-8 text-muted-foreground"
            disabled={ocupado}
            onClick={() => setConfirmarCancelamento(true)}
          >
            Cancelar votação
          </Button>
        </div>
      )}

      <AlertDialog open={!!escolhida} onOpenChange={(aberto) => !aberto && setEscolhida(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar o encontro nesta data?</AlertDialogTitle>
            <AlertDialogDescription>
              {escolhida ? `${comMaiuscula(quandoDoEncontro(escolhida.inicio_em))}. ` : ""}
              A votação é encerrada, o encontro é criado e os membros são avisados. Quem votou nessa data já entra
              como confirmado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (escolhida) encerrar.mutate({ votacao, opcaoId: escolhida.id });
                setEscolhida(null);
              }}
            >
              Marcar encontro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmarCancelamento} onOpenChange={setConfirmarCancelamento}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar a votação?</AlertDialogTitle>
            <AlertDialogDescription>
              Os votos são descartados e nenhum encontro é criado. Você pode abrir outra votação depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                cancelar.mutate(votacao.id);
                setConfirmarCancelamento(false);
              }}
            >
              Cancelar votação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};
