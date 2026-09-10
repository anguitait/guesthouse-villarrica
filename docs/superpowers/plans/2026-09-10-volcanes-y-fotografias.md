# Volcanes y fotografías — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renombrar las siete habitaciones a volcanes, publicar las primeras fotografías reales de todas ellas, aplicar las tarifas nuevas y bloquear el segundo piso entre el 22 de septiembre y el 13 de diciembre de 2026.

**Architecture:** El catálogo de habitaciones pasa a tener un único origen ejecutable, `tools/habitaciones.py`, que escribe el CSV versionado y empuja los mismos datos a Airtable. El sitio estático (`index.html`, `pages/alojamiento.html`, `js/main.js`) se edita a mano, y un test nuevo, `tests/contenido.test.js`, verifica que los tres archivos digan lo mismo que el CSV: es la única defensa contra un renombre de 210 lugares hecho a mano. Las fotos se procesan con `tools/prep-fotos.py` desde la carpeta ignorada `docs/CambiosFDB/` hacia `images/habitaciones/`.

**Tech Stack:** HTML/CSS/JS sin framework, ES modules. Tests con `node:test`. Python 3 con Pillow para imágenes. Airtable REST API. Cloudflare Worker + KV ya desplegados.

**Spec:** `docs/superpowers/specs/2026-09-10-volcanes-y-fotografias-design.md`

---

## Contexto que el implementador necesita

**El material de origen está ignorado a propósito.** `docs/CambiosFDB/` no está en git porque `docs/` se sirve público y esa carpeta trae cotizaciones con nombre de cliente. Existe en el disco de la máquina de trabajo. Si no está, el paso de fotos no puede correr y hay que pedirla de nuevo.

**Las carpetas de fotos de Llaima y Rukapillán vienen cruzadas.** Es deliberado, está decidido en el spec, y las rutas de este plan ya vienen corregidas. No "arreglar" lo que parece un error de tipeo.

**Airtable es la fuente de verdad en producción.** El CSV es la copia versionada y legible; el sitio lee el Worker, que lee Airtable. Un cambio que no llegue a Airtable no se ve en flordelbosque.cl.

**El campo `categoria` es un Single select.** Airtable rechaza en silencio un valor que no exista en la lista de opciones. Hay que agregar `Habitación Cuádruple – Literas` desde la interfaz antes de correr la sincronización.

**Los nombres viejos y sus slugs:** Magnolio→llaima, Arrayán→rukapillan, Canelo→sierra-nevada, Laurel→tolhuaca, Coihue→lanin, Fuinque→sollipulli, Tineo→lonquimay.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `tools/habitaciones.py` | **Crear.** Los siete registros como dato, y dos salidas: el CSV y el `PATCH` a Airtable. |
| `tools/prep-fotos.py` | **Crear.** Convierte una foto de origen en una imagen publicable: rotación EXIF, reescalado, limpieza de metadatos. |
| `tests/contenido.test.js` | **Crear.** Amarra CSV, `alojamiento.html`, `index.html` y `main.js` entre sí. |
| `docs/habitaciones-airtable.csv` | **Regenerar.** Salida de `tools/habitaciones.py --csv`. |
| `images/habitaciones/*.jpg` | **Crear.** Siete fotos, una por pieza. |
| `pages/alojamiento.html` | **Modificar.** Siete fichas: nombres, textos, `id`, y `<img>` en lugar del placeholder. |
| `js/main.js` | **Modificar.** 116 claves i18n en los dos diccionarios. |
| `index.html` | **Modificar.** Tres piezas destacadas y sus anclas. |

---

### Task 1: El procesador de fotos

**Files:**
- Create: `tools/prep-fotos.py`

- [ ] **Step 1: Escribir la herramienta**

Es hermana de `tools/prep-images.py`, que recorta la marca de agua del lote antiguo. Ésta hace lo otro: endereza, reescala y limpia. Lee `docs/CambiosFDB/`, que está fuera de git.

