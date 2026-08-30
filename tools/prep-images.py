#!/usr/bin/env python3
"""Recorta la marca de agua "MP" del borde inferior de las fotos.

Reemplaza al recorte con `sips`, que resulto ser una trampa: `sips -c`
recorta desde el CENTRO, y compensar con un offset negativo empuja la
ventana fuera del borde superior. En vez de fallar, sips RELLENA con
negro: las nueve fotos quedaron con 29 filas negras arriba y asi se
publicaron. Pillow recorta por coordenadas y no inventa pixeles.

La lista de archivos vive en tools/imagenes-con-marca.txt, compartida
con el verificador.

Idempotente: una foto que ya mide el alto objetivo no se vuelve a tocar.
El recorte sobrescribe el original y el respaldo es git, asi que no lo
corras con cambios sin commitear en images/.

Uso: python3 tools/prep-images.py
"""
import pathlib
import sys

from PIL import Image

RAIZ = pathlib.Path(__file__).resolve().parent.parent
LISTA = RAIZ / "tools" / "imagenes-con-marca.txt"
ALTO_OBJETIVO = 776   # 1250x834 menos el 7% inferior, donde va la marca
NEGRO = 24            # umbral para considerar una fila "negra"


def archivos():
    for linea in LISTA.read_text().splitlines():
        linea = linea.strip()
        if linea and not linea.startswith("#"):
            yield RAIZ / "images" / f"{linea}.jpg"


def filas_negras(im, desde_arriba=True):
    """Cuenta filas totalmente oscuras en un borde. Detecta relleno."""
    w, h = im.size
    paso = max(1, w // 40)
    rango = range(h) if desde_arriba else range(h - 1, -1, -1)
    n = 0
    for y in rango:
        fila = [im.getpixel((x, y)) for x in range(0, w, paso)]
        if max(max(p) for p in fila) < NEGRO:
            n += 1
        else:
            break
    return n


def main():
    if not LISTA.exists():
        print(f"falta {LISTA}", file=sys.stderr)
        return 1

    problemas = []
    for ruta in archivos():
        if not ruta.exists():
            print(f"  omitido, no existe: {ruta.name}")
            continue

        im = Image.open(ruta).convert("RGB")
        w, h = im.size

        if h <= ALTO_OBJETIVO:
            print(f"  ya recortada: {ruta.relative_to(RAIZ / 'images')} ({w}x{h})")
        else:
            # Anclado arriba: se descarta solo el borde inferior.
            im = im.crop((0, 0, w, ALTO_OBJETIVO))
            im.save(ruta, quality=88, subsampling=0)
            print(f"  recortada: {ruta.relative_to(RAIZ / 'images')} ({w}x{h} -> {w}x{ALTO_OBJETIVO})")

        # Se revisan LOS DOS bordes. Mirar solo el de abajo fue justamente
        # lo que dejo pasar el relleno negro de arriba.
        control = Image.open(ruta).convert("RGB")
        arriba = filas_negras(control, True)
        abajo = filas_negras(control, False)
        if arriba or abajo:
            problemas.append(f"{ruta.name}: {arriba} filas negras arriba, {abajo} abajo")

    print()
    if problemas:
        print("Hay bordes rellenos con negro:")
        for x in problemas:
            print(f"  {x}")
        return 1
    print("OK — sin bordes negros en ninguna")
    return 0


if __name__ == "__main__":
    sys.exit(main())
