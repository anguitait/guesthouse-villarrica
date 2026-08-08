#!/usr/bin/env python3
"""Busca marcadores de contenido sin completar que esten VISIBLES.

Los marcadores entre corchetes que viven dentro de una seccion con el
atributo hidden no cuentan: son contenido en espera, no publicado. Lo
que no puede pasar es que un "[Nombre]" llegue a la pantalla de alguien.

Uso: python3 tools/relleno-visible.py
"""
import pathlib
import re
import sys

MARCADOR = re.compile(r'\[(Nombre|Rol|Texto pendiente|Cierre del relato|Reemplazar)[^\]]*\]')
# Abre una seccion y captura sus atributos hasta el cierre de la etiqueta.
APERTURA = re.compile(r'<section\b([^>]*)>')


def bloques_ocultos(texto):
    """Rangos (inicio, fin) de las secciones con atributo hidden."""
    rangos = []
    for m in APERTURA.finditer(texto):
        if not re.search(r'\bhidden\b', m.group(1)):
            continue
        cierre = texto.find('</section>', m.end())
        rangos.append((m.start(), cierre if cierre != -1 else len(texto)))
    return rangos


def revisar(path):
    texto = path.read_text()
    ocultos = bloques_ocultos(texto)
    visibles = []
    for m in MARCADOR.finditer(texto):
        if any(ini <= m.start() < fin for ini, fin in ocultos):
            continue
        linea = texto.count('\n', 0, m.start()) + 1
        visibles.append(f"{path.name}:{linea}  {m.group(0)[:60]}")
    return visibles, len(ocultos)


def main():
    paginas = [pathlib.Path("index.html")] + sorted(pathlib.Path("pages").glob("*.html"))
    visibles, ocultas = [], 0
    for p in paginas:
        v, o = revisar(p)
        visibles.extend(v)
        ocultas += o

    if visibles:
        print("Marcadores de relleno a la vista:")
        print("\n".join(f"  {x}" for x in visibles))
        return 1

    extra = f" ({ocultas} seccion(es) oculta(s) en espera de contenido)" if ocultas else ""
    print(f"OK — ningun marcador visible{extra}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
