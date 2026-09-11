# Galería y listado de reservas — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la página de reservas sirva para comparar habitaciones —filas horizontales y calendario plegado— y que cada pieza tenga galería de fotos en las dos páginas donde se muestra.

**Architecture:** `tools/prep-fotos.py` pasa de una foto por pieza a una lista y escribe `images/habitaciones/galeria.json`. Un módulo nuevo, `js/galeria.js`, lee ese manifiesto y monta flechas, puntos y visor sobre cualquier `.card-room__image` que declare su pieza; lo importan `js/alojamiento-datos.js` y `js/reservas-ui.js`, que son los dos únicos lugares donde se dibujan tarjetas. La galería es mejora progresiva: sin JavaScript queda la foto de portada, que es lo que hay hoy.

**Tech Stack:** HTML/CSS/JS sin framework, ES modules. `<dialog>` nativo para el visor. Tests con `node:test`. Python 3 con Pillow.

**Spec:** `docs/superpowers/specs/2026-09-10-galeria-y-listado-de-reservas-design.md`

---

## Contexto que el implementador necesita

**El material de origen está ignorado a propósito.** `docs/CambiosFDB/` no está en git porque `docs/` se sirve público y trae cotizaciones con nombre de cliente. Existe en el disco. Sin él, el paso de fotos no corre.

**Las carpetas de Llaima y Rukapillán están cruzadas.** La carpeta llamada *Rukapillan* contiene la pieza que el catálogo llama **Llaima**, y viceversa. Está decidido en el spec anterior y las rutas de este plan ya vienen corregidas. No "arreglar" lo que parece un error.

**Varias rutas terminan en espacios** (`"Habitación Volcán Lanin /"`, `"Habitación Volcán Rukapillan  /"` con dos espacios). Así se llaman las carpetas en el disco.

**El sitio está en producción.** GitHub Pages sirve desde `main`. Airtable ya tiene el catálogo nuevo y el contrato público responde con los siete volcanes.

**`.card-room` se usa en tres sitios** con la misma clase: la portada, `pages/alojamiento.html` y las filas que genera `js/reservas-ui.js`. Los cambios de layout de este plan van acotados con `.reservas__resultados .card-room`, para no tocar las otras dos.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `tools/prep-fotos.py` | **Modificar.** De `slug → ruta` a `slug → [rutas]`; además escribe el manifiesto. |
| `images/habitaciones/galeria.json` | **Generar.** El contrato entre la herramienta y el sitio. |
| `js/galeria.js` | **Crear.** El componente: manifiesto, carrusel en la tarjeta y visor a pantalla completa. |
| `css/components.css` | **Modificar.** Filas del listado, flechas y puntos, visor. |
| `pages/reservas.html` | **Modificar.** El calendario pasa a `<details>`. |
| `js/reservas-ui.js` | **Modificar.** Marca el bloque de imagen con su pieza y monta la galería. |
| `js/alojamiento-datos.js` | **Modificar.** Monta la galería en las siete fichas. |
| `pages/alojamiento.html` | **Modificar.** `data-habitacion` en los siete bloques de imagen. |
| `tests/contenido.test.js` | **Modificar.** Tests del manifiesto. |

---

### Task 1: Las fotos de la galería y su manifiesto

**Files:**
- Modify: `tools/prep-fotos.py`
- Test: `tests/contenido.test.js`

- [ ] **Step 1: Escribir los tests que fallan**

Al final de `tests/contenido.test.js`, antes de nada más, agregar el `import` que falta arriba junto a los demás si no está:

```javascript
import { readFileSync, existsSync } from 'node:fs';
```

(ya está; no dupliques la línea). Y al final del archivo:

```javascript
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
```

- [ ] **Step 2: Correrlos y confirmar que fallan**

```bash
npm test
```

Esperado: FALLA al cargar el archivo, porque `images/habitaciones/galeria.json` todavía no existe. El mensaje trae `ENOENT` y la ruta.

- [ ] **Step 3: Reescribir `tools/prep-fotos.py`**

Cambian tres cosas: `FOTOS` pasa a listas, `main()` recorre cada lista numerando desde la segunda, y al final se escribe el manifiesto. Reemplazar el bloque `FOTOS`, `procesar` y `main` por:

