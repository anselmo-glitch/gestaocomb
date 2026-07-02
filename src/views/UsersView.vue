<script setup>
import { computed, reactive } from "vue";
import { ROLE_LABEL, ROLES } from "../core/constants.js";
import { useAppStore } from "../stores/appStore.js";
import { toast } from "../composables/useToast.js";

const store = useAppStore();

// Rascunho por usuário: só grava em store.state (e no localStorage) ao clicar "Salvar",
// igual ao comportamento original.
const drafts = reactive(Object.fromEntries(store.state.users.map((user) => [user.id, { role: user.role, active: user.active }])));

const auditRows = computed(() =>
  (store.state.auditLog || []).slice(0, 30).map((event) => {
    const when = new Date(event.at);
    const user = store.state.users.find((row) => row.id === event.userId);
    return {
      ...event,
      userName: user?.name || event.userId || "—",
      stamp: Number.isNaN(when.getTime()) ? event.at : when.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    };
  })
);

function loginAs(user) {
  store.state.currentUserId = user.id;
  store.saveOnly();
  toast("Perfil alterado para validação.");
}

function saveUser(user) {
  if (!store.userCan("canManageUsers")) return toast("Apenas administrador pode alterar usuários.");
  const draft = drafts[user.id];
  user.role = draft.role;
  user.active = draft.active;
  store.persist("user_updated", `Usuário ${user.email} atualizado.`);
  toast("Usuário atualizado.");
}
</script>

<template>
  <section class="panel">
    <div class="panel-title"><div><h2>Usuários e permissões</h2><p>No modo local, isso serve para validar a experiência. Em produção, a regra real fica no Supabase RLS.</p></div></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Usuário</th><th>E-mail</th><th>Perfil</th><th>Ativo</th><th>Entrar como</th><th>Ação</th></tr></thead>
        <tbody>
          <tr v-for="user in store.state.users" :key="user.id">
            <td><strong>{{ user.name }}</strong></td>
            <td>{{ user.email }}</td>
            <td>
              <select v-model="drafts[user.id].role" :disabled="!store.userCan('canManageUsers')">
                <option v-for="role in Object.values(ROLES)" :key="role" :value="role">{{ ROLE_LABEL[role] }}</option>
              </select>
            </td>
            <td><input type="checkbox" v-model="drafts[user.id].active" :disabled="!store.userCan('canManageUsers')" /></td>
            <td><button class="btn ghost" @click="loginAs(user)">Usar perfil</button></td>
            <td><button class="btn secondary" :disabled="!store.userCan('canManageUsers')" @click="saveUser(user)">Salvar</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
  <section class="panel">
    <div class="panel-title"><div><h2>Segurança aplicada nesta versão</h2><p>O visualizador fica bloqueado na tela e o SQL do Supabase também bloqueia alterações no banco.</p></div></div>
    <div class="rule-list">
      <div class="rule"><strong>Visualizador</strong>Não pode gravar dados. Em produção, a proteção não depende do botão escondido; depende de política RLS.</div>
      <div class="rule"><strong>Usuário pendente</strong>Não pode ativar a própria conta. Apenas administrador altera o campo <code>active</code>.</div>
      <div class="rule"><strong>Sem login caseiro</strong>O projeto não usa cookie simples nem senha manual. Para produção, usar Supabase Auth.</div>
    </div>
  </section>
  <section class="panel">
    <div class="panel-title"><div><h2>Auditoria</h2><p>Últimas 30 ações registradas na base local (máximo guardado: 300).</p></div></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Quando</th><th>Usuário</th><th>Ação</th><th>Detalhe</th></tr></thead>
        <tbody>
          <tr v-if="!auditRows.length"><td colspan="4">Nenhum evento registrado.</td></tr>
          <tr v-for="event in auditRows" :key="event.id">
            <td>{{ event.stamp }}</td>
            <td>{{ event.userName }}</td>
            <td><code>{{ event.action }}</code></td>
            <td>{{ event.detail }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
