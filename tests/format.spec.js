import { describe, expect, it } from "vitest";
import { round, toNumber } from "../src/core/format.js";

describe("toNumber", () => {
  it("aceita decimal com ponto (formato dos campos numéricos do navegador)", () => {
    expect(toNumber("5.29")).toBe(5.29);
    expect(toNumber("0.45")).toBe(0.45);
  });

  it("aceita formato brasileiro com milhar e vírgula", () => {
    expect(toNumber("1.234,56")).toBe(1234.56);
    expect(toNumber("5,29")).toBe(5.29);
    expect(toNumber("R$ 12,50")).toBe(12.5);
  });

  it("aceita milhares com ponto sem vírgula", () => {
    expect(toNumber("1.234.567")).toBe(1234567);
  });

  it("trata vazio, nulo e inválido com fallback", () => {
    expect(toNumber("")).toBe(0);
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber("abc")).toBe(0);
    expect(toNumber("abc", 7)).toBe(7);
    expect(toNumber(NaN, 3)).toBe(3);
  });

  it("preserva números já numéricos", () => {
    expect(toNumber(1234.56)).toBe(1234.56);
    expect(toNumber(0)).toBe(0);
  });
});

describe("round", () => {
  it("arredonda com casas configuráveis", () => {
    expect(round(1.005)).toBe(1.01);
    expect(round(10.12345, 4)).toBe(10.1235);
    expect(round("2,555")).toBe(2.56);
  });
});
