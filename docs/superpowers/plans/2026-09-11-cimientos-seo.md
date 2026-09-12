# Cimientos de SEO — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que Google pueda rastrear el sitio entero, entender qué es Flor del Bosque y mostrarlo por las búsquedas donde sí se puede competir.

**Architecture:** Tres piezas. Una herramienta, `tools/sitemap.py`, recorre los HTML del repositorio y genera `sitemap.xml`, para que no envejezca al agregar una página. Otra, `tools/schema-hotel.py`, construye los datos estructurados de la portada desde `docs/habitaciones-airtable.csv`, de modo que el catálogo y lo que lee Google no se separen. El resto son ediciones acotadas en el `<head>` de las once páginas —canónica, título, descripción— y en tres `<h1>`.

**Tech Stack:** HTML estático, Python 3 sin dependencias externas, tests con `node:test`.

**Spec:** `docs/superpowers/specs/2026-09-11-cimientos-seo-design.md`

---

## Contexto que el implementador necesita

**El sitio está en producción.** GitHub Pages sirve desde `main` y el dominio es `https://flordelbosque.cl`. Mergear es publicar.

**Cada página ya declara su dirección en `og:url`**, y es correcta en las once. La canónica sale de ahí: no hay que inventarla ni derivarla del nombre del archivo.

**`pages/en.html` no es la traducción de la portada**, sino una landing suelta en inglés. El `hreflang` de `index.html` la declara como alternativa, lo cual es falso.

**Los textos de las habitaciones viven en `docs/habitaciones-airtable.csv`**, generado por `tools/habitaciones.py`. Los datos estructurados de la portada se generan desde ahí, nunca a mano.

**Dato del negocio, ya presente en el sitio:** teléfono `+56 9 8548 8233`, correo `hola@flordelbosque.cl`, Instagram `hostalflordelbosque`, coordenadas `-39.2614638, -72.2383335` (del mapa de `pages/contacto.html`).

**Lo que NO se toca:** el sitio en inglés con direcciones propias es otra tanda. `pages/matrimonios.html` ya tiene su título optimizado y sus propios datos estructurados.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `robots.txt` | **Crear.** Permitir el rastreo y señalar el sitemap. |
| `tools/sitemap.py` | **Crear.** Recorre los HTML y escribe `sitemap.xml`. |
| `sitemap.xml` | **Generar.** Salida de la herramienta. |
| `tools/schema-hotel.py` | **Crear.** Construye el bloque `Hotel` desde el catálogo y lo inserta en `index.html`. |
| `index.html` | **Modificar.** Canónica, título, `hreflang`, datos estructurados. |
| `pages/*.html` | **Modificar.** Canónica, títulos, descripciones, tres `<h1>`. |
| `tests/contenido.test.js` | **Modificar.** Tests de canónica, sitemap, límites y datos estructurados. |

---

### Task 1: robots.txt y el sitemap

**Files:**
- Create: `robots.txt`, `tools/sitemap.py`
- Generate: `sitemap.xml`
- Test: `tests/contenido.test.js`

- [ ] **Step 1: Escribir los tests que fallan**

Al final de `tests/contenido.test.js`:

```javascript
// ── Rastreo ──────────────────────────────────────────────
//
// robots.txt y sitemap.xml son lo primero que pide un buscador. El sitemap lo
// genera tools/sitemap.py: si alguien agrega una página y no lo vuelve a
// correr, Google no se entera de que existe. Estos tests lo detectan.

const paginas = ['index.html', ...readdirSync(ruta('pages'))
  .filter(f => f.endsWith('.html'))
  .map(f => `pages/${f}`)];

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
```

Y arriba, junto a los demás `import`, agregar `readdirSync`:

```javascript
import { readFileSync, existsSync, readdirSync } from 'node:fs';
```

(la línea ya existe con los dos primeros; hay que ampliarla, no duplicarla).

