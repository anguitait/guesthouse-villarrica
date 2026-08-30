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

/**
 * Una pieza sin capacidad declarada se omite: sin ese dato no hay forma segura
 * de filtrar. Una pieza sin tarifa, en cambio, se ofrece igual — es el estado
 * normal mientras el negocio no defina precios.
 */
export function disponibles(habitaciones, llegada, salida, huespedes) {
  return habitaciones.filter(h =>
    typeof h.capacidad === 'number' &&
    h.capacidad >= huespedes &&
    estaLibre(h, llegada, salida)
  );
}

function aTexto(utc) {
  return new Date(utc).toISOString().slice(0, 10);
}

/** Los días que una estadía ocupa: incluye la llegada, excluye la salida. */
export function diasDelRango(llegada, salida) {
  const dias = [];
  for (let dia = aUTC(llegada); dia < aUTC(salida); dia += MS_POR_DIA) {
    dias.push(aTexto(dia));
  }
  return dias;
}

/**
 * Un día se marca sin cupo sólo cuando no queda ninguna pieza libre. Marcarlo
 * porque una sola esté ocupada escondería disponibilidad real.
 *
 * Cuenta piezas, no reservas: si una habitación trae dos rangos que se pisan
 * —dato inconsistente cargado a mano— debe seguir contando como una sola pieza
 * ocupada, o el día se marcaría sin cupo teniendo otras libres.
 */
export function diasSinCupo(habitaciones) {
  if (habitaciones.length === 0) return new Set();

  const piezasPorDia = new Map();
  for (const habitacion of habitaciones) {
    const diasDeEstaPieza = new Set();
    for (const [ini, fin] of habitacion.ocupado || []) {
      for (const dia of diasDelRango(ini, fin)) diasDeEstaPieza.add(dia);
    }
    for (const dia of diasDeEstaPieza) {
      piezasPorDia.set(dia, (piezasPorDia.get(dia) || 0) + 1);
    }
  }

  const sinCupo = new Set();
  for (const [dia, cuantas] of piezasPorDia) {
    if (cuantas >= habitaciones.length) sinCupo.add(dia);
  }
  return sinCupo;
}