```python
# Las fotos de cada pieza, la portada primero. Ojo: las carpetas de Llaima y
# Rukapillán vienen cruzadas respecto de la planilla, y la planilla es la que
# manda. Ver docs/superpowers/specs/2026-09-10-volcanes-y-fotografias-design.md
#
# La curaduría deja fuera las casi duplicadas —varias tomas del mismo encuadre
# con segundos de diferencia—, las mal archivadas y las previas a la
# remodelación. Los baños entran cuando aportan: el de Sollipulli, con tragaluz
# y baldosa, sostiene por sí solo el argumento de "baño privado en la pieza".
FOTOS = {
    "llaima": [
        "Habitación Volcán Rukapillan  /FB2027_10.jpg",
        "Habitación Volcán Rukapillan  /20260909_151247.jpg",
        "Habitación Volcán Rukapillan  /20260909_151200.jpg",
        "Habitación Volcán Rukapillan  /20260909_151331.jpg",
    ],
    "rukapillan": [
        "Habitación Volcán Llaima/20260909_151428.jpg",
        "Habitación Volcán Llaima/20260909_151454.jpg",
        "Habitación Volcán Llaima/FB2027_9.jpg",
        "Habitación Volcán Llaima/20260909_151450(1).jpg",
    ],
    "sierra-nevada": [
        "Habitación Volcán Sierra Nevada /20260909_151844.jpg",
        "Habitación Volcán Sierra Nevada /20260909_151809.jpg",
        "Habitación Volcán Sierra Nevada /20260909_151930.jpg",
        "Habitación Volcán Sierra Nevada /20260909_151824.jpg",
    ],
    "tolhuaca": [
        "Habitación Volcán Tolhuaca /20260909_151631.jpg",
        "Habitación Volcán Tolhuaca /20260909_151616.jpg",
    ],
    "lanin": [
        "Habitación Volcán Lanin /FB2027_2.jpg",
        "Habitación Volcán Lanin /20260909_152126.jpg",
        "Habitación Volcán Lanin /FB2027_3.jpg",
        "Habitación Volcán Lanin /20260909_152149.jpg",
    ],
    "sollipulli": [
        "Habitación Volcán Sollipulli/FB2027_4.jpg",
        "Habitación Volcán Sollipulli/FB2027_5.jpg",
        "Habitación Volcán Sollipulli/20260909_152430.jpg",
        "Habitación Volcán Sollipulli/20260909_152424.jpg",
    ],
    "lonquimay": [
        "Habitación Volcán Lonquimay /FB2027_7.jpg",
        "Habitación Volcán Lonquimay /20260909_152246.jpg",
        "Habitación Volcán Lonquimay /20260909_152320.jpg",
    ],
}

MANIFIESTO = DESTINO / "galeria.json"


def procesar(origen, destino):
    with Image.open(origen) as im:
        im = ImageOps.exif_transpose(im)
        im = im.convert("RGB")
        if im.width > ANCHO:
            alto = round(im.height * ANCHO / im.width)
            im = im.resize((ANCHO, alto), Image.LANCZOS)
        # Guardar sin pasar `exif=` ya descarta los metadatos: Pillow sólo los
        # escribe si se los das. No hace falta copiar los píxeles a mano.
        im.save(destino, "JPEG", quality=CALIDAD, optimize=True)
    return destino


def nombre(slug, posicion):
    """La portada conserva el nombre limpio: es la que declara Airtable."""
    return f"{slug}.jpg" if posicion == 0 else f"{slug}-{posicion + 1}.jpg"


def main():
    if not ORIGEN.is_dir():
        sys.exit(f"No existe {ORIGEN}. Es material sin versionar: hay que pedirlo.")

    DESTINO.mkdir(parents=True, exist_ok=True)
    faltan = []
    manifiesto = {}

    for slug, relativas in FOTOS.items():
        publicadas = []
        for posicion, relativa in enumerate(relativas):
            origen = ORIGEN / relativa
            if not origen.is_file() or origen.stat().st_size == 0:
                faltan.append(f"{slug}: {relativa}")
                continue
            destino = DESTINO / nombre(slug, posicion)
            try:
                procesar(origen, destino)
            except OSError as e:
                # Un archivo a medio bajar no es ilegible por tamaño, sino al
                # abrirlo. Se reporta junto a las faltantes en vez de reventar.
                faltan.append(f"{slug}: {relativa} ({e})")
                continue
            publicadas.append(str(destino.relative_to(RAIZ)))
        manifiesto[slug] = publicadas
        print(f"{slug:<14} {len(publicadas)} fotos")

    if faltan:
        sys.exit("Faltan fotos de origen:\n  " + "\n  ".join(faltan))

    MANIFIESTO.write_text(
        json.dumps(manifiesto, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    total = sum(len(v) for v in manifiesto.values())
    print(f"\n{total} fotos y el manifiesto en {DESTINO.relative_to(RAIZ)}")
```

