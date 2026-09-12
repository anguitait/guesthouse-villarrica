/**
 * El catálogo vive en docs/habitaciones-airtable.csv, pero el sitio estático
 * repite esos mismos datos a mano en tres archivos. Este test verifica que no
 * se hayan separado.
 *
 * No prueba lógica: prueba que un renombre de 210 lugares quedó completo.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
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

// ── La galería ───────────────────────────────────────────
//
// El manifiesto lo genera tools/prep-fotos.py y lo leen las dos páginas que
// muestran habitaciones. Nada en el navegador comprueba que los archivos que
// nombra existan: si uno falta, la galería se salta una foto sin decir nada.

const galeria = JSON.parse(leer('images/habitaciones/galeria.json'));

test('cada pieza del catálogo tiene galería', () => {
  for (const h of habitaciones) {
    assert.ok(galeria[h.id], `falta la galería de ${h.id}`);
  }
  assert.deepEqual(
    Object.keys(galeria).sort(),
    habitaciones.map(h => h.id).sort(),
    'el manifiesto y el catálogo no listan las mismas piezas'
  );
});

test('todas las fotos del manifiesto existen en disco', () => {
  for (const [id, fotos] of Object.entries(galeria)) {
    for (const foto of fotos) {
      assert.ok(existsSync(ruta(foto)), `${id}: no existe ${foto}`);
    }
  }
});

test('la portada de cada galería es la foto del catálogo', () => {
  for (const h of habitaciones) {
    assert.equal(
      galeria[h.id][0], h.imagen,
      `la galería de ${h.id} empieza con otra foto que la ficha`
    );
  }
});

test('ninguna galería se quedó con una sola foto', () => {
  for (const [id, fotos] of Object.entries(galeria)) {
    assert.ok(fotos.length >= 2, `${id} tiene ${fotos.length} foto(s)`);
  }
});

// El test anterior mira del manifiesto al disco. Éste mira al revés, que es por
// donde se cuela el error real: prep-fotos.py escribe cada foto apenas la
// procesa, así que al quitar una de la curaduría el archivo sobra en disco y
// nada lo delata. Pasó con llaima-4.jpg.
test('ninguna foto en disco sobra del manifiesto', () => {
  const nombrados = new Set(Object.values(galeria).flat());
  const enDisco = readdirSync(ruta('images/habitaciones'))
    .filter(f => f.endsWith('.jpg'))
    .map(f => `images/habitaciones/${f}`);

  for (const foto of enDisco) {
    assert.ok(
      nombrados.has(foto),
      `${foto} está en disco pero no lo nombra el manifiesto: sobra de una curaduría anterior`
    );
  }
});

// Anclado al elemento de verdad, no al primer <details> del documento: el día
// que se agregue otro plegable antes (unas preguntas frecuentes, digamos), un
// test que buscara «el primer <details>» pasaría a inspeccionar ése y el
// resultado dependería del orden en el archivo.
test('el calendario arranca plegado', () => {
  const reservas = leer('pages/reservas.html');

  const marca = reservas.indexOf('id="reservas-plegable"');
  assert.ok(marca !== -1, 'no existe ningún elemento con id="reservas-plegable"');

  const abre = reservas.lastIndexOf('<details', marca);
  assert.ok(abre !== -1, 'el calendario no está dentro de un <details>');

  const finEtiqueta = reservas.indexOf('>', abre);
  assert.ok(
    finEtiqueta > marca,
    'el id reservas-plegable no está en la etiqueta <details> que lo precede'
  );

  const etiqueta = reservas.slice(abre, finEtiqueta + 1);
  assert.ok(!/\bopen\b/.test(etiqueta), 'el <details> viene abierto de fábrica');

  const bloque = reservas.slice(abre, reservas.indexOf('</details>', abre));
  assert.ok(
    bloque.includes('id="reservas-calendario"'),
    'el <details> no envuelve al calendario'
  );
  assert.ok(bloque.includes('<summary'), 'falta el resumen que se puede pulsar');
});

test('cada ficha declara su pieza para la galería', () => {
  for (const h of habitaciones) {
    const ficha = fichaDe(alojamiento, h.id);
    assert.ok(ficha, `falta la ficha de ${h.id}`);
    assert.ok(
      ficha.includes(`data-habitacion="${h.id}"`),
      `la ficha de ${h.id} no marca su bloque de imagen`
    );
  }
});

// ── Rastreo ──────────────────────────────────────────────
//
// robots.txt y sitemap.xml son lo primero que pide un buscador. El sitemap lo
// genera tools/sitemap.py: si alguien agrega una página y no lo vuelve a
// correr, Google no se entera de que existe. Estos tests lo detectan.

/**
 * Todos los HTML publicados, a cualquier profundidad. Recursivo y no sólo la
 * raíz y pages/: con la lista corta, una página nueva en la raíz o en un
 * directorio nuevo —la forma que tendrá el sitio en inglés— se quedaba fuera
 * del sitemap sin que ningún test se quejara.
 *
 * Se salta lo que GitHub Pages no publica: lo excluido en _config.yml y lo que
 * empieza por punto o guion bajo. Ahí entra .claude/worktrees/, que en el
 * checkout principal guarda copias enteras del sitio.
 */
