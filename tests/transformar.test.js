import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transformar } from '../worker/src/transformar.js';

const HABITACIONES = [
  {
    id: 'recAAA',
    fields: {
      id: 'vista-volcan', nombre: 'Vista Volcán', categoria: 'Suite Premium',
      capacidad: 2, metros2: 35, activa: true, orden: 1,
      descripcion_es: 'Nuestra suite más especial.', descripcion_en: 'Our finest suite.',
      caracteristicas_es: 'Cama King\nBañera', caracteristicas_en: 'King bed\nBathtub',
      imagen: 'images/habitaciones/vista-volcan.jpg'
    }
  },
  {
    id: 'recBBB',
    fields: { id: 'bosque', nombre: 'Habitación Bosque', capacidad: 2, activa: true, orden: 2 }
  },
  {
    id: 'recCCC',
    fields: { id: 'oculta', nombre: 'En remodelación', capacidad: 2, activa: false, orden: 3 }
  }
];

const RESERVAS = [
  {
    id: 'recR1',
    fields: {
      habitacion: ['recAAA'], llegada: '2026-09-12', salida: '2026-09-15',
      estado: 'Confirmada', huesped: 'Ana Pérez', email: 'ana@ejemplo.cl', telefono: '+56911111111'
    }
  },
  {
    id: 'recR2',
    fields: {
      habitacion: ['recBBB'], llegada: '2026-10-01', salida: '2026-10-04',
      estado: 'Solicitud', huesped: 'Juan Soto', email: 'juan@ejemplo.cl'
    }
  },
  {
    id: 'recR3',
    fields: {
      habitacion: ['recAAA'], llegada: '2026-11-01', salida: '2026-11-05',
      estado: 'Cancelada', huesped: 'Luis Díaz', email: 'luis@ejemplo.cl'
    }
  }
];

const AHORA = '2026-08-30T14:00:00.000Z';

test('el contrato no filtra ningún dato personal', () => {
  const json = JSON.stringify(transformar(HABITACIONES, RESERVAS, AHORA));
  for (const dato of ['Ana', 'Pérez', 'ana@ejemplo.cl', '+56911111111',
                      'Juan', 'Soto', 'juan@ejemplo.cl', 'Luis', 'luis@ejemplo.cl']) {
    assert.equal(json.includes(dato), false, `se filtró "${dato}" al contrato público`);
  }
});

test('omite las habitaciones inactivas', () => {
  const r = transformar(HABITACIONES, RESERVAS, AHORA);
  assert.deepEqual(r.habitaciones.map(h => h.id), ['vista-volcan', 'bosque']);
});

test('respeta el campo orden', () => {
  const alReves = [HABITACIONES[1], HABITACIONES[0]];
  const r = transformar(alReves, [], AHORA);
  assert.deepEqual(r.habitaciones.map(h => h.id), ['vista-volcan', 'bosque']);
});

test('las reservas confirmadas ocupan', () => {
  const r = transformar(HABITACIONES, RESERVAS, AHORA);
  const volcan = r.habitaciones.find(h => h.id === 'vista-volcan');
  assert.deepEqual(volcan.ocupado, [['2026-09-12', '2026-09-15']]);
});

test('las solicitudes también ocupan', () => {
  const r = transformar(HABITACIONES, RESERVAS, AHORA);
  const bosque = r.habitaciones.find(h => h.id === 'bosque');
  assert.deepEqual(bosque.ocupado, [['2026-10-01', '2026-10-04']]);
});

test('las canceladas no ocupan', () => {
  const r = transformar(HABITACIONES, RESERVAS, AHORA);
  const volcan = r.habitaciones.find(h => h.id === 'vista-volcan');
  assert.equal(volcan.ocupado.length, 1);
});

test('una tarifa ausente viaja como null, no como cero', () => {
  const r = transformar(HABITACIONES, [], AHORA);
  assert.equal(r.habitaciones[0].precio_noche, null);
});

test('los campos opcionales que faltan no rompen la transformación', () => {
  const r = transformar(HABITACIONES, [], AHORA);
  const bosque = r.habitaciones.find(h => h.id === 'bosque');
  assert.equal(bosque.metros2, null);
  assert.equal(bosque.imagen, null);
  assert.deepEqual(bosque.caracteristicas, { es: [], en: [] });
  assert.deepEqual(bosque.descripcion, { es: '', en: '' });
});

test('las características se parten por línea', () => {
  const r = transformar(HABITACIONES, [], AHORA);
  assert.deepEqual(r.habitaciones[0].caracteristicas.es, ['Cama King', 'Bañera']);
});

test('una reserva sin fechas se ignora', () => {
  const rota = [{ id: 'recX', fields: { habitacion: ['recAAA'], estado: 'Confirmada' } }];
  const r = transformar(HABITACIONES, rota, AHORA);
  assert.deepEqual(r.habitaciones[0].ocupado, []);
});

test('una reserva que apunta a una pieza inexistente se ignora', () => {
  const huerfana = [{
    id: 'recY',
    fields: { habitacion: ['recZZZ'], llegada: '2026-09-01', salida: '2026-09-02', estado: 'Confirmada' }
  }];
  assert.doesNotThrow(() => transformar(HABITACIONES, huerfana, AHORA));
});

test('incluye la marca de tiempo', () => {
  const r = transformar(HABITACIONES, [], AHORA);
  assert.equal(r.actualizado, AHORA);
});
