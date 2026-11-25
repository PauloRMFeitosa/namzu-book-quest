// Exportação da lista de membros em CSV (Fase 3). Lógica pura, testável.

export interface LinhaMembroCsv {
  nome: string;
  usuario: string | null;
  papel: string;
  entrouEm: string | null;
  percentual: number | null;
  situacaoLeitura: string | null;
  ultimaAtividade: string | null;
  parado: boolean | null;
  respostaEncontro: string | null;
}

const CABECALHO = [
  "Nome",
  "Usuário",
  "Papel",
  "Entrou em",
  "Progresso no livro atual (%)",
  "Situação da leitura",
  "Última atividade",
  "Parado há 7 dias",
  "Resposta ao próximo encontro",
];

// Excel em português abre CSV separado por ponto e vírgula.
const SEPARADOR = ";";

/**
 * Prepara uma célula: protege contra fórmulas (um nome começando com "="
 * seria executado pelo Excel) e põe aspas quando o texto tem separador,
 * aspas ou quebra de linha.
 */
export function celulaCsv(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return "";
  let texto = String(valor);
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  if (/[";\n\r]/.test(texto)) texto = `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

/** Data no formato brasileiro, ou vazio quando não há data válida. */
export function dataCsv(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dois = (n: number) => String(n).padStart(2, "0");
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function gerarCsvMembros(linhas: LinhaMembroCsv[]): string {
  const corpo = linhas.map((l) =>
    [
      l.nome,
      // sem "@": o Excel trataria como fórmula e a proteção poria um apóstrofo
      l.usuario ?? "",
      l.papel,
      dataCsv(l.entrouEm),
      l.percentual,
      l.situacaoLeitura,
      dataCsv(l.ultimaAtividade),
      l.parado === null ? "" : l.parado ? "Sim" : "Não",
      l.respostaEncontro,
    ]
      .map(celulaCsv)
      .join(SEPARADOR)
  );
  // O BOM no início faz o Excel ler os acentos corretamente.
  return "﻿" + [CABECALHO.map(celulaCsv).join(SEPARADOR), ...corpo].join("\r\n") + "\r\n";
}

/** "membros-leitoras-do-cariri-2026-11-25.csv" */
export function nomeArquivoCsv(nomeClube: string, quando: Date = new Date()): string {
  const slug = (nomeClube || "clube")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "clube";
  const dois = (n: number) => String(n).padStart(2, "0");
  const data = `${quando.getFullYear()}-${dois(quando.getMonth() + 1)}-${dois(quando.getDate())}`;
  return `membros-${slug}-${data}.csv`;
}
