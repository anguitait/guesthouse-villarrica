import { listarHabitaciones, listarReservas, crearSolicitud } from './airtable.js';
import { transformar } from './transformar.js';
import { enviarSolicitud } from './correo.js';
import { estaLibre, rangoValido } from '../../js/reservas-logica.js';

const CLAVE_CACHE = 'disponibilidad';
const CLAVE_MAPA = 'mapa-habitaciones';

function cors(env) {
  return {
    'Access-Control-Allow-Origin': env.ORIGEN_PERMITIDO,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function json(cuerpo, env, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json', ...cors(env) }
  });
}

/**
 * Guarda dos cosas: el contrato público y, aparte, el mapa de id público a
 * record id de Airtable. El mapa nunca se sirve — sólo lo usa el POST para
 * saber a qué registro vincular la solicitud.
 */
async function sincronizar(env) {
  const [habitaciones, reservas] = await Promise.all([
    listarHabitaciones(env),
    listarReservas(env)
  ]);

  const contrato = transformar(habitaciones, reservas, new Date().toISOString());

  const mapa = {};
  for (const registro of habitaciones) {
    if (registro.fields.id) mapa[registro.fields.id] = registro.id;
  }

  await Promise.all([
    env.CACHE.put(CLAVE_CACHE, JSON.stringify(contrato)),
    env.CACHE.put(CLAVE_MAPA, JSON.stringify(mapa))
  ]);

  return contrato;
}

async function contratoVigente(env) {
  const guardado = await env.CACHE.get(CLAVE_CACHE);
  if (guardado) return JSON.parse(guardado);
  return sincronizar(env);
}

async function turnstileValido(env, token, ip) {
  if (!token) return false;
  const cuerpo = new FormData();
  cuerpo.append('secret', env.TURNSTILE_SECRET);
  cuerpo.append('response', token);
  if (ip) cuerpo.append('remoteip', ip);

  const respuesta = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    { method: 'POST', body: cuerpo }
  );
  const datos = await respuesta.json();
  return datos.success === true;
}

function hoyEnSantiago() {
  // en-CA da directamente el formato YYYY-MM-DD.
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
}

async function solicitud(peticion, env) {
  const datos = await peticion.json();

  // Trampa para robots: el campo está oculto por CSS, una persona nunca lo llena.
  if (datos.sitio_web) return json({ ok: true }, env);

  const valido = await turnstileValido(
    env, datos.turnstile, peticion.headers.get('CF-Connecting-IP')
  );
  if (!valido) return json({ error: 'verificacion_fallida' }, env, 403);

  for (const campo of ['habitacion', 'llegada', 'salida', 'nombre', 'email']) {
    if (!datos[campo]) return json({ error: 'faltan_datos', campo }, env, 400);
  }

  if (!rangoValido(datos.llegada, datos.salida, hoyEnSantiago())) {
    return json({ error: 'rango_invalido' }, env, 400);
  }

  const contrato = await contratoVigente(env);
  const habitacion = contrato.habitaciones.find(h => h.id === datos.habitacion);
  if (!habitacion) return json({ error: 'habitacion_desconocida' }, env, 400);

  // Revalidación del lado del servidor: el navegador pudo quedarse con datos
  // de hace rato, o alguien pudo llamar el endpoint directamente.
  if (!estaLibre(habitacion, datos.llegada, datos.salida)) {
    return json({ error: 'ya_no_disponible' }, env, 409);
  }

  const mapa = JSON.parse(await env.CACHE.get(CLAVE_MAPA) || '{}');
  const recordId = mapa[datos.habitacion];

  const paraAirtable = { ...datos, habitacionRecordId: recordId };
  const paraCorreo = { ...datos, nombreHabitacion: habitacion.nombre };

  // Las dos entregas son independientes a propósito: si una falla, la otra
  // igual llega. Se le confirma al huésped si al menos una funcionó.
  const [registro, correo] = await Promise.allSettled([
    recordId ? crearSolicitud(env, paraAirtable) : Promise.reject(new Error('sin record id')),
    enviarSolicitud(env, paraCorreo)
  ]);

  if (registro.status === 'rejected') console.error('Airtable falló:', registro.reason);
  if (correo.status === 'rejected') console.error('Correo falló:', correo.reason);

  if (registro.status === 'rejected' && correo.status === 'rejected') {
    return json({ error: 'no_se_pudo_entregar' }, env, 502);
  }

  // La solicitud recién creada ocupa la pieza, así que la caché quedó vieja.
  if (registro.status === 'fulfilled') await sincronizar(env);

  return json({ ok: true }, env);
}

export default {
  async scheduled(evento, env, ctx) {
    ctx.waitUntil(sincronizar(env));
  },

  async fetch(peticion, env) {
    const url = new URL(peticion.url);

    if (peticion.method === 'OPTIONS') {
      return new Response(null, { headers: cors(env) });
    }

    if (url.pathname === '/api/disponibilidad' && peticion.method === 'GET') {
      const guardado = await env.CACHE.get(CLAVE_CACHE);
      if (guardado) {
        return new Response(guardado, {
          headers: { 'Content-Type': 'application/json', ...cors(env) }
        });
      }
      return json(await sincronizar(env), env);
    }

    if (url.pathname === '/api/solicitud' && peticion.method === 'POST') {
      return solicitud(peticion, env);
    }

    return json({ error: 'No encontrado' }, env, 404);
  }
};
