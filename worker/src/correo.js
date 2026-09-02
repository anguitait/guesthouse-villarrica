import { EmailMessage } from 'cloudflare:email';

/**
 * Codifica en base64 respetando UTF-8. btoa() por sí solo se cae con las
 * tildes y la ñ, que en un correo en español aparecen siempre.
 */
function base64Utf8(texto) {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario);
}

function asuntoCodificado(asunto) {
  return `=?utf-8?B?${base64Utf8(asunto)}?=`;
}

function cuerpoDeLaSolicitud(solicitud) {
  return [
    'Nueva solicitud de reserva desde el sitio web.',
    '',
    `Habitación: ${solicitud.nombreHabitacion}`,
    `Llegada:    ${solicitud.llegada}`,
    `Salida:     ${solicitud.salida}`,
    `Huéspedes:  ${solicitud.huespedes || '(no indicado)'}`,
    '',
    `Nombre:   ${solicitud.nombre}`,
    `Email:    ${solicitud.email}`,
    `Teléfono: ${solicitud.telefono || '(no indicado)'}`,
    '',
    'Comentarios:',
    solicitud.comentarios || '(sin comentarios)',
    '',
    '---',
    'La solicitud quedó registrada en Airtable con estado "Solicitud".',
    'Confirmar o rechazar cambiando ese campo.'
  ].join('\r\n');
}

export async function enviarSolicitud(env, solicitud) {
  const mensaje = [
    `From: Reservas Flor del Bosque <${env.REMITENTE}>`,
    `To: ${env.DESTINATARIO}`,
    `Subject: ${asuntoCodificado(`Solicitud de reserva — ${solicitud.nombre} — ${solicitud.llegada}`)}`,
    `Message-ID: <${crypto.randomUUID()}@flordelbosque.cl>`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Utf8(cuerpoDeLaSolicitud(solicitud))
  ].join('\r\n');

  await env.CORREO.send(new EmailMessage(env.REMITENTE, env.DESTINATARIO, mensaje));
}
