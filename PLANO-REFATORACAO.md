# Plano de Refatoração — Gestão de Combustível 2026

## Fase 3 — Módulo completo de gestão de combustível (01/07/2026)

Expansão para a estrutura completa especificada pelo gestor, com redesign dark data-dense
(design system gerado pela skill ui-ux-pro-max e persistido em `design-system/MASTER.md`):

1. **Cadastros básicos**: filiais, tanques, fornecedores, tipos de combustível, centros de custo, motoristas (tela única com sub-abas, CRUD completo com bloqueio de exclusão em uso).
2. **Compras**: NF, fornecedor, filial, combustível, tanque de recebimento — entrada automática de estoque.
3. **Estoque por filial/tanque**: `estoque atual = entradas − saídas ± ajustes` (motor em `src/core/stock.js`), extrato de movimentações, transferências entre filiais com controle de perdas (baixa na origem, entrada líquida no destino).
4. **Abastecimentos**: data/hora, tanque, veículo, motorista, hodômetro/horímetro, centro de custo, OS — gera saída de estoque e alimenta o realizado do veículo (prioridade: manual > abastecimentos > rateio).
5. **Inventário e perdas**: aferição física × sistema com ajuste automático e indicador de perdas.
6. **Dashboard**: KPIs (compra mensal, estoque atual, consumo mensal, perdas/desvios), alertas automáticos (estoque mínimo, capacidade, inventário, consumo anormal), painel **Previsto × Realizado** (empresa/filial/contrato/veículo) e evolução diária (litros/custo) em gráfico SVG próprio.
7. **Dashboard por contrato**: resumo previsto × realizado, economia/excesso, frota com km/L previsto × realizado e classificação, evolução mensal.
8. **Desvios e planos de ação**: regras parametrizáveis (verde ≤3%, amarelo ≤8%, vermelho >8% — configuráveis), detecção automática, planos com responsável/causa/prazo/status.
9. **Perfis**: operador não vê valores previstos (`canViewPlanned`); só admin altera regras de desvio (`canManagePlanning`).
10. **Banco de produção**: `supabase/schema-relacional.sql` com as tabelas normalizadas, triggers de ledger (`movimentacoes_estoque`) e RLS.

Suíte de testes: 53 casos (cálculos, estoque, planejamento, validadores, formato, CSV, storage).

---

# Histórico — Frota RO v2 (fases 1 e 2)

Data: 01/07/2026
Método: três frentes — planejamento, aprimoramento e checagem.

## Frente 1 — Planejamento (diagnóstico)

### Como o sistema está hoje

- SPA em JavaScript puro (ES Modules), sem build, servida como arquivos estáticos.
- Persistência em LocalStorage para validação; Supabase (schema.sql com RLS) previsto para produção.
- Núcleo de cálculo isolado em `src/core/calculations.js` (programado, previsto ajustado, realizado, rateio de diesel por filial e desvios separados).
- Toda a interface (8 abas) concentrada em um único arquivo `src/main.js` com 777 linhas.

### Problemas encontrados

| # | Gravidade | Problema |
|---|-----------|----------|
| 1 | **Crítica** | `toNumber()` em `format.js` remove todos os pontos antes de converter. Campos numéricos do navegador enviam decimais com ponto (`"5.29"`), então o valor salvo vira `529` — preços, CPKs, médias e litros decimais são multiplicados por 100. |
| 2 | Alta | Lógica de totais duplicada: `filteredMonthResult()` em `main.js` reimplementa (sem arredondamento) o cálculo de totais que já existe em `calculations.js`. Risco de divergência entre dashboard filtrado e relatório. |
| 3 | Alta | `main.js` monolítico (777 linhas, 8 abas) — difícil de manter; era objetivo declarado da v2 separar módulos. |
| 4 | Média | Validação não impede código de contrato nem código de veículo duplicados. |
| 5 | Média | Veículo não pode ser editado depois de criado; contrato só é editado via `prompt()` (frágil, edita só 2 campos). Não existe exclusão de nada, apesar da permissão `canDelete` existir. |
| 6 | Média | Botão "Criar linhas zeradas do mês" não valida permissão no handler (só o atributo `disabled` protege). |
| 7 | Média | Log de auditoria cresce sem limite no LocalStorage e não é exibido em lugar nenhum. |
| 8 | Baixa | CSV exporta números com ponto decimal — Excel pt-BR lê errado (separador do arquivo é `;`, decimal deveria ser vírgula). |
| 9 | Baixa | Código morto: `monthOptions()` e `currentPermissions()` nunca são usados. |
| 10 | Baixa | Lançamento mensal exibe `0` em campos vazios em vez de deixar em branco (confunde "não informado" com "zero"). |
| 11 | Baixa | Testes cobrem apenas um cenário de cálculo; não cobrem `toNumber`, CSV nem casos-limite do rateio. Sem Node.js instalado na máquina, não há como rodá-los. |

