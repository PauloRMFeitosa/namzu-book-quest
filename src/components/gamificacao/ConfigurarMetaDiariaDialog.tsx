import { useEffect, useState } from "react";
import { Loader2, Clock, Sun, Sunset, Moon, Bell, Mail, Smartphone } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAuth } from "@/hooks/useAuth";
import { useSalvarMetaDiaria, type MetaDiariaStatus } from "@/hooks/gamificacao/useMetaDiaria";
import { ativarPush, desativarPush, pushConfiguravel } from "@/lib/pushNotifications";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  status?: MetaDiariaStatus;
};

type Tipo = "minutos" | "paginas";
type Quando = "horario" | "turno";
type Turno = "manha" | "tarde" | "noite";

const PRESETS: Record<Tipo, number[]> = {
  minutos: [5, 10, 15, 30],
  paginas: [5, 10, 20, 30],
};

export const ConfigurarMetaDiariaDialog = ({ open, onOpenChange, status }: Props) => {
  const { user } = useAuth();
  const salvar = useSalvarMetaDiaria();
  const draftKey = `draft-meta-diaria-${user?.id ?? "anon"}`;

  const [tipo, setTipo] = useState<Tipo>("minutos");
  const [valor, setValor] = useState<number>(10);
  const [lembreteAtivo, setLembreteAtivo] = useState(true);
  const [quando, setQuando] = useState<Quando>("turno");
  const [horario, setHorario] = useState("20:00");
  const [turno, setTurno] = useState<Turno>("noite");
  const [canalInapp, setCanalInapp] = useState(true);
  const [canalEmail, setCanalEmail] = useState(false);
  const [canalPush, setCanalPush] = useState(false);
  const [ativandoPush, setAtivandoPush] = useState(false);

  // Ao abrir: carrega meta do servidor (edição) ou rascunho local (criação).
  useEffect(() => {
    if (!open) return;
    if (status?.tem_meta) {
      setTipo(status.tipo_meta ?? "minutos");
      setValor(status.valor_meta ?? 10);
      setLembreteAtivo(status.lembrete_ativo ?? true);
      setQuando(status.lembrete_tipo ?? "turno");
      if (status.lembrete_horario) setHorario(status.lembrete_horario.slice(0, 5));
      if (status.lembrete_turno) setTurno(status.lembrete_turno);
      setCanalInapp(status.canal_inapp ?? true);
      setCanalEmail(status.canal_email ?? false);
      setCanalPush(status.canal_push ?? false);
      return;
    }
    const raw = localStorage.getItem(draftKey);
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (d.tipo) setTipo(d.tipo);
      if (d.valor !== undefined) setValor(d.valor);
      if (d.lembreteAtivo !== undefined) setLembreteAtivo(d.lembreteAtivo);
      if (d.quando) setQuando(d.quando);
      if (d.horario) setHorario(d.horario);
      if (d.turno) setTurno(d.turno);
      if (d.canalInapp !== undefined) setCanalInapp(d.canalInapp);
      if (d.canalEmail !== undefined) setCanalEmail(d.canalEmail);
      if (d.canalPush !== undefined) setCanalPush(d.canalPush);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, status?.tem_meta]);

  // Salva rascunho apenas na criação (sem meta no servidor).
  useEffect(() => {
    if (!open || status?.tem_meta) return;
    localStorage.setItem(
      draftKey,
      JSON.stringify({ tipo, valor, lembreteAtivo, quando, horario, turno, canalInapp, canalEmail, canalPush }),
    );
  }, [open, status?.tem_meta, draftKey, tipo, valor, lembreteAtivo, quando, horario, turno, canalInapp, canalEmail, canalPush]);

  const togglePush = async (ativar: boolean) => {
    if (!ativar) {
      setCanalPush(false);
      if (user) await desativarPush(user.id);
      return;
    }
    if (!pushConfiguravel()) {
      toast.error("Notificações push não estão disponíveis neste dispositivo/navegador.");
      return;
    }
    setAtivandoPush(true);
    try {
      await ativarPush(user!.id);
      setCanalPush(true);
      toast.success("Push ativado neste dispositivo.");
    } catch (e: any) {
      setCanalPush(false);
      toast.error(e?.message ?? "Não foi possível ativar o push.");
    } finally {
      setAtivandoPush(false);
    }
  };

  const onSubmit = async () => {
    const v = Math.max(1, Math.min(1000, Math.round(Number(valor) || 0)));
    if (!v) {
      toast.error("Defina um valor para a meta.");
      return;
    }
    try {
      await salvar.mutateAsync({
        tipo_meta: tipo,
        valor_meta: v,
        lembrete_ativo: lembreteAtivo,
        lembrete_tipo: quando,
        lembrete_horario: quando === "horario" ? horario : null,
        lembrete_turno: quando === "turno" ? turno : null,
        canal_inapp: canalInapp,
        canal_email: canalEmail,
        canal_push: canalPush,
      });
      localStorage.removeItem(draftKey);
      toast.success("Meta diária salva! 📚");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar a meta.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Meta diária de leitura</DialogTitle>
          <DialogDescription>
            Crie o hábito de ler todo dia. A gente te lembra e mantém sua ofensiva viva. 🔥
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-1">
          {/* Métrica */}
          <div className="flex flex-col gap-2">
            <Label>Quero ler por</Label>
            <ToggleGroup
              type="single"
              value={tipo}
              onValueChange={(v) => v && setTipo(v as Tipo)}
              className="justify-start gap-2"
            >
              <ToggleGroupItem value="minutos" className="rounded-xl px-4">Minutos</ToggleGroupItem>
              <ToggleGroupItem value="paginas" className="rounded-xl px-4">Páginas</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Valor */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="valor-meta">
              Meta por dia ({tipo === "minutos" ? "minutos" : "páginas"})
            </Label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESETS[tipo].map((p) => (
                <Button
                  key={p}
                  type="button"
                  size="sm"
                  variant={valor === p ? "default" : "outline"}
                  className="rounded-xl"
                  onClick={() => setValor(p)}
                >
                  {p}
                </Button>
              ))}
              <Input
                id="valor-meta"
                type="number"
                min={1}
                max={1000}
                value={valor}
                onChange={(e) => setValor(Number(e.target.value))}
                className="w-24 rounded-xl"
              />
            </div>
          </div>

          {/* Lembrete on/off */}
          <div className="flex items-center justify-between rounded-xl border p-3">
            <div>
              <p className="text-sm font-medium">Lembretes</p>
              <p className="text-xs text-muted-foreground">Avisar quando a meta do dia não foi cumprida</p>
            </div>
            <Switch checked={lembreteAtivo} onCheckedChange={setLembreteAtivo} />
          </div>

          {lembreteAtivo && (
            <>
              {/* Quando lembrar */}
              <div className="flex flex-col gap-2">
                <Label>Quando lembrar</Label>
                <ToggleGroup
                  type="single"
                  value={quando}
                  onValueChange={(v) => v && setQuando(v as Quando)}
                  className="justify-start gap-2"
                >
                  <ToggleGroupItem value="turno" className="rounded-xl px-4">Turno</ToggleGroupItem>
                  <ToggleGroupItem value="horario" className="rounded-xl px-4">
                    <Clock className="w-4 h-4 mr-1" /> Horário
                  </ToggleGroupItem>
                </ToggleGroup>

                {quando === "turno" ? (
                  <ToggleGroup
                    type="single"
                    value={turno}
                    onValueChange={(v) => v && setTurno(v as Turno)}
                    className="justify-start gap-2 mt-1"
                  >
                    <ToggleGroupItem value="manha" className="rounded-xl px-3 flex-col h-auto py-2 gap-1">
                      <Sun className="w-4 h-4" /> <span className="text-[11px]">Manhã</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="tarde" className="rounded-xl px-3 flex-col h-auto py-2 gap-1">
                      <Sunset className="w-4 h-4" /> <span className="text-[11px]">Tarde</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="noite" className="rounded-xl px-3 flex-col h-auto py-2 gap-1">
                      <Moon className="w-4 h-4" /> <span className="text-[11px]">Noite</span>
                    </ToggleGroupItem>
                  </ToggleGroup>
                ) : (
                  <Input
                    type="time"
                    value={horario}
                    onChange={(e) => setHorario(e.target.value)}
                    className="w-36 rounded-xl mt-1"
                  />
                )}
              </div>

              {/* Canais */}
              <div className="flex flex-col gap-2">
                <Label>Como avisar</Label>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="flex items-center gap-2 text-sm"><Bell className="w-4 h-4 text-primary" /> No app</span>
                  <Switch checked={canalInapp} onCheckedChange={setCanalInapp} />
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-primary" /> E-mail</span>
                  <Switch checked={canalEmail} onCheckedChange={setCanalEmail} />
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="flex items-center gap-2 text-sm">
                    <Smartphone className="w-4 h-4 text-primary" /> Push no celular
                  </span>
                  {ativandoPush ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Switch
                      checked={canalPush}
                      onCheckedChange={togglePush}
                      disabled={!pushConfiguravel()}
                    />
                  )}
                </div>
                {!pushConfiguravel() && (
                  <p className="text-[11px] text-muted-foreground">
                    Push indisponível neste dispositivo ou ainda não configurado no servidor.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button className="rounded-xl" onClick={onSubmit} disabled={salvar.isPending}>
            {salvar.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar meta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
