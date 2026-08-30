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
