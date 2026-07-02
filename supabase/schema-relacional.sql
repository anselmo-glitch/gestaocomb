-- Gestão de Combustível — Modelo relacional nível produção (Supabase/Postgres)
-- Complementa o schema.sql (que mantém profiles/RLS/auditoria e o estado JSONB
-- usado pelo frontend na fase de validação). Este arquivo cria as tabelas
-- normalizadas para a fase de produção plena, conforme especificação:
-- filiais, tanques, combustiveis, fornecedores, compras_combustivel,
-- movimentacoes_estoque, abastecimentos, transferencias, inventarios,
-- veiculos, centros_custo, contratos, planejamento_mensal_contrato,
-- contrato_veiculo, desvios, planos_de_acao.
-- Pré-requisito: executar schema.sql antes (funções is_admin/can_write_state).

create extension if not exists pgcrypto;

-- ---------- Cadastros básicos ----------

create table if not exists public.filiais (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.combustiveis (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique, -- Diesel S10, S500, Gasolina, Arla 32...
  ativo boolean not null default true
);

create table if not exists public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  cnpj text,
  cidade text,
  ativo boolean not null default true
);

create table if not exists public.tanques (
  id uuid primary key default gen_random_uuid(),
  filial_id uuid not null references public.filiais(id),
  codigo text not null unique, -- Ex.: TQ-01
  combustivel_id uuid not null references public.combustiveis(id),
  capacidade_litros numeric(12,2) not null check (capacidade_litros > 0),
  estoque_minimo_litros numeric(12,2) not null default 0 check (estoque_minimo_litros >= 0),
  ultima_afericao date,
  responsavel text,
  ativo boolean not null default true
);

create table if not exists public.centros_custo (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  contrato_id uuid, -- FK adicionada após criação de contratos
  ativo boolean not null default true
);

create table if not exists public.motoristas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  filial_id uuid references public.filiais(id),
  ativo boolean not null default true
);

create table if not exists public.contratos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  cliente text,
  filial_id uuid not null references public.filiais(id),
  preco_diesel_previsto numeric(10,4) not null check (preco_diesel_previsto > 0),
  custo_fixo_mensal numeric(12,2) not null default 0,
  ativo boolean not null default true
);

alter table public.centros_custo
  drop constraint if exists centros_custo_contrato_fk;
alter table public.centros_custo
  add constraint centros_custo_contrato_fk foreign key (contrato_id) references public.contratos(id);

create table if not exists public.veiculos (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid references public.contratos(id),
  codigo text not null unique, -- prefixo do bem
  placa text,
  descricao text not null,
  categoria text,
  km_planejado numeric(12,2) not null default 0,
  media_km_l numeric(8,3) not null default 0,
  bomba_l_h numeric(8,2) not null default 0,
  bomba_horas numeric(8,2) not null default 0,
  cpk_pneu numeric(8,4) not null default 0,
  cpk_manutencao numeric(8,4) not null default 0,
  ativo boolean not null default true
);

-- Histórico de alocação de veículo em contrato.
create table if not exists public.contrato_veiculo (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos(id),
  veiculo_id uuid not null references public.veiculos(id),
  inicio date not null,
  fim date,
  check (fim is null or fim >= inicio)
);

-- ---------- Planejamento ----------

create table if not exists public.planejamento_mensal_contrato (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos(id),
  competencia char(7) not null, -- 'YYYY-MM'
  litros_previstos numeric(14,2) not null default 0,
  valor_previsto numeric(14,2) not null default 0,
  km_previsto numeric(14,2) not null default 0,
  fechado boolean not null default false, -- competência fechada pelo administrador
  aprovado_por uuid references auth.users(id),
  unique (contrato_id, competencia)
);

-- ---------- Operação ----------

create table if not exists public.compras_combustivel (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  fornecedor_id uuid not null references public.fornecedores(id),
  filial_id uuid not null references public.filiais(id),
  combustivel_id uuid not null references public.combustiveis(id),
  tanque_id uuid not null references public.tanques(id),
  quantidade_litros numeric(12,2) not null check (quantidade_litros > 0),
  valor_unitario numeric(10,4) not null check (valor_unitario > 0),
  valor_total numeric(14,2) not null,
  numero_nf text not null,
  transportadora text,
  observacao text,
  created_at timestamptz not null default now()
);