Y arriba, junto a los demás `import`, agregar `import json`.

Actualiza también el docstring: donde dice que procesa "una foto" ahora procesa una lista por pieza y escribe el manifiesto.

- [ ] **Step 4: Correr la herramienta**

```bash
python3 tools/prep-fotos.py
```

Esperado: siete líneas con el número de fotos por pieza (4, 4, 4, 2, 4, 4, 3) y `25 fotos y el manifiesto en images/habitaciones`.

- [ ] **Step 5: Correr los tests**

```bash
npm test
```

Esperado: los cuatro tests nuevos pasan y los 56 anteriores siguen pasando. Total 60.

- [ ] **Step 6: Verificar que las portadas no cambiaron**

Las siete portadas ya estaban publicadas y no deben moverse ni un byte: la ficha y Airtable las referencian.

```bash
git status --short images/habitaciones/
```

Esperado: sólo archivos **nuevos** (`??`) —las `-2`, `-3`, `-4` y `galeria.json`—. Si alguna portada aparece como modificada (`M`), algo cambió en el procesamiento y hay que averiguar qué antes de seguir.

- [ ] **Step 7: Commit**

```bash
git add tools/prep-fotos.py images/habitaciones/
git commit -m "Publicar entre dos y cuatro fotografías por habitación"
```

---

### Task 2: El calendario se pliega

**Files:**
- Modify: `pages/reservas.html:110`
- Modify: `css/components.css`
- Modify: `js/reservas-ui.js`
- Test: `tests/contenido.test.js`

- [ ] **Step 1: Escribir el test que falla**

Al final de `tests/contenido.test.js`:

```javascript
test('el calendario arranca plegado', () => {
  const reservas = leer('pages/reservas.html');
  const abre = reservas.indexOf('<details');
  const cal = reservas.indexOf('id="reservas-calendario"');
  assert.ok(abre !== -1, 'el calendario no está dentro de un <details>');
  assert.ok(abre < cal, 'el <details> no envuelve al calendario');
  const etiqueta = reservas.slice(abre, cal);
  assert.ok(!/\bopen\b/.test(etiqueta), 'el <details> viene abierto de fábrica');
  assert.ok(etiqueta.includes('<summary'), 'falta el resumen que se puede pulsar');
});
```

- [ ] **Step 2: Correrlo y confirmar que falla**

```bash
npm test
```

Esperado: FALLA con `el calendario no está dentro de un <details>`.

- [ ] **Step 3: Envolver el calendario**

En `pages/reservas.html`, reemplazar la línea 110:

```html
        <div class="reservas__calendario" id="reservas-calendario"></div>
```

por:

```html
        <!-- Plegado de fábrica: son 318px antes del primer resultado, y no es
             el selector de fechas —los campos de arriba son <input type="date">
             con su propio calendario— sino un mapa de disponibilidad para quien
             tiene fechas flexibles. -->
        <details class="reservas__plegable" id="reservas-plegable">
          <summary data-i18n="reservas.verCalendario">Ver disponibilidad del mes</summary>
          <div class="reservas__calendario" id="reservas-calendario"></div>
        </details>
```

- [ ] **Step 4: Agregar la clave de traducción**

En `js/main.js`, junto a las demás claves `reservas.*` del diccionario español:

```javascript
      'reservas.verCalendario': 'Ver disponibilidad del mes',
```

y en el inglés:

```javascript
      'reservas.verCalendario': 'See this month’s availability',
```

- [ ] **Step 5: Recordar la preferencia**

Al final de `js/reservas-ui.js`, antes de la línea que arranca la carga inicial:

```javascript
// Quien usa el mapa de disponibilidad lo usa siempre; quien no, nunca. No tiene
// sentido que lo abra en cada visita. `try` porque en navegación privada el
// acceso a localStorage lanza en vez de devolver vacío.
const plegable = el('reservas-plegable');
if (plegable) {
  try {
    if (localStorage.getItem('fdb-calendario') === 'abierto') plegable.open = true;
  } catch { /* sin memoria: queda plegado, que es el valor por defecto */ }

  plegable.addEventListener('toggle', () => {
    try {
      localStorage.setItem('fdb-calendario', plegable.open ? 'abierto' : 'plegado');
    } catch { /* no poder recordarlo no es motivo para romper la página */ }
  });
}
```

