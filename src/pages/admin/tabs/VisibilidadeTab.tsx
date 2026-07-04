import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { FeatureFlagKey } from "@/hooks/useFeatureFlags";
import { LANDING_PAGE_OPTIONS, useSaveLandingPage, type LandingPageRoute } from "@/hooks/useLandingPage";

// ─── Grupos de flags ─────────────────────────────────────────────────────────

const FLAGS: { key: FeatureFlagKey; label: string; desc: string }[] = [
  { key: "show_clubes", label: "Página Clubes", desc: "Exibir o item Clubes na navegação." },
  { key: "show_leituras", label: "Página Leituras", desc: "Exibir Leituras no menu principal." },
  { key: "show_metas", label: "Página Metas", desc: "Exibir Metas no menu Mais." },
  { key: "show_historico", label: "Página Histórico", desc: "Exibir Histórico no menu Mais." },
  { key: "show_notificacoes", label: "Página Notificações", desc: "Exibir Notificações no menu Mais." },
  { key: "show_gamificacao_home", label: "Gamificação na Home", desc: "Exibir XP, nível e streak no topo da Home." },
];

const FLUXOS_FLAGS: { key: FeatureFlagKey; label: string; desc: string }[] = [
  { key: "show_onboarding", label: "Onboarding", desc: "Exibir o fluxo de boas-vindas para novos usuários. Quando desativado, novos usuários vão direto para o app." },
  { key: "show_codigo_me", label: "Questionário Código ME", desc: "Exibir o convite e redirecionar para o questionário de interesses. Quando desativado, o card e o redirect são suprimidos." },
];

const MENU_INFERIOR_FLAGS: { key: FeatureFlagKey; label: string; desc: string }[] = [
  { key: "show_menu_inferior_home", label: "Home", desc: "Exibir menu inferior na página inicial." },
  { key: "show_menu_inferior_clubes", label: "Clubes", desc: "Exibir menu inferior em Clubes e detalhe de clube." },
  { key: "show_menu_inferior_busca", label: "Busca", desc: "Exibir menu inferior na página de Busca." },
  { key: "show_menu_inferior_livros", label: "Livros / Obras / Autores", desc: "Exibir menu inferior em Livros, detalhe de obra e autor." },
  { key: "show_menu_inferior_leituras", label: "Leituras", desc: "Exibir menu inferior em Leituras e detalhe de leitura." },
  { key: "show_menu_inferior_perfil", label: "Perfil", desc: "Exibir menu inferior na página de Perfil e perfis públicos." },
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
  { key: "show_clube_ai_resumo", label: "IA · Resumo da discussão", desc: "Exibir o botão Resumo IA no feed do clube." },
  { key: "show_clube_ai_matchmaking", label: "IA · Encontrar afinidades", desc: "Exibir o botão Encontrar afinidades nos microgrupos." },
  { key: "show_clube_ai_recomendacoes", label: "IA · Recomendações de clubes", desc: "Exibir o bloco Curadoria IA no marketplace." },
  { key: "show_gamificacao_clube", label: "Gamificação do clube", desc: "Exibir liga semanal e nível do clube na página do clube." },
];

// ─── Presets ─────────────────────────────────────────────────────────────────

type PresetSettings = Partial<Record<FeatureFlagKey, boolean>> & { landing_page?: LandingPageRoute };

type Preset = {
  label: string;
  description: string;
  badge: string;
  settings: PresetSettings;
};

const PRESETS: Preset[] = [
  {
    label: "Modo Clubes",
    description: "Apenas Clubes ativo. Onboarding e Código ME desativados. Usuários entram direto nos clubes.",
    badge: "Foco",
    settings: {
      show_clubes: true,
      show_leituras: false,
      show_metas: false,
      show_historico: false,
      show_notificacoes: false,
      show_gamificacao_home: false,
      pages_global_visible: true,
      show_onboarding: false,
      show_codigo_me: false,
      landing_page: "/clubes",
    },
  },
  {
    label: "Padrão completo",
    description: "Restaura todas as páginas, onboarding e Código ME. Landing page volta para Home.",
    badge: "Reset",
    settings: {
      show_clubes: true,
      show_leituras: true,
      show_metas: true,
      show_historico: true,
      show_notificacoes: true,
      show_gamificacao_home: true,
      pages_global_visible: true,
      show_onboarding: true,
      show_codigo_me: true,
      landing_page: "/",
    },
  },
];

// ─── Componente ──────────────────────────────────────────────────────────────

const FlagRow = ({
  f,
  values,
  toggle,
}: {
  f: { key: string; label: string; desc: string };
  values: Record<string, boolean>;
  toggle: (key: string, next: boolean) => void;
}) => (
  <div className="flex items-start justify-between gap-4">
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
);

