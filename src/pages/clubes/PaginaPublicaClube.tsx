import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { BookOpen, CalendarDays, Check, Lock, Target, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaginaPublica } from "@/hooks/clubes/usePaginaPublica";
import { CATEGORIAS } from "@/hooks/clubes/useClubes";
import { caminhoConvite } from "@/lib/convite";
import {
  linkParaOApp,
  quandoDoEncontro,
  resumoDaPagina,
  textoDeMembros,
  type LivroDaPagina,
  type PaginaPublicaDoClube,
} from "@/lib/enderecoClube";
import logoNamzu from "@/assets/logo-namzu.png";

// Página pública do clube, para o organizador divulgar. Abre sem login em
// /c/:endereco e em <endereco>.namzu.com.br (ver docs/pagina-publica.md).
// Mostra só o que serve para apresentar o clube; quem quer participar vai
// para a página de convite, que cuida de cadastro e entrada.

const Capa = ({ livro, className }: { livro: LivroDaPagina; className: string }) =>
  livro.capa_url ? (
    <img src={livro.capa_url} alt="" loading="lazy" className={`${className} object-cover rounded-md shadow-soft bg-muted`} />
  ) : (
    <div className={`${className} rounded-md bg-secondary flex items-center justify-center`}>
      <BookOpen className="w-5 h-5 text-primary" aria-hidden="true" />
    </div>
  );

const Secao = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-3">
    <h2 className="font-display text-xl font-semibold">{titulo}</h2>
    {children}
  </section>
);

const Marca = ({ para }: { para: string }) => (
  <a href={para} className="flex items-center gap-2" aria-label="NAMZU, página inicial">
    <img src={logoNamzu} alt="" className="w-7 h-7 object-contain" />
    <span className="font-extrabold text-primary tracking-tight">NAMZU</span>
  </a>
);

const NaoEncontrada = ({ inicio }: { inicio: string }) => (
  <div className="max-w-md mx-auto px-6 pt-16">
    <div className="card-soft p-6 text-center flex flex-col items-center gap-3">
      <BookOpen className="w-10 h-10 text-primary" aria-hidden="true" />
      <h1 className="font-semibold">Clube não encontrado</h1>
      <p className="text-sm text-muted-foreground">
        O endereço pode estar errado ou a página deste clube foi desligada. Peça o link ao organizador.
      </p>
      <Button asChild variant="outline" className="rounded-2xl">
        <a href={inicio}>Conhecer o NAMZU</a>
      </Button>
    </div>
  </div>
);

