#!/usr/bin/env python3
"""Verifica el marcado de las filigranas del isotipo.

Comprueba tres cosas que se pueden saber sin renderizar:

  1. Cada <img class="filigrana"> vive dentro de una seccion marcada con
     section--con-filigrana. Sin esa clase la seccion no tiene
     position:relative ni overflow:hidden, y la forma se posiciona contra
     un ancestro cualquiera o se desborda.
  2. Ninguna seccion lleva mas de una.
  3. Todas apuntan a una variante oficial del isotipo y llevan una clase
     de esquina.

Lo que NO puede comprobar es si alguna queda por debajo de un texto: eso
depende del layout y se mide en el navegador con
tools/filigrana-sobre-texto.js.

Uso: python3 tools/filigranas-bien-puestas.py
"""
import pathlib
import re
import sys

OFICIALES = ("isotipo-verde.svg", "isotipo-blanco.svg", "isotipo.svg")
ESQUINAS = ("filigrana--sup-der", "filigrana--sup-izq",
            "filigrana--inf-der", "filigrana--inf-izq")

RE_SECCION = re.compile(r'<section[^>]*class="([^"]*)"[^>]*>')
RE_FILIGRANA = re.compile(r'<img[^>]*class="(filigrana[^"]*)"[^>]*src="([^"]*)"[^>]*>')


def revisar(path):
    """Devuelve la lista de problemas de una pagina."""
    problemas = []
    texto = path.read_text()

    # Trocea por secciones: cada trozo es el contenido de un <section>.
    partes = re.split(r'(?=<section)', texto)
    for parte in partes:
        m = RE_SECCION.search(parte)
        if not m:
            continue
        clases = m.group(1)
        halladas = RE_FILIGRANA.findall(parte)

        if not halladas:
            continue

        if len(halladas) > 1:
            problemas.append(f"{path.name}: una seccion lleva {len(halladas)} filigranas")

        if "section--con-filigrana" not in clases:
            problemas.append(f"{path.name}: filigrana en seccion sin section--con-filigrana")

        for clase_img, src in halladas:
            if not any(o in src for o in OFICIALES):
                problemas.append(f"{path.name}: filigrana con src no oficial: {src}")
            if not any(e in clase_img for e in ESQUINAS):
                problemas.append(f"{path.name}: filigrana sin clase de esquina: {clase_img}")

    return problemas


def main():
    paginas = [pathlib.Path("index.html")] + sorted(pathlib.Path("pages").glob("*.html"))
    todos = []
    total = 0
    for p in paginas:
        total += len(RE_FILIGRANA.findall(p.read_text()))
        todos.extend(revisar(p))

    if todos:
        for x in todos:
            print(x)
        print(f"\n{len(todos)} problema(s) en {total} filigranas")
        return 1

    print(f"OK — {total} filigranas bien puestas en {len(paginas)} paginas")
    return 0


if __name__ == "__main__":
    sys.exit(main())
