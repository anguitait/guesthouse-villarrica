import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seSolapan, estaLibre } from '../js/reservas-logica.js';

test('un rango que envuelve a la reserva se solapa', () => {
  assert.equal(seSolapan('2026-09-10', '2026-09-20', '2026-09-12', '2026-09-15'), true);
});

test('un rango que entra por la izquierda se solapa', () => {
  assert.equal(seSolapan('2026-09-10', '2026-09-13', '2026-09-12', '2026-09-15'), true);
});

test('un rango que entra por la derecha se solapa', () => {
  assert.equal(seSolapan('2026-09-14', '2026-09-18', '2026-09-12', '2026-09-15'), true);
});

test('llegar el día que el otro se va NO se solapa', () => {
  // La reserva ocupa 12, 13 y 14. El 15 la pieza queda libre.
  assert.equal(seSolapan('2026-09-15', '2026-09-18', '2026-09-12', '2026-09-15'), false);
});

test('irse el día que el otro llega NO se solapa', () => {
  assert.equal(seSolapan('2026-09-08', '2026-09-12', '2026-09-12', '2026-09-15'), false);
});

test('una sola noche dentro de la reserva se solapa', () => {
  assert.equal(seSolapan('2026-09-13', '2026-09-14', '2026-09-12', '2026-09-15'), true);
});

test('una habitación sin ocupación está libre', () => {
  assert.equal(estaLibre({ ocupado: [] }, '2026-09-12', '2026-09-15'), true);
});

test('una habitación sin el campo ocupado está libre', () => {
  assert.equal(estaLibre({}, '2026-09-12', '2026-09-15'), true);
});

test('basta un rango ocupado que choque para no estar libre', () => {
  const h = { ocupado: [['2026-10-01', '2026-10-03'], ['2026-09-13', '2026-09-14']] };
  assert.equal(estaLibre(h, '2026-09-12', '2026-09-15'), false);
});

import { noches, total, formatearPrecio, rangoValido } from '../js/reservas-logica.js';

test('tres noches entre el 12 y el 15', () => {
  assert.equal(noches('2026-09-12', '2026-09-15'), 3);
});

test('una noche', () => {
  assert.equal(noches('2026-09-12', '2026-09-13'), 1);
});

test('el cambio de horario de verano no altera el conteo', () => {
  // En Chile el horario de verano arranca el primer domingo de septiembre.
  // Contado como instantes locales, este rango daría 6.958... noches.
  assert.equal(noches('2026-09-04', '2026-09-11'), 7);
});

test('el total multiplica precio por noches', () => {
  assert.equal(total({ precio_noche: 85000 }, 3), 255000);
});

test('sin tarifa definida no hay total', () => {
  assert.equal(total({ precio_noche: null }, 3), null);
});

test('una tarifa ausente del registro tampoco produce total', () => {
  assert.equal(total({}, 3), null);
});

test('sin tarifa el precio se muestra como Consultar', () => {
  assert.equal(formatearPrecio(null, 'es'), 'Consultar');
  assert.equal(formatearPrecio(null, 'en'), 'On request');
});

test('con tarifa el precio se formatea en pesos', () => {
  assert.match(formatearPrecio(85000, 'es'), /85\.000/);
});

test('la salida debe ser posterior a la llegada', () => {
  assert.equal(rangoValido('2026-09-15', '2026-09-12', '2026-09-01'), false);
  assert.equal(rangoValido('2026-09-15', '2026-09-15', '2026-09-01'), false);
  assert.equal(rangoValido('2026-09-12', '2026-09-15', '2026-09-01'), true);
});

test('no se puede reservar hacia atrás', () => {
  assert.equal(rangoValido('2026-08-01', '2026-08-05', '2026-09-01'), false);
});

test('se puede reservar desde hoy mismo', () => {
  assert.equal(rangoValido('2026-09-01', '2026-09-03', '2026-09-01'), true);
});

import { disponibles } from '../js/reservas-logica.js';

const CATALOGO = [
  { id: 'vista-volcan', capacidad: 2, ocupado: [['2026-09-12', '2026-09-15']] },
  { id: 'suite-familiar', capacidad: 4, ocupado: [] },
  { id: 'bosque', capacidad: 2, ocupado: [] }
];

test('excluye las piezas ocupadas en el rango', () => {
  const r = disponibles(CATALOGO, '2026-09-13', '2026-09-14', 2);
  assert.deepEqual(r.map(h => h.id), ['suite-familiar', 'bosque']);
});

test('excluye las piezas que no alcanzan para el grupo', () => {
  const r = disponibles(CATALOGO, '2026-10-01', '2026-10-03', 4);
  assert.deepEqual(r.map(h => h.id), ['suite-familiar']);
});

test('la capacidad justa alcanza', () => {
  const r = disponibles([{ id: 'x', capacidad: 2, ocupado: [] }], '2026-10-01', '2026-10-03', 2);
  assert.equal(r.length, 1);
});

test('una pieza sin capacidad declarada no se ofrece', () => {
  // Sin ese dato no se puede filtrar con seguridad, así que se omite.
  const r = disponibles([{ id: 'x', ocupado: [] }], '2026-10-01', '2026-10-03', 1);
  assert.deepEqual(r, []);
});

test('una pieza sin tarifa SÍ se ofrece', () => {
  // Es el estado normal hoy: las tarifas no están definidas.
  const r = disponibles([{ id: 'x', capacidad: 2, precio_noche: null, ocupado: [] }],
    '2026-10-01', '2026-10-03', 2);
  assert.equal(r.length, 1);
});

import { diasDelRango, diasSinCupo } from '../js/reservas-logica.js';

test('el rango incluye la llegada y excluye la salida', () => {
  assert.deepEqual(diasDelRango('2026-09-12', '2026-09-15'),
    ['2026-09-12', '2026-09-13', '2026-09-14']);
});

test('el rango cruza el fin de mes', () => {
  assert.deepEqual(diasDelRango('2026-09-29', '2026-10-02'),
    ['2026-09-29', '2026-09-30', '2026-10-01']);
});

test('el rango cruza un año bisiesto', () => {
  assert.deepEqual(diasDelRango('2028-02-28', '2028-03-01'),
    ['2028-02-28', '2028-02-29']);
});

test('un día queda sin cupo sólo si todas las piezas están ocupadas', () => {
  const catalogo = [
    { id: 'a', ocupado: [['2026-09-12', '2026-09-14']] },
    { id: 'b', ocupado: [['2026-09-13', '2026-09-15']] }
  ];
  // El 12 sólo cae 'a'; el 13 caen ambas; el 14 sólo cae 'b'.
  assert.deepEqual([...diasSinCupo(catalogo)].sort(), ['2026-09-13']);
});

test('sin ocupación no hay días sin cupo', () => {
  assert.equal(diasSinCupo([{ id: 'a', ocupado: [] }]).size, 0);
});

test('un catálogo vacío no marca días', () => {
  assert.equal(diasSinCupo([]).size, 0);
});

test('dos reservas solapadas de la misma pieza no esconden a las demás', () => {
  // Dato inconsistente cargado a mano en Airtable: la pieza 'a' tiene dos
  // reservas que se pisan. Eso no puede hacer desaparecer a la pieza 'b'.
  const catalogo = [
    { id: 'a', ocupado: [['2026-09-12', '2026-09-14'], ['2026-09-12', '2026-09-14']] },
    { id: 'b', ocupado: [] }
  ];
  assert.equal(diasSinCupo(catalogo).size, 0);
});
