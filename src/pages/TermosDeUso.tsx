import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUp, FileText, Shield, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const sections = [
  { id: "sobre", label: "1. Sobre a NAMZU" },
  { id: "conduta", label: "2. Conduta dos Usuários" },
  { id: "privacidade", label: "3. Privacidade e Confidencialidade" },
  { id: "conteudo", label: "4. Conteúdo e Direitos Autorais" },
  { id: "dados-coletados", label: "5. Dados Coletados" },
  { id: "uso-dados", label: "6. Uso dos Dados" },
  { id: "exclusao", label: "7. Exclusão de Conta" },
  { id: "suspensao", label: "8. Suspensão e Encerramento" },
  { id: "alteracoes", label: "9. Alterações destes Termos" },
  { id: "conhecimento", label: "10. Conhecimento Colaborativo" },
  { id: "contato", label: "11. Contato" },
];

const lastUpdated = "Junho de 2026";

export default function TermosDeUso() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>(sections[0].id);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);

      const offsets = sections
        .map((s) => {
          const el = sectionRefs.current[s.id];
          if (!el) return { id: s.id, top: Infinity };
          const rect = el.getBoundingClientRect();
          return { id: s.id, top: rect.top };
        })
        .filter((o) => o.top <= 120)
        .sort((a, b) => b.top - a.top);

      if (offsets.length > 0) {
        setActiveSection(offsets[0].id);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) {
      const headerOffset = 80;
      const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
    <section
      ref={(el) => { sectionRefs.current[id] = el; }}
      id={id}
      className="scroll-mt-20"
    >
      <h2 className="font-display text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-primary to-accent inline-block" />
        {title}
      </h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHero
        icon={FileText}
        badge="Legal"
        title={
          <>
            Termos de Uso, <span className="text-gradient-warm">Privacidade</span> e Diretrizes
          </>
        }
        description="Leia com atenção as regras e diretrizes da comunidade NAMZU."
      />

      <div className="card-soft p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            Índice
          </p>
          <span className="text-[11px] text-muted-foreground">
            Atualizado em: <span className="font-medium text-foreground">{lastUpdated}</span>
          </span>
        </div>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-1">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className={cn(
                  "inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                  activeSection === s.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/40"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex flex-col gap-6 card-soft p-5 md:p-6">
        <Section id="sobre" title="1. Sobre a NAMZU">
          <p>
            A NAMZU é uma plataforma destinada à organização de conhecimento, clubes de leitura, comunidades de aprendizagem e registros colaborativos de conteúdo.
          </p>
          <p>
            Ao criar uma conta ou utilizar a plataforma, você concorda com os termos descritos nesta página.
          </p>
        </Section>

        <hr className="border-border/60" />

        <Section id="conduta" title="2. Conduta dos Usuários">
          <p>Esperamos que todos os participantes contribuam para um ambiente respeitoso, colaborativo e produtivo.</p>
          <p className="font-medium text-foreground">Não é permitido:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Assediar, ameaçar ou ofender outros usuários.</li>
            <li>Publicar conteúdo discriminatório ou ilegal.</li>
            <li>Utilizar a plataforma para spam ou publicidade não autorizada.</li>
            <li>Compartilhar informações falsas de forma intencional.</li>
            <li>Violar direitos autorais ou propriedade intelectual de terceiros.</li>
            <li>Tentar acessar contas, dados ou áreas sem autorização.</li>
          </ul>
          <p className="font-medium text-foreground">Cada usuário é responsável pelo conteúdo que publica.</p>
        </Section>

        <hr className="border-border/60" />

        <Section id="privacidade" title="3. Privacidade e Confidencialidade">
          <p>Respeitamos a privacidade dos usuários e incentivamos o mesmo comportamento dentro das comunidades.</p>
          <p className="font-medium text-foreground">Ao utilizar a NAMZU, você concorda em:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Respeitar a privacidade dos demais participantes.</li>
            <li>Não divulgar informações pessoais de terceiros sem autorização.</li>
            <li>Não reproduzir ou compartilhar conteúdos privados de clubes ou comunidades sem consentimento dos responsáveis.</li>
          </ul>
          <p>Embora a NAMZU adote medidas de segurança para proteger os dados armazenados, nenhum sistema é totalmente imune a riscos tecnológicos.</p>
        </Section>

        <hr className="border-border/60" />

        <Section id="conteudo" title="4. Conteúdo e Direitos Autorais">
          <p>Os conteúdos publicados permanecem sob responsabilidade de seus respectivos autores.</p>
          <p>Ao publicar conteúdo na plataforma, o usuário concede à NAMZU autorização para armazenar, processar e exibir esse conteúdo conforme necessário para o funcionamento dos serviços.</p>
          <p className="font-medium text-foreground">O usuário declara possuir os direitos necessários sobre os materiais enviados.</p>
        </Section>

        <hr className="border-border/60" />

        <Section id="dados-coletados" title="5. Dados Coletados">
          <p>Podemos coletar informações necessárias para o funcionamento da plataforma, incluindo:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Nome e informações de perfil.</li>
            <li>Endereço de e-mail.</li>
            <li>Dados de autenticação.</li>
            <li>Informações de uso da plataforma.</li>
            <li>Registros técnicos de acesso e segurança.</li>
          </ul>
        </Section>

        <hr className="border-border/60" />

        <Section id="uso-dados" title="6. Uso dos Dados">
          <p>Os dados coletados podem ser utilizados para:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Permitir acesso à plataforma.</li>
            <li>Gerenciar clubes, leituras e comunidades.</li>
            <li>Melhorar funcionalidades e experiência de uso.</li>
            <li>Garantir segurança e prevenção de fraudes.</li>
            <li>Cumprir obrigações legais.</li>
          </ul>
          <p className="font-medium text-foreground">A NAMZU não comercializa dados pessoais dos usuários.</p>
        </Section>

        <hr className="border-border/60" />

        <Section id="exclusao" title="7. Exclusão de Conta">
          <p>O usuário pode solicitar a exclusão de sua conta.</p>
          <p>Por razões legais, operacionais ou de segurança, determinados registros poderão ser mantidos pelo período exigido pela legislação aplicável.</p>
        </Section>

        <hr className="border-border/60" />

        <Section id="suspensao" title="8. Suspensão e Encerramento">
          <p>A NAMZU poderá suspender ou encerrar contas que:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Descumpram estes termos.</li>
            <li>Utilizem a plataforma de forma abusiva.</li>
            <li>Coloquem em risco a segurança do serviço ou dos demais usuários.</li>
          </ul>
        </Section>

        <hr className="border-border/60" />

        <Section id="alteracoes" title="9. Alterações destes Termos">
          <p>Estes termos poderão ser atualizados periodicamente.</p>
          <p className="font-medium text-foreground">A continuidade do uso da plataforma após alterações representa a aceitação da versão vigente.</p>
        </Section>

        <hr className="border-border/60" />

        <Section id="conhecimento" title="10. Conhecimento Colaborativo">
          <p>Os conteúdos, anotações, comentários, resumos, reflexões, citações e registros produzidos pelos usuários dentro de clubes e comunidades permanecem vinculados aos seus respectivos autores.</p>
          <p>A organização, indexação, estruturação e disponibilização desse conhecimento pela plataforma não transfere a titularidade intelectual do conteúdo para a NAMZU, exceto na medida necessária para operação, armazenamento e disponibilização dos serviços.</p>
        </Section>

        <hr className="border-border/60" />

        <Section id="contato" title="11. Contato">
          <p>Dúvidas, solicitações ou questões relacionadas a estes termos podem ser encaminhadas para os canais oficiais de atendimento da NAMZU.</p>
        </Section>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
        <Shield className="w-3.5 h-3.5" />
        <span>Última atualização: {lastUpdated}</span>
      </div>

      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className="fixed bottom-24 right-4 z-50 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-elevated flex items-center justify-center hover:bg-primary-hover transition-colors"
            aria-label="Voltar ao topo"
          >
            <ArrowUp className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