```python
#!/usr/bin/env python3
"""Convierte una foto del lote de la propietaria en una imagen publicable.

Tres cosas que no son opcionales:

1. La rotación EXIF. Veintitrés fotos del lote de septiembre de 2026 vienen
   con orientación 6 (giradas 90°). El navegador respeta ese campo, pero
   `object-fit: cover` recorta ANTES de rotar y el resultado sale de canto.
   Se rota de verdad y se guarda sin el campo.
2. El reescalado a 1250px de ancho, que es el formato del resto del sitio.
   Los originales pesan entre 2,5 y 3,7 MB: publicarlos tal cual triplicaría
   el peso de la página de alojamiento.
3. La limpieza de metadatos. Las fotos de teléfono traen GPS con la
   ubicación exacta de la casa.

El origen vive en docs/CambiosFDB/, que está en .gitignore porque docs/ se
sirve público. Si la carpeta no existe, este script no tiene nada que hacer.

Uso: python3 tools/prep-fotos.py
"""
import pathlib
import sys

from PIL import Image, ImageOps

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ORIGEN = RAIZ / "docs" / "CambiosFDB"
DESTINO = RAIZ / "images" / "habitaciones"
ANCHO = 1250
CALIDAD = 82

# La foto principal de cada pieza. Ojo: las carpetas de Llaima y Rukapillán
# vienen cruzadas respecto de la planilla, y la planilla es la que manda.
# Ver docs/superpowers/specs/2026-09-10-volcanes-y-fotografias-design.md
FOTOS = {
    "llaima":        "Habitación Volcán Rukapillan  /FB2027_10.jpg",
    "rukapillan":    "Habitación Volcán Llaima/20260909_151428.jpg",
    "sierra-nevada": "Habitación Volcán Sierra Nevada /20260909_151844.jpg",
    "tolhuaca":      "Habitación Volcán Tolhuaca /20260909_151631.jpg",
    "lanin":         "Habitación Volcán Lanin /FB2027_2.jpg",
    "sollipulli":    "Habitación Volcán Sollipulli/FB2027_4.jpg",
    "lonquimay":     "Habitación Volcán Lonquimay /FB2027_7.jpg",
}


def procesar(origen, destino):
    with Image.open(origen) as im:
        im = ImageOps.exif_transpose(im)
        im = im.convert("RGB")
        if im.width > ANCHO:
            alto = round(im.height * ANCHO / im.width)
            im = im.resize((ANCHO, alto), Image.LANCZOS)
        limpia = Image.new("RGB", im.size)
        limpia.putdata(list(im.getdata()))
        limpia.save(destino, "JPEG", quality=CALIDAD, optimize=True)
    return destino


def main():
    if not ORIGEN.is_dir():
        sys.exit(f"No existe {ORIGEN}. Es material sin versionar: hay que pedirlo.")

    DESTINO.mkdir(parents=True, exist_ok=True)
    faltan = []

    for slug, relativa in FOTOS.items():
        origen = ORIGEN / relativa
        if not origen.is_file() or origen.stat().st_size == 0:
            faltan.append(f"{slug}: {relativa}")
            continue
        destino = DESTINO / f"{slug}.jpg"
        procesar(origen, destino)
        kb = destino.stat().st_size // 1024
        print(f"{slug:<14} {destino.relative_to(RAIZ)}  {kb} KB")

    if faltan:
        sys.exit("Faltan fotos de origen:\n  " + "\n  ".join(faltan))

    print(f"\n{len(FOTOS)} fotos listas en {DESTINO.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Correrla**

```bash
python3 tools/prep-fotos.py
```

Esperado: siete líneas, una por pieza, cada archivo entre 100 y 400 KB, y `7 fotos listas en images/habitaciones`.

- [ ] **Step 3: Verificar que quedaron derechas y del ancho correcto**

```bash
python3 -c "
from PIL import Image
import pathlib
for f in sorted(pathlib.Path('images/habitaciones').glob('*.jpg')):
    im = Image.open(f)
    print(f.name, im.size, 'EXIF orient:', im.getexif().get(274))
"
```

Esperado: los siete slugs nuevos con ancho 1250 y `EXIF orient: None`. `habitacion-verde.jpg` sigue ahí a 1250x776; se borra en el Task 3, cuando ya nadie la referencie.

- [ ] **Step 4: Commit**

```bash
git add tools/prep-fotos.py images/habitaciones/
git commit -m "Publicar las primeras fotografías de las siete habitaciones"
```

---

### Task 2: El catálogo de habitaciones

**Files:**
- Create: `tools/habitaciones.py`
- Modify: `docs/habitaciones-airtable.csv` (se reescribe entero)

- [ ] **Step 1: Escribir la herramienta**

```python
#!/usr/bin/env python3
"""El catálogo de las siete habitaciones, en un solo lugar.

Airtable es la fuente de verdad en producción, pero es una base remota que
nadie puede revisar en un diff. Este archivo es la copia legible: se edita
acá, se escribe el CSV versionado y se empuja lo mismo a Airtable.

  python3 tools/habitaciones.py --csv        escribe docs/habitaciones-airtable.csv
  python3 tools/habitaciones.py --airtable   empuja a Airtable (pide confirmación)
  python3 tools/habitaciones.py --airtable --dry-run   muestra sin escribir

Para --airtable hacen falta dos variables de entorno:

  AIRTABLE_TOKEN     token con data.records:write sobre la base
  AIRTABLE_BASE_ID   el id que empieza con "app"

OJO con `categoria`: es un Single select. Este script no manda `typecast`,
así que un valor que no esté en la lista de opciones NO se ignora en
silencio: la API responde 422 INVALID_MULTIPLE_CHOICE_OPTIONS, el PATCH
entero se cae, no se escribe ni un registro y el error sale por pantalla.
El riesgo, entonces, es quedarse sin hacer nada: hay que crear la opción
"Habitación Cuádruple – Literas" desde la interfaz antes de correr esto.
"""
import argparse
import csv
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CSV = RAIZ / "docs" / "habitaciones-airtable.csv"

CAMPOS = [
    "id", "nombre", "categoria", "precio_noche", "capacidad", "metros2",
    "descripcion_es", "descripcion_en", "caracteristicas_es",
    "caracteristicas_en", "imagen", "activa", "orden",
]

# Los campos numéricos de Airtable: un "" en cualquiera de ellos hace fallar
# el PATCH entero, así que los vacíos se omiten al empujar. Los de texto
# viajan siempre, incluso vacíos (ver `empujar`).
NUMERICOS = {"precio_noche", "capacidad", "metros2", "orden"}

