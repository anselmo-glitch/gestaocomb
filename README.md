# Frota RO v2

Sistema para controlar contratos, veículos, diesel e custo programado x previsto ajustado x realizado por filial.

Stack: **Vue 3 + Vite + Pinia + Vue Router**, testado com **Vitest**, com **Supabase** (Postgres + Auth + RLS) como backend de produção.

## Por que essa stack (benchmark rápido)

| Camada | Escolha | Alternativas descartadas | Motivo |
|---|---|---|---|
| Backend/Banco | Supabase (Postgres + RLS) | Firebase, PocketBase, Express+Postgres manual | Dado é relacional (contratos↔veículos↔filiais); RLS do Postgres já estava modelado em `supabase/schema.sql` |
| Build/dev server | Vite | Webpack, Parcel | HMR quase instantâneo, zero-config para Vue |
| Framework de UI | Vue 3 (Composition API) | React, Svelte, manter vanilla JS | Curva de aprendizado suave, sintaxe de template próxima do que já existia |
| Estado global | Pinia | Vuex, estado manual | Padrão oficial do Vue 3, DevTools integrado, ~1 KB |
| Roteamento | Vue Router (hash mode) | trocar aba manualmente | URL navegável, botão voltar funciona; hash mode evita configurar rewrite no servidor estático |
| Testes | Vitest | Jest | Mesmo motor do Vite, muito mais rápido, API compatível |
| Gerenciador de pacotes | npm | pnpm, yarn | Já vem com o Node, zero fricção para projeto único |

## Regras de negócio (não mudaram na migração para Vue)

1. O KM realizado informado por veículo é usado diretamente no cálculo.
2. O sistema não redistribui KM por peso de KM planejado.
3. O diesel pode ser informado por veículo ou rateado pela compra consolidada da filial.
4. Pneu e manutenção entram pelo KM realizado mesmo quando o diesel ainda não foi informado.
5. Os desvios foram separados:
   - Desvio de volume: previsto ajustado - programado.
   - Desvio operacional: realizado - previsto ajustado.
   - Desvio total: realizado - programado.
   - Desvio de preço: litros reais x diferença entre preço real e preço previsto.
   - Desvio de consumo: diferença de litros x preço previsto.
6. O SQL do Supabase inclui RLS para impedir que visualizador grave dados e para impedir que usuário ative a própria conta.
7. O projeto não usa login caseiro, cookie simples nem senha armazenada manualmente.

## Como rodar

Pré-requisitos: Node.js LTS (instalado via `winget install OpenJS.NodeJS.LTS`).

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`. O app usa LocalStorage para validação, então não precisa de banco para testar.

Outros comandos:

```bash
npm run build     # gera build de produção em dist/
npm run preview   # serve o build de produção localmente
npm test          # roda a suíte Vitest
```

Resultado esperado de `npm test`: todos os arquivos de teste passando (cálculos, formatação, CSV, validadores e persistência).

> `serve.ps1` (servidor estático em PowerShell puro) fica como alternativa legada apenas se por algum motivo o Node não puder ser usado — o fluxo normal de desenvolvimento agora é `npm run dev`.

## Estrutura do projeto

```text
frota-ro-v2/
  index.html
  vite.config.js
  serve.ps1                 # servidor estático legado (fallback sem Node)
  src/
    main.js                 # cria a app Vue, instala Pinia e o router
    App.vue                 # shell: sidebar + topbar + <router-view>
    styles.css
    core/                   # regras de negócio puras (sem Vue, sem DOM)
      calculations.js
      constants.js
      csv.js
      format.js
      permissions.js
      seed.js
      validators.js
    stores/
      appStore.js            # store Pinia: estado, auditoria, persistência
    composables/
      useToast.js
      useFilteredMonth.js
    components/
      MonthBranchFilter.vue  # filtro de mês/filial reutilizado em 3 telas
    router/
      index.js               # uma rota por aba
    views/                    # um componente .vue por aba
      DashboardView.vue
      ContractsView.vue
      VehiclesView.vue
      MonthlyView.vue
      BranchFuelView.vue
      ReportsView.vue
      UsersView.vue
      RulesView.vue
    services/
      localStore.js
      supabaseStore.js
  supabase/
    schema.sql
  tests/
    format.spec.js
    calculations.spec.js
    csv.spec.js
    validators.spec.js
    localStore.spec.js
  PLANO-REFATORACAO.md      # diagnóstico e decisões da refatoração
  README.md
  package.json
  .env.example
```

## Regras de cálculo

### Programado

```text
KM = KM planejado
Litros = KM planejado / média prevista + litros de bomba
Diesel = litros x preço previsto
Pneu = KM planejado x CPK pneu
Manutenção = KM planejado x CPK manutenção
Total = diesel + pneu + manutenção + fixos
```

### Previsto ajustado

```text
KM = KM realizado por veículo
Litros = KM realizado / média prevista + litros de bomba
Diesel = litros x preço previsto
Pneu = KM realizado x CPK pneu
Manutenção = KM realizado x CPK manutenção
Total = diesel + pneu + manutenção + fixos
```

### Realizado

```text
KM = KM realizado por veículo
Litros = litros reais informados ou litros rateados pela filial
Preço diesel = preço real informado ou preço médio da filial
Diesel = litros x preço real
Pneu = KM realizado x CPK pneu
Manutenção = KM realizado x CPK manutenção
Total = diesel + pneu + manutenção + fixos
```

## Rateio de diesel por filial

O rateio só acontece para veículos sem litros reais informados.

1. O sistema soma a compra de diesel da filial no mês.
2. Abate os litros já informados manualmente por veículo.
3. Calcula os litros teóricos dos veículos restantes.
4. Rateia o saldo proporcionalmente aos litros teóricos.

Isso evita misturar entrada manual com rateio automático.

## Perfis

- Administrador: altera tudo e gerencia usuários.
- Gestor: altera dados operacionais, não gerencia usuários.
- Operador: lança dados, não importa base nem gerencia usuários.
- Visualizador: apenas consulta.

No modo local, o bloqueio é visual. Em produção, aplique o arquivo `supabase/schema.sql` para o bloqueio real no banco.

## Produção com Supabase

1. Crie um projeto Supabase.
2. Execute o arquivo `supabase/schema.sql` no SQL Editor.
3. Use Supabase Auth para login.
4. Configure as variáveis do `.env.example` no ambiente de hospedagem.
5. Não coloque `.env` real no repositório.
6. Não use `SUPABASE_SERVICE_ROLE_KEY` no frontend.

## Observação importante

Esta entrega foi montada para validação rápida do fluxo e da regra de negócio. Para colocar em produção, o próximo passo é ligar o frontend ao Supabase Auth e trocar o repositório local por persistência real com RLS ativo.
