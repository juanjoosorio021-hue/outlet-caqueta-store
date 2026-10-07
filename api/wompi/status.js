// Consulta a Wompi el estado de una transacción. Solo informativo para la página de retorno.
export default async function handler(req, res) {
  const id = String(req.query?.id || '').replace(/[^\w-]/g, '');
  if (!id) return res.status(400).json({ error: 'Falta id' });
  const sandbox = (process.env.WOMPI_ENV || 'production').toLowerCase() === 'sandbox';
  try {
    const r = await fetch(`https://${sandbox ? 'sandbox' : 'production'}.wompi.co/v1/transactions/${id}`);
    const j = await r.json();
    return res.status(200).json({ status: j?.data?.status || 'UNKNOWN' });
  } catch { return res.status(200).json({ status: 'UNKNOWN' }); }
}
