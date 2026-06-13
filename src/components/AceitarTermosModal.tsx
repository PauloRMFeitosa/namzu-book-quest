import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const AceitarTermosModal = ({ userId }: { userId: string }) => {
  const [aceito, setAceito] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const qc = useQueryClient();

  const handleAceitar = async () => {
    setSalvando(true);
    const agora = new Date().toISOString();
    const { error } = await supabase
      .from("perfis")
      .update({ termos_aceitos_em: agora })
      .eq("user_id", userId);
    setSalvando(false);
    if (error) { toast.error("Erro ao salvar. Tente novamente."); return; }
    // Atualiza o cache diretamente para fechar o modal imediatamente,
    // sem depender do refetch que pode ser atrasado pelo staleTime
    qc.setQueryData(["perfil-onboarding", userId], (old: any) => ({
      ...old,
      termos_aceitos_em: agora,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-in fade-in-0 px-4">
      <div className="bg-background border border-border rounded-2xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-elevated">
        <div>
          <h2 className="font-display text-lg font-semibold">Bem-vindo ao NAMZU!</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Para continuar, leia e aceite nossos termos de uso e política de privacidade.
          </p>
        </div>

        <Link
          to="/termos"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Termos de Uso e Privacidade</p>
            <p className="text-xs text-muted-foreground">Clique para ler antes de aceitar</p>
          </div>
        </Link>

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={aceito}
            onChange={(e) => setAceito(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-border accent-primary shrink-0"
          />
          <span className="text-sm text-muted-foreground leading-snug">
            Li e concordo com os{" "}
            <Link to="/termos" target="_blank" className="text-primary underline underline-offset-2">
              Termos de Uso e Política de Privacidade
            </Link>{" "}
            da NAMZU.
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
  );
};