# precio_noche es temporada BAJA CON DESAYUNO. Cambió de significado en
# septiembre de 2026: antes era sin desayuno, y por eso ya no aparece la
# frase que ofrecía agregarlo por $5.000. La temporada alta no es
# representable: hay un solo campo de precio.
HABITACIONES = [
    {
        "id": "llaima",
        "nombre": "Volcán Llaima",
        "categoria": "Habitación Doble – Baño Compartido",
        "precio_noche": 50000,
        "capacidad": 2,
        "metros2": "",
        "descripcion_es": "Habitación del primer piso con cama matrimonial y piso de madera. Cuenta con un gran clóset, veladores con lámparas y un ventanal con salida directa al jardín. Comparte un baño completo con ducha con la habitación Volcán Rukapillán.",
        "descripcion_en": "Ground-floor room with a double bed and wooden floors. It features a large closet, bedside tables with lamps and a full-height window opening directly onto the garden. Shares a full bathroom with shower with the Volcán Rukapillán room.",
        "caracteristicas_es": "Cama matrimonial\nBaño compartido con ducha (con Volcán Rukapillán)\nSalida directa al jardín\nVentanal al jardín\nClóset amplio\nPiso de madera\nVeladores con lámparas\nPrimer piso",
        "caracteristicas_en": "Double bed\nShared bathroom with shower (with Volcán Rukapillán)\nDirect garden access\nGarden-facing picture window\nLarge closet\nWooden floors\nBedside tables with lamps\nGround floor",
        "imagen": "images/habitaciones/llaima.jpg",
        "activa": "true",
        "orden": 1,
    },
    {
        "id": "rukapillan",
        "nombre": "Volcán Rukapillán",
        "categoria": "Habitación Twin – Baño Compartido",
        "precio_noche": 50000,
        "capacidad": 2,
        "metros2": "",
        "descripcion_es": "Habitación del primer piso con dos camas y escritorio de trabajo, piso de madera y gran clóset. Ventanal con salida directa al jardín y veladores con lámparas. Comparte un baño completo con ducha con la habitación Volcán Llaima.",
        "descripcion_en": "Ground-floor room with two beds and a work desk, wooden floors and a large closet. Full-height window with direct garden access and bedside tables with lamps. Shares a full bathroom with shower with the Volcán Llaima room.",
        "caracteristicas_es": "2 camas\nEscritorio\nBaño compartido con ducha (con Volcán Llaima)\nSalida directa al jardín\nVentanal al jardín\nClóset amplio\nPiso de madera\nVeladores con lámparas\nPrimer piso",
        "caracteristicas_en": "2 beds\nDesk\nShared bathroom with shower (with Volcán Llaima)\nDirect garden access\nGarden-facing picture window\nLarge closet\nWooden floors\nBedside tables with lamps\nGround floor",
        "imagen": "images/habitaciones/rukapillan.jpg",
        "activa": "true",
        "orden": 2,
    },
    {
        "id": "sierra-nevada",
        "nombre": "Volcán Sierra Nevada",
        "categoria": "Habitación Twin – Baño Exterior",
        "precio_noche": 55000,
        "capacidad": 2,
        "metros2": "",
        "descripcion_es": "Habitación del primer piso con dos camas y clóset amplio, piso de madera y ventanal con salida directa al jardín. El baño completo con ducha se encuentra fuera de la habitación y es de uso exclusivo.",
        "descripcion_en": "Ground-floor room with two beds and a spacious closet, wooden floors and a full-height window opening onto the garden. The full bathroom with shower is for the exclusive use of this room and is located just outside it.",
        "caracteristicas_es": "2 camas\nBaño con ducha fuera de la habitación, de uso exclusivo\nSalida directa al jardín\nVentanal al jardín\nClóset amplio\nPiso de madera\nVeladores con lámparas\nPrimer piso",
        "caracteristicas_en": "2 beds\nExclusive-use bathroom with shower, outside the room\nDirect garden access\nGarden-facing picture window\nSpacious closet\nWooden floors\nBedside tables with lamps\nGround floor",
        "imagen": "images/habitaciones/sierra-nevada.jpg",
        "activa": "true",
        "orden": 3,
    },
    {
        "id": "tolhuaca",
        "nombre": "Volcán Tolhuaca",
        "categoria": "Habitación Doble",
        "precio_noche": 55000,
        "capacidad": 2,
        "metros2": "",
        "descripcion_es": "Habitación del primer piso con baño privado dentro de la habitación y ducha. Gran clóset, piso de madera y ventanal con salida directa al jardín.",
        "descripcion_en": "Ground-floor room with a private en-suite bathroom with shower. Large closet, wooden floors and a full-height window opening directly onto the garden.",
        "caracteristicas_es": "Cama matrimonial\nBaño privado en la habitación, con ducha\nSalida directa al jardín\nVentanal al jardín\nClóset amplio\nPiso de madera\nVeladores con lámparas\nPrimer piso",
        "caracteristicas_en": "Double bed\nPrivate en-suite bathroom with shower\nDirect garden access\nGarden-facing picture window\nLarge closet\nWooden floors\nBedside tables with lamps\nGround floor",
        "imagen": "images/habitaciones/tolhuaca.jpg",
        "activa": "true",
        "orden": 4,
    },
    {
        "id": "lanin",
        "nombre": "Volcán Lanín",
        "categoria": "Suite Premium",
        "precio_noche": 55000,
        "capacidad": 3,
        "metros2": "",
        "descripcion_es": "Habitación amplia del segundo piso con baño privado dentro y ducha. Cuenta con cama matrimonial y una cama chica adicional, dos veladores y una linda vista al jardín y a la piscina. Capacidad para 2 adultos y 1 niño.",
        "descripcion_en": "Spacious second-floor room with a private en-suite bathroom and shower. It has a double bed plus an extra small bed, two bedside tables and lovely views over the garden and the pool. Sleeps 2 adults and 1 child.",
        "caracteristicas_es": "Cama matrimonial + cama chica adicional\nBaño privado en la habitación, con ducha\nVista al jardín y a la piscina\n2 veladores\nHabitación amplia\nSegundo piso\nApta para 2 adultos y 1 niño",
        "caracteristicas_en": "Double bed + extra small bed\nPrivate en-suite bathroom with shower\nGarden and pool views\n2 bedside tables\nSpacious room\nSecond floor\nSuitable for 2 adults and 1 child",
        "imagen": "images/habitaciones/lanin.jpg",
        "activa": "true",
        "orden": 5,
    },
    {
        "id": "sollipulli",
        "nombre": "Volcán Sollipulli",
        "categoria": "Habitación Cuádruple – Literas",
        "precio_noche": 55000,
        "capacidad": 4,
        "metros2": "",
        "descripcion_es": "Habitación amplia del segundo piso con dos literas, pensada para grupos o familias. Tiene baño privado dentro de la habitación, con ducha y tragaluz en el techo que le da mucha luz natural, y un arrimo de clóset para la ropa.",
        "descripcion_en": "Spacious second-floor room with two bunk beds, suited to groups or families. It has a private en-suite bathroom with shower and a ceiling skylight that fills it with natural light, plus a wardrobe unit for clothes.",
        "caracteristicas_es": "Dos literas (4 plazas)\nBaño privado en la habitación, con ducha\nTragaluz en el techo\nArrimo de clóset\nSegundo piso",
        "caracteristicas_en": "Two bunk beds (sleeps 4)\nPrivate en-suite bathroom with shower\nCeiling skylight\nWardrobe unit\nSecond floor",
        "imagen": "images/habitaciones/sollipulli.jpg",
        "activa": "true",
        "orden": 6,
    },
    {
        "id": "lonquimay",
        "nombre": "Volcán Lonquimay",
        "categoria": "Habitación Doble",
        "precio_noche": 55000,
        "capacidad": 2,
        "metros2": "",
        "descripcion_es": "Habitación del segundo piso con cama matrimonial y baño privado dentro de la habitación, con ducha. Cuenta con repisas para guardar y ordenar la ropa.",
        "descripcion_en": "Second-floor room with a double bed and a private en-suite bathroom with shower. It has open shelving for storing and organising clothes.",
        "caracteristicas_es": "Cama matrimonial\nBaño privado en la habitación, con ducha\nRepisas para la ropa\nVeladores con lámparas\nSegundo piso",
        "caracteristicas_en": "Double bed\nPrivate en-suite bathroom with shower\nOpen clothing shelves\nBedside tables with lamps\nSecond floor",
        "imagen": "images/habitaciones/lonquimay.jpg",
        "activa": "true",
        "orden": 7,
    },
]


