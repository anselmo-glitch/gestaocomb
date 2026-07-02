import { describe, expect, it } from "vitest";
import { csvNumber, toCsv } from "../src/core/csv.js";

describe("csvNumber", () => {
  it("usa vírgula decimal para o Excel pt-BR", () => {
    expect(csvNumber(1234.5)).toBe("1234,50");
    expect(csvNumber(0)).toBe("0,00");
    expect(csvNumber(-12.345)).toBe("-12,35");
  });
});

describe("toCsv", () => {
  it("separa por ponto e vírgula e escapa células especiais", () => {
    const csv = toCsv([
      { contrato: "PR-BA", valor: "1234,50", obs: 'tem "aspas"; e ponto e vírgula' },
      { contrato: "SEA", valor: "10,00", obs: "" }
    ]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("contrato;valor;obs");
    expect(lines[1]).toBe('PR-BA;1234,50;"tem ""aspas""; e ponto e vírgula"');
    expect(lines[2]).toBe("SEA;10,00;");
  });

  it("com lista vazia devolve string vazia", () => {
    expect(toCsv([])).toBe("");
  });
});
