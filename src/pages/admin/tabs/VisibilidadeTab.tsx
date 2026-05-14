import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { FeatureFlagKey } from "@/hooks/useFeatureFlags";

const FLAGS: { key: FeatureFlagKey; label: string; desc: string }[] = [
  { key: "show_clubes", label: "Página Clubes", desc: "Exibir o item Clubes na navegação." },
  { key: "show_metas", label: "Página Metas", desc: "Exibir Metas no menu Mais." },
  { key: "show_historico", label: "Página Histórico", desc: "Exibir Histórico no menu Mais." },
  { key: "show_notificacoes", label: "Página Notificações", desc: "Exibir Notificações no menu Mais." },
  { key: "show_gamificacao_home", label: "Gamificação na Home", desc: "Exibir XP, nível e streak no topo da Home." },
];

const CLUBE_FLAGS: { key: FeatureFlagKey; label: string; desc: string }[] = [
  { key: "show_clube_feed", label: "Aba Feed", desc: "Exibir a aba Feed dentro do clube." },
  { key: "show_clube_leituras", label: "Aba Leituras", desc: "Exibir a aba Leituras dentro do clube." },
  { key: "show_clube_canais", label: "Aba Canais", desc: "Exibir a aba Canais dentro do clube." },
  { key: "show_clube_eventos", label: "Aba Eventos", desc: "Exibir a aba Eventos dentro do clube." },
  { key: "show_clube_membros", label: "Aba Membros", desc: "Exibir a aba Membros dentro do clube." },
  { key: "show_clube_conteudos", label: "Aba Conteúdos", desc: "Exibir a aba Conteúdos dentro do clube." },
  { key: "show_clube_microgrupos", label: "Aba Microgrupos", desc: "Exibir a aba Microgrupos dentro do clube." },
  { key: "show_clube_ai_copiloto", label: "IA · Copiloto de leitura", desc: "Exibir o botão Copiloto IA na página de leitura." },
  { key: "show_clube_ai_provocacao", label: "IA · Provocar discussão", desc: "Exibir o botão Provocar (perguntas profundas) nos posts do feed." },
];

export const VisibilidadeTab = () => {
  const [values, setValues] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from("app_settings")
        .select("key, value");
      if (error) {
        toast.error("Erro ao carregar configurações: " + error.message);
        setLoading(false);
        return;
      }
      const map: Record<string, boolean> = {};
      for (const row of data ?? []) {
        const v = row.value;
        map[row.key] = typeof v === "boolean" ? v : v === "true" || v === true;
      }
      // defaults
      [...FLAGS, ...CLUBE_FLAGS].forEach((f) => {
        if (!(f.key in map)) map[f.key] = true;
      });
      setValues(map);
      setLoading(false);
    })();
  }, []);

  const toggle = async (key: string, next: boolean) => {
    setValues((p) => ({ ...p, [key]: next }));
    const { error } = await (supabase as any)
      .from("app_settings")
      .upsert({ key, value: next, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      setValues((p) => ({ ...p, [key]: !next }));
      return;
    }
    toast.success("Configuração atualizada");
    qc.invalidateQueries({ queryKey: ["app_settings"] });
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Visibilidade global</h2>
        <p className="text-sm text-muted-foreground">
          Controle quais áreas ficam disponíveis para os usuários. Admins sempre veem tudo.
        </p>
      </div>
      <div className="card-soft p-4 space-y-4">
        {FLAGS.map((f) => (
          <div key={f.key} className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Label htmlFor={f.key} className="font-semibold">{f.label}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
            </div>
            <Switch
              id={f.key}
              checked={!!values[f.key]}
              onCheckedChange={(v) => toggle(f.key, v)}
            />
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold">Abas do Clube de Leitura</h2>
        <p className="text-sm text-muted-foreground">
          Controle quais abas internas aparecem em cada clube. Admins sempre veem tudo.
        </p>
      </div>
      <div className="card-soft p-4 space-y-4">
        {CLUBE_FLAGS.map((f) => (
          <div key={f.key} className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Label htmlFor={f.key} className="font-semibold">{f.label}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
            </div>
            <Switch
              id={f.key}
              checked={!!values[f.key]}
              onCheckedChange={(v) => toggle(f.key, v)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