const SIN_PUBLICAR = new Set(['docs', 'tools', 'tests', 'worker', 'node_modules']);

function htmlPublicados(dir = '', acumulado = []) {
  for (const entrada of readdirSync(ruta(dir || '.'), { withFileTypes: true })) {
    if (entrada.name.startsWith('.') || entrada.name.startsWith('_')) continue;
    const rel = dir ? `${dir}/${entrada.name}` : entrada.name;
    if (entrada.isDirectory()) {
      if (!SIN_PUBLICAR.has(entrada.name)) htmlPublicados(rel, acumulado);
    } else if (entrada.name.endsWith('.html')) {
      acumulado.push(rel);
    }
  }
  return acumulado;
}

const paginas = htmlPublicados().sort();

test('robots.txt permite el rastreo y señala el sitemap', () => {
  const robots = leer('robots.txt');
  assert.ok(/User-agent:\s*\*/i.test(robots), 'falta la regla para todos los rastreadores');
  assert.ok(!/^\s*Disallow:\s*\/\s*$/im.test(robots), 'el sitio entero está bloqueado');
  assert.ok(
    robots.includes('https://flordelbosque.cl/sitemap.xml'),
    'robots.txt no señala el sitemap'
  );
});

test('el sitemap nombra todas las páginas del sitio', () => {
  const sitemap = leer('sitemap.xml');
  for (const p of paginas) {
    const url = p === 'index.html'
      ? 'https://flordelbosque.cl/'
      : `https://flordelbosque.cl/${p}`;
    assert.ok(sitemap.includes(`<loc>${url}</loc>`), `el sitemap no nombra ${p}`);
  }
});

test('el sitemap no nombra páginas que no existen', () => {
  const sitemap = leer('sitemap.xml');
  for (const [, url] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const relativa = url.replace('https://flordelbosque.cl/', '') || 'index.html';
    assert.ok(existsSync(ruta(relativa)), `el sitemap nombra ${relativa}, que no existe`);
  }
});

test('cada página declara su dirección canónica', () => {
  for (const p of paginas) {
    const html = leer(p);
    const canonica = html.match(/<link rel="canonical" href="([^"]+)"/);
    assert.ok(canonica, `${p} no declara canónica`);
    const og = html.match(/property="og:url" content="([^"]+)"/);
    assert.equal(
      canonica[1], og[1],
      `${p}: la canónica y og:url apuntan a direcciones distintas`
    );
  }
});

test('los títulos y descripciones caben en lo que Google muestra', () => {
  for (const p of paginas) {
    const html = leer(p);
    const titulo = html.match(/<title>([^<]*)<\/title>/)[1];
    const desc = html.match(/name="description" content="([^"]*)"/)[1];
    assert.ok(titulo.length <= 60, `${p}: título de ${titulo.length} caracteres`);
    assert.ok(desc.length <= 160, `${p}: descripción de ${desc.length} caracteres`);
  }
});

test('ningún título genérico se queda sin decir dónde queda esto', () => {
  // Las páginas que venden un servicio tienen que nombrar el lugar: nadie
  // teclea "alojamiento" a secas, teclea "alojamiento en Villarrica".
  const conLugar = ['index.html', 'pages/alojamiento.html', 'pages/coliving.html',
                    'pages/cowork.html', 'pages/experiencias.html',
                    'pages/matrimonios.html', 'pages/reservas.html'];
  for (const p of conLugar) {
    const titulo = leer(p).match(/<title>([^<]*)<\/title>/)[1];
    assert.ok(
      /Villarrica|Araucanía|Toltén|Volcán/i.test(titulo),
      `${p}: el título no nombra el lugar — "${titulo}"`
    );
  }
});

