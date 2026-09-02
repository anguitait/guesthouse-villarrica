/**
 * Interfaz de la página de reservas. Toda la lógica de fechas y filtros vive en
 * reservas-logica.js, que está cubierta por tests; acá sólo hay DOM y red.
 */
import {
  disponibles, noches, total, formatearPrecio, rangoValido, diasSinCupo
} from './reservas-logica.js?v=20260830';

const API = 'https://reservas.flordelbosque.cl';
const WHATSAPP = '56985488233';
const MINUTOS_TOLERADOS = 30;

const TEXTOS = {
  es: {
    sinConexion: 'No pudimos cargar la disponibilidad en línea. Puedes enviarnos igual tu solicitud y te confirmamos por correo.',
    datosViejos: 'La disponibilidad puede no estar al día. La confirmamos al responderte.',
    sinResultados: 'No hay habitaciones libres para esas fechas. Prueba con otras.',
    rangoInvalido: 'Revisa las fechas: la salida debe ser posterior a la llegada y no puede ser una fecha pasada.',
    noches: n => n === 1 ? '1 noche' : `${n} noches`,
    porNoche: 'por noche',
    elegir: 'Elegir',
    exito: 'Recibimos tu solicitud. Te respondemos a la brevedad para confirmar disponibilidad y tarifa.',
    yaNoDisponible: 'Esa habitación se ocupó recién. Vuelve a buscar, por favor.',
    errorEnvio: 'No pudimos enviar la solicitud. Escríbenos a hola@flordelbosque.cl o por WhatsApp.',
    seguirWhatsapp: 'Seguir por WhatsApp',
    resumen: (h, ll, s, n) => `${h} · ${ll} a ${s} · ${n}`
  },
  en: {
    sinConexion: 'We could not load live availability. Send your request anyway and we will confirm by email.',
    datosViejos: 'Availability may not be up to date. We will confirm when we reply.',
    sinResultados: 'No rooms available for those dates. Try different ones.',
    rangoInvalido: 'Check the dates: check-out must be after check-in and cannot be in the past.',
    noches: n => n === 1 ? '1 night' : `${n} nights`,
    porNoche: 'per night',
    elegir: 'Choose',
    exito: 'We received your request. We will reply shortly to confirm availability and rates.',
    yaNoDisponible: 'That room was just taken. Please search again.',
    errorEnvio: 'We could not send the request. Email hola@flordelbosque.cl or reach us on WhatsApp.',
    seguirWhatsapp: 'Continue on WhatsApp',
    resumen: (h, ll, s, n) => `${h} · ${ll} to ${s} · ${n}`
  }
};

const el = id => document.getElementById(id);
const idioma = () => (document.documentElement.lang === 'en' ? 'en' : 'es');
const t = () => TEXTOS[idioma()];

let contrato = null;
let elegida = null;

function hoy() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
}

// ── Carga ────────────────────────────────────────────────

async function cargar() {
  try {
    const respuesta = await fetch(`${API}/api/disponibilidad`);
    if (!respuesta.ok) throw new Error(respuesta.status);
    contrato = await respuesta.json();
  } catch (error) {
    // Modo consulta: nunca mostrar todo libre ni bloquear todo.
    console.warn('Sin disponibilidad en línea:', error);
    contrato = null;
    avisar(t().sinConexion);
    return;
  }

  const antiguedad = (Date.now() - new Date(contrato.actualizado)) / 60000;
  if (antiguedad > MINUTOS_TOLERADOS) avisar(t().datosViejos);

  dibujarCalendario();
}

function avisar(mensaje) {
  const aviso = el('reservas-aviso');
  aviso.textContent = mensaje;
  aviso.hidden = false;
}

function mostrarError(mensaje) {
  const error = el('reservas-error');
  error.textContent = mensaje;
  error.hidden = !mensaje;
}

// ── Calendario ───────────────────────────────────────────

