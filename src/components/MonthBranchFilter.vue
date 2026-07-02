<script setup>
import { useAppStore } from "../stores/appStore.js";

const store = useAppStore();
</script>

<template>
  <div class="panel">
    <div class="form-grid compact">
      <div class="field">
        <label>Mês de análise</label>
        <input type="month" v-model="store.selectedMonth" />
      </div>
      <div class="field">
        <label>Filial</label>
        <select v-model="store.selectedBranch">
          <option value="all">Todas as filiais</option>
          <option v-for="branch in store.state.branches" :key="branch.id" :value="branch.id">{{ branch.name }}</option>
        </select>
      </div>
    </div>
  </div>
</template>
