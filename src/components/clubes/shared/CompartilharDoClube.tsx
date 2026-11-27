import { useEffect, useState } from "react";
import { CartaoDaTrilha, CartaoDoEncontro } from "@/components/clubes/shared/CartoesDeDivulgacao";
import { CompartilharImagem } from "@/components/clubes/shared/CompartilharImagem";
import { useClube } from "@/hooks/clubes/useClube";
import { useTrilhasGestao } from "@/hooks/clubes/useClubeTrilhasGestao";
import { linkConvite } from "@/lib/convite";
import { livroDoCiclo } from "@/lib/cronograma";
import { linkDaPagina, semProtocolo } from "@/lib/enderecoClube";
import { imageToDataUrl } from "@/lib/imageToDataUrl";
import { livrosParaAImagem, nomeDoArquivo } from "@/lib/imagemDeDivulgacao";

/** Link que vai na imagem e na mensagem: a página pública, se estiver no ar; senão, o convite. */
function useLinkDoClube(clubeId: string) {
  const { data: clube } = useClube(clubeId);
  const paginaNoAr = !!clube?.pagina_publica && !!clube?.endereco;
  const link = paginaNoAr ? linkDaPagina(clube!.endereco!) : linkConvite(clubeId);
  // Na imagem, o convite (endereço comprido) dá lugar ao endereço do site.
  return { link, naImagem: paginaNoAr ? semProtocolo(link) : "namzu.com.br" };
}

interface PropsBase {
  clubeId: string;
  nomeClube: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Imagem do encontro, com o link da página do clube. */
export const CompartilharEncontro = ({
  clubeId,
  nomeClube,
  open,
  onOpenChange,
  encontro,
}: PropsBase & { encontro: { titulo: string; inicio_em: string; tipo: string } }) => {
  const { link, naImagem } = useLinkDoClube(clubeId);
  return (
    <CompartilharImagem
      open={open}
      onOpenChange={onOpenChange}
      titulo="Compartilhar o encontro"
      clubeId={clubeId}
      tipo="encontro"
      arquivo={nomeDoArquivo("encontro", nomeClube)}
      textoInicial={`${encontro.titulo}: o próximo encontro do clube "${nomeClube}". Venha participar:`}
      link={link}
      cartao={(formato, ref) => (
        <CartaoDoEncontro
          ref={ref}
          formato={formato}
          nomeClube={nomeClube}
          endereco={naImagem}
          titulo={encontro.titulo}
          inicio={encontro.inicio_em}
          tipo={encontro.tipo}
        />
      )}
    />
  );
};

/** Imagem da trilha: o livro da vez e os próximos, com o link da página do clube. */
export const CompartilharTrilha = ({ clubeId, nomeClube, open, onOpenChange }: PropsBase) => {
  const { link, naImagem } = useLinkDoClube(clubeId);
  const { data: trilhas = [] } = useTrilhasGestao(clubeId);
  const { atual, proximos } = livrosParaAImagem(trilhas, livroDoCiclo(trilhas)?.id);
  const capaUrl = atual?.obra?.capa_padrao_url ?? null;

  // A capa vem de outro site: vira data URL antes, senão não entra no PNG.
  const [capa, setCapa] = useState<string | null>(null);
  const [preparando, setPreparando] = useState(false);
  useEffect(() => {
    let cancelado = false;
    setCapa(null);
    if (!open || !capaUrl) return;
    setPreparando(true);
    imageToDataUrl(capaUrl)
      .then((dataUrl) => !cancelado && setCapa(dataUrl))
      .finally(() => !cancelado && setPreparando(false));
    return () => {
      cancelado = true;
    };
  }, [open, capaUrl]);

  const titulo = atual?.obra?.titulo_original ?? null;
  return (
    <CompartilharImagem
      open={open}
      onOpenChange={onOpenChange}
      titulo="Compartilhar a trilha"
      clubeId={clubeId}
      tipo="trilha"
      arquivo={nomeDoArquivo("trilha", nomeClube)}
      textoInicial={
        titulo
          ? `No clube "${nomeClube}" estamos lendo "${titulo}". Venha ler com a gente:`
          : `Conheça a trilha de leitura do clube "${nomeClube}":`
      }
      link={link}
      preparando={preparando}
      cartao={(formato, ref) => (
        <CartaoDaTrilha
          ref={ref}
          formato={formato}
          nomeClube={nomeClube}
          endereco={naImagem}
          livro={titulo ? { titulo, capa } : null}
          proximos={proximos.map((p) => p.obra?.titulo_original ?? "Livro")}
        />
      )}
    />
  );
};