const Conteudo = ({ pagina, noSubdominio }: { pagina: PaginaPublicaDoClube; noSubdominio: boolean }) => {
  const host = window.location.hostname;
  const participar = linkParaOApp(caminhoConvite(pagina.id), noSubdominio, host);
  const criarClube = linkParaOApp("/comecar", noSubdominio, host);
  const inicio = linkParaOApp("/", noSubdominio, host);
  const categoria = CATEGORIAS.find((c) => c.value === pagina.categoria)?.label;
  const organizador = pagina.organizador?.nome ?? "Organizador";
  const iniciais = organizador.split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  const rotuloParticipar = pagina.privado ? "Pedir para entrar" : "Participar do clube";
  const lidos = pagina.livros.filter((l) => l.lido).length;

  return (
    <>
      <header className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <Marca para={inicio} />
        <Button asChild size="sm" className="rounded-xl">
          <a href={participar}>{rotuloParticipar}</a>
        </Button>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-12 flex flex-col gap-8">
        <div className="card-soft overflow-hidden">
          <div className="h-40 sm:h-56 bg-muted">
            {pagina.imagem_capa_url ? (
              <img src={pagina.imagem_capa_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-warm flex items-center justify-center">
                <BookOpen className="w-14 h-14 text-primary-foreground/70" aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Clube de leitura{categoria ? ` · ${categoria}` : ""}
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-semibold leading-tight break-words">{pagina.nome}</h1>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="w-10 h-10 border border-border shrink-0">
                  <AvatarImage src={pagina.organizador?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-secondary text-xs">{iniciais || "O"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Organizado por</p>
                  <p className="text-sm font-medium break-words">{organizador}</p>
                </div>
              </div>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="w-4 h-4" aria-hidden="true" /> {textoDeMembros(pagina.membros)}
              </p>
              {lidos > 0 && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Check className="w-4 h-4" aria-hidden="true" /> {lidos === 1 ? "1 livro lido" : `${lidos} livros lidos`}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button asChild className="h-[52px] rounded-2xl text-base font-semibold sm:self-start sm:px-10">
                <a href={participar}>{rotuloParticipar}</a>
              </Button>
              {pagina.privado && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> O organizador aprova cada entrada.
                </p>
              )}
            </div>
          </div>
        </div>

        {(pagina.descricao || pagina.objetivo) && (
          <Secao titulo="Sobre o clube">
            {pagina.descricao && <p className="text-base leading-relaxed whitespace-pre-line break-words">{pagina.descricao}</p>}
            {pagina.objetivo && (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <Target className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="break-words">{pagina.objetivo}</span>
              </p>
            )}
          </Secao>
        )}

        {pagina.livro_atual && (
          <Secao titulo="Lendo agora">
            <div className="card-soft p-4 flex items-center gap-4">
              <Capa livro={pagina.livro_atual} className="w-20 h-28 shrink-0" />
              <div className="min-w-0">
                <p className="font-display text-lg font-semibold leading-snug break-words">{pagina.livro_atual.titulo}</p>
                {pagina.livro_atual.autor && <p className="text-sm text-muted-foreground break-words">{pagina.livro_atual.autor}</p>}
              </div>
            </div>
          </Secao>
        )}

        {pagina.encontros.length > 0 && (
          <Secao titulo="Próximos encontros">
            <ul className="flex flex-col gap-2">
              {pagina.encontros.map((e) => (
                <li key={e.inicio_em + e.titulo} className="card-soft p-4 flex items-start gap-3">
                  <CalendarDays className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="font-medium break-words">{e.titulo}</p>
                    <p className="text-sm text-muted-foreground first-letter:uppercase">{quandoDoEncontro(e.inicio_em)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">O local ou o link de cada encontro aparece para quem participa do clube.</p>
          </Secao>
        )}

        {pagina.livros.length > 1 && (
          <Secao titulo="Livros do clube">
            <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-3 gap-y-5">
              {pagina.livros.map((l, i) => (
                <li key={`${l.titulo}-${i}`} className="flex flex-col gap-1.5 min-w-0">
                  <Capa livro={l} className="w-full aspect-[2/3]" />
                  <p className="text-xs font-medium leading-snug line-clamp-2 break-words">{l.titulo}</p>
                  {l.lido && <p className="text-[11px] text-muted-foreground">Já lido</p>}
                </li>
              ))}
            </ul>
          </Secao>
        )}

        <div className="card-soft p-6 flex flex-col items-center text-center gap-3">
          <h2 className="font-display text-xl font-semibold break-words">Leia com {pagina.nome}</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Acompanhe a leitura, os encontros e as conversas do clube pelo NAMZU. O cadastro é rápido e gratuito.
          </p>
          <Button asChild className="h-[52px] rounded-2xl text-base font-semibold px-10">
            <a href={participar}>{rotuloParticipar}</a>
          </Button>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <Marca para={inicio} />
          <p>
            Tem um clube de leitura?{" "}
            <a href={criarClube} className="text-primary font-medium hover:underline">
              Crie a página do seu
            </a>
          </p>
        </div>
      </footer>
    </>
  );
};

const PaginaPublicaClube = ({ enderecoDoSubdominio }: { enderecoDoSubdominio?: string }) => {
  const { endereco: daRota } = useParams();
  const noSubdominio = !!enderecoDoSubdominio;
  const endereco = (enderecoDoSubdominio ?? daRota ?? "").toLowerCase();
  const { data: pagina, isLoading } = usePaginaPublica(endereco);

  // Título e descrição da aba, para favoritos e buscadores.
  useEffect(() => {
    if (!pagina) return;
    const anterior = document.title;
    document.title = `${pagina.nome} · Clube de leitura no NAMZU`;
    const meta = document.querySelector('meta[name="description"]');
    const descricaoAnterior = meta?.getAttribute("content") ?? null;
    meta?.setAttribute("content", resumoDaPagina(pagina));
    return () => {
      document.title = anterior;
      if (descricaoAnterior !== null) meta?.setAttribute("content", descricaoAnterior);
    };
  }, [pagina]);

  return (
    <div className="relative z-10 min-h-screen bg-background">
      {isLoading ? (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-14 flex flex-col gap-4" aria-busy="true">
          <Skeleton className="h-56 rounded-[var(--radius)]" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-24" />
        </div>
      ) : pagina ? (
        <Conteudo pagina={pagina} noSubdominio={noSubdominio} />
      ) : (
        <NaoEncontrada inicio={linkParaOApp("/", noSubdominio, window.location.hostname)} />
      )}
    </div>
  );
};

export default PaginaPublicaClube;
