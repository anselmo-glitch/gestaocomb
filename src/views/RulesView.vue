<script setup>
import { downloadText } from "../core/csv.js";
import { exportState } from "../services/localStore.js";
import { useAppStore } from "../stores/appStore.js";
import { toast } from "../composables/useToast.js";

const store = useAppStore();

function exportJson() {
  downloadText(`frota-ro-backup-${new Date().toISOString().slice(0, 10)}.json`, exportState(store.state), "application/json;charset=utf-8");
}

async function importJson(event) {
  if (!store.userCan("canImport")) return toast("Seu perfil não permite importar base.");
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    store.importFromJson(text);
    store.persist("state_imported", "Backup JSON importado.");
    toast("Backup importado.");
  } catch (error) {
    toast(error.message);
  } finally {
    event.target.value = "";
  }
}

function resetState() {
  if (!confirm("Resetar a base local de validação?")) return;
  store.resetAll();
  toast("Base local reiniciada.");
}
</script>

<template>
  <section class="panel">
    <div class="panel-title"><div><h2>Regras oficiais desta versão</h2><p>Estas regras foram separadas para deixar a lógica auditável.</p></div></div>
    <div class="rule-list">
      <div class="rule"><strong>1. Programado</strong><code>KM planejado / média km/l + consumo de bomba</code>. Depois multiplica pelo preço previsto do diesel e soma CPK de pneu e manutenção.</div>
      <div class="rule"><strong>2. Previsto ajustado</strong>Usa o <code>KM realizado por veículo</code>, mantendo média prevista e preço previsto. Responde: quanto deveria custar com o KM real?</div>
      <div class="rule"><strong>3. Realizado</strong>Usa o KM informado no veículo. Diesel vem de litros manuais ou do rateio da filial. Pneu e manutenção entram pelo KM mesmo que o diesel não tenha sido informado.</div>
      <div class="rule"><strong>4. Rateio de diesel por filial</strong>Quando não há litros por veículo, o diesel da filial é rateado pelos litros teóricos de cada veículo. Se houver litros manuais, eles são abatidos antes do rateio.</div>
      <div class="rule"><strong>5. Desvio de volume</strong><code>Previsto ajustado - programado</code>. Mede impacto de rodar mais ou menos que o planejado.</div>
      <div class="rule"><strong>6. Desvio operacional</strong><code>Realizado - previsto ajustado</code>. Mede impacto de consumo, preço real e eficiência.</div>
      <div class="rule"><strong>7. Desvio total</strong><code>Realizado - programado</code>. Mede o efeito final contra o orçamento original.</div>
      <div class="rule"><strong>8. Desvio de preço separado</strong><code>Litros reais × (preço real - preço previsto)</code>. Não mistura consumo com preço.</div>
      <div class="rule"><strong>9. Desvio de consumo separado</strong><code>(litros reais - litros previstos ajustados) × preço previsto</code>. Mede eficiência de consumo.</div>
    </div>
  </section>
  <section class="panel">
    <div class="panel-title"><div><h2>Backup e validação</h2><p>Use os botões abaixo para exportar ou reiniciar a base local.</p></div></div>
    <div class="actions">
      <button class="btn secondary" @click="exportJson">Exportar backup JSON</button>
      <label class="btn ghost" for="import-json">Importar backup JSON</label>
      <input id="import-json" type="file" accept="application/json" style="display:none" @change="importJson" />
      <button class="btn danger" @click="resetState">Resetar base local</button>
    </div>
  </section>
</template>