- [ ] **Step 6: Darle forma al resumen**

En `css/components.css`, junto a las reglas `.reservas__calendario`:

```css
/* El resumen tiene que leerse como un control, no como un título suelto. */
.reservas__plegable { margin-bottom: var(--space-8); }

.reservas__plegable > summary {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--tracking-wide);
  color: var(--brand-terracota);
  padding: var(--space-2) 0;
}

.reservas__plegable > summary::marker { content: ''; }

.reservas__plegable > summary::before {
  content: '›';
  display: inline-block;
  transition: transform var(--duration-fast) var(--ease-out);
}

.reservas__plegable[open] > summary::before { transform: rotate(90deg); }

/* El calendario ya traía su propio margen inferior; dentro del plegable
   duplicaba el hueco. */
.reservas__plegable .reservas__calendario { margin-bottom: var(--space-4); }
```

- [ ] **Step 7: Correr los tests**

```bash
npm test
```

Esperado: 61 tests, 0 fallos.

- [ ] **Step 8: Commit**

```bash
git add pages/reservas.html css/components.css js/main.js js/reservas-ui.js tests/contenido.test.js
git commit -m "Plegar el mapa de disponibilidad para devolverle el espacio a los resultados"
```

---

### Task 3: Los resultados pasan a filas

**Files:**
- Modify: `css/components.css`

Sin test automático: es layout, y se verifica en el navegador en la Task 7. El test que importa —que las fotos no vuelvan a desbordar— se hace midiendo, no leyendo.

- [ ] **Step 1: Escribir las reglas**

En `css/components.css`, reemplazar la regla `.reservas__resultados` existente:

```css
.reservas__resultados {
  display: grid;
  gap: var(--space-6);
  margin-bottom: var(--space-8);
}
```

por:

```css
/* Una fila por habitación, no una tarjeta a ancho completo. Sin columnas
   declaradas, cada tarjeta se estiraba a los 1184px del contenedor y el
   aspect-ratio 4:3 del bloque de imagen la volvía de 888px de alto: una
   habitación ocupaba más que la pantalla y comparar precios era imposible. */
.reservas__resultados {
  display: grid;
  gap: var(--space-6);
  margin-bottom: var(--space-8);
}

@media (min-width: 768px) {
  .reservas__resultados .card-room {
    display: grid;
    grid-template-columns: 17.5rem 1fr;
    align-items: stretch;
  }

  /* La foto manda el alto de la fila sólo si la ficha es corta; si el texto es
     más largo, la foto lo acompaña recortando por el centro. */
  .reservas__resultados .card-room__image {
    aspect-ratio: auto;
    height: 100%;
    min-height: 13rem;
  }

  .reservas__resultados .card-room__description {
    /* En la fila, la descripción compite con las características por un ancho
       que ya no es el de una tarjeta. Tres líneas bastan para decidir; el
       detalle completo está en la ficha de alojamiento. */
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
```

- [ ] **Step 2: Comprobar que no se tocaron las otras tarjetas**

Las reglas nuevas van todas bajo `.reservas__resultados`. La portada y `pages/alojamiento.html` no usan ese contenedor.

```bash
grep -c "reservas__resultados" index.html pages/alojamiento.html
```

Esperado: `0` en los dos.

- [ ] **Step 3: Commit**

```bash
git add css/components.css
git commit -m "Convertir los resultados en filas para poder compararlos"
```

---

### Task 4: El componente de galería

**Files:**
- Create: `js/galeria.js`

- [ ] **Step 1: Escribir el módulo**

