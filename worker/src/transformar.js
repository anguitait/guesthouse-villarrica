/**
 * Convierte los registros crudos de Airtable en el contrato público del sitio.
 *
 * Esta función es la frontera de privacidad del sistema: es el único lugar donde
 * se decide qué sale hacia internet. De la tabla Reservas sólo se leen habitación,
 * fechas y estado. Los campos huesped, email, telefono y notas no se tocan nunca,
 * y hay un test que lo verifica sobre el JSON serializado.
 */

const ESTADOS_QUE_OCUPAN = new Set(['Solicitud', 'Confirmada']);

function lineas(texto) {
  if (!texto) return [];
  return texto.split('\n').map(l => l.trim()).filter(Boolean);
}

function opcional(valor) {
  return valor === undefined ? null : valor;
}

export function transformar(registrosHabitaciones, registrosReservas, ahoraISO) {
  const porRecordId = new Map();

  const habitaciones = registrosHabitaciones
    .filter(r => r.fields.activa === true)
    .sort((a, b) => (a.fields.orden || 0) - (b.fields.orden || 0))
    .map(r => {
      const f = r.fields;
      const habitacion = {
        id: f.id,
        nombre: f.nombre,
        categoria: opcional(f.categoria),
        precio_noche: opcional(f.precio_noche),
        capacidad: opcional(f.capacidad),
        metros2: opcional(f.metros2),
        descripcion: { es: f.descripcion_es || '', en: f.descripcion_en || '' },
        caracteristicas: { es: lineas(f.caracteristicas_es), en: lineas(f.caracteristicas_en) },
        imagen: opcional(f.imagen),
        ocupado: []
      };
      porRecordId.set(r.id, habitacion);
      return habitacion;
    });

  for (const reserva of registrosReservas) {
    const f = reserva.fields;
    if (!ESTADOS_QUE_OCUPAN.has(f.estado)) continue;
    if (!f.llegada || !f.salida) continue;
    for (const recordId of f.habitacion || []) {
      const habitacion = porRecordId.get(recordId);
      if (habitacion) habitacion.ocupado.push([f.llegada, f.salida]);
    }
  }

  return { actualizado: ahoraISO, habitaciones };
}
