/**
 * Cliente mínimo de la API de Airtable. Sólo lo que el Worker necesita.
 */

const BASE_URL = 'https://api.airtable.com/v0';

async function pedir(env, ruta, opciones = {}) {
  const respuesta = await fetch(`${BASE_URL}/${env.AIRTABLE_BASE_ID}/${ruta}`, {
    ...opciones,
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json',
      ...(opciones.headers || {})
    }
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    throw new Error(`Airtable ${respuesta.status}: ${detalle}`);
  }
  return respuesta.json();
}

/**
 * Airtable pagina de a 100 registros. Con 7 piezas no hace falta hoy, pero
 * la tabla de reservas sí va a pasar ese umbral dentro del primer año.
 */
async function listarTodo(env, tabla) {
  const registros = [];
  let offset;

  do {
    const query = new URLSearchParams({ pageSize: '100' });
    if (offset) query.set('offset', offset);
    const pagina = await pedir(env, `${encodeURIComponent(tabla)}?${query}`);
    registros.push(...pagina.records);
    offset = pagina.offset;
  } while (offset);

  return registros;
}

export function listarHabitaciones(env) {
  return listarTodo(env, 'Habitaciones');
}

export function listarReservas(env) {
  return listarTodo(env, 'Reservas');
}

export function crearSolicitud(env, solicitud) {
  return pedir(env, 'Reservas', {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        habitacion: [solicitud.habitacionRecordId],
        llegada: solicitud.llegada,
        salida: solicitud.salida,
        huesped: solicitud.nombre,
        email: solicitud.email,
        telefono: solicitud.telefono || '',
        notas: solicitud.comentarios || '',
        estado: 'Solicitud',
        origen: 'Sitio web'
      }
    })
  });
}
