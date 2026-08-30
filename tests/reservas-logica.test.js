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