```javascript
/**
 * La galería de fotos de una habitación.
 *
 * Es mejora progresiva: la foto de portada ya viene en el HTML (o la dibuja
 * reservas-ui) y es lo que se ve sin JavaScript. Esto le monta encima las
 * flechas, los puntos y el visor a pantalla completa.
 *
 * El manifiesto lo genera tools/prep-fotos.py. Vive en el repositorio y no en
 * Airtable porque el campo `imagen` es texto simple: una galería habría exigido
 * cambiar el esquema y que la propietaria mantuviera listas de nombres de
 * archivo.
 *
 * Las rutas del manifiesto son relativas a la raíz del sitio, pero las páginas
 * que lo consumen viven en pages/. Se resuelven contra la URL de este módulo en
 * vez de adivinar cuántos `../` hacen falta.
 */

const RAIZ = new URL('../', import.meta.url);
const url = ruta => new URL(ruta, RAIZ).href;

let manifiesto = null;

/** Una sola petición aunque la llamen las siete tarjetas. */
async function cargarManifiesto() {
  if (manifiesto) return manifiesto;
  const respuesta = await fetch(url('images/habitaciones/galeria.json'));
  if (!respuesta.ok) throw new Error(`galeria.json: ${respuesta.status}`);
  manifiesto = await respuesta.json();
  return manifiesto;
}

// ── El visor ─────────────────────────────────────────────
//
// Uno solo para toda la página, no uno por tarjeta: es un <dialog> que se
// rellena al abrirse. `showModal()` trae gratis el cierre con Esc, el foco
// atrapado y la devolución del foco al elemento que lo abrió.

let visor = null;

function construirVisor() {
  if (visor) return visor;

  const dialogo = document.createElement('dialog');
  dialogo.className = 'visor';

  const figura = document.createElement('figure');
  figura.className = 'visor__figura';

  const imagen = document.createElement('img');
  imagen.className = 'visor__imagen';
  figura.appendChild(imagen);

  const anterior = boton('‹', 'visor__flecha visor__flecha--anterior');
  const siguiente = boton('›', 'visor__flecha visor__flecha--siguiente');
  const contador = document.createElement('p');
  contador.className = 'visor__contador';

  const cerrar = boton('×', 'visor__cerrar');
  cerrar.addEventListener('click', () => dialogo.close());

  dialogo.append(cerrar, anterior, figura, siguiente, contador);
  document.body.appendChild(dialogo);

  // Clic fuera de la figura cierra. El <dialog> ocupa toda la pantalla, así que
  // "fuera" es el propio diálogo y no sus hijos.
  dialogo.addEventListener('click', evento => {
    if (evento.target === dialogo) dialogo.close();
  });

  visor = { dialogo, imagen, anterior, siguiente, contador };
  return visor;
}

function boton(texto, clase) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = clase;
  b.textContent = texto;
  return b;
}

function abrirVisor(fotos, indiceInicial, nombrePieza) {
  const v = construirVisor();
  let indice = indiceInicial;

  const pintar = () => {
    v.imagen.src = url(fotos[indice]);
    v.imagen.alt = `${nombrePieza} — fotografía ${indice + 1} de ${fotos.length}`;
    v.contador.textContent = `${indice + 1} / ${fotos.length}`;
  };

  const mover = salto => {
    indice = (indice + salto + fotos.length) % fotos.length;
    pintar();
  };

  // Los oyentes se reemplazan en cada apertura porque cambian las fotos.
  v.anterior.onclick = () => mover(-1);
  v.siguiente.onclick = () => mover(1);
  v.dialogo.onkeydown = evento => {
    if (evento.key === 'ArrowLeft') mover(-1);
    if (evento.key === 'ArrowRight') mover(1);
  };

  // Deslizamiento táctil. 40px de umbral: por debajo suele ser un toque torcido
  // al intentar cerrar, no un gesto.
  let inicioX = null;
  v.dialogo.onpointerdown = evento => { inicioX = evento.clientX; };
  v.dialogo.onpointerup = evento => {
    if (inicioX === null) return;
    const recorrido = evento.clientX - inicioX;
    if (Math.abs(recorrido) > 40) mover(recorrido < 0 ? 1 : -1);
    inicioX = null;
  };

  pintar();
  v.dialogo.showModal();
}

// ── El carrusel de la tarjeta ────────────────────────────

/**
 * Monta la galería sobre un bloque `.card-room__image` que ya trae su <img>.
 * Con una sola foto no monta nada: unas flechas que no llevan a ninguna parte
 * son peor que no tenerlas.
 */
function montarUna(bloque, fotos, nombrePieza) {
  if (!Array.isArray(fotos) || fotos.length < 2) return;

  const imagen = bloque.querySelector('img');
  if (!imagen) return;

  const tira = document.createElement('div');
  tira.className = 'galeria__puntos';
  const puntos = fotos.map(() => {
    const punto = document.createElement('span');
    punto.className = 'galeria__punto';
    tira.appendChild(punto);
    return punto;
  });

  let indice = 0;
  const pintar = () => {
    imagen.src = url(fotos[indice]);
    puntos.forEach((p, i) => p.classList.toggle('galeria__punto--activo', i === indice));
  };

  const mover = salto => {
    indice = (indice + salto + fotos.length) % fotos.length;
    pintar();
  };

  const anterior = boton('‹', 'galeria__flecha galeria__flecha--anterior');
  const siguiente = boton('›', 'galeria__flecha galeria__flecha--siguiente');
  anterior.setAttribute('aria-label', 'Foto anterior');
  siguiente.setAttribute('aria-label', 'Foto siguiente');
  anterior.addEventListener('click', () => mover(-1));
  siguiente.addEventListener('click', () => mover(1));

  const ampliar = boton('', 'galeria__ampliar');
  ampliar.setAttribute('aria-label', `Ver las ${fotos.length} fotos de ${nombrePieza}`);
  ampliar.addEventListener('click', () => abrirVisor(fotos, indice, nombrePieza));

  bloque.classList.add('galeria');
  bloque.append(ampliar, anterior, siguiente, tira);
  pintar();
}

/**
 * Busca los bloques de imagen que declaren su pieza y les monta la galería.
 * `raiz` permite montar sólo una tarjeta recién creada en vez de repasar todo
 * el documento.
 */
export async function montarGalerias(raiz = document) {
  const bloques = [...raiz.querySelectorAll('.card-room__image[data-habitacion]')];
  if (!bloques.length) return;

  let fotos;
  try {
    fotos = await cargarManifiesto();
  } catch (error) {
    // Sin manifiesto queda la portada, que es lo que había antes de la galería.
    console.warn('Galería no disponible:', error);
    return;
  }

  for (const bloque of bloques) {
    const id = bloque.dataset.habitacion;
    const nombre = bloque.querySelector('img')?.alt || id;
    montarUna(bloque, fotos[id], nombre);
  }
}
```

