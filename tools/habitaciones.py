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
        # El orden importa: la fila del listado de reservas sólo muestra tres
        # características, y con el escritorio en segundo lugar la salida al
        # jardín caía fuera. Es el gancho de esta pieza —estar a nivel del
        # jardín con puerta propia— y pesa más que el escritorio.
        "id": "rukapillan",
        "nombre": "Volcán Rukapillán",
        "categoria": "Habitación Twin – Baño Compartido",
        "precio_noche": 50000,
        "capacidad": 2,
        "metros2": "",
        "descripcion_es": "Habitación del primer piso con dos camas y escritorio de trabajo, piso de madera y gran clóset. Ventanal con salida directa al jardín y veladores con lámparas. Comparte un baño completo con ducha con la habitación Volcán Llaima.",
        "descripcion_en": "Ground-floor room with two beds and a work desk, wooden floors and a large closet. Full-height window with direct garden access and bedside tables with lamps. Shares a full bathroom with shower with the Volcán Llaima room.",
        "caracteristicas_es": "2 camas\nSalida directa al jardín\nBaño compartido con ducha (con Volcán Llaima)\nEscritorio\nVentanal al jardín\nClóset amplio\nPiso de madera\nVeladores con lámparas\nPrimer piso",
        "caracteristicas_en": "2 beds\nDirect garden access\nShared bathroom with shower (with Volcán Llaima)\nDesk\nGarden-facing picture window\nLarge closet\nWooden floors\nBedside tables with lamps\nGround floor",
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
