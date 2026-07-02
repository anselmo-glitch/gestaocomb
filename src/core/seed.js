import { APP_VERSION, DEFAULT_DEVIATION_SETTINGS, ROLES } from "./constants.js";

// Base de validação. O mês de referência dos exemplos é 2026-06.
export function createSeedState() {
  return {
    meta: {
      schemaVersion: 3,
      appVersion: APP_VERSION,
      updatedAt: new Date().toISOString(),
      companyWide: true
    },
    currentUserId: "user_admin",
    users: [
      { id: "user_admin", name: "Administrador BENEL", email: "admin@benel.local", role: ROLES.ADMIN, active: true },
      { id: "user_gestor", name: "Gestor Frota", email: "gestor@benel.local", role: ROLES.GESTOR, active: true },
      { id: "user_operador", name: "Operador Pátio", email: "operador@benel.local", role: ROLES.OPERADOR, active: true },
      { id: "user_viewer", name: "Visualizador", email: "viewer@benel.local", role: ROLES.VISUALIZADOR, active: true }
    ],
    branches: [
      { id: "branch_pojuca", name: "Pojuca/BA" },
      { id: "branch_mossoro", name: "Mossoró/RN" },
      { id: "branch_sao_mateus", name: "São Mateus/ES" },
      { id: "branch_carmopolis", name: "Carmópolis/SE" }
    ],
    fuelTypes: [
      { id: "fuel_s10", name: "Diesel S10", active: true },
      { id: "fuel_s500", name: "Diesel S500", active: true },
      { id: "fuel_gasolina", name: "Gasolina comum", active: true },
      { id: "fuel_arla", name: "Arla 32", active: true }
    ],
    suppliers: [
      { id: "sup_ipiranga", name: "Ipiranga Distribuidora", document: "33.337.122/0001-27", city: "Salvador/BA", active: true },
      { id: "sup_vibra", name: "Vibra Energia", document: "34.274.233/0001-02", city: "Vitória/ES", active: true },
      { id: "sup_regional", name: "TRR Regional Nordeste", document: "12.345.678/0001-90", city: "Mossoró/RN", active: true }
    ],
    tanks: [
      {
        id: "tank_sm_01",
        branchId: "branch_sao_mateus",
        code: "TQ-SM-01",
        fuelTypeId: "fuel_s10",
        capacityLiters: 30000,
        minLiters: 6000,
        lastAuditDate: "2026-06-28",
        responsible: "Carlos Andrade",
        active: true
      },
      {
        id: "tank_pj_01",
        branchId: "branch_pojuca",
        code: "TQ-PJ-01",
        fuelTypeId: "fuel_s10",
        capacityLiters: 20000,
        minLiters: 4000,
        lastAuditDate: "2026-06-30",
        responsible: "Marta Lima",
        active: true
      },
      {
        id: "tank_pj_02",
        branchId: "branch_pojuca",
        code: "TQ-PJ-02",
        fuelTypeId: "fuel_arla",
        capacityLiters: 5000,
        minLiters: 800,
        lastAuditDate: "2026-06-15",
        responsible: "Marta Lima",
        active: true
      },
      {
        id: "tank_ms_01",
        branchId: "branch_mossoro",
        code: "TQ-MS-01",
        fuelTypeId: "fuel_s10",
        capacityLiters: 15000,
        minLiters: 3000,
        lastAuditDate: "2026-06-20",
        responsible: "João Nogueira",
        active: true
      }
    ],
    costCenters: [
      { id: "cc_seacrest", name: "Contrato Seacrest", contractId: "contract_seacrest_es", active: true },
      { id: "cc_prba", name: "Contrato PetroReconcavo", contractId: "contract_pr_ba", active: true },
      { id: "cc_interno", name: "Frota interna / apoio", contractId: "", active: true }
    ],
    drivers: [
      { id: "drv_joao", name: "João Pereira", branchId: "branch_sao_mateus", active: true },
      { id: "drv_marcos", name: "Marcos Souza", branchId: "branch_sao_mateus", active: true },
      { id: "drv_ana", name: "Ana Ribeiro", branchId: "branch_pojuca", active: true },
      { id: "drv_pedro", name: "Pedro Costa", branchId: "branch_mossoro", active: true }
    ],
    contracts: [
      {
        id: "contract_seacrest_es",
        code: "SEACREST-ES",
        name: "Seacrest - Transporte de óleo",
        client: "Seacrest",
        branchId: "branch_sao_mateus",
        plannedDieselPrice: 5.54,
        fixedCostMonthly: 12000,
        active: true
      },
      {
        id: "contract_pr_ba",
        code: "PR-BA",
        name: "PetroReconcavo - Operação BA",
        client: "PetroReconcavo",
        branchId: "branch_pojuca",
        plannedDieselPrice: 5.29,
        fixedCostMonthly: 9000,
        active: true
      }
    ],
    vehicles: [
      {
        id: "veh_001",
        contractId: "contract_seacrest_es",
        code: "15007",
        plate: "ROD0A00",
        plateHistory: [],
        description: "Cavalo mecânico 6x4",
        category: "Cavalo mecânico",
        plannedKm: 8000,
        avgKmL: 2.4,
        pumpLitersHour: 0,
        pumpHours: 0,
        tireCpk: 0.45,
        maintenanceCpk: 0.72,
        active: true
      },
      {
        id: "veh_002",
        contractId: "contract_seacrest_es",
        code: "25011",
        plate: "ROD0B00",
        plateHistory: [],
        description: "Semirreboque tanque",
        category: "Implemento",
        plannedKm: 8000,
        avgKmL: 999,
        pumpLitersHour: 0,
        pumpHours: 0,
        tireCpk: 0.18,
        maintenanceCpk: 0.22,
        active: true
      },
      {
        id: "veh_003",
        contractId: "contract_pr_ba",
        code: "32015",
        plate: "ROD0C00",
        plateHistory: [],
        description: "Caminhão tanque com bomba",
        category: "Tanque",
        plannedKm: 6200,
        avgKmL: 2.8,
        pumpLitersHour: 8,
        pumpHours: 35,
        tireCpk: 0.36,
        maintenanceCpk: 0.65,
        active: true
      }
    ],
    monthlyEntries: [
      {
        id: "entry_001",
        month: "2026-06",
        vehicleId: "veh_001",
        active: true,
        actualKm: 8500,
        actualDieselLiters: 0,
        actualDieselPrice: 0,
        notes: "Litros integrados dos abastecimentos"
      },
      {
        id: "entry_002",
        month: "2026-06",
        vehicleId: "veh_002",
        active: true,
        actualKm: 8500,
        actualDieselLiters: 0,
        actualDieselPrice: 0,
        notes: "Implemento acompanha operação"
      },
      {
        id: "entry_003",
        month: "2026-06",
        vehicleId: "veh_003",
        active: true,
        actualKm: 5900,
        actualDieselLiters: 2300,
        actualDieselPrice: 5.31,
        notes: "Diesel informado por veículo"
      }
    ],
    // Legado (mantido por compatibilidade). Novas compras entram em `purchases`.
    branchFuelPurchases: [],
    purchases: [
      {
        id: "pur_001",
        date: "2026-06-03",
        supplierId: "sup_vibra",
        branchId: "branch_sao_mateus",
        fuelTypeId: "fuel_s10",
        tankId: "tank_sm_01",
        liters: 15000,
        unitPrice: 5.6,
        totalCost: 84000,
        invoiceNumber: "45871",
        carrier: "Transporte Vibra",
        notes: "Compra consolidada da filial"
      },
      {
        id: "pur_002",
        date: "2026-06-05",
        supplierId: "sup_ipiranga",
        branchId: "branch_pojuca",
        fuelTypeId: "fuel_s10",
        tankId: "tank_pj_01",
        liters: 13250,
        unitPrice: 5.3,
        totalCost: 70225,
        invoiceNumber: "78123",
        carrier: "TRR Bahia",
        notes: ""
      },
      {
        id: "pur_003",
        date: "2026-06-18",
        supplierId: "sup_regional",
        branchId: "branch_mossoro",
        fuelTypeId: "fuel_s10",
        tankId: "tank_ms_01",
        liters: 8000,
        unitPrice: 5.45,
        totalCost: 43600,
        invoiceNumber: "90455",
        carrier: "TRR Regional",
        notes: ""
      }
    ],
    fuelings: [
      {
        id: "fue_001",
        date: "2026-06-04T07:40",
        branchId: "branch_sao_mateus",
        tankId: "tank_sm_01",
        vehicleId: "veh_001",
        driverId: "drv_joao",
        liters: 1180,
        odometer: 251400,
        hourmeter: 0,
        costCenterId: "cc_seacrest",
        osNumber: "OS-4501",
        notes: ""
      },
      {
        id: "fue_002",
        date: "2026-06-12T13:10",
        branchId: "branch_sao_mateus",
        tankId: "tank_sm_01",
        vehicleId: "veh_001",
        driverId: "drv_marcos",
        liters: 1210,
        odometer: 254600,
        hourmeter: 0,
        costCenterId: "cc_seacrest",
        osNumber: "OS-4522",
        notes: ""
      },
      {
        id: "fue_003",
        date: "2026-06-21T08:05",
        branchId: "branch_sao_mateus",
        tankId: "tank_sm_01",
        vehicleId: "veh_001",
        driverId: "drv_joao",
        liters: 1195,
        odometer: 257850,
        hourmeter: 0,
        costCenterId: "cc_seacrest",
        osNumber: "OS-4540",
        notes: ""
      },
      {
        id: "fue_004",
        date: "2026-06-27T16:30",
        branchId: "branch_sao_mateus",
        tankId: "tank_sm_01",
        vehicleId: "veh_002",
        driverId: "drv_marcos",
        liters: 60,
        odometer: 0,
        hourmeter: 0,
        costCenterId: "cc_seacrest",
        osNumber: "OS-4551",
        notes: "Bomba do implemento"
      }
    ],
    transfers: [
      {
        id: "tra_001",
        date: "2026-06-15",
        fromTankId: "tank_pj_01",
        toTankId: "tank_ms_01",
        liters: 3000,
        lossLiters: 18,
        carrier: "Caminhão tanque 32015",
        notes: "Reforço para parada de manutenção"
      }
    ],
    inventories: [
      {
        id: "inv_001",
        date: "2026-06-28",
        tankId: "tank_sm_01",
        systemLiters: 12455,
        physicalLiters: 12180,
        reason: "Evaporação/erro de medição",
        responsible: "Carlos Andrade",
        notes: "Régua conferida em 28/06"
      }
    ],
    deviationSettings: { ...DEFAULT_DEVIATION_SETTINGS },
    actionPlans: [
      {
        id: "plan_001",
        month: "2026-06",
        scope: "vehicle",
        refId: "veh_003",
        name: "32015 — Caminhão tanque com bomba",
        responsible: "Gestor Frota",
        cause: "Operação de bomba acima do previsto na parada da PetroReconcavo",
        plan: "Revisar horas de bomba planejadas do contrato e aferir bico injetor",
        deadline: "2026-07-15",
        status: "andamento",
        createdAt: "2026-06-25T10:00:00.000Z"
      }
    ],
    auditLog: [
      {
        id: "audit_seed",
        at: new Date().toISOString(),
        userId: "user_admin",
        action: "seed_created",
        detail: "Base inicial criada para validação."
      }
    ]
  };
}

// Coleções garantidas em qualquer estado carregado (migração de versões antigas).
export const STATE_COLLECTIONS = [
  "users",
  "branches",
  "fuelTypes",
  "suppliers",
  "tanks",
  "costCenters",
  "drivers",
  "contracts",
  "vehicles",
  "monthlyEntries",
  "branchFuelPurchases",
  "purchases",
  "fuelings",
  "transfers",
  "inventories",
  "actionPlans",
  "auditLog"
];

export function ensureStateShape(state) {
  for (const collection of STATE_COLLECTIONS) {
    if (!Array.isArray(state[collection])) state[collection] = [];
  }
  // Prefixo/placa: garante o histórico de placas em estados salvos por versões antigas.
  for (const vehicle of state.vehicles) {
    if (!Array.isArray(vehicle.plateHistory)) vehicle.plateHistory = [];
  }
  state.deviationSettings = { ...DEFAULT_DEVIATION_SETTINGS, ...(state.deviationSettings || {}) };
  state.meta = { ...(state.meta || {}), schemaVersion: 3 };
  return state;
}
