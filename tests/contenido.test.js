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
 * El fragmento de una ficha: desde su `id` hasta que el artículo cierra.
 * Buscar con `includes()` sobre el archivo entero no serviría: dos fichas
 * traspuestas dejarían pasar el test, porque los dos nombres aparecen igual
 * en alguna parte del documento.
 *
 * El corte va en `</article>` y no en el `<article>` siguiente: la última
 * ficha no tiene ninguno después, y el fragmento se llevaba todo el resto
 * de la página. Hoy no hay nada de habitaciones ahí abajo, pero un bloque
 * de "piezas relacionadas" en el pie bastaría para volver verde una ficha
 * final mal armada.
 */
function fichaDe(alojamiento, id) {
  const inicio = alojamiento.indexOf(`id="${id}"`);
  if (inicio === -1) return null;
  const fin = alojamiento.indexOf('</article>', inicio);
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
  // Las dos formas: la página en inglés escribía "CLP 5,000".
  for (const cifra of ['$5.000', '5,000']) {
    assert.ok(!alojamiento.includes(cifra), `alojamiento.html todavía dice ${cifra}`);
    assert.ok(!main.includes(cifra), `main.js todavía dice ${cifra}`);
  }
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

/**
 * El bloque de la tarjeta que rodea a un enlace: desde el `<article>` que la
 * abre hasta que ese artículo cierra. En la portada las tarjetas no tienen
 * `id`, así que el punto de anclaje es el `<article>` inmediatamente anterior
 * al enlace. No sirve la clase `stagger-N`, que es de animación y cambia sola
 * si mañana se reordenan las tarjetas.
 */
function tarjetaDe(portada, posicionDelEnlace) {
  const inicio = portada.lastIndexOf('<article', posicionDelEnlace);
  if (inicio === -1) return null;
  const fin = portada.indexOf('</article>', posicionDelEnlace);
  return portada.slice(inicio, fin === -1 ? undefined : fin);
}

/**
 * Tolerante a comillas simples o dobles, a `HREF` en mayúsculas, a espacios
 * alrededor del `=` y a los prefijos `./` y `/`. No es quisquillosidad: una
 * variante no reconocida no hace fallar nada, simplemente queda sin revisar,
 * y el test sigue verde gracias a los enlaces que sí calzan. Es el mismo
 * silencio que dejó pasar las tres anclas rotas.
 */
const ENLACE_A_FICHA = /href\s*=\s*(["'])\s*(?:\.?\/)?pages\/alojamiento\.html#([^"'\s>]+)\s*\1/gi;

/**
 * Un ancla rota no rompe nada visible: el navegador abre igual
 * pages/alojamiento.html y se queda arriba, sin saltar a ninguna ficha.
 * Por eso los tres enlaces de la portada sobrevivieron varios renombres
 * apuntando a fichas que ya no existían, sin que nadie se quejara.
 *
 * Revisar sólo el `href` tampoco basta: una tarjeta con el título y las
 * claves de otra pieza se ve perfecta y manda al huésped a la habitación
 * equivocada. Por eso el enlace se compara contra el contenido de su propia
 * tarjeta, igual que cada ficha se compara con la suya.
 */
test('cada tarjeta destacada de la portada enlaza la pieza de la que habla', () => {
  const enlaces = [...portada.matchAll(ENLACE_A_FICHA)];
  assert.ok(enlaces.length > 0, 'la portada no enlaza ninguna ficha de alojamiento');

  const porId = new Map(habitaciones.map(h => [h.id, h]));
  for (const enlace of enlaces) {
    const ancla = enlace[2];
    const pieza = porId.get(ancla);
    assert.ok(
      pieza,
      `la portada enlaza pages/alojamiento.html#${ancla}, que no es ninguna de las siete piezas`
    );
    assert.ok(
      fichaDe(alojamiento, ancla),
      `la portada enlaza pages/alojamiento.html#${ancla}, pero esa ficha no existe en la página`
    );

    const tarjeta = tarjetaDe(portada, enlace.index);
    assert.ok(tarjeta, `el enlace a #${ancla} no está dentro de ninguna tarjeta`);

    const titulo = tarjeta.match(/<h3[^>]*>([^<]*)<\/h3>/);
    assert.ok(titulo, `la tarjeta que enlaza #${ancla} no tiene título`);
    assert.equal(
      titulo[1].trim(),
      pieza.nombre,
      `la tarjeta que enlaza #${ancla} se titula "${titulo[1].trim()}" y no "${pieza.nombre}"`
    );

    for (const m of tarjeta.matchAll(/data-i18n="hab\.dest\.([a-z-]+)\.[^"]*"/g)) {
      assert.equal(m[1], ancla, `la tarjeta que enlaza #${ancla} usa las claves de ${m[1]}`);
    }
  }
});

test('Sollipulli es cuádruple y con literas', () => {
  const s = habitaciones.find(h => h.id === 'sollipulli');
  assert.equal(s.capacidad, '4');
  assert.ok(s.caracteristicas_es.includes('literas'));
  assert.ok(!s.descripcion_es.includes('matrimonial'));
});
