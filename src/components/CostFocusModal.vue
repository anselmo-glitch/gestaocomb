<script setup>
import { ref } from "vue";
import { COST_FOCUS_OPTIONS } from "../core/constants.js";

const props = defineProps({
  modelValue: { type: String, required: true }
});
const emit = defineEmits(["confirm", "close"]);

const selected = ref(props.modelValue);
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal panel" role="dialog" aria-modal="true" aria-labelledby="cost-focus-title">
      <div class="panel-title">
        <div>
          <h2 id="cost-focus-title">Quais custos você quer ver?</h2>
          <p>Escolha o foco do dashboard. Você pode trocar isso a qualquer momento.</p>
        </div>
      </div>
      <div class="cost-focus-options">
        <button
          v-for="option in COST_FOCUS_OPTIONS"
          :key="option.value"
          type="button"
          class="cost-focus-option"
          :class="{ active: selected === option.value }"
          @click="selected = option.value"
        >
          <span class="cost-avatar" style="--cost-color: var(--primary);">{{ option.letter }}</span>
          {{ option.label }}
        </button>
      </div>
      <div class="actions">
        <button class="btn" @click="emit('confirm', selected)">Confirmar</button>
        <button class="btn ghost" @click="emit('close')">Cancelar</button>
      </div>
    </div>
  </div>
</template>