- [ ] **Step 2: Comprobar que es JavaScript válido**

```bash
node --check js/galeria.js
```

Esperado: sin salida.

- [ ] **Step 3: Commit**

```bash
git add js/galeria.js
git commit -m "Escribir el componente de galería, compartido por las dos páginas"
```

---

### Task 5: El aspecto de la galería

**Files:**
- Modify: `css/components.css`

- [ ] **Step 1: Escribir las reglas**

Al final de la sección de tarjetas de `css/components.css`:

```css
/* ── Galería ──────────────────────────────────────────── */

/* Las flechas y los puntos van dentro del bloque de imagen, que ya es
   position: relative por el badge. */
.galeria__flecha,
.galeria__ampliar {
  position: absolute;
  border: 0;
  cursor: pointer;
}

.galeria__flecha {
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  border-radius: 50%;
  /* Blanco translúcido y no color de marca: la flecha va sobre fotografías de
     tono impredecible y tiene que leerse en todas. */
  background: rgba(255, 255, 255, 0.82);
  color: var(--color-neutral-900);
  font-size: var(--text-lg);
  line-height: 1;
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.galeria__flecha--anterior { left: var(--space-2); }
.galeria__flecha--siguiente { right: var(--space-2); }

/* En un dispositivo táctil no hay hover: ahí se quedan visibles. */
.galeria:hover .galeria__flecha,
.galeria__flecha:focus-visible { opacity: 1; }

@media (hover: none) {
  .galeria__flecha { opacity: 1; }
}

/* Cubre la foto entera: el clic en cualquier parte amplía. Va debajo de las
   flechas en z-index para no robarles el clic. */
.galeria__ampliar {
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  background: transparent;
}

.galeria__puntos {
  position: absolute;
  z-index: 2;
  bottom: var(--space-3);
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: var(--space-2);
  pointer-events: none;
}

.galeria__punto {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.45);
}

.galeria__punto--activo { background: var(--color-neutral-50); }

/* ── Visor ────────────────────────────────────────────── */

.visor {
  border: 0;
  padding: 0;
  max-width: 100vw;
  max-height: 100vh;
  width: 100vw;
  height: 100vh;
  background: transparent;
  display: grid;
  place-items: center;
}

.visor::backdrop { background: rgba(13, 24, 18, 0.92); }

.visor__figura {
  margin: 0;
  max-width: min(90vw, 60rem);
  max-height: 85vh;
  display: grid;
  place-items: center;
}

.visor__imagen {
  max-width: 100%;
  max-height: 85vh;
  object-fit: contain;
  border-radius: var(--radius-md);
}

.visor__flecha,
.visor__cerrar {
  position: fixed;
  z-index: 2;
  border: 0;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.14);
  color: var(--color-neutral-50);
  display: grid;
  place-items: center;
  border-radius: 50%;
}

.visor__flecha {
  top: 50%;
  transform: translateY(-50%);
  width: 3rem;
  height: 3rem;
  font-size: var(--text-2xl);
}

.visor__flecha--anterior { left: var(--space-4); }
.visor__flecha--siguiente { right: var(--space-4); }

.visor__cerrar {
  top: var(--space-4);
  right: var(--space-4);
  width: 2.5rem;
  height: 2.5rem;
  font-size: var(--text-xl);
}

.visor__flecha:hover,
.visor__cerrar:hover { background: rgba(255, 255, 255, 0.28); }

.visor__contador {
  position: fixed;
  bottom: var(--space-5);
  left: 0;
  right: 0;
  text-align: center;
  color: var(--color-neutral-50);
  font-size: var(--text-sm);
  margin: 0;
}
```