### Decisões de arquitetura

1. **Manter a stack** (JS puro, sem build, LocalStorage) — é adequada ao propósito de validação e a máquina não tem Node/npm para toolchain.
2. **Fatiar `main.js` por aba**: `src/views/*.js` (uma view por aba, com `render()` e `bind()`), estado da aplicação em `src/state/appState.js`, utilitários de UI em `src/ui/helpers.js`. `main.js` vira só o orquestrador (~60 linhas).
3. **Fonte única de totais**: extrair `summarizeContractRows()` para `calculations.js` e reutilizar no cálculo mensal e no filtro por filial.
4. **Testes executáveis sem Node**: runner de testes minimalista compartilhado (`tests/suite.js`) + página `tests/test-runner.html` que roda a mesma suíte no navegador. O comando `node tests/run-node.mjs` continua funcionando onde houver Node.

### Regras de negócio preservadas (sem mudança de comportamento)

- KM realizado por veículo usado diretamente, sem redistribuição.
- Rateio de diesel da filial apenas para veículos sem litros manuais, proporcional aos litros teóricos.
- Desvios separados: volume, operacional, total, preço e consumo.
- Veículo inativo continua no programado (orçamento original) e zerado no ajustado/realizado — o desvio de volume mostra o efeito da desativação, comportamento intencional.

## Frente 2 — Aprimoramento (o que foi feito)

