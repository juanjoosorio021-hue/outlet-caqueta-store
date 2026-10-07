-- OUTLET CAQUETÁ STORE — migración de pagos con Wompi (ejecutar UNA vez en Supabase → SQL Editor).
-- Reemplaza a "actualizar-pedidos.sql". No borra pedidos existentes.

-- 1) Catálogo para validar precios/tallas en el servidor (solo accesible con la llave secreta del servidor)
create table if not exists public.catalog_items (
  id text primary key, name text not null, gender text, category text,
  price numeric not null check (price >= 0), sizes jsonb not null default '[]', stock jsonb not null default '{}',
  updated_at timestamptz default now()
);
alter table public.catalog_items enable row level security;

-- 2) Estado del PEDIDO separado del estado del PAGO
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='status') then
    alter table public.orders rename column status to order_status;
  end if;
end $$;
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders drop constraint if exists orders_order_status_check;
update public.orders set order_status = 'Recibido' where order_status in ('Pendiente','Confirmado');
alter table public.orders alter column order_status set default 'Recibido';
alter table public.orders add constraint orders_order_status_check check (order_status in ('Recibido','En preparación','Enviado','Entregado','Cancelado'));

alter table public.orders add column if not exists payment_status text not null default 'Pendiente';
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check check (payment_status in ('Pendiente','Aprobado','Rechazado'));
alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists wompi_reference text;
alter table public.orders add column if not exists wompi_transaction_id text;
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists shipping jsonb;
alter table public.orders add column if not exists hidden_by_user boolean not null default false;
create unique index if not exists orders_wompi_reference_key on public.orders (wompi_reference) where wompi_reference is not null;

alter table public.order_items add column if not exists lot_id text;
alter table public.order_items add column if not exists size text;

-- 3) Reglas de seguridad del cliente
drop policy if exists "orders insert own" on public.orders;
create policy "orders insert own" on public.orders for insert to authenticated
  with check (user_id = auth.uid() and order_status = 'Recibido' and payment_status = 'Pendiente');
drop policy if exists "orders update own" on public.orders;
create policy "orders update own" on public.orders for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- El cliente NO puede tocar el pago ni el total; solo cancelar (si no está pagado), marcar entregado u ocultar.
create or replace function public.guard_order_update() returns trigger
language plpgsql as $$
begin
  if auth.role() = 'authenticated' then
    if new.total <> old.total or new.user_id <> old.user_id or new.number <> old.number
       or new.payment_status <> old.payment_status or new.wompi_reference is distinct from old.wompi_reference
       or new.wompi_transaction_id is distinct from old.wompi_transaction_id or new.payment_method is distinct from old.payment_method
       or new.shipping is distinct from old.shipping or new.paid_at is distinct from old.paid_at then
      raise exception 'Cambio no permitido';
    end if;
    if new.order_status <> old.order_status and not (
      (new.order_status = 'Cancelado' and old.order_status = 'Recibido' and old.payment_status <> 'Aprobado') or
      (new.order_status = 'Entregado' and old.order_status in ('En preparación','Enviado'))
    ) then
      raise exception 'Cambio de estado no permitido';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists orders_guard on public.orders;
create trigger orders_guard before update on public.orders for each row execute function public.guard_order_update();