test('los datos estructurados de cada página son JSON válido', () => {
  for (const p of paginas) {
    for (const [, bloque] of leer(p).matchAll(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      assert.doesNotThrow(() => JSON.parse(bloque), `${p}: datos estructurados rotos`);
    }
  }
});

test('la portada describe el hotel con lo que Google necesita', () => {
  const bloques = [...leer('index.html').matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  const hotel = bloques.find(b => b['@type'] === 'Hotel');
  assert.ok(hotel, 'la portada no declara un Hotel');

  for (const campo of ['telephone', 'email', 'url', 'image', 'geo', 'priceRange', 'sameAs']) {
    assert.ok(hotel[campo], `al Hotel le falta ${campo}`);
  }
  assert.equal(hotel.geo.latitude, -39.2614638);
  assert.equal(hotel.geo.longitude, -72.2383335);
  // Sin streetAddress a propósito: el único rótulo disponible no es una calle
  // y discrepa de lo que dicen los directorios. Lo que sí tiene que estar es
  // la ciudad, la región y el país, más las coordenadas de arriba.
  for (const campo of ['addressLocality', 'addressRegion', 'addressCountry']) {
    assert.ok(hotel.address[campo], `a la dirección le falta ${campo}`);
  }
});

test('el hotel ofrece las siete habitaciones del catálogo', () => {
  const hotel = [...leer('index.html').matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(m => JSON.parse(m[1])).find(b => b['@type'] === 'Hotel');
  const ofrecidas = (hotel.makesOffer || []).map(o => o.itemOffered.name).sort();
  assert.deepEqual(
    ofrecidas, habitaciones.map(h => h.nombre).sort(),
    'las habitaciones de los datos estructurados no son las del catálogo'
  );
});

// ── Correcciones de la propietaria (2026-09-12) ──────────

/**
 * El piso de una habitación es una línea propia de sus características:
 * «Primer piso» o «Segundo piso». Hay que anclar la línea entera y no buscar
 * la palabra suelta, porque «Piso de madera» también dice «piso» —y en inglés
 * «Wooden floors» también dice «floor»— y aparece antes en la lista.
 */
const PISO_ES = /^(Primer|Segundo) piso$/;
const pisoDe = (h) => h.caracteristicas_es
  .split('\n').map(l => l.trim()).filter(Boolean).find(l => PISO_ES.test(l));

test('el catálogo declara el piso de cada pieza', () => {
  // La ficha lo muestra junto a la capacidad tomándolo de acá. Si alguien
  // borra esa línea al editar el catálogo, la ficha se queda muda sin que se
  // note. No se le exige ser la última: Volcán Lanín cierra con «Apta para 2
  // adultos y 1 niño» y deja el piso en la penúltima.
  for (const h of habitaciones) {
    assert.ok(pisoDe(h), `${h.id}: el catálogo no declara su piso`);
  }
});

test('cada ficha muestra el piso de su habitación', () => {
  for (const h of habitaciones) {
    const piso = pisoDe(h);
    const ficha = fichaDe(alojamiento, h.id);
    assert.ok(ficha, `falta la ficha de ${h.id}`);
    assert.ok(
      ficha.includes(piso),
      `la ficha de ${h.id} no dice "${piso}"`
    );
  }
});

test('experiencias no anuncia un retiro con fecha', () => {
  // La fecha estaba quemada en el HTML —«15-17 Mayo 2026»— y para cuando la
  // propietaria lo pidió ya había pasado hacía cuatro meses. Una fecha fija en
  // una página estática siempre termina así.
  const exp = leer('pages/experiencias.html');
  assert.ok(!/Próximo retiro/i.test(exp), 'sigue anunciando un próximo retiro');
  assert.ok(!/Mayo 2026/i.test(exp), 'sigue con la fecha vieja');
});

test('el cowork no ofrece café ni monitores', () => {
  // Se pidió quitar los dos servicios. Aparecían en tres lugares, no en los
  // dos que mostraba la captura: el café estaba también en lo que incluye un
  // día de cowork.
  const cw = leer('pages/cowork.html');
  assert.ok(!/Café ilimitado/i.test(cw), 'sigue ofreciendo café ilimitado');
  assert.ok(!/Monitores/i.test(cw), 'sigue ofreciendo monitores');
  assert.ok(
    /alejado de la ciudad/i.test(cw),
    'falta el recuadro del espacio de trabajo tranquilo'
  );
});

test('los paquetes de matrimonio ofrecen las siete habitaciones y la cocina', () => {
  const m = leer('pages/matrimonios.html');
  const paquete = nombre => {
    const i = m.indexOf(`package-card__title">${nombre}<`);
    assert.ok(i !== -1, `no existe el paquete ${nombre}`);
    const fin = m.indexOf('</ul>', i);
    return m.slice(i, fin);
  };
  for (const nombre of ['Clásico', 'Premium']) {
    const bloque = paquete(nombre);
    assert.match(bloque, /7\b/, `${nombre} no menciona las 7 habitaciones`);
    assert.match(bloque, /cocina/i, `${nombre} no menciona el uso de cocina`);
  }
});

test('la agenda ofrece posibilidades, no horarios que no existen', () => {
  const ag = leer('pages/agenda.html');
  // Nada de días fijos: la propietaria dijo que todavía no hay claridad.
  for (const patron of [/Sábados \d/, /Domingos \d/, /Un sábado al mes/]) {
    assert.ok(!patron.test(ag), `la agenda todavía anuncia "${patron.source}"`);
  }
  // Ni botones de reservar una actividad que no tiene fecha. Se mira sólo el
  // contenido y no la página entera: el botón «Reservar» de la cabecera lleva
  // al calendario de alojamiento y está en las once páginas, así que buscarlo
  // en todo el archivo haría fallar el test para siempre.
  const contenido = ag.slice(ag.indexOf('<main>'), ag.indexOf('</main>'));
  assert.ok(
    !/>\s*Reservar\s*</i.test(contenido),
    'la agenda todavía tiene botones de reservar'
  );
  // Y sí los siete tipos de evento que pidió.
  for (const tipo of ['cumpleaños', 'empresas', 'Despedidas',
                      'cocina', 'yoga', 'Congresos']) {
    assert.match(ag, new RegExp(tipo, 'i'), `la agenda no ofrece ${tipo}`);
  }
});

test('coliving publica las tarifas de estadía larga', () => {
  const co = leer('pages/coliving.html');
  for (const precio of ['$450.000', '$1.200.000', '$350.000', '$400.000']) {
    assert.ok(co.includes(precio), `falta la tarifa ${precio}`);
  }
});

test('ninguna tarifa quedó escrita sin los miles', () => {
  // El documento de la propietaria decía «350 diario» sin unidad. Publicar
  // "$350" en vez de "$350.000" sería cobrar mil veces menos, y es el tipo de
  // error que nadie nota hasta que alguien reserva.
  const co = leer('pages/coliving.html');
  const sospechosas = [...co.matchAll(/\$\s?(\d{1,3})(?![\d.])/g)].map(m => m[0]);
  assert.deepEqual(sospechosas, [], `cifras sin separador de miles: ${sospechosas}`);
});

test('la casa completa dice su capacidad y su mínimo', () => {
  const co = leer('pages/coliving.html');
  // Anclado a la clase del bloque y no a la frase «casa completa»: la
  // descripción de la página también la dice, y está antes en el archivo, así
  // que buscar el texto dejaba el recorte dentro del <head>.
  const i = co.indexOf('class="casa-completa"');
  assert.ok(i !== -1, 'no existe el bloque de casa completa');
  const bloque = co.slice(i, co.indexOf('</div>', i));
  assert.match(bloque, /17\b/, 'no dice la capacidad de 17 personas');
  assert.match(bloque, /2 noches/i, 'no dice el mínimo de dos noches');
});

test('ninguna página rotula «Agenda» una sección que ya no tiene fechas', () => {
  // La página dejó de anunciar días y horas, así que llamarla «Agenda» prometía
  // algo que no entrega. La dirección agenda.html se mantiene a propósito: está
  // en el sitemap y GitHub Pages no sabe redirigir. Lo que cambia es el rótulo.
  for (const pagina of paginas) {
    const texto = leer(pagina);
    assert.ok(
      !/>\s*Agenda\s*</.test(texto),
      `${pagina} todavía muestra «Agenda» como rótulo`
    );
    assert.ok(
      !/\bnav\.agenda\b/.test(texto),
      `${pagina} todavía usa la clave nav.agenda`
    );
  }
});

test('el menú dice Actividades en los dos idiomas', () => {
  const main = leer('js/main.js');
  assert.match(main, /'nav\.activities': 'Actividades'/, 'falta el rótulo en castellano');
  assert.match(main, /'nav\.activities': 'Activities'/, 'falta el rótulo en inglés');
});

test('la portada tampoco anuncia talleres con día y hora', () => {
  // El mismo arreglo que se hizo en agenda.html: la portada prometía «Sábados
  // 10:00 · 8 cupos» y un botón para reservar un cupo que nadie podía tomar.
  const seccion = portada.slice(
    portada.indexOf('<section class="section section--cream section--con-filigrana" id="proximas">'),
    portada.indexOf('<!-- Matrimonios Banner -->')
  );
  assert.ok(seccion.length > 0, 'no se encontró la sección de actividades de la portada');
  for (const patron of [/Sábados \d/, /Viernes \d/, /Último viernes del mes/, /cupos/i]) {
    assert.ok(!patron.test(seccion), `la portada todavía anuncia "${patron.source}"`);
  }
  assert.ok(
    !/Reservar cupo/i.test(seccion),
    'la portada todavía ofrece reservar un cupo'
  );
});
