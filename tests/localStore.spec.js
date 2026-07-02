import { beforeEach, describe, expect, it } from "vitest";
import { saveState } from "../src/services/localStore.js";

// Node não tem localStorage; stub mínimo só com getItem/setItem, suficiente para o serviço.
beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value))
  };
});

describe("saveState", () => {
  it("serializa mesmo quando o estado contém objetos-Proxy aninhados", () => {
    // Reproduz o que Array.prototype.filter devolve quando aplicado a um array
    // reativo do Vue: elementos envolvidos em Proxy, que o structuredClone rejeita
    // (DataCloneError) mas o JSON.stringify atravessa normalmente.
    const proxiedContract = new Proxy({ id: "c1", code: "PR-BA" }, {});
    const state = { contracts: [proxiedContract], vehicles: [], monthlyEntries: [], branchFuelPurchases: [] };

    const saved = saveState(state);

    expect(saved.contracts).toEqual([{ id: "c1", code: "PR-BA" }]);
    expect(JSON.parse(localStorage.getItem("frota-ro-v2-state")).contracts[0].code).toBe("PR-BA");
  });

  it("grava a data de atualização em meta", () => {
    const saved = saveState({ contracts: [] });
    expect(saved.meta.updatedAt).toBeTruthy();
  });
});
