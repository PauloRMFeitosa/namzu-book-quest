import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Globe, Loader2, Lock, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AcoesCriacao, ErroCriacao, PaginaCriacao, SecaoCriacao } from "@/components/criacao/PaginaCriacao";
import { CapaUploader } from "@/components/clubes/shared/CapaUploader";
import { CATEGORIAS } from "@/hooks/clubes/useClubes";
import { useAuth } from "@/hooks/useAuth";
import { useMeuPlano } from "@/hooks/clubes/usePlanoDoClube";
import { useRascunho } from "@/hooks/useRascunho";
import { supabase } from "@/integrations/supabase/client";
import { CLUBE_VAZIO, MAXIMO_NOME_CLUBE, explicarVisibilidade, validarNovoClube } from "@/lib/criacao";
import { DOMINIO_RAIZ, MAXIMO_ENDERECO, limparEndereco, linkDaPagina, semProtocolo, sugerirEndereco } from "@/lib/enderecoClube";
import { bloqueioParaCriarClube } from "@/lib/planoDoClube";
import { registrarEvento } from "@/services/analytics";

const DRAFT_KEY = "draft-criar-clube";

const VISIBILIDADES = [
  { value: "publico", titulo: "Público", icone: Globe },
  { value: "privado", titulo: "Privado", icone: Lock },
];

