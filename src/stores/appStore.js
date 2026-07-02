import { computed, reactive, ref, toRaw } from "vue";
import { defineStore } from "pinia";
import { currentMonth, uid } from "../core/format.js";
import { can } from "../core/permissions.js";
import { importState, loadState, resetState, saveState } from "../services/localStore.js";

const MAX_AUDIT_ENTRIES = 300;

export const useAppStore = defineStore("app", () => {
  const state = reactive(loadState());
  const selectedMonth = ref(state.monthlyEntries[0]?.month || currentMonth());
  const selectedBranch = ref("all");

  const currentUser = computed(() => state.users.find((user) => user.id === state.currentUserId) || state.users[0]);

  function userCan(action) {
    return can(currentUser.value?.role, action);
  }

  // Importante: persist/saveOnly NÃO substituem as coleções do estado —
  // substituí-las por clones (Object.assign(state, saveState(...))) órfã
  // referências capturadas pelas views antes do persist e silenciosamente
  // descarta mutações feitas depois. Só o meta (updatedAt) é atualizado.
  function persist(action, detail) {
    const user = currentUser.value;
    state.auditLog = (state.auditLog || []).slice(0, MAX_AUDIT_ENTRIES - 1);
    state.auditLog.unshift({ id: uid("audit"), at: new Date().toISOString(), userId: user?.id, action, detail });
    state.meta = saveState(toRaw(state)).meta;
  }

  function saveOnly() {
    state.meta = saveState(toRaw(state)).meta;
  }

  function resetAll() {
    Object.assign(state, resetState());
    selectedMonth.value = state.monthlyEntries[0]?.month || currentMonth();
    selectedBranch.value = "all";
  }

  function importFromJson(text) {
    Object.assign(state, importState(text));
    selectedMonth.value = state.monthlyEntries[0]?.month || currentMonth();
    selectedBranch.value = "all";
  }

  function byId(collection, id) {
    return (state[collection] || []).find((item) => item.id === id);
  }

  function getBranch(id) {
    return byId("branches", id);
  }

  function getContract(id) {
    return byId("contracts", id);
  }

  function getVehicle(id) {
    return byId("vehicles", id);
  }

  function getTank(id) {
    return byId("tanks", id);
  }

  function getSupplier(id) {
    return byId("suppliers", id);
  }

  function getFuelType(id) {
    return byId("fuelTypes", id);
  }

  function getCostCenter(id) {
    return byId("costCenters", id);
  }

  function getDriver(id) {
    return byId("drivers", id);
  }

  return {
    state,
    selectedMonth,
    selectedBranch,
    currentUser,
    userCan,
    persist,
    saveOnly,
    resetAll,
    importFromJson,
    byId,
    getBranch,
    getContract,
    getVehicle,
    getTank,
    getSupplier,
    getFuelType,
    getCostCenter,
    getDriver
  };
});
