const CHAVE_LS = "namzu_dicas";

function lerDicas(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_LS) ?? "{}");
  } catch {
    return {};
  }
}

export function temDicaPendente(chave: string): boolean {
  return !lerDicas()[chave];
}

export function dispensarDica(chave: string): void {
  try {
    const dicas = lerDicas();
    dicas[chave] = true;
    localStorage.setItem(CHAVE_LS, JSON.stringify(dicas));
  } catch {}
}
