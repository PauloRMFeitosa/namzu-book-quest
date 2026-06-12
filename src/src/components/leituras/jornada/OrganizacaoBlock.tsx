import { useState } from "react";
import { Tag, Link2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LivroDetalhe } from "@/hooks/leituras/useLivroDetalhe";
import { TagAddDialog } from "./dialogs/TagAddDialog";
import { LinkAddDialog } from "./dialogs/LinkAddDialog";

type Tipo = "tag" | "link" | null;

export const OrganizacaoBlock = ({ livro }: { livro: LivroDetalhe }) => {
  const tags = Array.from(
    new Map(
      livro.leituras
        .flatMap((l) => l.leitura_tags.filter((t) => t.tags).map((t) => [t.tags!.id, t.tags!]))
    ).values()
  );
  const links = livro.leituras.flatMap((l) => l.leitura_links);

  const [active, setActive] = useState<Tipo>(null);

  return (
    <section className="card-soft p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Organização</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="rounded-xl h-9">
              <Plus className="w-3.5 h-3.5" /> Adicionar conteúdo
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setActive("tag")}>
              <Tag className="w-4 h-4 mr-2" /> Tag
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActive("link")}>
              <Link2 className="w-4 h-4 mr-2" /> Link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5" /> Tags ({tags.length})
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
          <Link2 className="w-3.5 h-3.5" /> Links / Arquivos ({links.length})
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

      <TagAddDialog livro={livro} open={active === "tag"} onOpenChange={(o) => !o && setActive(null)} />
      <LinkAddDialog livro={livro} open={active === "link"} onOpenChange={(o) => !o && setActive(null)} />
    </section>
  );
};
