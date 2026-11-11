export async function notifyBarber({ barber, booking, service }) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_GRAPH_VERSION || 'v23.0';
  if (!token || !phoneNumberId || !barber?.phone) {
    return { sent: false, skipped: true, reason: 'WhatsApp no configurado' };
  }

  const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
  const text = `🔔 Nuevo turno en Black Barberia\n\nCliente: ${booking.customer_name}\nTeléfono: ${booking.customer_phone}\nServicio: ${service.name}\nFecha: ${booking.date}\nHora: ${booking.time}\n${booking.notes ? `Notas: ${booking.notes}\n` : ''}\nPor favor revisá tu panel para ver el turno.`;

  const template = process.env.WHATSAPP_TEMPLATE_NAME;
  const language = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es_AR';
  const payload = template
    ? { messaging_product: 'whatsapp', to: barber.phone, type: 'template', template: { name: template, language: { code: language }, components: [{ type: 'body', parameters: [
      { type: 'text', text: booking.customer_name }, { type: 'text', text: service.name }, { type: 'text', text: booking.date }, { type: 'text', text: booking.time }
    ] }] } }
    : { messaging_product: 'whatsapp', to: barber.phone, type: 'text', text: { body: text } };

  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || 'WhatsApp rechazó el mensaje');
  return { sent: true, data };
}
