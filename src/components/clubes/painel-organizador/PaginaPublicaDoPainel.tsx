import { useState } from "react";
import { Copy, ExternalLink, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bloco } from "@/components/painel/PartesDoPainel";
import type { ClubeDetalhe } from "@/hooks/clubes/useClube";
import { useDefinirPaginaPublica } from "@/hooks/clubes/usePaginaPublica";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import {
  DOMINIO_RAIZ,
  MAXIMO_ENDERECO,
  caminhoDaPagina,
  limparEndereco,
  linkDaPagina,
  linkPorSubdominio,
  semProtocolo,
  sugerirEndereco,
  validarEndereco,
} from "@/lib/enderecoClube";
import { registrarEvento } from "@/services/analytics";

const mensagemDaPagina = (nomeClube: string, link: string) => `Conheça o nosso clube de leitura "${nomeClube}": ${link}`;

const LinhaDoLink = ({
  rotulo,
  link,
  clube,
  tipo,
}: {
  rotulo: string;
  link: string;
  clube: ClubeDetalhe;
  tipo: "subdominio" | "caminho";
}) => {
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado.");
      registrarEvento("pagina_publica_compartilhada", { clubeId: clube.id, props: { canal: "copiar", tipo } });
    } catch {
      toast.error("Não foi possível copiar. Selecione o endereço e copie à mão.");
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-3 border-b border-border/60 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{rotulo}</p>
        <p className="text-sm font-medium break-all">{semProtocolo(link)}</p>
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={copiar}>
          <Copy className="w-4 h-4" /> Copiar
        </Button>
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(mensagemDaPagina(clube.nome, link))}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => registrarEvento("pagina_publica_compartilhada", { clubeId: clube.id, props: { canal: "whatsapp", tipo } })}
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
        </Button>
      </div>
    </div>
  );
};

// Painel do organizador > Página pública: endereço do clube, liga e desliga
// e os links para divulgar (ver docs/pagina-publica.md).
export const PaginaPublicaDoPainel = ({
  clube,
  podeEditar,
}: {
  clube: ClubeDetalhe;
  /** Só quem criou o clube e o admin mudam o endereço e ligam a página. */
  podeEditar: boolean;
}) => {
  const { flags } = useFeatureFlags();
  const definir = useDefinirPaginaPublica(clube.id);
  const salvo = clube.endereco ?? "";
  const noAr = !!clube.pagina_publica && !!salvo;
  const [endereco, setEndereco] = useState(salvo || sugerirEndereco(clube.nome));
  const [ativa, setAtiva] = useState(noAr || !salvo);
  const [tentouSalvar, setTentouSalvar] = useState(false);

  const erro = validarEndereco(endereco);
  const mudou = endereco !== salvo || ativa !== noAr;

  const salvar = async () => {
    setTentouSalvar(true);
    if (erro) return;
    try {
      const resultado = await definir.mutateAsync({ endereco, ativa });
      if (resultado.endereco) setEndereco(resultado.endereco);
      setTentouSalvar(false);
    } catch {
      /* o hook já mostrou o erro */
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <Bloco
        titulo="Página pública do clube"
        descricao="Uma página aberta, sem login, para apresentar o clube e convidar novos leitores."
      >
        {podeEditar ? (
          <>
            <div className="grid gap-1.5">
              <Label htmlFor="pagina-endereco">Endereço do clube</Label>
              <div className="flex items-center rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-ring overflow-hidden">
                <span className="pl-3 text-sm text-muted-foreground whitespace-nowrap hidden sm:inline">{DOMINIO_RAIZ}/c/</span>
                <Input
                  id="pagina-endereco"
                  value={endereco}
                  maxLength={MAXIMO_ENDERECO}
                  placeholder="nome-do-clube"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  onChange={(e) => setEndereco(limparEndereco(e.target.value))}
                  className="h-11 border-0 shadow-none focus-visible:ring-0 pl-3 sm:pl-0.5"
                />
              </div>
              <p className="text-xs text-muted-foreground break-all">
                A página fica em {semProtocolo(linkDaPagina(endereco || "nome-do-clube"))}
                {flags.show_clube_subdominio ? ` e em ${semProtocolo(linkPorSubdominio(endereco || "nome-do-clube"))}` : ""}.
                {noAr ? " Se você mudar o endereço, os links antigos param de funcionar." : ""}
              </p>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Label htmlFor="pagina-ativa">Página no ar</Label>
                <p className="text-xs text-muted-foreground">
                  Desligada, o endereço mostra "clube não encontrado". O endereço continua reservado para o clube.
                </p>
              </div>
              <Switch id="pagina-ativa" checked={ativa} onCheckedChange={setAtiva} />
            </div>

            {tentouSalvar && erro && (
              <p role="alert" className="text-sm text-destructive">
                {erro}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={salvar} disabled={!mudou || definir.isPending} className="rounded-xl">
                {definir.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : noAr || salvo ? "Salvar" : "Publicar página"}
              </Button>
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {noAr ? "A página está no ar." : salvo ? "A página está desligada." : "A página ainda não foi publicada."}
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {noAr ? "A página está no ar. " : "A página não está no ar. "}Só quem criou o clube muda o endereço e liga ou desliga a página.
          </p>
        )}
      </Bloco>

      {noAr && (
        <Bloco
          titulo="Divulgue o clube"
          descricao="Mande o link no grupo, coloque na bio ou no cartão do clube."
          acao={
            <Button asChild size="sm" variant="outline" className="gap-1.5 shrink-0">
              <a href={caminhoDaPagina(salvo)} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" /> Ver a página
              </a>
            </Button>
          }
        >
          <div>
            {flags.show_clube_subdominio && (
              <LinhaDoLink rotulo="Endereço curto" link={linkPorSubdominio(salvo)} clube={clube} tipo="subdominio" />
            )}
            <LinhaDoLink rotulo="Endereço no NAMZU" link={linkDaPagina(salvo)} clube={clube} tipo="caminho" />
          </div>
        </Bloco>
      )}

      <Bloco titulo="O que a página mostra">
        <ul className="text-sm text-muted-foreground list-disc pl-5 flex flex-col gap-1">
          <li>Nome, descrição, objetivo e capa do clube. Para mudar, edite o clube em Configurações.</li>
          <li>Seu nome e sua foto, como organizador, e o número de membros.</li>
          <li>O livro que o clube está lendo e os outros livros da trilha.</li>
          <li>Data e título dos próximos encontros, sem o link nem o local.</li>
          <li>O botão para participar{clube.visibilidade === "privado" ? ". Como o clube é privado, cada entrada continua passando pela sua aprovação" : ""}.</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          A página não mostra a lista de membros, as conversas, os avisos nem os conteúdos do clube.
        </p>
      </Bloco>
    </div>
  );
};
