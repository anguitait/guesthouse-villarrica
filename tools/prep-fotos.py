#!/usr/bin/env python3
"""Convierte las fotos del lote de la propietaria en imágenes publicables.

De cada habitación publica una galería —la portada primero— y escribe el
manifiesto images/habitaciones/galeria.json, que es lo único que relaciona
cada pieza con sus fotos: en el navegador nadie comprueba que los archivos
nombrados existan.

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
import json
import pathlib
import sys

from PIL import Image, ImageOps

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ORIGEN = RAIZ / "docs" / "CambiosFDB"
DESTINO = RAIZ / "images" / "habitaciones"
ANCHO = 1250
CALIDAD = 82

# Las fotos de cada pieza, la portada primero. Ojo: las carpetas de Llaima y
# Rukapillán vienen cruzadas respecto de la planilla, y la planilla es la que
# manda. Ver docs/superpowers/specs/2026-09-10-volcanes-y-fotografias-design.md
#
# La curaduría deja fuera las casi duplicadas —varias tomas del mismo encuadre
# con segundos de diferencia—, las mal archivadas y las previas a la
# remodelación. Los baños entran cuando aportan: el de Sollipulli, con tragaluz
# y baldosa, sostiene por sí solo el argumento de "baño privado en la pieza".
#
# En los baños hay que mirar el espejo AMPLIADO antes de elegir la toma: de las
# cuatro del baño de Lonquimay, 152320 refleja a una persona identificable con
# el teléfono en la mano y 152330 una mano con el teléfono. Sólo 152336 refleja
# nada más que el vano de la puerta y pared, y por eso es la que se publica.
FOTOS = {
    "llaima": [
        "Habitación Volcán Rukapillan  /FB2027_10.jpg",
        "Habitación Volcán Rukapillan  /20260909_151247.jpg",
        "Habitación Volcán Rukapillan  /20260909_151200.jpg",
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
        "Habitación Volcán Lonquimay /20260909_152336.jpg",
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


if __name__ == "__main__":
    main()