def escribir_csv():
    with CSV.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=CAMPOS, lineterminator="\n")
        w.writeheader()
        for h in HABITACIONES:
            w.writerow(h)
    print(f"{len(HABITACIONES)} habitaciones -> {CSV.relative_to(RAIZ)}")


# Sin timeout, una conexión que queda colgada deja el script esperando para
# siempre y sin señal. En una corrida única contra producción eso es peor que
# un error: quien la ejecuta no sabe si el intento alcanzó a escribir algo
# antes de que la matara.
TIMEOUT = 30


def pedir(token, base, ruta, metodo="GET", cuerpo=None):
    req = urllib.request.Request(
        f"https://api.airtable.com/v0/{base}/{ruta}",
        method=metodo,
        data=json.dumps(cuerpo).encode() if cuerpo else None,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        # El código y el cuerpo son la parte útil: ahí Airtable dice qué
        # campo rechazó. Va primero porque HTTPError es subclase de URLError.
        sys.exit(f"Airtable {e.code}: {e.read().decode()}")
    except urllib.error.URLError as e:
        # DNS que no resuelve, host inalcanzable, TLS caído: sin esto subía
        # crudo como traceback.
        sys.exit(f"No se pudo hablar con Airtable: {e.reason}")
    except TimeoutError:
        # Un timeout de lectura no viene envuelto en URLError.
        sys.exit(f"Airtable no respondió en {TIMEOUT} segundos.")


def empujar(dry_run):
    token = os.environ.get("AIRTABLE_TOKEN")
    base = os.environ.get("AIRTABLE_BASE_ID")
    if not token or not base:
        sys.exit("Faltan AIRTABLE_TOKEN y/o AIRTABLE_BASE_ID en el entorno.")

    # El campo `id` del CSV es el slug nuevo, así que en la primera corrida
    # ningún registro calza por id y hay que emparejar por `orden`, que no
    # cambió. De la segunda en adelante manda el id.
    registros = pedir(token, base, "Habitaciones")["records"]

    # El peligro acá no es no encontrar el registro —eso aborta más abajo, a
    # la vista— sino encontrar de más. `orden` se escribe a mano en Airtable:
    # si dos filas comparten el mismo valor, la comprensión de diccionario se
    # queda callada con la última y descarta la otra. Eso no deja un
    # record_id vacío, deja uno válido pero de OTRA habitación, y el PATCH
    # sobrescribe la pieza equivocada en silencio y sin vuelta atrás. Se
    # corta antes de emparejar nada.
    por_orden = {}
    repetidos = {}
    for r in registros:
        orden = r["fields"].get("orden")
        if orden is None:
            continue
        if orden in por_orden:
            repetidos.setdefault(orden, [por_orden[orden]]).append(r["id"])
        else:
            por_orden[orden] = r["id"]
    if repetidos:
        detalle = "; ".join(
            f"orden {o} en {', '.join(ids)}"
            for o, ids in sorted(repetidos.items(), key=lambda kv: str(kv[0]))
        )
        sys.exit(
            "Hay `orden` repetidos en Airtable y emparejar por ese campo "
            f"escribiría sobre la habitación equivocada: {detalle}"
        )

    por_id = {r["fields"].get("id"): r["id"] for r in registros}

    cambios = []
    for h in HABITACIONES:
        record_id = por_id.get(h["id"]) or por_orden.get(h["orden"])
        if not record_id:
            sys.exit(f"No encuentro en Airtable el registro de {h['nombre']}.")
        # Sólo se omiten los numéricos vacíos —hoy nada más metros2, que no
        # se midió nunca—, porque un "" ahí rompe el PATCH. Los textos viajan
        # aunque vengan vacíos: Airtable no borra lo que no aparece en
        # `fields`, así que omitir un texto vacío dejaría el valor viejo en la
        # base y el script igual diría "actualizado". Esa desincronización
        # entre la copia legible y la fuente de verdad no se vería nunca.
        campos = {
            k: v for k, v in h.items()
            if k != "activa" and not (k in NUMERICOS and v == "")
        }
        campos["activa"] = h["activa"] == "true"
        cambios.append({"id": record_id, "fields": campos})

    if dry_run:
        for c in cambios:
            print(f"{c['id']}  <-  {c['fields']['nombre']}  ${c['fields']['precio_noche']}")
        print(f"\n{len(cambios)} registros (dry-run, no se escribió nada)")
        return

    pedir(token, base, "Habitaciones", "PATCH", {"records": cambios})
    print(f"{len(cambios)} registros actualizados en Airtable")


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--csv", action="store_true", help="escribe el CSV versionado")
    p.add_argument("--airtable", action="store_true", help="empuja a Airtable")
    p.add_argument("--dry-run", action="store_true", help="con --airtable, no escribe")
    a = p.parse_args()

    if not a.csv and not a.airtable:
        p.error("elige --csv o --airtable")
    if a.csv:
        escribir_csv()
    if a.airtable:
        empujar(a.dry_run)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Regenerar el CSV**

```bash
python3 tools/habitaciones.py --csv
```

Esperado: `7 habitaciones -> docs/habitaciones-airtable.csv`.

- [ ] **Step 3: Verificar que no sobrevive ningún nombre de árbol**

```bash
grep -cE "Magnolio|Arrayán|Canelo|Laurel|Coihue|Fuinque|Tineo" docs/habitaciones-airtable.csv
```

Esperado: `0`. Si `grep` devuelve algo distinto de 0, el CSV quedó a medias.

- [ ] **Step 4: Commit**

```bash
git add tools/habitaciones.py docs/habitaciones-airtable.csv
git commit -m "Renombrar las habitaciones a volcanes y aplicar las tarifas nuevas"
```

---

### Task 3: El test que amarra el contenido

Este test es la razón por la que el renombre a mano de los tres archivos siguientes es seguro. Se escribe **antes** de tocarlos, y debe fallar.

**Files:**
- Create: `tests/contenido.test.js`

- [ ] **Step 1: Escribir el test que falla**

```javascript
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

/**
 * Un ancla rota no rompe nada visible: el navegador abre igual
 * pages/alojamiento.html y se queda arriba, sin saltar a ninguna ficha.
 * Por eso los tres enlaces de la portada sobrevivieron varios renombres
 * apuntando a fichas que ya no existían, sin que nadie se quejara.
 */
test('cada enlace de la portada apunta a una ficha que existe', () => {
  const anclas = [...portada.matchAll(/href="pages\/alojamiento\.html#([^"]+)"/g)].map(m => m[1]);
  assert.ok(anclas.length > 0, 'la portada no enlaza ninguna ficha de alojamiento');

  const ids = new Set(habitaciones.map(h => h.id));
  for (const ancla of anclas) {
    assert.ok(
      ids.has(ancla),
      `la portada enlaza pages/alojamiento.html#${ancla}, que no es ninguna de las siete piezas`
    );
    assert.ok(
      fichaDe(alojamiento, ancla),
      `la portada enlaza pages/alojamiento.html#${ancla}, pero esa ficha no existe en la página`
    );
  }
});