create table if not exists public.abastecimentos (
  id uuid primary key default gen_random_uuid(),
  data_hora timestamptz not null,
  filial_id uuid not null references public.filiais(id),
  tanque_id uuid not null references public.tanques(id),
  veiculo_id uuid not null references public.veiculos(id),
  motorista_id uuid references public.motoristas(id),
  litros numeric(10,2) not null check (litros > 0),
  hodometro numeric(12,1),
  horimetro numeric(12,1),
  centro_custo_id uuid references public.centros_custo(id),
  os_viagem text,
  observacao text,
  created_at timestamptz not null default now()
);

create table if not exists public.transferencias (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  tanque_origem_id uuid not null references public.tanques(id),
  tanque_destino_id uuid not null references public.tanques(id),
  litros numeric(12,2) not null check (litros > 0),
  perda_litros numeric(12,2) not null default 0 check (perda_litros >= 0 and perda_litros <= litros),
  transportador text,
  observacao text,
  check (tanque_origem_id <> tanque_destino_id)
);

create table if not exists public.inventarios (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  tanque_id uuid not null references public.tanques(id),
  estoque_sistema_litros numeric(12,2) not null,
  estoque_fisico_litros numeric(12,2) not null check (estoque_fisico_litros >= 0),
  motivo text,
  responsavel text not null,
  observacao text
);

-- Razão de movimentações (ledger). Preenchida por triggers a partir das
-- tabelas de origem — nunca gravada diretamente pela aplicação.
create table if not exists public.movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  tanque_id uuid not null references public.tanques(id),
  data timestamptz not null,
  tipo text not null check (tipo in ('compra', 'abastecimento', 'transferencia_saida', 'transferencia_entrada', 'ajuste_inventario')),
  litros numeric(12,2) not null, -- positivo entra, negativo sai
  origem_tabela text not null,
  origem_id uuid not null,
  unique (origem_tabela, origem_id, tipo)
);

create index if not exists idx_mov_tanque_data on public.movimentacoes_estoque (tanque_id, data);
create index if not exists idx_abast_data on public.abastecimentos (data_hora);
create index if not exists idx_compras_data on public.compras_combustivel (data);

-- ---------- Desvios e planos de ação ----------

create table if not exists public.desvios (
  id uuid primary key default gen_random_uuid(),
  competencia char(7) not null,
  escopo text not null check (escopo in ('contrato', 'veiculo', 'filial')),
  referencia_id uuid not null,
  indicador text not null,
  valor_previsto numeric(14,2) not null,
  valor_realizado numeric(14,2) not null,
  percentual numeric(8,2) not null,
  classificacao text not null check (classificacao in ('normal', 'atencao', 'critico'))
);

create table if not exists public.planos_de_acao (
  id uuid primary key default gen_random_uuid(),
  desvio_id uuid references public.desvios(id),
  competencia char(7) not null,
  titulo text not null,
  responsavel text not null,
  causa text not null,
  plano text not null,
  prazo date not null,
  status text not null default 'aberto' check (status in ('aberto', 'andamento', 'concluido')),
  created_at timestamptz not null default now()
);

-- ---------- Triggers do ledger de estoque ----------

create or replace function public.fn_mov_compra()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into movimentacoes_estoque (tanque_id, data, tipo, litros, origem_tabela, origem_id)
  values (new.tanque_id, new.data::timestamptz, 'compra', new.quantidade_litros, 'compras_combustivel', new.id);
  return new;
end; $$;

create or replace function public.fn_mov_abastecimento()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into movimentacoes_estoque (tanque_id, data, tipo, litros, origem_tabela, origem_id)
  values (new.tanque_id, new.data_hora, 'abastecimento', -new.litros, 'abastecimentos', new.id);
  return new;
end; $$;

create or replace function public.fn_mov_transferencia()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into movimentacoes_estoque (tanque_id, data, tipo, litros, origem_tabela, origem_id)
  values (new.tanque_origem_id, new.data::timestamptz, 'transferencia_saida', -new.litros, 'transferencias', new.id);
  insert into movimentacoes_estoque (tanque_id, data, tipo, litros, origem_tabela, origem_id)
  values (new.tanque_destino_id, new.data::timestamptz, 'transferencia_entrada', new.litros - new.perda_litros, 'transferencias', new.id);
  return new;
