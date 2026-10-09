-- Vista cómoda para el administrador: todos los pedidos y pagos en una sola tabla.
-- Ejecutar UNA vez en Supabase → SQL Editor. Luego: Table Editor → Views → pedidos_admin.
create or replace view public.pedidos_admin as
select
  o.number                                   as pedido,
  o.created_at                               as fecha,
  o.order_status                             as estado_pedido,
  o.payment_status                           as estado_pago,
  o.payment_method                           as metodo,
  o.total,
  coalesce(nullif(trim(concat_ws(' ', o.shipping->>'first_name', o.shipping->>'last_name')), ''), o.shipping->>'recipient') as cliente,
  o.shipping->>'email'                       as correo,
  coalesce(o.shipping->>'phone', o.shipping->>'profile_phone') as telefono,
  concat_ws(', ', o.shipping->>'address', o.shipping->>'neighborhood', o.shipping->>'city', o.shipping->>'department') as direccion,
  o.shipping->>'reference'                   as referencia,
  o.shipping->>'carrier'                     as transportadora,
  (select string_agg(i.qty::text || ' x ' || i.name, ' | ') from public.order_items i where i.order_id = o.id) as productos,
  o.wompi_reference,
  o.wompi_transaction_id
from public.orders o
order by o.created_at desc;

-- Seguridad: la vista solo la puede leer usted desde el panel, nunca el público.
alter view public.pedidos_admin set (security_invoker = true);
revoke all on public.pedidos_admin from anon, authenticated;
