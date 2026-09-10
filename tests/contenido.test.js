/**
 * El catálogo vive en docs/habitaciones-airtable.csv, pero el sitio estático
 * repite esos mismos datos a mano en tres archivos. Este test verifica que no
 * se hayan separado.
 *
 * No prueba lógica: prueba que un renombre de 210 lugares quedó completo.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RAIZ = new URL('../', import.meta.url);
const ruta = (p) => fileURLToPath(new URL(p, RAIZ));
const leer = (p) => readFileSync(ruta(p), 'utf8');

/** Parser de CSV con comillas y saltos de línea dentro de los campos. */
function parsearCSV(texto) {
  texto = texto.replace(/\r\n/g, '\n');
  const filas = [];
  let fila = [], campo = '', comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ''; }
    else campo += c;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  const [cabecera, ...resto] = filas.filter(f => f.length > 1);
  return resto.map(f => Object.fromEntries(cabecera.map((k, i) => [k, f[i]])));
}

const habitaciones = parsearCSV(leer('docs/habitaciones-airtable.csv'));
const alojamiento = leer('pages/alojamiento.html');
const portada = leer('index.html');
const main = leer('js/main.js');

/**
 * El fragmento de una ficha: desde su `id` hasta el `<article>` siguiente.
 * Buscar con `includes()` sobre el archivo entero no serviría: dos fichas
 * traspuestas dejarían pasar el test, porque los dos nombres aparecen igual
 * en alguna parte del documento.
 */
function fichaDe(alojamiento, id) {
  const inicio = alojamiento.indexOf(`id="${id}"`);
  if (inicio === -1) return null;
  const fin = alojamiento.indexOf('<article', inicio + 1);
  return alojamiento.slice(inicio, fin === -1 ? undefined : fin);
}

// Insensible a mayúsculas y con las dos formas de tilde: quien renombra 210
// apariciones a mano deja justo esas erratas. Los slugs viejos, además,
// sobreviven en anclas (`#coihue`), en `id="magnolio"` y en las claves de
// traducción, y ésos no se ven leyendo.
const NOMBRES_VIEJOS = /magnolio|arrayan|arrayán|canelo|laurel|coihue|fuinque|tineo/i;

test('el catálogo tiene las siete piezas', () => {
  assert.equal(habitaciones.length, 7);
  assert.deepEqual(
    habitaciones.map(h => h.id),
    ['llaima', 'rukapillan', 'sierra-nevada', 'tolhuaca', 'lanin', 'sollipulli', 'lonquimay']
  );
});

test('ningún nombre de árbol sobrevive en el sitio', () => {
  for (const [nombre, texto] of [
    ['pages/alojamiento.html', alojamiento],
    ['index.html', portada],
    ['js/main.js', main],
    ['docs/habitaciones-airtable.csv', leer('docs/habitaciones-airtable.csv')]
  ]) {
    const hallazgo = texto.match(NOMBRES_VIEJOS);
    assert.equal(hallazgo, null, `${nombre} todavía dice "${hallazgo?.[0]}"`);
  }
});

test('cada pieza tiene su ficha, con el nombre y el ancla del catálogo', () => {
  for (const h of habitaciones) {
    const ficha = fichaDe(alojamiento, h.id);
    assert.ok(ficha, `falta la ficha de ${h.id}`);
    assert.ok(ficha.includes(h.nombre), `la ficha de ${h.id} no muestra ${h.nombre}`);
    // Una ficha traspuesta arrastra las claves de traducción de la otra.
    for (const m of ficha.matchAll(/data-i18n="hab\.([a-z-]+)\.[^"]*"/g)) {
      assert.equal(m[1], h.id, `la ficha de ${h.id} usa las claves de ${m[1]}`);
    }
  }
});

test('cada pieza tiene su fotografía en el disco', () => {
  for (const h of habitaciones) {
    assert.ok(h.imagen, `${h.id} no declara imagen`);
    assert.ok(existsSync(ruta(h.imagen)), `no existe ${h.imagen}`);
    const ficha = fichaDe(alojamiento, h.id);
    assert.ok(ficha, `falta la ficha de ${h.id}`);
    assert.ok(
      ficha.includes(`../${h.imagen}`),
      `la ficha de ${h.id} no muestra ${h.imagen}`
    );
  }
});

test('ninguna ficha sigue con el placeholder de marca', () => {
  assert.ok(!alojamiento.includes('card-room__image--marca'));
});

test('el precio ya incluye desayuno, así que nadie lo ofrece aparte', () => {
  for (const h of habitaciones) {
    assert.ok(!h.descripcion_es.includes('5.000'), `${h.id} todavía ofrece el desayuno`);
    assert.ok(!h.descripcion_en.includes('5,000'), `${h.id} still offers breakfast`);
  }
  assert.ok(!alojamiento.includes('$5.000'));
  assert.ok(!main.includes('$5.000'));
});

test('toda clave data-i18n usada existe en español y en inglés', () => {
  const usadas = new Set();
  for (const texto of [alojamiento, portada]) {
    for (const m of texto.matchAll(/data-i18n="([^"]+)"/g)) usadas.add(m[1]);
  }
  assert.ok(usadas.size > 0, 'no se encontró ninguna clave data-i18n');

  for (const clave of usadas) {
    const veces = main.split(`'${clave}':`).length - 1;
    assert.equal(veces, 2, `'${clave}' aparece ${veces} veces en main.js, se esperaban 2 (es y en)`);
  }
});

test('Sollipulli es cuádruple y con literas', () => {
  const s = habitaciones.find(h => h.id === 'sollipulli');
  assert.equal(s.capacidad, '4');
  assert.ok(s.caracteristicas_es.includes('literas'));
  assert.ok(!s.descripcion_es.includes('matrimonial'));
});