test('Sollipulli es cuádruple y con literas', () => {
  const s = habitaciones.find(h => h.id === 'sollipulli');
  assert.equal(s.capacidad, '4');
  assert.ok(s.caracteristicas_es.includes('literas'));
  assert.ok(!s.descripcion_es.includes('matrimonial'));
});
```

- [ ] **Step 2: Correrlo y confirmar que falla**

```bash
npm test
```

Esperado: FALLA, con tres de los ocho pasando. Con los Tasks 1 y 2 hechos:

| Test | Estado |
|---|---|
| el catálogo tiene las siete piezas | PASA |
| ningún nombre de árbol sobrevive | falla: `pages/alojamiento.html todavía dice "Magnolio"` |
| cada pieza tiene su ficha | falla: `falta la ficha de llaima` |
| cada pieza tiene su fotografía | falla: `falta la ficha de llaima` |
| ninguna ficha con el placeholder | falla |
| el precio ya incluye desayuno | falla: `alojamiento.html` todavía trae `$5.000` |
| toda clave data-i18n existe | PASA — las claves viejas siguen completas en los dos idiomas |
| Sollipulli es cuádruple | PASA |

Los tres archivos de test que ya existían siguen pasando. Si en cambio falla `no existe images/habitaciones/llaima.jpg`, el Task 1 no se corrió.

- [ ] **Step 3: Commit**

```bash
git add tests/contenido.test.js
git commit -m "Amarrar el sitio estático al catálogo con un test"
```

---

### Task 4: Las fichas de alojamiento

**Files:**
- Modify: `pages/alojamiento.html:96-257` (las siete `<article class="card-room">`)

- [ ] **Step 1: Reescribir las siete fichas**

Cada ficha cambia en cinco puntos: el comentario, el `id`, el `<div>` del placeholder por un `<img>`, el `<h2>`, y el prefijo de las claves `data-i18n`. Ésta es la de Llaima, completa; las otras seis siguen el mismo molde con los datos del CSV.

```html
          <!-- Room: Volcán Llaima -->
          <article class="card-room scroll-reveal" id="llaima">
            <div class="card-room__image">
              <img src="../images/habitaciones/llaima.jpg" alt="Volcán Llaima">
            </div>
            <div class="card-room__content">
              <span class="card-room__category" data-i18n="hab.llaima.cat">Habitación Doble – Baño Compartido</span>
              <h2 class="card-room__title">Volcán Llaima</h2>
              <p class="card-room__description" data-i18n="hab.llaima.desc">
                Habitación del primer piso con cama matrimonial y piso de madera. Cuenta con un gran clóset, veladores con lámparas y un ventanal con salida directa al jardín. Comparte un baño completo con ducha con la habitación Volcán Rukapillán.
              </p>
              <ul style="font-size: var(--text-sm); color: var(--text-secondary); margin: var(--space-4) 0;">
                <li data-i18n="hab.llaima.cap">2 huéspedes</li>
                <li data-i18n="hab.llaima.c1">Cama matrimonial</li>
                <li data-i18n="hab.llaima.c2">Baño compartido con ducha (con Volcán Rukapillán)</li>
                <li data-i18n="hab.llaima.c3">Salida directa al jardín</li>
                <li data-i18n="hab.llaima.c4">Ventanal al jardín</li>
              </ul>
              <div class="card-room__footer">
                <div class="card-room__price" data-i18n="hab.consultar">Consultar</div>
                <a href="reservas.html" class="btn btn-sm btn-primary" data-i18n="hab.reservar">Reservar</a>
              </div>
            </div>
          </article>
