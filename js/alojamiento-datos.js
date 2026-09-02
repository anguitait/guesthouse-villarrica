/**
 * Mejora progresiva de las fichas de alojamiento.
 *
 * El HTML ya trae las habitaciones y sirve tal cual sin JS. Esto sólo refresca
 * el precio cuando el Worker responde, para que la tarifa no se bifurque entre
 * esta página y la de reservas. Si algo falla, no toca nada: una página de
 * marketing no puede quedar en blanco por un servicio externo caído.
 */
import { formatearPrecio } from './reservas-logica.js?v=20260830';

const API = 'https://reservas.flordelbosque.cl';

/** Se guarda el contrato para poder repintar al cambiar de idioma sin re-pedirlo. */
let contrato = null;

function pintar() {
  if (!contrato) return;

  const idioma = document.documentElement.lang === 'en' ? 'en' : 'es';

  for (const habitacion of contrato.habitaciones) {
    const ficha = document.getElementById(habitacion.id);
    if (!ficha) continue;

    const precio = ficha.querySelector('.card-room__price');
    if (!precio) continue;

    const texto = formatearPrecio(habitacion.precio_noche, idioma);
    precio.textContent = habitacion.precio_noche === null
      ? texto
      : `${texto} / ${idioma === 'en' ? 'night' : 'noche'}`;

    // El HTML trae data-i18n="hab.consultar" para que el estado previo a esta
    // respuesta se traduzca solo. Una vez escrita la tarifa hay que soltar la
    // clave: si no, el proximo cambio de idioma llamaria a setLanguage y
    // devolveria la celda a "Consultar". El repintado de abajo la reemplaza.
    precio.removeAttribute('data-i18n');
  }
}

async function actualizar() {
  try {
    const respuesta = await fetch(`${API}/api/disponibilidad`);
    if (!respuesta.ok) return;
    contrato = await respuesta.json();
  } catch (error) {
    console.warn('Precios en vivo no disponibles:', error);
    return;
  }

  pintar();
}

// main.js lo emite al final de setLanguage. El sufijo "/ noche" y el texto de
// tarifa ausente dependen del idioma; el monto no, va siempre en formato CLP.
document.addEventListener('idiomacambiado', pintar);

actualizar();
