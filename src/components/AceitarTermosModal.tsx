import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TermosConteudo = () => (
  <div className="flex flex-col gap-4 text-sm text-muted-foreground leading-relaxed">
    <div>
      <h3 className="font-semibold text-foreground mb-1">1. Sobre a NAMZU</h3>
      <p>A NAMZU é uma plataforma destinada à organização de conhecimento, clubes de leitura, comunidades de aprendizagem e registros colaborativos de conteúdo. Ao criar uma conta ou utilizar a plataforma, você concorda com estes termos.</p>
    </div>
    <div>
      <h3 className="font-semibold text-foreground mb-1">2. Conduta dos Usuários</h3>
      <p>Esperamos um ambiente respeitoso e colaborativo. <span className="font-medium text-foreground">Não é permitido:</span> assediar ou ofender outros usuários; publicar conteúdo discriminatório ou ilegal; usar a plataforma para spam; compartilhar informações falsas intencionalmente; violar direitos autorais; acessar dados ou áreas sem autorização.</p>
    </div>
    <div>
      <h3 className="font-semibold text-foreground mb-1">3. Privacidade e Confidencialidade</h3>
      <p>Respeitamos sua privacidade. Ao usar a NAMZU, você concorda em respeitar a privacidade dos demais participantes, não divulgar informações pessoais de terceiros sem autorização e não reproduzir conteúdos privados de clubes sem consentimento.</p>
    </div>
    <div>
      <h3 className="font-semibold text-foreground mb-1">4. Conteúdo e Direitos Autorais</h3>
      <p>Os conteúdos publicados permanecem sob responsabilidade de seus autores. Ao publicar, você concede à NAMZU autorização para armazenar e exibir esse conteúdo para o funcionamento dos serviços, e declara possuir os direitos necessários.</p>
    </div>
    <div>
      <h3 className="font-semibold text-foreground mb-1">5. Dados Coletados</h3>
      <p>Podemos coletar: nome e informações de perfil, endereço de e-mail, dados de autenticação, informações de uso da plataforma e registros técnicos de acesso e segurança.</p>
    </div>
    <div>
      <h3 className="font-semibold text-foreground mb-1">6. Uso dos Dados</h3>
      <p>Os dados são usados para: permitir acesso à plataforma, gerenciar clubes e leituras, melhorar funcionalidades, garantir segurança e cumprir obrigações legais. <span className="font-medium text-foreground">A NAMZU não comercializa dados pessoais dos usuários.</span></p>
    </div>
    <div>
      <h3 className="font-semibold text-foreground mb-1">7. Exclusão de Conta</h3>
      <p>Você pode solicitar a exclusão de sua conta. Por razões legais, determinados registros poderão ser mantidos pelo período exigido pela legislação aplicável.</p>
    </div>
    <div>
      <h3 className="font-semibold text-foreground mb-1">8. Suspensão e Encerramento</h3>
      <p>A NAMZU poderá suspender ou encerrar contas que descumpram estes termos, usem a plataforma de forma abusiva ou coloquem em risco a segurança do serviço ou de outros usuários.</p>
    </div>
    <div>
      <h3 className="font-semibold text-foreground mb-1">9. Alterações destes Termos</h3>
      <p>Estes termos poderão ser atualizados periodicamente. A continuidade do uso da plataforma após alterações representa a aceitação da versão vigente.</p>
    </div>
    <div>
      <h3 className="font-semibold text-foreground mb-1">10. Conhecimento Colaborativo</h3>
      <p>Os conteúdos produzidos pelos usuários dentro de clubes e comunidades permanecem vinculados aos seus respectivos autores. A organização e disponibilização desse conhecimento pela NAMZU não transfere a titularidade intelectual do conteúdo.</p>
    </div>
    <div>
      <h3 className="font-semibold text-foreground mb-1">11. Contato</h3>
      <p>Dúvidas ou solicitações relacionadas a estes termos podem ser encaminhadas pelos canais oficiais de atendimento da NAMZU.</p>
    </div>
    <div>
      <h3 className="font-semibold text-foreground mb-1">12. Política do Acervo</h3>
      <p>O catálogo da NAMZU é composto por títulos cujos metadados são obtidos de fontes públicas, licenciadas ou de domínio público, conforme a legislação vigente sobre direitos autorais no Brasil (Lei nº 9.610/1998). A NAMZU não endossa opiniões ou perspectivas presentes nas obras catalogadas. Caso identifique qualquer conteúdo que viole direitos autorais, entre em contato para regularização imediata.</p>
    </div>
    <p className="text-[11px] text-muted-foreground/70 border-t border-border pt-3">
      Última atualização: Junho de 2026
    </p>
  </div>
);

export const AceitarTermosModal = ({ userId }: { userId: string }) => {
  const [leuTudo, setLeuTudo] = useState(false);
  const [aceito, setAceito] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const chegouNoFim = el.scrollTop + el.clientHeight >= el.scrollHeight - 48;
    if (chegouNoFim && !leuTudo) setLeuTudo(true);
  };

  const handleAceitar = async () => {
    setSalvando(true);
    const agora = new Date().toISOString();
    const { error } = await supabase
      .from("perfis")
      .update({ termos_aceitos_em: agora })
      .eq("user_id", userId);
    setSalvando(false);
    if (error) { toast.error("Erro ao salvar. Tente novamente."); return; }
    qc.setQueryData(["perfil-onboarding", userId], (old: any) => ({
      ...old,
      termos_aceitos_em: agora,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 animate-in fade-in-0 px-0 sm:px-4">
      <div className="bg-background border border-border rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md flex flex-col shadow-elevated max-h-[92vh]">

        {/* Cabeçalho fixo */}
        <div className="px-6 pt-6 pb-3 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4 sm:hidden" />
          <h2 className="font-display text-lg font-semibold">Termos de Uso e Privacidade</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Leia com atenção antes de continuar.
          </p>
        </div>

        {/* Área de scroll dos termos */}
        <div className="relative flex-1 min-h-0">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto px-6 pb-4"
          >
            <TermosConteudo />
          </div>

          {/* Indicador de scroll — some quando chega ao fim */}
          {!leuTudo && (
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent flex items-end justify-center pb-2 pointer-events-none">
              <span className="flex items-center gap-1 text-xs text-muted-foreground animate-bounce">
                <ChevronDown className="w-3.5 h-3.5" /> Role para ler tudo
              </span>
            </div>
          )}
        </div>

        {/* Rodapé fixo — ativa após ler tudo */}
        <div className="px-6 pb-6 pt-3 border-t border-border shrink-0 flex flex-col gap-3">
          <label
            className={`flex items-start gap-3 select-none transition-opacity ${leuTudo ? "cursor-pointer opacity-100" : "opacity-40 pointer-events-none"}`}
          >
            <input
              type="checkbox"
              checked={aceito}
              onChange={(e) => setAceito(e.target.checked)}
              disabled={!leuTudo}
              className="mt-0.5 w-4 h-4 rounded border-border accent-primary shrink-0"
            />
            <span className="text-sm text-muted-foreground leading-snug">
              Li e concordo com os Termos de Uso e Política de Privacidade da NAMZU.
            </span>
          </label>

          <Button
            disabled={!aceito || salvando}
            onClick={handleAceitar}
            className="w-full bg-primary hover:bg-primary-hover"
          >
            {salvando ? "Salvando…" : "Continuar"}
          </Button>
        </div>
      </div>
    </div>
  );
};