function dibujarCalendario() {
  if (!contrato) return;

  const sinCupo = diasSinCupo(contrato.habitaciones);
  const contenedor = el('reservas-calendario');
  contenedor.innerHTML = '';

  const inicio = new Date();
  for (let salto = 0; salto < 2; salto++) {
    contenedor.appendChild(dibujarMes(inicio.getFullYear(), inicio.getMonth() + salto, sinCupo));
  }
}

function dibujarMes(anio, mes, sinCupo) {
  const primero = new Date(anio, mes, 1);
  const tabla = document.createElement('table');
  tabla.className = 'calendario';

  const titulo = primero.toLocaleDateString(idioma() === 'en' ? 'en-GB' : 'es-CL',
    { month: 'long', year: 'numeric' });
  tabla.innerHTML = `<caption>${titulo}</caption>`;

  const cuerpo = document.createElement('tbody');
  let fila = document.createElement('tr');

  // getDay() da 0 para domingo; la semana chilena parte en lunes.
  const relleno = (primero.getDay() + 6) % 7;
  for (let i = 0; i < relleno; i++) fila.appendChild(document.createElement('td'));

  const ultimoDia = new Date(anio, mes + 1, 0).getDate();
  for (let dia = 1; dia <= ultimoDia; dia++) {
    const fecha = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const celda = document.createElement('td');
    celda.textContent = dia;
    celda.className = 'calendario__dia';

    if (fecha < hoy()) celda.classList.add('calendario__dia--pasado');
    else if (sinCupo.has(fecha)) celda.classList.add('calendario__dia--ocupado');
    else {
      celda.classList.add('calendario__dia--libre');
      celda.tabIndex = 0;
      celda.addEventListener('click', () => elegirDia(fecha));
      celda.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegirDia(fecha); }
      });
    }

    fila.appendChild(celda);
    if (fila.children.length === 7) { cuerpo.appendChild(fila); fila = document.createElement('tr'); }
  }
  if (fila.children.length) cuerpo.appendChild(fila);

  tabla.appendChild(cuerpo);
  return tabla;
}

/** El primer clic fija la llegada; el segundo, la salida. */
function elegirDia(fecha) {
  const llegada = el('llegada');
  const salida = el('salida');

  if (!llegada.value || salida.value || fecha <= llegada.value) {
    llegada.value = fecha;
    salida.value = '';
  } else {
    salida.value = fecha;
    buscar();
  }
}

// ── Resultados ───────────────────────────────────────────

function buscar() {
  const llegada = el('llegada').value;
  const salida = el('salida').value;
  const huespedes = Number(el('huespedes').value);

  el('reservas-form').hidden = true;
  el('reservas-exito').hidden = true;

  if (!rangoValido(llegada, salida, hoy())) {
    el('reservas-resultados').innerHTML = '';
    mostrarError(t().rangoInvalido);
    return;
  }
  mostrarError('');

  // Modo consulta: sin datos no se puede filtrar, así que se pide contacto directo.
  if (!contrato) {
    elegida = null;
    el('reservas-resultados').innerHTML = '';
    abrirFormulario(null, llegada, salida);
    return;
  }

  const libres = disponibles(contrato.habitaciones, llegada, salida, huespedes);
  dibujarResultados(libres, llegada, salida);
}

