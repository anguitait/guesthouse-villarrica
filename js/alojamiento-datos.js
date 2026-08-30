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

async function actualizar() {
  let contrato;
  try {
    const respuesta = await fetch(`${API}/api/disponibilidad`);
    if (!respuesta.ok) return;
    contrato = await respuesta.json();
  } catch (error) {
    console.warn('Precios en vivo no disponibles:', error);
    return;
  }

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
  }
}

actualizar();
