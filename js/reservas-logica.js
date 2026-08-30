/**
 * Lógica de disponibilidad. Sin DOM: se usa igual en el navegador y en los tests.
 *
 * Todas las fechas son civiles en formato YYYY-MM-DD, nunca instantes. Compararlas
 * como texto funciona porque el formato es de ancho fijo y ordena igual que el
 * calendario, y así se evitan los corrimientos de un día que produce America/Santiago
 * al cambiar de huso dos veces al año.
 */

/**
 * Dos estadías se solapan si cada una empieza antes de que termine la otra.
 * El día de salida NO cuenta como ocupado: quien se va el 15 libera esa noche.
 */
export function seSolapan(iniA, finA, iniB, finB) {
  return iniA < finB && iniB < finA;
}

export function estaLibre(habitacion, llegada, salida) {
  const ocupado = habitacion.ocupado || [];
  return !ocupado.some(([ini, fin]) => seSolapan(llegada, salida, ini, fin));
}

const MS_POR_DIA = 86400000;

function aUTC(fecha) {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return Date.UTC(anio, mes - 1, dia);
}

/**
 * Cuenta noches en UTC a propósito. Con fechas locales, un rango que cruza el
 * cambio de horario de verano mide 23 o 25 horas y el redondeo se equivoca.
 */
export function noches(llegada, salida) {
  return Math.round((aUTC(salida) - aUTC(llegada)) / MS_POR_DIA);
}

/**
 * Devuelve null cuando la tarifa no está definida, que hoy es el caso de todas
 * las piezas. Un total de 0 sería peor que no mostrar nada.
 */
export function total(habitacion, cantidadNoches) {
  const precio = habitacion.precio_noche;
  if (precio === null || precio === undefined) return null;
  return precio * cantidadNoches;
}

export function formatearPrecio(valor, idioma) {
  if (valor === null || valor === undefined) {
    return idioma === 'en' ? 'On request' : 'Consultar';
  }
  return valor.toLocaleString('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  });
}

export function rangoValido(llegada, salida, hoy) {
  if (!llegada || !salida) return false;
  if (llegada < hoy) return false;
  return llegada < salida;
}
