interface Props {
  etapa: number; // 2, 3 ou 4
}

export function ProgressoOnboarding({ etapa }: Props) {
  const total = 3;
  const atual = etapa - 1; // 1, 2, 3
  const pct = (atual / total) * 100;

  return (
    <div className="px-6 pt-5 pb-2">
      <div
        role="progressbar"
        aria-valuenow={atual}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Passo ${atual} de ${total} do quiz`}
        className="h-1 bg-secondary rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-primary rounded-full transition-all duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1 text-right" aria-hidden>
        {atual}&nbsp;de&nbsp;{total}
      </p>
    </div>
  );
}
