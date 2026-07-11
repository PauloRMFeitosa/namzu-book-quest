import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BarcodeScannerDialog } from "@/components/BarcodeScannerDialog";
import {
  BookOpen,
  BookmarkPlus,
  CheckCheck,
  Loader2,
  Check,
  ScanLine,
  Search,
  CircleCheck,
  CircleAlert,
} from "lucide-react";

export interface LivroExterno {
  key: string;
  titulo: string;
  autores: string[];
  ano: number | null;
  capa_url: string | null;
  isbn13: string | null;
  fonte: string;
  editora?: string | null;
  num_paginas?: number | null;
  idioma?: string | null;
  descricao?: string | null;
  generos?: string[];
}

type Conferencia =
  | { resultado: "igual"; isbn: string }
  | { resultado: "diferente"; isbn: string }
  | { resultado: "sem_isbn"; isbn: string };

interface Props {
  livro: LivroExterno | null;
  onOpenChange: (open: boolean) => void;
  onAdd: (status: "quero_ler" | "lido") => void;
  adicionando: boolean;
  adicionado: boolean;
  onBuscarPorIsbn: (isbn: string) => void;
}

const NOMES_IDIOMA: Record<string, string> = {
  pt: "Português",
  "pt-BR": "Português",
  en: "Inglês",
  es: "Espanhol",
  fr: "Francês",
  de: "Alemão",
  it: "Italiano",
  ja: "Japonês",
};

export const DetalhesLivroExternoDialog = ({
  livro,
  onOpenChange,
  onAdd,
  adicionando,
  adicionado,
  onBuscarPorIsbn,
}: Props) => {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [conferencia, setConferencia] = useState<Conferencia | null>(null);

  // Limpa a conferência ao trocar de livro
  useEffect(() => {
    setConferencia(null);
  }, [livro?.key]);

  const handleIsbnDetectado = (isbn: string) => {
    if (!livro) return;
    if (!livro.isbn13) {
      setConferencia({ resultado: "sem_isbn", isbn });
      return;
    }
    const igual = livro.isbn13.replace(/[-\s]/g, "") === isbn.replace(/[-\s]/g, "");
    setConferencia({ resultado: igual ? "igual" : "diferente", isbn });
  };

  const campos: { label: string; valor: string | null }[] = livro
    ? [
        { label: "Autores", valor: livro.autores.length ? livro.autores.join(", ") : null },
        { label: "Ano", valor: livro.ano ? String(livro.ano) : null },
        { label: "Editora", valor: livro.editora ?? null },
        { label: "Páginas", valor: livro.num_paginas ? String(livro.num_paginas) : null },
        {
          label: "Idioma",
          valor: livro.idioma ? NOMES_IDIOMA[livro.idioma] ?? livro.idioma : null,
        },
        { label: "ISBN-13", valor: livro.isbn13 },
        {
          label: "Gêneros",
          valor: livro.generos && livro.generos.length ? livro.generos.join(", ") : null,
        },
      ]
    : [];

  return (
    <>
      <Dialog open={!!livro} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display pr-6">{livro?.titulo}</DialogTitle>
            <DialogDescription>
              Encontrado em fonte externa ({livro?.fonte}). Confira os dados da edição antes de
              adicionar à sua estante.
            </DialogDescription>
          </DialogHeader>

          {livro && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                {livro.capa_url ? (
                  <img
                    src={livro.capa_url}
                    alt=""
                    className="w-24 h-36 rounded-lg object-cover shadow-soft shrink-0"
                  />
                ) : (
                  <div className="w-24 h-36 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <BookOpen className="w-8 h-8 text-primary" />
                  </div>
                )}
                <dl className="flex-1 min-w-0 flex flex-col gap-1.5 text-sm">
                  {campos
                    .filter((c) => c.valor)
                    .map((c) => (
                      <div key={c.label}>
                        <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {c.label}
                        </dt>
                        <dd className="break-words">{c.valor}</dd>
                      </div>
                    ))}
                </dl>
              </div>

              {livro.descricao && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                    Sinopse
                  </p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line max-h-40 overflow-y-auto">
                    {livro.descricao}
                  </p>
                </div>
              )}

              {/* Conferência de edição por ISBN */}
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-muted">
                <p className="text-sm font-medium">É a mesma edição que você tem em mãos?</p>
                <Button
                  variant="outline"
                  className="rounded-xl justify-start"
                  onClick={() => setScannerOpen(true)}
                >
                  <ScanLine className="w-4 h-4 mr-2" /> Conferir com o código de barras do meu
                  livro
                </Button>

                {conferencia?.resultado === "igual" && (
                  <div className="flex items-start gap-2 text-sm text-green-700 dark:text-green-400 bg-green-500/10 rounded-lg p-2">
                    <CircleCheck className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>Mesma edição! O ISBN do seu livro confere com este resultado.</span>
                  </div>
                )}
                {conferencia?.resultado === "diferente" && (
                  <div className="flex flex-col gap-2 text-sm bg-amber-500/10 rounded-lg p-2">
                    <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                      <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>
                        Edição diferente. O ISBN do seu livro é {conferencia.isbn}, mas este
                        resultado é {livro.isbn13}.
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl self-start"
                      onClick={() => onBuscarPorIsbn(conferencia.isbn)}
                    >
                      <Search className="w-3.5 h-3.5 mr-1.5" /> Buscar pela minha edição
                    </Button>
                  </div>
                )}
                {conferencia?.resultado === "sem_isbn" && (
                  <div className="flex flex-col gap-2 text-sm bg-amber-500/10 rounded-lg p-2">
                    <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                      <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>
                        Este resultado não informa ISBN, então não dá para comparar. Você pode
                        buscar diretamente pelo ISBN do seu livro ({conferencia.isbn}).
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl self-start"
                      onClick={() => onBuscarPorIsbn(conferencia.isbn)}
                    >
                      <Search className="w-3.5 h-3.5 mr-1.5" /> Buscar pela minha edição
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  size="lg"
                  disabled={adicionando || adicionado}
                  onClick={() => onAdd("quero_ler")}
                  className="rounded-xl bg-primary hover:bg-primary-hover justify-start touch-manipulation"
                >
                  {adicionando ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : adicionado ? (
                    <Check className="w-5 h-5 mr-2" />
                  ) : (
                    <BookmarkPlus className="w-5 h-5 mr-2" />
                  )}
                  {adicionado ? "Já está na sua estante" : "Quero ler"}
                </Button>
                {!adicionado && (
                  <Button
                    size="lg"
                    variant="outline"
                    disabled={adicionando}
                    onClick={() => onAdd("lido")}
                    className="rounded-xl justify-start touch-manipulation"
                  >
                    <CheckCheck className="w-5 h-5 mr-2" /> Já li
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onDetected={handleIsbnDetectado}
      />
    </>
  );
};