function dibujarResultados(libres, llegada, salida) {
  const contenedor = el('reservas-resultados');
  contenedor.innerHTML = '';

  if (libres.length === 0) {
    contenedor.innerHTML = `<p class="reservas__vacio">${t().sinResultados}</p>`;
    return;
  }

  const cantidadNoches = noches(llegada, salida);

  for (const habitacion of libres) {
    const totalEstadia = total(habitacion, cantidadNoches);
    const tarjeta = document.createElement('article');
    tarjeta.className = 'card-room';

    const imagen = habitacion.imagen
      ? `<div class="card-room__image"><img src="../${habitacion.imagen}" alt="${habitacion.nombre}"></div>`
      : '';

    tarjeta.innerHTML = `
      ${imagen}
      <div class="card-room__content">
        <span class="card-room__category">${habitacion.categoria || ''}</span>
        <h3 class="card-room__title">${habitacion.nombre}</h3>
        <p class="card-room__description">${habitacion.descripcion[idioma()] || ''}</p>
        <ul class="card-room__features">
          ${(habitacion.caracteristicas[idioma()] || []).map(c => `<li>${c}</li>`).join('')}
        </ul>
        <div class="card-room__footer">
          <div class="card-room__price">
            ${formatearPrecio(totalEstadia, idioma())}
            <span>${totalEstadia === null ? '' : t().noches(cantidadNoches)}</span>
          </div>
          <button class="btn btn-sm btn-primary">${t().elegir}</button>
        </div>
      </div>`;

    tarjeta.querySelector('button')
      .addEventListener('click', () => abrirFormulario(habitacion, llegada, salida));
    contenedor.appendChild(tarjeta);
  }
}

// ── Envío ────────────────────────────────────────────────

function abrirFormulario(habitacion, llegada, salida) {
  elegida = habitacion;
  const formulario = el('reservas-form');
  formulario.hidden = false;

  el('reservas-resumen').textContent = habitacion
    ? t().resumen(habitacion.nombre, llegada, salida, t().noches(noches(llegada, salida)))
    : `${llegada} — ${salida}`;

  formulario.scrollIntoView({ behavior: 'smooth' });
}

function mensajeWhatsApp() {
  const partes = ['Hola! Envié una solicitud de reserva desde el sitio.'];
  if (elegida) partes.push(`Habitación: ${elegida.nombre}`);
  partes.push(`Llegada: ${el('llegada').value}`);
  partes.push(`Salida: ${el('salida').value}`);
  partes.push(`Nombre: ${el('nombre').value}`);
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(partes.join('\n'))}`;
}

function mostrarExito(mensaje) {
  const exito = el('reservas-exito');
  exito.innerHTML = `
    <p>${mensaje}</p>
    <a class="btn btn-outline" href="${mensajeWhatsApp()}" target="_blank" rel="noopener">
      ${t().seguirWhatsapp}
    </a>`;
  exito.hidden = false;
  el('reservas-form').hidden = true;
  exito.scrollIntoView({ behavior: 'smooth' });
}

async function enviar(evento) {
  evento.preventDefault();

  const token = document.querySelector('[name="cf-turnstile-response"]');
  const cuerpo = {
    habitacion: elegida ? elegida.id : null,
    llegada: el('llegada').value,
    salida: el('salida').value,
    huespedes: el('huespedes').value,
    nombre: el('nombre').value,
    email: el('email').value,
    telefono: el('telefono').value,
    comentarios: el('comentarios').value,
    sitio_web: el('sitio_web').value,
    turnstile: token ? token.value : ''
  };

  try {
    const respuesta = await fetch(`${API}/api/solicitud`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo)
    });

    if (respuesta.status === 409) {
      mostrarError(t().yaNoDisponible);
      await cargar();
      return;
    }
    if (!respuesta.ok) throw new Error(respuesta.status);

    mostrarExito(t().exito);
  } catch (error) {
    console.error('Envío fallido:', error);
    mostrarExito(t().errorEnvio);
  }
}

// ── Arranque ─────────────────────────────────────────────

function aplicarQuerystring() {
  const parametros = new URLSearchParams(location.search);
  for (const [clave, campo] of [['llegada', 'llegada'], ['salida', 'salida'], ['huespedes', 'huespedes']]) {
    const valor = parametros.get(clave);
    if (valor) el(campo).value = valor;
  }
  return parametros.has('llegada') && parametros.has('salida');
}

el('reservas-fechas').addEventListener('submit', e => { e.preventDefault(); buscar(); });
el('reservas-form').addEventListener('submit', enviar);

cargar().then(() => {
  if (aplicarQuerystring()) buscar();
});