- [ ] **Step 2: Subir la versión de la hoja**

`css/components.css` cambió, y las hojas llevan su propia versión en la URL. En `index.html` y las once páginas de `pages/`:

```bash
sed -i '' 's|components\.css?v=20260902b|components.css?v=20260910|g' index.html pages/*.html
grep -rho "components\.css?v=[0-9a-z]*" index.html pages/*.html | sort | uniq -c
```

Esperado: `11 components.css?v=20260910`.

- [ ] **Step 3: Commit**

```bash
git add css/components.css index.html pages/*.html
git commit -m "Dar forma a las flechas, los puntos y el visor"
```

---

### Task 6: Enchufar la galería en las dos páginas

**Files:**
- Modify: `pages/alojamiento.html` (los siete bloques de imagen)
- Modify: `js/alojamiento-datos.js`
- Modify: `js/reservas-ui.js`
- Test: `tests/contenido.test.js`

- [ ] **Step 1: Escribir el test que falla**

Al final de `tests/contenido.test.js`:

```javascript
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
```

- [ ] **Step 2: Correrlo y confirmar que falla**

```bash
npm test
```

Esperado: FALLA con `la ficha de llaima no marca su bloque de imagen`.

- [ ] **Step 3: Marcar los siete bloques de `alojamiento.html`**

En cada una de las siete fichas, el `<div class="card-room__image">` gana el atributo. El de Llaima queda así:

```html
            <div class="card-room__image" data-habitacion="llaima">
              <img src="../images/habitaciones/llaima.jpg" alt="Cama matrimonial junto al ventanal que da al jardín">
            </div>
```

Y lo mismo con `rukapillan`, `sierra-nevada`, `tolhuaca`, `lanin`, `sollipulli` y `lonquimay`, cada uno con el suyo. **No toques el `<img>`, ni su `src`, ni su `alt`.**

- [ ] **Step 4: Montarla en la página de alojamiento**

En `js/alojamiento-datos.js`, junto al `import` que ya existe arriba:

```javascript
import { montarGalerias } from './galeria.js?v=20260910';
```

y al final del archivo, después de la llamada que arranca la carga de precios:

```javascript
// Las fichas ya están en el HTML con su foto de portada: la galería se monta
// encima y no depende del Worker. Si falla, la página queda como estaba.
montarGalerias();
```

- [ ] **Step 5: Montarla en la página de reservas**

En `js/reservas-ui.js`, junto a los `import` de arriba:

```javascript
import { montarGalerias } from './galeria.js?v=20260910';
```

En la función que dibuja los resultados, la plantilla del bloque de imagen pasa a declarar la pieza:

```javascript
    const imagen = habitacion.imagen
      ? `<div class="card-room__image" data-habitacion="${habitacion.id}"><img src="../${habitacion.imagen}" alt="${habitacion.nombre}"></div>`
      : '';
```

Y justo después del bucle `for (const habitacion of libres)`, antes de cerrar la función:

```javascript
  // Una sola pasada al terminar de construir las filas: montarGalerias pide el
  // manifiesto una vez y lo reutiliza para todas.
  montarGalerias(contenedor);
```

- [ ] **Step 6: Subir la versión de los módulos**

Los tres archivos JavaScript cambiaron:

```bash
sed -i '' 's|alojamiento-datos\.js?v=20260901|alojamiento-datos.js?v=20260910|g' pages/alojamiento.html
sed -i '' 's|reservas-ui\.js?v=20260902|reservas-ui.js?v=20260910|g' pages/reservas.html
grep -rho "js/[a-z-]*\.js?v=[0-9a-z]*" index.html pages/*.html | sort | uniq -c
```

Esperado: `11 js/main.js?v=20260910`, `1 js/alojamiento-datos.js?v=20260910`, `1 js/reservas-ui.js?v=20260910`.

- [ ] **Step 7: Correr los tests**