1. Correção do `toNumber` (bug crítico #1) preservando aceitação de formato brasileiro (`1.234,56`) e formato de máquina (`1234.56`).
2. Modularização completa da UI (`src/views/`, `src/state/`, `src/ui/`).
3. `summarizeContractRows()` unificando totais (bug #2), com arredondamento consistente.
4. Unicidade de código de contrato e de veículo nos validadores.
5. Edição completa de contrato e de veículo pelo próprio formulário (modo edição com botão cancelar); exclusão com permissão `canDelete`, bloqueada quando há registros dependentes.
6. Guarda de permissão em todos os handlers de escrita.
7. Log de auditoria limitado a 300 entradas e exibido na aba Usuários.
8. CSV no padrão pt-BR (decimal com vírgula, separador `;`).
9. Remoção de código morto; campos do lançamento mensal ficam em branco quando não informados.

## Frente 3 — Checagem (como foi validado)

1. Suíte de testes ampliada de 1 arquivo/10 asserções para 4 arquivos/27 testes (cálculos originais preservados + `toNumber` + casos-limite do rateio + CSV + validadores).
2. Suíte executável em Node (`node tests/run-node.mjs`) e no navegador (`tests/test-runner.html`) — necessário porque a máquina de validação não tem Node instalado.
3. Validação funcional no navegador com servidor local (`serve.ps1`).

### Resultado (01/07/2026)

- **27/27 testes passaram** no navegador.
- As 8 abas renderizam sem erro de console.
- Cadastro de contrato com preço `5.29` grava `5.29` (antes da correção gravaria `529`); custo fixo `1234.56` grava corretamente.
- Código de contrato duplicado (mesmo com maiúsculas/minúsculas diferentes) é rejeitado.
- Edição pré-preenche o formulário e atualiza; exclusão pede confirmação e respeita vínculos; tudo registrado na auditoria.
- Perfil visualizador: formulários desabilitados e botões de exclusão ocultos.
- Lançamento mensal: campos não informados aparecem em branco, decimais salvam corretos, valores existentes não são perdidos ao salvar.
- Totais do dashboard com a base de exemplo: Programado R$ 71.527,80 · Ajustado R$ 72.599,96 · Realizado R$ 72.957,00 · Desvio operacional R$ 357,04 — consistentes com as regras documentadas.

### Backup

Cópia integral do projeto antes da refatoração ficou no diretório temporário da sessão e o arquivo `frota-ro-v2.zip` na Área de Trabalho também preserva a versão anterior.

---

## Fase 2 (01/07/2026) — Trilha fullstack: instalação de ferramentas e migração para Vue 3

Pedido do usuário: montar a trilha fullstack completa (backend, frontend, banco), instalar as ferramentas necessárias e comparar com as melhores opções de mercado. Decisões confirmadas pelo usuário antes de qualquer instalação: instalar tudo via winget, migrar o frontend para Vue 3, usar npm como gerenciador, e manter Supabase só em nuvem (sem Docker).

### Ferramentas instaladas na máquina

| Ferramenta | Versão | Via |
|---|---|---|
| Node.js LTS | 24.18.0 | `winget install OpenJS.NodeJS.LTS` |
| npm | 11.16.0 | incluso no Node |
| Supabase CLI | 2.109.0 | `npm install -g supabase` |

Git (2.55.0) e VS Code já estavam instalados. Python e Docker não foram instalados (Supabase cloud-only não precisa deles).

### Migração vanilla JS → Vue 3

- `src/main.js` (777 linhas originais) virou `src/main.js` (5 linhas, só bootstrap) + `App.vue` (shell).
- Estado global (`src/state/appState.js`) virou store Pinia (`src/stores/appStore.js`), com `reactive()` para o dado carregado do LocalStorage.
- As 8 views (antes template-strings HTML com `escapeHtml` manual em cada campo) viraram componentes `.vue` com `<script setup>` — o auto-escape do Vue elimina a necessidade de `escapeHtml` nos templates.
- Navegação por clique em botão virou rotas reais com Vue Router (hash mode, para não exigir configuração de rewrite no servidor estático).
- `src/core/*` (calculations, validators, format, permissions, csv, seed, constants) permaneceu **intocado** — é lógica de negócio pura, sem dependência de framework, exatamente por isso sobreviveu à migração sem alteração.
- Suíte de testes portada do runner caseiro (`tests/suite.js`) para Vitest (`describe`/`it`/`expect`), mesma cobertura.

### Bug encontrado durante a migração: `DataCloneError` ao excluir registros

**Sintoma**: excluir um contrato/veículo/compra de diesel removia o item da tela, mas o LocalStorage continuava com o item antigo — ou seja, a exclusão "voltava" ao recarregar a página.

**Causa raiz**: `saveState()` usava `structuredClone(state)`. Quando uma view fazia `store.state.contracts = store.state.contracts.filter(...)`, o array resultante do `.filter()` continha objetos ainda envolvidos em Proxy reativo do Vue (o `.filter()` lê cada elemento através do array reativo, que devolve uma versão "proxied" de cada item). `structuredClone` não sabe clonar esses objetos-Proxy e lança `DataCloneError`, silenciosamente capturado pelo tratamento de erros do Vue — a UI parecia funcionar, mas o `localStorage.setItem` dentro de `saveState` nunca era alcançado.

**Correção**: trocar `structuredClone(state)` por `JSON.parse(JSON.stringify(state))` em `src/services/localStore.js`. `JSON.stringify` atravessa Proxies normalmente (o dado da aplicação é sempre serializável, sem `Date`/`Map`/funções). Adicionado teste de regressão em `tests/localStore.spec.js` que reproduz um Proxy vazio e confirma que `saveState` sobrevive.

**Como foi encontrado**: validação funcional no navegador (clicar em excluir, checar LocalStorage) mostrou a divergência; isolado importando a store diretamente via `import()` no console do navegador e chamando `persist()` fora do clique, capturando a exceção real (`DataCloneError: ... #<Object> could not be cloned`, com stack apontando para `saveState`).

### Resultado da validação (Fase 2)

- `npm test` (Vitest): **29/29 testes passando** (27 anteriores + 2 novos de `localStore.spec.js`).
- `npm run dev` (Vite): as 8 rotas renderizam sem erro de console.
- Reproduzido no navegador, pós-correção: criação com decimal (`5.29` → `5.29`, não `529`), rejeição de código duplicado, edição, **exclusão persistindo corretamente no LocalStorage**, bloqueio de formulário e ocultação de botões de exclusão para o perfil visualizador, lançamento mensal com campos em branco e decimais corretos.
- Totais do dashboard permanecem idênticos aos da Fase 1: Programado R$ 71.527,80 · Ajustado R$ 72.599,96 · Realizado R$ 72.957,00 · Desvio operacional R$ 357,04.

### O que ainda falta para produção (não feito nesta sessão — depende de ação do usuário)

1. **Criar o projeto no Supabase Cloud** (exige login do usuário — e-mail/senha ou GitHub) e aplicar `supabase/schema.sql` pelo SQL Editor.
2. **Trocar `localStore.js` por `supabaseStore.js`** de fato (hoje é só um stub) e ligar o login ao Supabase Auth, removendo a troca de perfil "Usar como" que hoje só existe para validação.
3. **Inicializar repositório Git** e configurar CI (GitHub Actions) rodando `npm test` a cada push — não foi feito porque exige decidir hospedagem do repositório (GitHub/GitLab) e não havia repositório Git iniciado no projeto.
4. Escolher hospedagem do frontend (Cloudflare Pages recomendado no benchmark do README) e configurar variáveis de ambiente de produção a partir de `.env.example`.