end; $$;

create or replace function public.fn_mov_inventario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into movimentacoes_estoque (tanque_id, data, tipo, litros, origem_tabela, origem_id)
  values (new.tanque_id, new.data::timestamptz, 'ajuste_inventario', new.estoque_fisico_litros - new.estoque_sistema_litros, 'inventarios', new.id);
  update tanques set ultima_afericao = new.data where id = new.tanque_id;
  return new;
end; $$;

drop trigger if exists trg_mov_compra on public.compras_combustivel;
create trigger trg_mov_compra after insert on public.compras_combustivel
  for each row execute procedure public.fn_mov_compra();

drop trigger if exists trg_mov_abastecimento on public.abastecimentos;
create trigger trg_mov_abastecimento after insert on public.abastecimentos
  for each row execute procedure public.fn_mov_abastecimento();

drop trigger if exists trg_mov_transferencia on public.transferencias;
create trigger trg_mov_transferencia after insert on public.transferencias
  for each row execute procedure public.fn_mov_transferencia();

drop trigger if exists trg_mov_inventario on public.inventarios;
create trigger trg_mov_inventario after insert on public.inventarios
  for each row execute procedure public.fn_mov_inventario();

-- ---------- Visões consolidadas ----------

-- Estoque atual por tanque = soma do ledger.
create or replace view public.v_estoque_tanques as
select
  t.id as tanque_id,
  t.codigo,
  t.filial_id,
  f.nome as filial,
  c.nome as combustivel,
  t.capacidade_litros,
  t.estoque_minimo_litros,
  coalesce(sum(m.litros), 0) as estoque_atual_litros,
  t.ultima_afericao,
  t.responsavel
from public.tanques t
join public.filiais f on f.id = t.filial_id
join public.combustiveis c on c.id = t.combustivel_id
left join public.movimentacoes_estoque m on m.tanque_id = t.id
group by t.id, f.nome, c.nome;

-- Consumo mensal consolidado por contrato/veículo.
create or replace view public.v_consumo_mensal as
select
  to_char(a.data_hora, 'YYYY-MM') as competencia,
  v.contrato_id,
  a.veiculo_id,
  a.filial_id,
  sum(a.litros) as litros,
  max(a.hodometro) - min(a.hodometro) as km_percorrido,
  max(a.horimetro) - min(a.horimetro) as horas_trabalhadas
from public.abastecimentos a
join public.veiculos v on v.id = a.veiculo_id
group by 1, 2, 3, 4;

-- ---------- RLS ----------

do $$
declare t text;
begin
  foreach t in array array[
    'filiais','combustiveis','fornecedores','tanques','centros_custo','motoristas',
    'contratos','veiculos','contrato_veiculo','planejamento_mensal_contrato',
    'compras_combustivel','abastecimentos','transferencias','inventarios',
    'movimentacoes_estoque','desvios','planos_de_acao'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s_read" on public.%I', t, t);
    execute format(
      'create policy "%s_read" on public.%I for select using (public.current_role() is not null)', t, t
    );
    execute format('drop policy if exists "%s_write" on public.%I', t, t);
    execute format(
      'create policy "%s_write" on public.%I for insert with check (public.can_write_state())', t, t
    );
    execute format('drop policy if exists "%s_update" on public.%I', t, t);
    execute format(
      'create policy "%s_update" on public.%I for update using (public.can_write_state()) with check (public.can_write_state())', t, t
    );
    execute format('drop policy if exists "%s_delete" on public.%I', t, t);
    execute format(
      'create policy "%s_delete" on public.%I for delete using (public.is_admin())', t, t
    );
  end loop;
end $$;

-- Planejamento fechado: apenas admin altera (metas aprovadas não mudam por gestor).
drop policy if exists "planejamento_mensal_contrato_update" on public.planejamento_mensal_contrato;
create policy "planejamento_mensal_contrato_update"
  on public.planejamento_mensal_contrato for update
  using (public.is_admin() or (public.can_write_state() and not fechado))
  with check (public.is_admin() or (public.can_write_state() and not fechado));