const CriarClube = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { dados, mudar, limpar } = useRascunho(DRAFT_KEY, CLUBE_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [tentouSalvar, setTentouSalvar] = useState(false);
  // O endereço acompanha o nome até a pessoa mexer nele.
  const [enderecoEditado, setEnderecoEditado] = useState(!!dados.endereco && dados.endereco !== sugerirEndereco(dados.nome));

  // Rascunho antigo, de antes de existir o endereço: sugere um a partir do nome.
  useEffect(() => {
    if (dados.nome.trim() && !dados.endereco && !enderecoEditado) mudar({ endereco: sugerirEndereco(dados.nome) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // O banco também barra; aqui a pessoa fica sabendo antes de preencher tudo.
  const { data: meuPlano } = useMeuPlano(!!user);
  const bloqueio = bloqueioParaCriarClube(meuPlano);

  const erro = validarNovoClube(dados);
  const categoria = CATEGORIAS.find((c) => c.value === dados.categoria)?.label;

  const salvar = async () => {
    setTentouSalvar(true);
    if (erro || bloqueio || !user) return;
    setSalvando(true);
    try {
      const { data, error } = await supabase
        .from("clubes")
        .insert({
          nome: dados.nome.trim(),
          descricao: dados.descricao.trim() || null,
          objetivo: dados.objetivo.trim() || null,
          categoria: dados.categoria || null,
          visibilidade: dados.visibilidade,
          imagem_capa_url: dados.imagem_capa_url.trim() || null,
          curador_id: user.id,
          is_ativo: true,
          duracao_tipo: "continuo",
        } as any)
        .select("id")
        .single();
      if (error) throw error;

      // Quem organiza entra automaticamente como membro ativo.
      await supabase
        .from("clube_membros")
        .insert({ clube_id: data.id, user_id: user.id, status: "ativo", papel: "moderador" } as any);

      // A página pública já nasce no ar. Se o endereço não puder ser usado (por
      // exemplo, outro clube pegou antes), o clube fica criado e a pessoa
      // escolhe outro endereço no painel.
      const { error: erroDaPagina } = await supabase.rpc("clube_definir_pagina_publica", {
        p_clube_id: data.id,
        p_endereco: dados.endereco.trim(),
        p_ativa: true,
      });

      if (erroDaPagina) {
        toast.warning(`Clube criado, mas a página pública não foi publicada: ${erroDaPagina.message} Escolha outro endereço em Página pública.`);
      } else {
        toast.success("Clube criado!");
      }
      registrarEvento("clube_criado", { clubeId: data.id, props: { visibilidade: dados.visibilidade, pagina_publica: !erroDaPagina } });
      limpar();
      qc.invalidateQueries({ queryKey: ["clubes-marketplace"] });
      // Abre o painel com o roteiro de primeiros passos.
      navigate(`/clubes/${data.id}/painel?novo=1`);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao criar clube");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <PaginaCriacao
      titulo="Criar clube de leitura"
      subtitulo="Leva um minuto. Depois um roteiro mostra os próximos passos."
      voltarPara="/"
      rotuloVoltar="Voltar para Meu clube"
    >
      {bloqueio && (
        <p
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200 px-4 py-3 text-sm"
        >
          {bloqueio} Para criar outro, encerre um dos clubes ou fale com a equipe do NAMZU sobre o seu plano.
        </p>
      )}

      <SecaoCriacao titulo="1. Identidade" descricao="Como o clube aparece para quem recebe o convite.">
        <div className="grid gap-1.5">
          <Label htmlFor="clube-nome">Nome do clube</Label>
          <Input
            id="clube-nome"
            value={dados.nome}
            maxLength={MAXIMO_NOME_CLUBE}
            onChange={(e) =>
              mudar(enderecoEditado ? { nome: e.target.value } : { nome: e.target.value, endereco: sugerirEndereco(e.target.value) })
            }
            placeholder="Ex.: Leitoras do Cariri"
            className="h-11 rounded-xl"
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Imagem de capa (opcional)</Label>
          <CapaUploader value={dados.imagem_capa_url} onChange={(v) => mudar({ imagem_capa_url: v })} />
        </div>
      </SecaoCriacao>

      <SecaoCriacao titulo="2. Sobre o clube" descricao="Opcional. Ajuda quem chega a entender a proposta.">
        <div className="grid gap-1.5">
          <Label htmlFor="clube-descricao">Descrição</Label>
          <Textarea
            id="clube-descricao"
            rows={3}
            value={dados.descricao}
            onChange={(e) => mudar({ descricao: e.target.value })}
            placeholder="O que vocês leem e como são os encontros?"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="clube-objetivo">Objetivo</Label>
          <Textarea
            id="clube-objetivo"
            rows={2}
            value={dados.objetivo}
            onChange={(e) => mudar({ objetivo: e.target.value })}
            placeholder="O que vocês querem alcançar juntos?"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="clube-categoria">Categoria</Label>
          <Select value={dados.categoria || "_none"} onValueChange={(v) => mudar({ categoria: v === "_none" ? "" : v })}>
            <SelectTrigger id="clube-categoria" className="h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Sem categoria</SelectItem>
              {CATEGORIAS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SecaoCriacao>

      <SecaoCriacao titulo="3. Quem pode entrar">
        <RadioGroup value={dados.visibilidade} onValueChange={(v) => mudar({ visibilidade: v })} className="grid gap-2">
          {VISIBILIDADES.map((v) => (
            <Label
              key={v.value}
              htmlFor={`clube-visibilidade-${v.value}`}
              className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
            >
              <RadioGroupItem id={`clube-visibilidade-${v.value}`} value={v.value} className="mt-0.5" />
              <span className="flex flex-col gap-0.5">
                <span className="flex items-center gap-1.5 font-medium">
                  <v.icone className="w-4 h-4" /> {v.titulo}
                </span>
                <span className="text-sm font-normal text-muted-foreground">{explicarVisibilidade(v.value)}</span>
              </span>
            </Label>
          ))}
        </RadioGroup>
      </SecaoCriacao>

      <SecaoCriacao
        titulo="4. Página do clube"
        descricao="Seu clube ganha uma página aberta, sem login, para divulgar. Escolha o endereço dela."
      >
        <div className="grid gap-1.5">
          <Label htmlFor="clube-endereco">Endereço</Label>
          <div className="flex items-center rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-ring overflow-hidden">
            <span className="pl-3 text-sm text-muted-foreground whitespace-nowrap hidden sm:inline">{DOMINIO_RAIZ}/c/</span>
            <Input
              id="clube-endereco"
              value={dados.endereco}
              maxLength={MAXIMO_ENDERECO}
              placeholder="nome-do-clube"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => {
                setEnderecoEditado(true);
                mudar({ endereco: limparEndereco(e.target.value) });
              }}
              className="h-11 border-0 shadow-none focus-visible:ring-0 pl-3 sm:pl-0.5"
            />
          </div>
          <p className="text-xs text-muted-foreground break-all">
            A página fica em {semProtocolo(linkDaPagina(dados.endereco || "nome-do-clube"))}.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          A página mostra o nome, a descrição, o livro da vez e as datas dos encontros. Não mostra os membros nem as
          conversas. Você pode mudar o endereço ou desligar a página depois, no painel do clube.
        </p>
      </SecaoCriacao>

      <SecaoCriacao titulo="Como vai aparecer">
        <div className="rounded-xl border border-border overflow-hidden" aria-label="Prévia do clube">
          {dados.imagem_capa_url ? (
            <img src={dados.imagem_capa_url} alt="" className="w-full h-28 object-cover" />
          ) : (
            <div className="w-full h-28 bg-secondary flex items-center justify-center">
              <Users className="w-8 h-8 text-primary" />
            </div>
          )}
          <div className="p-3 flex flex-col gap-1">
            <p className="font-display text-lg font-semibold leading-snug break-words">
              {dados.nome.trim() || "Nome do clube"}
            </p>
            <p className="text-xs text-muted-foreground">
              {[categoria, dados.visibilidade === "privado" ? "Privado" : "Público"].filter(Boolean).join(" · ")}
            </p>
            {dados.descricao.trim() && (
              <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-line">{dados.descricao.trim()}</p>
            )}
          </div>
        </div>
      </SecaoCriacao>

      <ErroCriacao erro={tentouSalvar && erro} />

      <AcoesCriacao cancelarPara="/">
        <Button onClick={salvar} disabled={salvando || !!bloqueio} className="rounded-xl">
          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar clube"}
        </Button>
      </AcoesCriacao>
    </PaginaCriacao>
  );
};

export default CriarClube;
