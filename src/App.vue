<script setup>
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { NAV_GROUPS, ROLE_LABEL, TABS } from "./core/constants.js";
import { useAppStore } from "./stores/appStore.js";
import AppIcon from "./components/AppIcon.vue";

const THEME_KEY = "frota-ro-theme";

const store = useAppStore();
const route = useRoute();

const theme = ref(localStorage.getItem(THEME_KEY) || "dark");
document.documentElement.dataset.theme = theme.value;

function toggleTheme() {
  theme.value = theme.value === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = theme.value;
  localStorage.setItem(THEME_KEY, theme.value);
}

const activeLabel = computed(() => {
  if (route.name === "contractDetail") return "Dashboard do contrato";
  return TABS.find((tab) => tab.id === route.name)?.label || "Gestão de Combustível";
});
const user = computed(() => store.currentUser);

function isActive(tabId) {
  if (tabId === "contracts") return route.name === "contracts" || route.name === "contractDetail";
  return route.name === tabId;
}
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <strong>Gestão Combustível</strong>
        <span>Compras, estoque, consumo e contratos</span>
      </div>
      <nav aria-label="Navegação principal">
        <div v-for="group in NAV_GROUPS" :key="group.label" class="nav-group">
          <div class="nav-group-label">{{ group.label }}</div>
          <router-link
            v-for="tab in group.items"
            :key="tab.id"
            :to="tab.id === 'dashboard' ? '/' : `/${tab.id}`"
            custom
            v-slot="{ navigate }"
          >
            <button class="nav-button" :class="{ active: isActive(tab.id) }" @click="navigate">
              <span class="nav-icon"><AppIcon :name="tab.icon" /></span>
              <span>{{ tab.label }}</span>
            </button>
          </router-link>
        </div>
      </nav>
      <div class="sidebar-card">
        <strong>Estoque em tempo real:</strong><br />
        Estoque atual = entradas − saídas ± ajustes. Todo abastecimento gera saída automática do tanque.
      </div>
    </aside>
    <main class="main">
      <div class="topbar">
        <div>
          <h1>{{ activeLabel }}</h1>
          <p>Base corporativa única em modo local para validação. Para produção, usar Supabase com RLS.</p>
        </div>
        <div class="topbar-right">
          <button
            class="btn ghost"
            :aria-label="theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'"
            @click="toggleTheme"
          >
            <AppIcon :name="theme === 'dark' ? 'sun' : 'moon'" :size="16" />
            {{ theme === "dark" ? "Modo claro" : "Modo escuro" }}
          </button>
          <div class="user-pill">
            <strong>{{ user?.name || "Usuário" }}</strong>
            <span>{{ ROLE_LABEL[user?.role] || user?.role }} · {{ user?.active ? "ativo" : "inativo" }}</span>
          </div>
        </div>
      </div>
      <router-view />
    </main>
  </div>
</template>