```bash
npm test
node --check js/reservas-ui.js && node --check js/alojamiento-datos.js
```

Esperado: 62 tests, 0 fallos, y los dos `--check` sin salida.

- [ ] **Step 8: Commit**

```bash
git add pages/alojamiento.html pages/reservas.html js/ tests/contenido.test.js
git commit -m "Enchufar la galería en la ficha y en el listado"
```

---

### Task 7: Verificación en el navegador

Lo que falta comprobar no se lee, se mide: que la foto dejó de desbordar y que el visor funciona de verdad.

- [ ] **Step 1: Levantar una copia con el contrato real**

El Worker responde `access-control-allow-origin: https://flordelbosque.cl`, así que desde `localhost` el `fetch` de disponibilidad muere por CORS. Copiar el sitio a un directorio temporal fuera del repositorio, guardar ahí la respuesta real y apuntar la constante `API`:

```bash
S=$(mktemp -d)
cp -R css js images pages index.html "$S/" && mkdir -p "$S/api"
curl -s https://reservas.flordelbosque.cl/api/disponibilidad > "$S/api/disponibilidad"
sed -i '' "s|const API = 'https://reservas.flordelbosque.cl';|const API = '..';|" "$S/js/reservas-ui.js" "$S/js/alojamiento-datos.js"
cd "$S" && python3 -m http.server 8767
```

- [ ] **Step 2: Medir la fila**

En `http://localhost:8767/pages/reservas.html`, buscar del 20 al 23 de diciembre para 2 huéspedes y evaluar en la consola:

```javascript
const c = document.querySelector('#reservas-resultados .card-room');
const i = c.querySelector('.card-room__image').getBoundingClientRect();
({ tarjeta: Math.round(c.getBoundingClientRect().width),
   imagen: `${Math.round(i.width)}x${Math.round(i.height)}`,
   porPantalla: Math.floor(window.innerHeight / c.getBoundingClientRect().height) })
```

Esperado a 1440×900: la imagen ronda los 280px de ancho y **no pasa de 400 de alto** (antes era 1184×888), y `porPantalla` da 3 o más.

- [ ] **Step 3: Comprobar el calendario**

Al cargar, el mapa de disponibilidad debe estar plegado y verse sólo la línea «Ver disponibilidad del mes». Al abrirlo aparecen los dos meses. Recargar: sigue abierto. Cerrarlo y recargar: sigue plegado.

- [ ] **Step 4: Comprobar la galería**

En una fila con varias fotos: las flechas pasan las fotos y el punto activo las acompaña. Un clic sobre la foto abre el visor. Dentro del visor, `←` y `→` navegan, el contador avanza, `Esc` cierra y el foco vuelve a la foto. Repetir en `http://localhost:8767/pages/alojamiento.html`.

Comprobar también **Tolhuaca**, que tiene sólo dos fotos, y que ninguna pieza muestre flechas con una sola.

- [ ] **Step 5: Comprobar en móvil**

Redimensionar a 390×844. La fila vuelve a apilarse —foto arriba, datos abajo— y no hay desborde horizontal:

```javascript
document.documentElement.scrollWidth > window.innerWidth
```

Esperado: `false`. Las flechas de la galería deben verse sin necesidad de hover.

- [ ] **Step 6: Comprobar sin JavaScript**

Con JavaScript desactivado, `pages/alojamiento.html` debe seguir mostrando las siete fichas con su foto de portada, sin flechas ni puntos. Es la garantía de que la galería es mejora progresiva y no un requisito.

- [ ] **Step 7: Limpiar y commitear**

```bash
rm -rf "$S"
cd /Users/la/Documents/FLORDELBOSQUE/guesthouse-villarrica
git status --short
```

Esperado: árbol limpio. Si Playwright dejó capturas sueltas, moverlas fuera del repositorio antes de continuar.

---

## Lo que queda para la propietaria

1. **Sierra Nevada** se vende como Twin con «2 camas» y sus cuatro fotos muestran una sola cama tendida como matrimonial. Sigue sin resolverse desde la tanda anterior, y ahora se ve cuatro veces en vez de una.
2. **Hasta el 13 de diciembre no hay nada para 3 o 4 huéspedes:** Lanín y Sollipulli son las únicas piezas de más de dos plazas y las dos están bloqueadas.
3. **DMARC** sigue sin publicarse: `TXT _dmarc` → `v=DMARC1; p=none; rua=mailto:hola@flordelbosque.cl; fo=1`.
