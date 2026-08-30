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
