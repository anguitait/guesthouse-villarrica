#!/usr/bin/env python3
"""Convierte una foto del lote de la propietaria en una imagen publicable.

Tres cosas que no son opcionales:

1. La rotación EXIF. Diecinueve fotos del lote de septiembre de 2026 vienen
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
