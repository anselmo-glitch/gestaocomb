-- Frota RO v2 - Schema seguro para produção no Supabase
-- Objetivo: base corporativa única, autenticação pelo Supabase Auth e proteção real via RLS.
-- Não use login/cookie próprio para produção.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null unique,
  role text not null default 'visualizador' check (role in ('admin', 'gestor', 'operador', 'visualizador')),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_state (
  id text primary key default 'main' check (id = 'main'),
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  user_id uuid references auth.users(id),
  action text not null,
  detail text not null default ''
);

alter table public.profiles enable row level security;
alter table public.company_state enable row level security;
alter table public.audit_log enable row level security;

create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid() and active = true limit 1;
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active = true limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'admin', false);
$$;

create or replace function public.can_write_state()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('admin', 'gestor', 'operador'), false);
$$;

-- Perfis: usuário ativo pode ler o próprio perfil; admin pode ler todos.
create policy "profiles_read_self_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

-- Usuário pode atualizar somente nome próprio. Não pode ativar a própria conta nem mudar o próprio perfil.
-- A atualização de role/active deve ser feita apenas por admin via política abaixo ou função transacional.
create policy "profiles_update_own_name_only"
  on public.profiles for update
  using (id = auth.uid() and active = true)
  with check (
    id = auth.uid()
    and role = (select role from public.profiles p where p.id = auth.uid())
    and active = (select active from public.profiles p where p.id = auth.uid())
  );

create policy "profiles_admin_manage"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- Estado corporativo: todos os perfis ativos podem ler; visualizador não pode gravar.
create policy "company_state_read_active_users"
  on public.company_state for select
  using (public.current_role() is not null);

create policy "company_state_write_authorized"
  on public.company_state for insert
  with check (public.can_write_state());

create policy "company_state_update_authorized"
  on public.company_state for update
  using (public.can_write_state())
  with check (public.can_write_state());

-- Auditoria: perfis ativos podem inserir eventos próprios; admin pode ler tudo.
create policy "audit_insert_active_users"
  on public.audit_log for insert
  with check (public.current_role() is not null and user_id = auth.uid());

create policy "audit_read_admin"
  on public.audit_log for select
  using (public.is_admin());

-- Função segura para admin trocar perfil/ativação em uma transação.
create or replace function public.admin_update_profile(target_user uuid, new_role text, new_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administrador pode alterar perfis.';
  end if;

  if new_role not in ('admin', 'gestor', 'operador', 'visualizador') then
    raise exception 'Perfil inválido.';
  end if;

  update public.profiles
     set role = new_role,
         active = new_active,
         updated_at = now()
   where id = target_user;
end;
$$;

-- Trigger para criar perfil pendente quando o usuário se cadastrar.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role, active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.email, ''),
    'visualizador',
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.company_state (id, state)
values ('main', '{}'::jsonb)
on conflict (id) do nothing;
