import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BookOpen,
  Bug,
  Building2,
  ClipboardList,
  Eye,
  Flag,
  Gamepad2,
  Globe,
  HeartPulse,
  LayoutDashboard,
  LineChart,
  RefreshCw,
  Tags,
  Target,
  Trophy,
  User,
  Users,
} from "lucide-react";
import { CascaDoPainel, type GrupoDoPainel } from "@/components/painel/CascaDoPainel";
import { AutoresTab } from "./tabs/AutoresTab";
import { ClubesTab } from "./tabs/ClubesTab";
import { ConquistasTab } from "./tabs/ConquistasTab";
import { DenunciasTab } from "./tabs/DenunciasTab";
import { ErrosAppTab } from "./tabs/ErrosAppTab";
import { GamificacaoTab } from "./tabs/GamificacaoTab";
import { JobsTab } from "./tabs/JobsTab";
import { LivrosTab } from "./tabs/LivrosTab";
import { MapeamentoGenerosTab } from "./tabs/MapeamentoGenerosTab";
import { MetasTab } from "./tabs/MetasTab";
import { MetricasTab } from "./tabs/MetricasTab";
import { PainelTab } from "./tabs/PainelTab";
import { ReprocessamentoTab } from "./tabs/ReprocessamentoTab";
import { SaudeCatalogoTab } from "./tabs/SaudeCatalogoTab";
import { UsuariosTab } from "./tabs/UsuariosTab";
import { VisibilidadeTab } from "./tabs/VisibilidadeTab";
import { WikidataAutoresTab } from "./tabs/WikidataAutoresTab";
import { WikidataObrasTab } from "./tabs/WikidataObrasTab";

// Admin do NAMZU. Tem tela própria, fora do layout do app (CascaDoPainel).
// A seção aberta fica na URL (?secao=), para dar para voltar e compartilhar
// o endereço.

const GRUPOS: GrupoDoPainel[] = [
  {
    rotulo: "Operação",
    secoes: [
      { chave: "painel", rotulo: "Painel", descricao: "O que está acontecendo no produto e o que pede atenção.", icone: LayoutDashboard },
      { chave: "metricas", rotulo: "Métricas", descricao: "Ações de organizadores e membros, por dia e por tipo.", icone: LineChart },
      { chave: "clubes", rotulo: "Clubes", descricao: "Situação, organizador e atividade de cada clube.", icone: Building2 },
      { chave: "usuarios", rotulo: "Usuários", descricao: "Contas, papéis e acesso.", icone: Users },
      { chave: "denuncias", rotulo: "Denúncias e sugestões", descricao: "O que os usuários reportaram pelo app.", icone: Flag },
      { chave: "erros-app", rotulo: "Erros do app", descricao: "Erros encontrados no navegador de quem estava logado.", icone: Bug },
    ],
  },
  {
    rotulo: "Catálogo",
    secoes: [
      { chave: "livros", rotulo: "Livros", descricao: "Obras e edições do acervo.", icone: BookOpen },
      { chave: "autores", rotulo: "Autores", descricao: "Autores do acervo.", icone: User },
      { chave: "saude", rotulo: "Saúde do catálogo", descricao: "Obras sem capa, sem autor ou sem gênero.", icone: HeartPulse },
      { chave: "wikidata-obras", rotulo: "Wikidata: obras", descricao: "Conferência de obras com o Wikidata.", icone: Globe },
      { chave: "wikidata-autores", rotulo: "Wikidata: autores", descricao: "Conferência de autores com o Wikidata.", icone: Globe },
      { chave: "reprocessamento", rotulo: "Reprocessamento", descricao: "Refazer autores e gêneros em lote.", icone: RefreshCw },
      { chave: "jobs", rotulo: "Integrações e logs", descricao: "Execuções das integrações do catálogo e registro de XP.", icone: ClipboardList },
    ],
  },
  {
    rotulo: "Configuração",
    secoes: [{ chave: "visibilidade", rotulo: "Visibilidade", descricao: "Liga e desliga recursos do app.", icone: Eye }],
  },
  {
    rotulo: "Recursos desligados",
    recolhido: true,
    secoes: [
      { chave: "gamificacao", rotulo: "Gamificação", descricao: "XP e conquistas dos usuários. A gamificação está desligada no app.", icone: Gamepad2 },
      { chave: "metas", rotulo: "Missões", descricao: "Missões da página de metas, que está desligada no app.", icone: Target },
      { chave: "conquistas", rotulo: "Conquistas", descricao: "Cadastro de conquistas. A gamificação está desligada no app.", icone: Trophy },
      { chave: "mapeamento-generos", rotulo: "Mapeamento de gêneros", descricao: "Liga interesses a gêneros, para o recurso de leitores parecidos, desligado no app.", icone: Tags },
    ],
  },
];

const TODAS = GRUPOS.flatMap((g) => g.secoes);

const Admin = () => {
  const [busca, setBusca] = useSearchParams();
  const pedida = busca.get("secao") ?? "painel";
  const atual = TODAS.find((s) => s.chave === pedida) ?? TODAS[0];

  useEffect(() => {
    document.title = `${atual.rotulo} · Admin NAMZU`;
    window.scrollTo({ top: 0 });
    return () => {
      document.title = "Namzu";
    };
  }, [atual.chave, atual.rotulo]);

  const irPara = (chave: string) => {
    const proxima = new URLSearchParams(busca);
    proxima.set("secao", chave);
    setBusca(proxima);
  };

  return (
    <CascaDoPainel
      marca="NAMZU"
      area="Admin"
      rotuloDoMenu="Seções do Admin"
      grupos={GRUPOS}
      atual={atual}
      onIrPara={irPara}
      voltar={{ para: "/", rotulo: "Voltar ao app", rotuloCurto: "App" }}
      chaveDoMenu="admin-sidebar-collapsed"
    >
          {atual.chave === "painel" && <PainelTab onIrPara={irPara} />}
          {atual.chave === "metricas" && <MetricasTab />}
          {atual.chave === "clubes" && <ClubesTab />}
          {atual.chave === "usuarios" && <UsuariosTab />}
          {atual.chave === "denuncias" && <DenunciasTab />}
          {atual.chave === "erros-app" && <ErrosAppTab />}
          {atual.chave === "livros" && <LivrosTab />}
          {atual.chave === "autores" && <AutoresTab />}
          {atual.chave === "saude" && <SaudeCatalogoTab />}
          {atual.chave === "wikidata-obras" && <WikidataObrasTab />}
          {atual.chave === "wikidata-autores" && <WikidataAutoresTab />}
          {atual.chave === "reprocessamento" && <ReprocessamentoTab />}
          {atual.chave === "jobs" && <JobsTab />}
          {atual.chave === "visibilidade" && <VisibilidadeTab />}
          {atual.chave === "gamificacao" && <GamificacaoTab />}
          {atual.chave === "metas" && <MetasTab />}
          {atual.chave === "conquistas" && <ConquistasTab />}
          {atual.chave === "mapeamento-generos" && <MapeamentoGenerosTab />}
    </CascaDoPainel>
  );
};

export default Admin;