```

Las `<li>` de `c1` a `c4` son las cuatro primeras características del CSV de cada pieza. Para las seis restantes:

| Ficha | `id` | `cat` | c1 · c2 · c3 · c4 | `cap` |
|---|---|---|---|---|
| Volcán Rukapillán | `rukapillan` | Habitación Twin – Baño Compartido | 2 camas · Escritorio · Baño compartido con ducha (con Volcán Llaima) · Salida directa al jardín | 2 huéspedes |
| Volcán Sierra Nevada | `sierra-nevada` | Habitación Twin – Baño Exterior | 2 camas · Baño con ducha fuera de la habitación, de uso exclusivo · Salida directa al jardín · Ventanal al jardín | 2 huéspedes |
| Volcán Tolhuaca | `tolhuaca` | Habitación Doble | Cama matrimonial · Baño privado en la habitación, con ducha · Salida directa al jardín · Ventanal al jardín | 2 huéspedes |
| Volcán Lanín | `lanin` | Suite Premium | Cama matrimonial + cama chica adicional · Baño privado en la habitación, con ducha · Vista al jardín y a la piscina · Habitación amplia | 3 huéspedes |
| Volcán Sollipulli | `sollipulli` | Habitación Cuádruple – Literas | Dos literas (4 plazas) · Baño privado en la habitación, con ducha · Tragaluz en el techo · Arrimo de clóset | 4 huéspedes |
| Volcán Lonquimay | `lonquimay` | Habitación Doble | Cama matrimonial · Baño privado en la habitación, con ducha · Repisas para la ropa · Veladores con lámparas | 2 huéspedes |

Las descripciones son las de `descripcion_es` en el CSV, tal cual.

- [ ] **Step 2: Borrar la foto que ya no referencia nadie**

```bash
git rm images/habitaciones/habitacion-verde.jpg
grep -rn "habitacion-verde" --include=*.html --include=*.js --include=*.css --include=*.txt . | grep -v '^./.git'
```

Esperado del `grep`: una sola línea, en `tools/imagenes-con-marca.txt`. Quitar de ahí la línea `habitaciones/habitacion-verde`, porque `tools/verificar-marca.sh` falla si la lista nombra un archivo que no existe.

- [ ] **Step 3: Correr los tests**

```bash
npm test
```

Esperado: pasan los de la ficha, la foto y el placeholder. Quedan tres fallando, todos por `main.js` e `index.html`, que aún no se tocan: `index.html todavía dice "Coihue"`, `'hab.llaima.cat' aparece 0 veces en main.js, se esperaban 2`, y el del desayuno, porque `main.js` conserva las descripciones viejas con `$5.000`.

- [ ] **Step 4: Commit**

```bash
git add pages/alojamiento.html images/habitaciones/habitacion-verde.jpg tools/imagenes-con-marca.txt
git commit -m "Reescribir las siete fichas con los nombres nuevos y sus fotografías"
```

---

### Task 5: Las traducciones

**Files:**
- Modify: `js/main.js:195-252` (bloque español) y el bloque inglés equivalente

- [ ] **Step 1: Renombrar las claves y actualizar los textos**

Son siete bloques de siete claves en cada idioma. El prefijo cambia (`hab.magnolio.` → `hab.llaima.`) y el texto pasa a ser el del CSV: `categoria` para `.cat`, `descripcion_es`/`descripcion_en` para `.desc`, y las cuatro primeras características para `.c1` a `.c4`. Ejemplo del bloque español de Llaima:

```javascript
      'hab.llaima.cat': 'Habitación Doble – Baño Compartido',
      'hab.llaima.desc': 'Habitación del primer piso con cama matrimonial y piso de madera. Cuenta con un gran clóset, veladores con lámparas y un ventanal con salida directa al jardín. Comparte un baño completo con ducha con la habitación Volcán Rukapillán.',
      'hab.llaima.cap': '2 huéspedes',
      'hab.llaima.c1': 'Cama matrimonial',
      'hab.llaima.c2': 'Baño compartido con ducha (con Volcán Rukapillán)',
      'hab.llaima.c3': 'Salida directa al jardín',
      'hab.llaima.c4': 'Ventanal al jardín',
