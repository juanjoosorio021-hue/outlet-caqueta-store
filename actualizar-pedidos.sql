-- Ejecutar UNA vez en Supabase → SQL Editor (no borra nada)
alter table public.orders add column if not exists hidden_by_user boolean not null default false;

drop policy if exists "orders update own" on public.orders;
create policy "orders update own" on public.orders for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- El cliente solo puede: cancelar (Pendiente/Confirmado), marcar entregado, u ocultar el pedido. No puede cambiar el total.
create or replace function public.guard_order_update() returns trigger
language plpgsql as $$
begin
  if auth.role() = 'authenticated' then
    if new.total <> old.total or new.user_id <> old.user_id or new.number <> old.number then
      raise exception 'Cambio no permitido';
    end if;
    if new.status <> old.status and not (
      (new.status = 'Cancelado' and old.status in ('Pendiente','Confirmado')) or
      (new.status = 'Entregado' and old.status in ('Confirmado','En preparación','Enviado'))
    ) then
      raise exception 'Cambio de estado no permitido';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists orders_guard on public.orders;
create trigger orders_guard before update on public.orders for each row execute function public.guard_order_update();
