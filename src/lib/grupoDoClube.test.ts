import { describe, expect, it } from "vitest";
import {
  limparLinkDoGrupo,
  linkParaEnviarNoWhatsApp,
  rotuloDeEntrar,
  tipoDoGrupo,
  validarLinkDoGrupo,
} from "./grupoDoClube";

describe("limparLinkDoGrupo", () => {
  it("põe o https e tira espaços", () => {
    expect(limparLinkDoGrupo("  chat.whatsapp.com/AbC123  ")).toBe("https://chat.whatsapp.com/AbC123");
    expect(limparLinkDoGrupo("http://t.me/+AbC_123")).toBe("https://t.me/+AbC_123");
    expect(limparLinkDoGrupo("https://chat.whatsapp.com/AbC 123")).toBe("https://chat.whatsapp.com/AbC123");
    expect(limparLinkDoGrupo("")).toBe("");
  });
});

describe("tipoDoGrupo", () => {
  it("reconhece WhatsApp e Telegram", () => {
    expect(tipoDoGrupo("https://chat.whatsapp.com/AbC123xyz")).toBe("whatsapp");
    expect(tipoDoGrupo("https://t.me/+AbC_123")).toBe("telegram");
    expect(tipoDoGrupo("https://t.me/clubedolivro")).toBe("telegram");
    expect(tipoDoGrupo("https://telegram.me/joinchat/AbC")).toBe("telegram");
  });

  it("recusa o resto", () => {
    expect(tipoDoGrupo(null)).toBeNull();
    expect(tipoDoGrupo("https://exemplo.com/grupo")).toBeNull();
    expect(tipoDoGrupo("https://chat.whatsapp.com.exemplo.com/AbC")).toBeNull();
    expect(tipoDoGrupo("javascript:alert(1)")).toBeNull();
    expect(tipoDoGrupo("https://chat.whatsapp.com/")).toBeNull();
    expect(tipoDoGrupo('https://chat.whatsapp.com/AbC"><script>')).toBeNull();
  });
});

describe("validarLinkDoGrupo", () => {
  it("aceita link de convite", () => {
    expect(validarLinkDoGrupo("https://chat.whatsapp.com/AbC123xyz")).toBeNull();
    expect(validarLinkDoGrupo("https://t.me/+AbC_123")).toBeNull();
  });

  it("explica o problema", () => {
    expect(validarLinkDoGrupo("")).toMatch(/Cole o link/);
    expect(validarLinkDoGrupo("https://wa.me/5588999999999")).toMatch(/conversa, não de um grupo/);
    expect(validarLinkDoGrupo("https://instagram.com/clube")).toMatch(/chat\.whatsapp\.com/);
    expect(validarLinkDoGrupo(`https://chat.whatsapp.com/${"a".repeat(300)}`)).toMatch(/comprido/);
  });
});

describe("textos e links", () => {
  it("monta o rótulo e o link de envio", () => {
    expect(rotuloDeEntrar("whatsapp")).toBe("Entrar no grupo do WhatsApp");
    expect(rotuloDeEntrar("telegram")).toBe("Entrar no grupo do Telegram");
    expect(linkParaEnviarNoWhatsApp("Oi, pessoal! https://x/y?a=1")).toBe("https://wa.me/?text=Oi%2C%20pessoal!%20https%3A%2F%2Fx%2Fy%3Fa%3D1");
  });
});