export const VisibilidadeTab = () => {
  const [values, setValues] = useState<Record<string, boolean>>({});
  const [landingPage, setLandingPage] = useState<LandingPageRoute>("/");
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();
  const saveLandingPage = useSaveLandingPage();

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
      // defaults booleanos
      [...FLAGS, ...CLUBE_FLAGS, ...MENU_INFERIOR_FLAGS, ...FLUXOS_FLAGS].forEach((f) => {
        if (!(f.key in map)) map[f.key] = true;
      });
      if (!("pages_global_visible" in map)) map["pages_global_visible"] = true;

      // landing page (string)
      const lpRow = (data ?? []).find((r: any) => r.key === "landing_page");
      if (lpRow?.value) setLandingPage(lpRow.value as LandingPageRoute);

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

  const hideAll = async () => {
    const updates = FLAGS.map((f) => ({ key: f.key, value: false, updated_at: new Date().toISOString() }));
    setValues((p) => {
      const next = { ...p };
      FLAGS.forEach((f) => { next[f.key] = false; });
      return next;
    });
    const { error } = await (supabase as any)
      .from("app_settings")
      .upsert(updates, { onConflict: "key" });
    if (error) { toast.error("Erro ao ocultar todas: " + error.message); return; }
    toast.success("Todas as páginas ocultadas");
    qc.invalidateQueries({ queryKey: ["app_settings"] });
  };

  const showAll = async () => {
    const updates = FLAGS.map((f) => ({ key: f.key, value: true, updated_at: new Date().toISOString() }));
    setValues((p) => {
      const next = { ...p };
      FLAGS.forEach((f) => { next[f.key] = true; });
      return next;
    });
    const { error } = await (supabase as any)
      .from("app_settings")
      .upsert(updates, { onConflict: "key" });
    if (error) { toast.error("Erro ao exibir todas: " + error.message); return; }
    toast.success("Todas as páginas exibidas");
    qc.invalidateQueries({ queryKey: ["app_settings"] });
  };

  const applyPreset = async (preset: Preset) => {
    const { landing_page: lp, ...boolSettings } = preset.settings;

    // Atualiza estado local
    setValues((p) => ({ ...p, ...boolSettings }));
    if (lp) setLandingPage(lp);

    // Persiste booleanos
    const boolUpdates = Object.entries(boolSettings).map(([key, value]) => ({
      key, value, updated_at: new Date().toISOString(),
    }));
    const { error } = await (supabase as any)
      .from("app_settings")
      .upsert(boolUpdates, { onConflict: "key" });
    if (error) { toast.error("Erro ao aplicar preset: " + error.message); return; }

    // Persiste landing_page
    if (lp) await saveLandingPage(lp);

    toast.success(`Preset "${preset.label}" aplicado`);
    qc.invalidateQueries({ queryKey: ["app_settings"] });
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-4">

      {/* ── Presets ── */}
      <div>
        <h2 className="text-lg font-semibold">Presets</h2>
        <p className="text-sm text-muted-foreground">Configurações prontas para aplicar de uma vez.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PRESETS.map((preset) => (
          <div key={preset.label} className="card-soft p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{preset.label}</span>
              <Badge variant="secondary" className="text-[10px]">{preset.badge}</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{preset.description}</p>
            <Button variant="outline" size="sm" className="mt-auto self-start" onClick={() => applyPreset(preset)}>
              Aplicar
            </Button>
          </div>
        ))}
      </div>

      {/* ── Toggle global ── */}
      <div className="card-soft p-4 flex items-start justify-between gap-4 border-2 border-primary/20">
        <div className="flex-1">
          <Label htmlFor="pages_global_visible" className="font-bold text-base">Páginas visíveis globalmente</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quando desativado, oculta todas as páginas para usuários sem alterar as configurações individuais abaixo.
          </p>
          {!values["pages_global_visible"] && (
            <p className="text-xs text-destructive font-medium mt-1">⚠️ Todas as páginas estão ocultas para usuários.</p>
          )}
        </div>
        <Switch
          id="pages_global_visible"
          checked={!!values["pages_global_visible"]}
          onCheckedChange={(v) => toggle("pages_global_visible", v)}
        />
      </div>

      {/* ── Fluxos de entrada ── */}
      <div>
        <h2 className="text-lg font-semibold">Fluxos de entrada</h2>
        <p className="text-sm text-muted-foreground">Controle os fluxos de onboarding e questionários iniciais.</p>
      </div>
      <div className="card-soft p-4 space-y-4">
        {FLUXOS_FLAGS.map((f) => <FlagRow key={f.key} f={f} values={values} toggle={toggle} />)}
      </div>

      {/* ── Visibilidade por página ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Visibilidade por página</h2>
          <p className="text-sm text-muted-foreground">Controle quais áreas ficam disponíveis. Admins sempre veem tudo.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={showAll}>Exibir todas</Button>
          <Button variant="destructive" size="sm" onClick={hideAll}>Ocultar todas</Button>
        </div>
      </div>

      {/* Página de entrada */}
      <div className="card-soft p-4 flex items-start justify-between gap-4">
        <div className="flex-1">
          <Label className="font-semibold">Página de entrada</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Para onde os usuários são direcionados ao abrir o app. Admins sempre vão para a Home.
          </p>
        </div>
        <Select
          value={landingPage}
          onValueChange={async (v) => {
            setLandingPage(v as LandingPageRoute);
            await saveLandingPage(v as LandingPageRoute);
            toast.success("Página de entrada atualizada");
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANDING_PAGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="card-soft p-4 space-y-4">
        {FLAGS.map((f) => <FlagRow key={f.key} f={f} values={values} toggle={toggle} />)}
      </div>

      {/* ── Abas do Clube ── */}
      <div>
        <h2 className="text-lg font-semibold">Abas do Clube de Leitura</h2>
        <p className="text-sm text-muted-foreground">Controle quais abas internas aparecem em cada clube. Admins sempre veem tudo.</p>
      </div>
      <div className="card-soft p-4 space-y-4">
        {CLUBE_FLAGS.map((f) => <FlagRow key={f.key} f={f} values={values} toggle={toggle} />)}
      </div>

      {/* ── Menu inferior ── */}
      <div>
        <h2 className="text-lg font-semibold">Menu inferior</h2>
        <p className="text-sm text-muted-foreground">Controle em quais seções o menu de navegação inferior é exibido.</p>
      </div>
      <div className="card-soft p-4 space-y-4">
        {MENU_INFERIOR_FLAGS.map((f) => <FlagRow key={f.key} f={f} values={values} toggle={toggle} />)}
      </div>

    </div>
  );
};
