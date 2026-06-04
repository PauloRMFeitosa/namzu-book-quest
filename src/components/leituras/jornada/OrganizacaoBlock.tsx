import { Tag, ExternalLink, Paperclip } from "lucide-react";
import type { LivroDetalhe } from "@/hooks/leituras/useLivroDetalhe";

export const OrganizacaoBlock = ({ livro }: { livro: LivroDetalhe }) => {
  const tags = Array.from(
    new Map(
      livro.leituras
        .flatMap((l) => l.leitura_tags.filter((t) => t.tags).map((t) => [t.tags!.id, t.tags!]))
    ).values()
  );
  const links = livro.leituras.flatMap((l) => l.leitura_links);

  return (
    <section className="card-soft p-4 flex flex-col gap-3">
      <h2 className="text-sm font-semibold">Organização</h2>

      <div className="flex flex-col gap-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5" /> Tags
        </div>
        {tags.length ? (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t.id} className="bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-xs">
                {t.nome}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhuma tag.</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <ExternalLink className="w-3.5 h-3.5" /> Links
        </div>
        {links.length ? (
          <ul className="flex flex-col gap-1">
            {links.map((l) => (
              <li key={l.id} className="text-sm">
                <a href={l.url} target="_blank" rel="noreferrer" className="text-primary underline break-all">
                  {l.descricao || l.url}
                </a>
                {l.tipo && <span className="text-xs text-muted-foreground ml-1">({l.tipo})</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhum link.</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" /> Arquivos
        </div>
        <p className="text-xs text-muted-foreground">Em breve.</p>
      </div>
    </section>
  );
};
