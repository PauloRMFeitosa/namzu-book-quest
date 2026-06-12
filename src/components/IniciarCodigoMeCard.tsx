import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInteressesUsuario } from "@/hooks/useInteressesUsuario";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

/**
 * Convite para iniciar o Código ME do Leitor.
 * Exibido enquanto o usuário não possui registros em perfil_interesses
 * e a flag show_codigo_me está ativa no admin.
 */
export const IniciarCodigoMeCard = ({ compact = false }: { compact?: boolean }) => {
  const navigate = useNavigate();
  const { data: interesses, isLoading } = useInteressesUsuario();
  const { flags } = useFeatureFlags();

  if (!flags.show_codigo_me) return null;
  if (isLoading) return null;
  if ((interesses?.length ?? 0) > 0) return null;

  return (
    <section className="card-soft p-5 border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg font-semibold leading-tight">
            Descubra seu <span className="text-gradient-warm">Código ME</span>
          </h3>
          {!compact && (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Tudo no universo, segundo os sumérios, possuía um <strong>Me</strong> — um conjunto de princípios
              que definia sua essência. Descubra o seu Código ME e comece a construir sua identidade como leitor.
            </p>
          )}
          {compact && (
            <p className="text-sm text-muted-foreground mt-1">
              Seu Código ME ainda não foi iniciado.
            </p>
          )}
          <Button
            onClick={() => navigate("/onboarding-interesses")}
            className="mt-4 h-11 rounded-2xl bg-primary hover:bg-primary-hover"
          >
            Iniciar Código ME
          </Button>
        </div>
      </div>
    </section>
  );
};