```

Y el inglés:

```javascript
      'hab.llaima.cat': 'Double Room – Shared Bathroom',
      'hab.llaima.desc': 'Ground-floor room with a double bed and wooden floors. It features a large closet, bedside tables with lamps and a full-height window opening directly onto the garden. Shares a full bathroom with shower with the Volcán Rukapillán room.',
      'hab.llaima.cap': '2 guests',
      'hab.llaima.c1': 'Double bed',
      'hab.llaima.c2': 'Shared bathroom with shower (with Volcán Rukapillán)',
      'hab.llaima.c3': 'Direct garden access',
      'hab.llaima.c4': 'Garden-facing picture window',
```

Los nombres de volcán **no se traducen**: "Volcán Rukapillán" queda igual en inglés, como ya ocurría con los árboles.

Las categorías en inglés, que no vienen en el CSV:

| `id` | `cat` en inglés |
|---|---|
| `llaima` | Double Room – Shared Bathroom |
| `rukapillan` | Twin Room – Shared Bathroom |
| `sierra-nevada` | Twin Room – External Bathroom |
| `tolhuaca` | Double Room |
| `lanin` | Premium Suite |
| `sollipulli` | Quadruple Room – Bunk Beds |
| `lonquimay` | Double Room |

Y `cap` en inglés: `2 guests`, salvo `lanin` (`3 guests`) y `sollipulli` (`4 guests`).

- [ ] **Step 2: Correr los tests**

```bash
npm test
```

Esperado: queda fallando un solo test, `ningún nombre de árbol sobrevive en el sitio`, con el mensaje `index.html todavía dice "Coihue"`. Las claves `hab.dest.coihue.*` siguen intactas en los dos idiomas, así que el test de i18n pasa: el Task 6 las renombra en `index.html` y en `main.js` a la vez, y por eso van juntas.

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "Traducir las fichas nuevas al inglés y al español"
```

---

### Task 6: Las destacadas de la portada

**Files:**
- Modify: `index.html:356-390`
- Modify: `js/main.js` (las seis claves `hab.dest.*`)

- [ ] **Step 1: Reemplazar las tres destacadas**

Coihue→Lanín, Laurel→Tolhuaca, Magnolio→Llaima. Cambian el `<h3>`, la clave `data-i18n` y el ancla del enlace:

```html
              <span class="card-room__category" data-i18n="hab.dest.lanin.cat">Suite</span>
              <h3 class="card-room__title">Volcán Lanín</h3>
              <p class="card-room__description" data-i18n="hab.dest.lanin.desc">Habitación amplia del segundo piso, con baño privado y vista al jardín y a la piscina. Cama matrimonial más una cama chica.</p>
```

con `<a href="pages/alojamiento.html#lanin" ...>`, y lo mismo para `tolhuaca` y `llaima`.

- [ ] **Step 2: Renombrar las seis claves `hab.dest.*` en los dos idiomas**

```javascript
      'hab.dest.lanin.cat': 'Suite',
      'hab.dest.lanin.desc': 'Habitación amplia del segundo piso, con baño privado y vista al jardín y a la piscina. Cama matrimonial más una cama chica.',
      'hab.dest.tolhuaca.cat': 'Doble',
      'hab.dest.tolhuaca.desc': 'Baño privado dentro de la habitación, gran clóset y un ventanal con salida directa al jardín.',
      'hab.dest.llaima.cat': 'Doble',
      'hab.dest.llaima.desc': 'Cama matrimonial, piso de madera y ventanal con salida directa al jardín. Baño compartido con Volcán Rukapillán.',
```

En el bloque inglés, la única que cambia de texto es la de Llaima, que menciona la pieza vecina: `Double bed, wooden floors and a full-height window opening directly onto the garden. Shared bathroom with Volcán Rukapillán.`

- [ ] **Step 3: Correr los tests**

```bash
npm test
```

Esperado: **todo pasa**, incluidos los tres archivos de test que ya existían.

- [ ] **Step 4: Commit**

```bash
git add index.html js/main.js
git commit -m "Actualizar las tres habitaciones destacadas de la portada"
```

---

### Task 7: Llevarlo a Airtable

Hasta acá el sitio estático dice "Volcán Llaima" pero la página de reservas sigue ofreciendo "Magnolio", porque lee el Worker y el Worker lee Airtable.

- [ ] **Step 1: Crear la opción del Single select**

En la interfaz de Airtable, tabla `Habitaciones`, campo `categoria`: agregar la opción **`Habitación Cuádruple – Literas`**. El guión es una raya (`–`), no un guión corto; si no coincide, Airtable la trata como otra opción.

- [ ] **Step 2: Ver qué se va a escribir, sin escribir**

```bash
export AIRTABLE_TOKEN='...'      # el token con data.records:write
export AIRTABLE_BASE_ID='app...'
python3 tools/habitaciones.py --airtable --dry-run
```

Esperado: siete líneas `rec...  <-  Volcán Llaima  $50000`, y `7 registros (dry-run, no se escribió nada)`.

- [ ] **Step 3: Escribir**

```bash
python3 tools/habitaciones.py --airtable
```

Esperado: `7 registros actualizados en Airtable`.

- [ ] **Step 4: Confirmar en la interfaz que `categoria` de Sollipulli quedó puesta**

Es el único campo que Airtable puede ignorar en silencio. Si quedó vacío, el Step 1 no se hizo o la raya no coincide.

---

### Task 8: Bloquear el segundo piso

- [ ] **Step 1: Borrar la reserva de prueba**

En la tabla `Reservas`, eliminar la fila **`PRUEBA FINAL - borrar`** (2027-03-15 a 2027-03-17, pieza que ahora se llama Volcán Llaima). Mientras exista, esas fechas quedan bloqueadas.

- [ ] **Step 2: Crear las tres filas del bloqueo**

