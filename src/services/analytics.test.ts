import { describe, it, expect } from "vitest";
import { prepararProps } from "@/services/analytics";

describe("prepararProps", () => {
  it("devolve objeto vazio quando não há propriedades", () => {
    expect(prepararProps(undefined)).toEqual({});
    expect(prepararProps({})).toEqual({});
  });

  it("mantém textos, números, booleanos e nulos", () => {
    expect(prepararProps({ canal: "whatsapp", percentual: 42, concluiu: false, nota: null })).toEqual({
      canal: "whatsapp", percentual: 42, concluiu: false, nota: null,
    });
  });

  it("descarta undefined, objetos e números inválidos", () => {
    const entrada = { a: undefined, b: NaN, c: Infinity, d: { x: 1 }, e: [1, 2], f: "ok" } as any;
    expect(prepararProps(entrada)).toEqual({ f: "ok" });
  });

  it("corta textos longos em 120 caracteres", () => {
    const saida = prepararProps({ texto: "x".repeat(500) });
    expect((saida.texto as string).length).toBe(120);
  });

  it("limita a 12 chaves", () => {
    const muitas = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`k${i}`, i]));
    expect(Object.keys(prepararProps(muitas))).toHaveLength(12);
  });
});
