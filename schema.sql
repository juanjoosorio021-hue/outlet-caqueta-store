-- OUTLET CAQUETÁ STORE — esquema de cuentas de cliente (ejecutar en Supabase → SQL Editor)

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text, last_name text, phone text, email text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  recipient text, phone text, department text, city text, address text,
  neighborhood text, reference text, postal_code text,
  carrier text,  -- Inter Rapidísimo | Servientrega | Líneas Verdes (sin integración automática)
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  created_at timestamptz default now(),
  primary key (user_id, product_id)
);
create table if not exists public.carts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  updated_at timestamptz default now()
);
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.carts(user_id) on delete cascade,
  product_id text not null, name text not null, price numeric not null,
  qty int not null default 1 check (qty > 0)
);
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'Pendiente'
    check (status in ('Pendiente','Confirmado','En preparación','Enviado','Entregado','Cancelado')),
  total numeric not null default 0,
  created_at timestamptz default now()
);
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text, name text not null, price numeric not null, qty int not null default 1
);

-- Perfil automático al registrarse
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security: cada cliente solo ve y modifica lo suyo
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.favorites enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "profiles own" on public.profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "addresses own" on public.addresses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "favorites own" on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "carts own" on public.carts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cart_items own" on public.cart_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Pedidos: el cliente crea y consulta los suyos; el ESTADO solo lo cambia el administrador (panel de Supabase / service role)
create policy "orders select own" on public.orders for select to authenticated using (user_id = auth.uid());
create policy "orders insert own" on public.orders for insert to authenticated
  with check (user_id = auth.uid() and status = 'Pendiente');
create policy "order_items select own" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "order_items insert own" on public.order_items for insert to authenticated
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