- [ ] **Step 2: Correrlos y confirmar que fallan**

```bash
npm test
```

Esperado: FALLA al leer `robots.txt`, con `ENOENT`, porque el archivo no existe.

- [ ] **Step 3: Escribir `robots.txt`**

```
# Flor del Bosque — https://flordelbosque.cl
#
# Todo el sitio es público y se quiere rastreado. Lo único que se excluye es
# docs/, que guarda material de trabajo —specs, planes, capturas— y no aporta
# nada a quien busca dónde alojar en Villarrica.

User-agent: *
Allow: /
Disallow: /docs/

Sitemap: https://flordelbosque.cl/sitemap.xml
```

- [ ] **Step 4: Escribir `tools/sitemap.py`**

```python
#!/usr/bin/env python3
"""Genera sitemap.xml recorriendo los HTML del repositorio.

Escrito a mano, un sitemap se desactualiza al segundo cambio: alguien agrega
una página, olvida el sitemap, y Google nunca la ve. Generándolo, el olvido
posible es no correr esta herramienta, y de eso avisa un test.

La dirección de cada página sale de su `og:url`, que ya está bien puesta en
las once, en vez de derivarla del nombre del archivo. Así hay un solo lugar
donde vive la dirección canónica de una página.

La fecha de modificación sale de git, no del sistema de archivos: al clonar
el repositorio, la fecha del archivo es la del clon y no dice nada.

Uso: python3 tools/sitemap.py
"""
import pathlib
import re
import subprocess
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "sitemap.xml"

# docs/ se sirve público pero no interesa a nadie que busque alojamiento, y
# robots.txt lo excluye: nombrarlo aquí sería contradecirse.
EXCLUIDOS = {"docs"}


def paginas():
    for f in sorted(RAIZ.glob("*.html")) + sorted(RAIZ.glob("pages/*.html")):
        if f.relative_to(RAIZ).parts[0] not in EXCLUIDOS:
            yield f


def direccion(archivo):
    """La canónica declarada por la propia página."""
    texto = archivo.read_text(encoding="utf-8")
    m = re.search(r'property="og:url" content="([^"]+)"', texto)
    if not m:
        sys.exit(f"{archivo.relative_to(RAIZ)} no declara og:url; sin eso no sé su dirección.")
    return m.group(1)


def modificado(archivo):
    """Última fecha en que git vio cambiar el archivo, en formato ISO corto."""
    r = subprocess.run(
        ["git", "-C", str(RAIZ), "log", "-1", "--format=%cs", "--", str(archivo)],
        capture_output=True, text=True,
    )
    return r.stdout.strip() or None


def main():
    lineas = ['<?xml version="1.0" encoding="UTF-8"?>',
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    total = 0
    for archivo in paginas():
        lineas.append("  <url>")
        lineas.append(f"    <loc>{direccion(archivo)}</loc>")
        fecha = modificado(archivo)
        if fecha:
            lineas.append(f"    <lastmod>{fecha}</lastmod>")
        lineas.append("  </url>")
        total += 1
    lineas.append("</urlset>")

    SALIDA.write_text("\n".join(lineas) + "\n", encoding="utf-8")
    print(f"{total} páginas -> {SALIDA.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 5: Generarlo**

```bash
python3 tools/sitemap.py
```

Esperado: `11 páginas -> sitemap.xml`.

- [ ] **Step 6: Comprobar que es XML válido**

```bash
python3 -c "
import xml.etree.ElementTree as ET
t = ET.parse('sitemap.xml')
locs = [e.text for e in t.iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
print(len(locs), 'direcciones')
print('\n'.join(locs))
"
```

Esperado: 11 direcciones, empezando por `https://flordelbosque.cl/`.

- [ ] **Step 7: Correr los tests**

```bash
npm test
```

Esperado: 66 tests, 0 fallos (63 más los 3 nuevos).

- [ ] **Step 8: Commit**

```bash
git add robots.txt sitemap.xml tools/sitemap.py tests/contenido.test.js
git commit -m "Dejar que Google rastree el sitio entero"
```

---

### Task 2: La dirección canónica de las once páginas

**Files:**
- Modify: `index.html`, `pages/*.html`
- Test: `tests/contenido.test.js`

- [ ] **Step 1: Escribir el test que falla**

Al final de `tests/contenido.test.js`:

```javascript
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
```

- [ ] **Step 2: Correrlo y confirmar que falla**

```bash
npm test
```

Esperado: FALLA con `index.html no declara canónica`.

- [ ] **Step 3: Insertar la canónica en cada página**

Va inmediatamente antes del comentario `<!-- Open Graph -->`, tomando el valor del `og:url` de esa misma página. En `index.html`:

```html
  <!-- Dirección canónica: sin ella, "/" y "/index.html" compiten entre sí -->
  <link rel="canonical" href="https://flordelbosque.cl/">

  <!-- Open Graph -->
```

Y en cada página de `pages/`, con su propia dirección: por ejemplo `pages/alojamiento.html` lleva `href="https://flordelbosque.cl/pages/alojamiento.html"`.

Hazlo con un script en vez de a mano, para que el valor salga del `og:url` de cada archivo y no de una transcripción:

```bash
python3 - <<'PYEOF'
import pathlib, re
raiz = pathlib.Path('.')
for f in [raiz / 'index.html'] + sorted(raiz.glob('pages/*.html')):
    t = f.read_text(encoding='utf-8')
    if 'rel="canonical"' in t:
        print(f'{f}: ya la tenía'); continue
    url = re.search(r'property="og:url" content="([^"]+)"', t).group(1)
    marca = '  <!-- Open Graph -->'
    assert marca in t, f'{f}: no encuentro el bloque Open Graph'
    canonica = ('  <!-- Dirección canónica: sin ella, dos direcciones que sirven\n'
                '       lo mismo compiten entre sí -->\n'
                f'  <link rel="canonical" href="{url}">\n\n')
    f.write_text(t.replace(marca, canonica + marca, 1), encoding='utf-8')
    print(f'{f}: {url}')
PYEOF
```

- [ ] **Step 4: Correr los tests**

```bash
npm test
```

Esperado: 67 tests, 0 fallos.

- [ ] **Step 5: Commit**

```bash
git add index.html pages/ tests/contenido.test.js
git commit -m "Declarar la dirección canónica de cada página"
```

---

### Task 3: Títulos, descripciones y los tres H1 mudos

**Files:**
- Modify: `index.html`, `pages/*.html`
- Test: `tests/contenido.test.js`

- [ ] **Step 1: Escribir el test que falla**

```javascript
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
```

- [ ] **Step 2: Correrlo y confirmar que falla**

```bash
npm test
```

Esperado: FALLA dos veces: `pages/coliving.html: descripción de 200 caracteres` y `pages/alojamiento.html: el título no nombra el lugar — "Alojamiento | Flor del Bosque"`.

- [ ] **Step 3: Reemplazar los títulos**

Cada título va en tres lugares del `<head>`: `<title>`, `og:title` y `twitter:title`. Los tres tienen que quedar iguales.

| Archivo | Título nuevo |
|---|---|
| `index.html` | `Flor del Bosque \| Hostal frente al Volcán Villarrica` |
| `pages/alojamiento.html` | `Habitaciones a orillas del Río Toltén \| Flor del Bosque` |
| `pages/coliving.html` | `Coliving para nómadas en Villarrica \| Flor del Bosque` |
| `pages/cowork.html` | `CoWork y café en Villarrica \| Flor del Bosque` |
| `pages/experiencias.html` | `Retiros y talleres en Villarrica \| Flor del Bosque` |
| `pages/agenda.html` | `Agenda de talleres y eventos, Villarrica \| Flor del Bosque` |
| `pages/nosotros.html` | `Nuestra historia \| Flor del Bosque, Villarrica` |
| `pages/contacto.html` | `Cómo llegar y contacto \| Flor del Bosque, Villarrica` |
| `pages/reservas.html` | `Reservar habitación en Villarrica \| Flor del Bosque` |
| `pages/matrimonios.html` | **sin cambio** |
| `pages/en.html` | **sin cambio** |

- [ ] **Step 4: Recortar las dos descripciones que se pasan**

`pages/coliving.html` tiene 200 caracteres y `pages/en.html` 234. Google corta en 160, y corta a mitad de frase. Van también en `og:description` y `twitter:description`, que tienen que quedar iguales.

`pages/coliving.html`:

```
Coliving en Villarrica para nómadas digitales: habitación privada, cowork con fibra, cocina compartida y bosque alrededor. Estadías por semana o por mes.
```

`pages/en.html`:

```
Live and work from Villarrica, Chile: private rooms, coworking with fibre internet, shared kitchen and native forest by the Toltén river.
```

- [ ] **Step 5: Cambiar los tres H1 que no dicen nada**

Los evocativos se conservan. Sólo estos tres:

| Archivo | H1 hoy | H1 nuevo |
|---|---|---|
| `pages/alojamiento.html` | `Alojamiento` | `Habitaciones a orillas del Río Toltén` |
| `pages/experiencias.html` | `Experiencias` | `Retiros, talleres y experiencias` |
| `pages/contacto.html` | `Contacto` | `Cómo llegar a Flor del Bosque` |

**Ojo:** esos `<h1>` pueden llevar `data-i18n`. Si lo llevan, hay que cambiar también el texto en los dos diccionarios de `js/main.js`, o el cambio se deshace al cargar la página. Compruébalo con `grep -n '<h1' pages/alojamiento.html pages/experiencias.html pages/contacto.html`.

- [ ] **Step 6: Correr los tests**

```bash
npm test
```

Esperado: 69 tests, 0 fallos.

- [ ] **Step 7: Commit**

```bash
git add index.html pages/ js/main.js tests/contenido.test.js
git commit -m "Decir en los títulos dónde queda Flor del Bosque"
```

---

### Task 4: Los datos estructurados de la portada

**Files:**
- Create: `tools/schema-hotel.py`
- Modify: `index.html`
- Test: `tests/contenido.test.js`

- [ ] **Step 1: Escribir los tests que fallan**

```javascript
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
  assert.ok(hotel.address.streetAddress, 'la dirección no trae calle');
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
```

- [ ] **Step 2: Correrlos y confirmar que fallan**

```bash
npm test
```

Esperado: FALLA con `al Hotel le falta telephone` y `las habitaciones de los datos estructurados no son las del catálogo`.

- [ ] **Step 3: Escribir `tools/schema-hotel.py`**

```python
#!/usr/bin/env python3
"""Construye los datos estructurados de la portada desde el catálogo.

Google arma la ficha de un alojamiento con estos campos. Escribirlos a mano
significa que el día que cambie una tarifa o entre una habitación, el sitio
diga una cosa y Google otra, sin que nada se queje. Las habitaciones salen de
docs/habitaciones-airtable.csv, el mismo archivo del que vive la página de
alojamiento.

Los datos del negocio no salen del CSV porque no están ahí: son del sitio
—teléfono y correo de contacto, coordenadas del mapa— y se declaran acá.

Uso: python3 tools/schema-hotel.py
"""
import csv
import json
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
CATALOGO = RAIZ / "docs" / "habitaciones-airtable.csv"
PORTADA = RAIZ / "index.html"

NEGOCIO = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    "name": "Flor del Bosque",
    "description": "Alojamiento en entorno natural a orillas del Río Toltén, "
                   "con vista al Volcán Villarrica.",
    "url": "https://flordelbosque.cl/",
    "image": "https://flordelbosque.cl/images/og-image.jpg",
    "telephone": "+56985488233",
    "email": "hola@flordelbosque.cl",
    "priceRange": "CLP 50.000–55.000",
    "currenciesAccepted": "CLP",
    "address": {
        "@type": "PostalAddress",
        "streetAddress": "Orillas del Río Toltén",
        "addressLocality": "Villarrica",
        "addressRegion": "La Araucanía",
        "addressCountry": "CL",
    },
    # Del mapa incrustado en pages/contacto.html.
    "geo": {"@type": "GeoCoordinates", "latitude": -39.2614638, "longitude": -72.2383335},
    "sameAs": ["https://instagram.com/hostalflordelbosque"],
    "amenityFeature": [
        {"@type": "LocationFeatureSpecification", "name": n, "value": True}
        for n in ["WiFi", "Estacionamiento", "Piscina", "CoWork",
                  "Desayuno", "Cocina compartida", "Jardín"]
    ],
}


def habitaciones():
    with CATALOGO.open(encoding="utf-8") as f:
        for fila in csv.DictReader(f):
            if fila["activa"].strip().lower() != "true":
                continue
            yield {
                "@type": "Offer",
                "itemOffered": {
                    "@type": "HotelRoom",
                    "name": fila["nombre"],
                    "description": fila["descripcion_es"],
                    "occupancy": {
                        "@type": "QuantitativeValue",
                        "maxValue": int(fila["capacidad"]),
                    },
                },
                "price": fila["precio_noche"],
                "priceCurrency": "CLP",
            }


def main():
    if not CATALOGO.is_file():
        sys.exit(f"No existe {CATALOGO.relative_to(RAIZ)}.")

    datos = dict(NEGOCIO)
    datos["makesOffer"] = list(habitaciones())
    bloque = json.dumps(datos, ensure_ascii=False, indent=2)

    texto = PORTADA.read_text(encoding="utf-8")
    patron = re.compile(
        r'(<script type="application/ld\+json">)[\s\S]*?(</script>)')
    if not patron.search(texto):
        sys.exit("index.html no tiene un bloque de datos estructurados que reemplazar.")
    # Sólo el primero: si mañana la portada suma otro bloque —unas preguntas
    # frecuentes, por ejemplo— no hay que pisarlo.
    nuevo = patron.sub(lambda m: f"{m.group(1)}\n{bloque}\n  {m.group(2)}", texto, count=1)
    PORTADA.write_text(nuevo, encoding="utf-8")
    print(f"Hotel con {len(datos['makesOffer'])} habitaciones -> index.html")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Generarlo**

```bash
python3 tools/schema-hotel.py
```

Esperado: `Hotel con 7 habitaciones -> index.html`.

- [ ] **Step 5: Comprobar que el HTML no se rompió**

```bash
python3 -c "
import re, json, pathlib
t = pathlib.Path('index.html').read_text()
b = re.findall(r'<script type=\"application/ld\+json\">([\s\S]*?)</script>', t)
print(len(b), 'bloque(s)')
d = json.loads(b[0])
print('tipo:', d['@type'], '| habitaciones:', len(d['makesOffer']))
print('teléfono:', d['telephone'], '| geo:', d['geo']['latitude'], d['geo']['longitude'])
"
```

Esperado: un bloque, tipo `Hotel`, 7 habitaciones, teléfono y coordenadas.

- [ ] **Step 6: Correr los tests**

```bash
npm test
```

Esperado: 72 tests, 0 fallos.

- [ ] **Step 7: Commit**

```bash
git add tools/schema-hotel.py index.html tests/contenido.test.js
git commit -m "Describirle a Google qué es Flor del Bosque"
```

---

### Task 5: El hreflang que promete lo que no hay

**Files:**
- Modify: `index.html`, `pages/en.html`

- [ ] **Step 1: Mirar qué declaran hoy**

```bash
grep -n 'hreflang' index.html pages/en.html
```

Esperado: dos líneas en cada archivo, declarando `es` → `https://flordelbosque.cl/` y `en` → `https://flordelbosque.cl/pages/en.html`.

- [ ] **Step 2: Quitar la declaración falsa**

`pages/en.html` no es la traducción de la portada: es una landing distinta, sobre vivir y trabajar en la Patagonia. Declararlas como alternativas de idioma le dice a Google que son la misma página en dos idiomas, y no lo son. Google lo detecta y descarta la señal; en el peor caso, muestra la página equivocada.

Quitar de **`index.html`** las dos líneas:

```html
  <!-- Language alternates -->
  <link rel="alternate" hreflang="es" href="https://flordelbosque.cl/">
  <link rel="alternate" hreflang="en" href="https://flordelbosque.cl/pages/en.html">
```

y dejar en su lugar:

```html
  <!-- Sin alternativas de idioma todavía: pages/en.html es una landing propia,
       no la traducción de esta página. Las direcciones /en/ de verdad son la
       tanda siguiente, y ahí vuelve el hreflang. -->
```

Hacer lo mismo en **`pages/en.html`**, con el comentario adaptado a esa página.

- [ ] **Step 3: Comprobar que no quedó ninguna**

```bash
grep -c hreflang index.html pages/*.html
```

Esperado: `0` en todas.

- [ ] **Step 4: Commit**

```bash
git add index.html pages/en.html
git commit -m "Dejar de declarar una traducción que no existe"
```

---

### Task 6: Verificación en producción

Los tests comprueban el contenido del repositorio. Lo que falta es que funcione servido.

- [ ] **Step 1: Mergear y publicar**

```bash
git checkout main && git merge worktree-seo
npm test
git push
```

El merge tiene que ser limpio y los 72 tests verdes **sobre el resultado del
merge**, no sólo en la rama: mergear es publicar.

- [ ] **Step 2: Comprobar que los archivos nuevos responden**

```bash
for u in robots.txt sitemap.xml; do
  printf "%-14s %s\n" "$u" "$(curl -s -o /dev/null -w '%{http_code} %{content_type}' https://flordelbosque.cl/$u)"
done
```

Esperado: `200` en los dos. El sitemap debe salir como `application/xml` o `text/xml`.

- [ ] **Step 3: Comprobar las canónicas servidas**

```bash
for p in "" pages/alojamiento.html pages/reservas.html; do
  echo "https://flordelbosque.cl/$p"
  curl -s "https://flordelbosque.cl/$p" | grep -o '<link rel="canonical"[^>]*'
done
```

Esperado: cada página declara su propia dirección.

- [ ] **Step 4: Validar los datos estructurados**

Pegar `https://flordelbosque.cl/` en la prueba de resultados enriquecidos de Google: `https://search.google.com/test/rich-results`.

Esperado: detecta un `Hotel` sin errores. Las advertencias sobre campos recomendados que faltan (`starRating`, `checkinTime`) son aceptables: no los tenemos confirmados y **no se inventan**.

- [ ] **Step 5: Enviar el sitemap**

Esto depende de que la propietaria haya verificado el dominio en Search Console. Si todavía no, queda anotado en el informe final y se hace después.

---

## Lo que queda del lado de la propietaria

Está detallado en el spec y va al informe final. En resumen, y por orden de impacto:

1. **Reabrir la ficha de Google**, que hoy dice «Cerrado temporalmente». Es lo que más pesa de todo este trabajo y no se puede hacer desde el código.
2. **Search Console**, verificar el dominio y enviar el sitemap.
3. **Una sola dirección oficial**, usada igual en el sitio, en Google y en los portales.
4. **Reclamar Tripadvisor**, que tiene 36 reseñas con 4,7.
5. **Listarse en matrimonios.cl e invitalo.cl**, que son los que ocupan los primeros lugares de esa búsqueda.
