import { useEffect, useState } from "react";
import { ChevronRight, Loader2, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bloco } from "@/components/painel/PartesDoPainel";
import { useGrupoDoClube, useSalvarGrupoDoClube } from "@/hooks/clubes/useGrupoDoClube";
import {
  MAXIMO_LINK_DO_GRUPO,
  limparLinkDoGrupo,
  nomeDoAplicativo,
  rotuloDeEntrar,
  tipoDoGrupo,
  validarLinkDoGrupo,
} from "@/lib/grupoDoClube";
import { registrarEvento } from "@/services/analytics";

/** Página do clube: botão para o membro entrar no grupo do WhatsApp ou do Telegram. */
export const EntrarNoGrupo = ({ clubeId, habilitado }: { clubeId: string; habilitado: boolean }) => {
  const { data: link } = useGrupoDoClube(clubeId, habilitado);
  const tipo = tipoDoGrupo(link);
  if (!link || !tipo) return null;
  const Icone = tipo === "whatsapp" ? MessageCircle : Send;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => registrarEvento("grupo_do_clube_aberto", { clubeId, props: { tipo } })}
      className="card-soft px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors"
    >
      <span className="w-10 h-10 rounded-xl bg-secondary text-primary flex items-center justify-center shrink-0">
        <Icone className="w-5 h-5" aria-hidden="true" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-semibold text-sm">{rotuloDeEntrar(tipo)}</span>
        <span className="block text-sm text-muted-foreground">Avisos rápidos e conversa do dia a dia do clube.</span>
      </span>
      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" aria-hidden="true" />
    </a>
  );
};

/** Painel do organizador > Comunicação: guardar o link do grupo do clube. */
export const GrupoDoPainel = ({ clubeId }: { clubeId: string }) => {
  const { data: salvo, isLoading } = useGrupoDoClube(clubeId);
  const salvar = useSalvarGrupoDoClube(clubeId);
  const [link, setLink] = useState("");
  const [tentouSalvar, setTentouSalvar] = useState(false);

  useEffect(() => {
    setLink(salvo ?? "");
  }, [salvo]);

  const limpo = limparLinkDoGrupo(link);
  const erro = validarLinkDoGrupo(limpo);
  const tipo = tipoDoGrupo(salvo);
  const mudou = limpo !== (salvo ?? "");

  const enviar = async () => {
    setTentouSalvar(true);
    if (erro) return;
    try {
      await salvar.mutateAsync(limpo);
      setTentouSalvar(false);
    } catch {
      /* o hook já mostrou o erro */
    }
  };

  return (
    <Bloco
      titulo="Grupo do clube"
      descricao="Cole o link de convite do grupo do WhatsApp ou do Telegram. Os membros do clube passam a ver um botão para entrar no grupo."
    >
      <div className="grid gap-1.5">
        <Label htmlFor="grupo-link">Link de convite do grupo</Label>
        <Input
          id="grupo-link"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={MAXIMO_LINK_DO_GRUPO}
          placeholder="https://chat.whatsapp.com/..."
          value={link}
          disabled={isLoading}
          onChange={(e) => setLink(e.target.value)}
          className="h-11 rounded-xl"
        />
        <p className="text-xs text-muted-foreground">
          No WhatsApp: abra o grupo, toque no nome, depois em "Convidar por link" e em "Copiar link". Só quem já é membro
          do clube no NAMZU vê esse link; ele não aparece na página pública.
        </p>
      </div>

      {tentouSalvar && erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={enviar} disabled={!mudou || !limpo || salvar.isPending} className="rounded-xl">
          {salvar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : salvo ? "Salvar" : "Salvar o grupo"}
        </Button>
        {salvo && (
          <Button variant="ghost" disabled={salvar.isPending} onClick={() => salvar.mutate(null)} className="rounded-xl text-muted-foreground">
            Remover o link
          </Button>
        )}
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {tipo ? `Grupo do ${nomeDoAplicativo(tipo)} ligado ao clube.` : "Nenhum grupo ligado ao clube."}
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        O NAMZU não publica sozinho no grupo: o WhatsApp não permite. Nos lembretes, metas e avisos, use "Enviar no
        WhatsApp" para abrir a conversa com a mensagem pronta e escolher o grupo.
      </p>
    </Bloco>
  );
};