Una por cada pieza del segundo piso, en la tabla `Reservas`:

| habitacion | llegada | salida | estado | huesped | origen |
|---|---|---|---|---|---|
| Volcán Lanín | 2026-09-22 | 2026-12-13 | Confirmada | Bloqueo — larga estadía | Directo |
| Volcán Sollipulli | 2026-09-22 | 2026-12-13 | Confirmada | Bloqueo — larga estadía | Directo |
| Volcán Lonquimay | 2026-09-22 | 2026-12-13 | Confirmada | Bloqueo — larga estadía | Directo |

Las fechas van **sin hora**: el check-in y el check-out son días. `estado` debe ser exactamente `Confirmada`; `transformar.js` sólo cuenta como ocupados los estados `Solicitud` y `Confirmada`.

- [ ] **Step 3: Forzar la resincronización**

El Worker cachea la disponibilidad en KV y la refresca por cron cada 10 minutos. Para no esperar:

```bash
cd worker && npx wrangler kv key delete "disponibilidad" \
  --namespace-id=30cfa39d108748cea09db57871431665 --remote
```

- [ ] **Step 4: Verificar el contrato público**

```bash
curl -s https://reservas.flordelbosque.cl/api/disponibilidad \
  | python3 -m json.tool | head -40
```

Esperado: los siete `nombre` con los volcanes, `precio_noche` en 50000/55000, y `ocupado` con `["2026-09-22", "2026-12-13"]` en Lanín, Sollipulli y Lonquimay. Las lecturas de KV se cachean en el borde hasta 60 segundos; si sale el contenido viejo, esperar y repetir.

```bash
curl -s https://reservas.flordelbosque.cl/api/disponibilidad \
  | python3 -c "
import json, sys
d = json.load(sys.stdin)
for h in d['habitaciones']:
    print(f\"{h['nombre']:<24} \${h['precio_noche']}  cap {h['capacidad']}  {h['ocupado']}\")
"
```

Esperado: exactamente tres piezas con un tramo ocupado, y ninguna con el tramo de marzo de 2027.

---

### Task 9: Verificación en el navegador

Los tests cubren el texto, no el resultado visual. Siete fotos nuevas entrando por primera vez a una grilla que hasta ahora mostraba placeholders es justo el tipo de cambio que se ve mal sin que nada falle.

- [ ] **Step 1: Levantar el sitio**

```bash
python3 -m http.server 8000
```

- [ ] **Step 2: Revisar la página de alojamiento**

Abrir `http://localhost:8000/pages/alojamiento.html` y confirmar:

- Las siete fichas con foto, ninguna con el isotipo de fondo.
- Ninguna foto de canto ni estirada: el recorte es `4/3` con `object-fit: cover`.
- El precio pasa de "Consultar" a `$50.000 / noche` o `$55.000 / noche` cuando responde el Worker.
- El cambio a inglés no devuelve ningún precio a "Consultar" ni deja una ficha en español.

- [ ] **Step 3: Revisar la página de reservas**

Abrir `http://localhost:8000/pages/reservas.html` y confirmar:

- Con 2 huéspedes y fechas de octubre aparecen sólo las cuatro del primer piso.
- Con 4 huéspedes aparece Sollipulli, con su foto y sus literas — antes ninguna pieza llegaba a 4 y la búsqueda salía vacía.
- Con fechas posteriores al 13 de diciembre vuelven a aparecer las siete.

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "Cerrar la integración de volcanes y fotografías"
git push
```

GitHub Pages sirve desde `main`, así que el push publica.

---

## Fuera de este plan: los espacios comunes y exteriores

Del lote llegaron 15 fotos de interiores comunes y 9 de exteriores, y no entran
acá. No es un olvido: **no hay un solo hueco donde ponerlas.** Las cuatro
carpetas de fotos generales del sitio —`lugar/`, `cowork/`, `experiencias/`,
`hero/`— están todas ocupadas, y sus nueve imágenes se reparten entre ocho
páginas, algunas repetidas cuatro veces.

Integrarlas es una de dos cosas, y las dos son una tanda aparte:

- **Reemplazar** las que ya están. Es una decisión editorial —cuál foto vende
  mejor cada página— y toca ocho archivos. Un intercambio a ciegas puede
  empeorar páginas que hoy funcionan.
- **Abrir espacio nuevo** para lo que de verdad es material inédito: el pasillo
  del segundo piso, el comedor, la cocina, la terraza y el árbol en flor. Eso es
  diseño de sección, no reemplazo de archivos.

Este plan tiene fecha —el bloqueo empieza el 22 de septiembre— y el renombre no
puede esperar a esa discusión. Los espacios comunes van en un spec propio.

## Ya aplicado antes de este plan

`.gitignore` cubre `docs/CambiosFDB/`, `docs/*.xlsx` y `docs/*.zip` desde el
commit del spec. No hay tarea para eso; sólo hay que no deshacerlo.

## Lo que queda para la propietaria

Ninguno de estos puntos bloquea el plan, pero conviene levantarlos al entregar:

1. **Sollipulli quedó a $55.000 con cuatro plazas**, el mismo precio que las dobles. La tabla de tarifas se escribió cuando figuraba como matrimonial para dos.
2. **Llaima y Rukapillán comparten baño** y en temporada alta quedaron con $5.000 de diferencia en la planilla. No afecta al sitio, que sólo publica `precio_noche`.
3. **La leyenda de la hoja *Tarifas*** sigue citando los valores anteriores y contradice su propia tabla.
4. **DMARC sigue sin publicarse**: `TXT _dmarc` → `v=DMARC1; p=none; rua=mailto:hola@flordelbosque.cl; fo=1`.
