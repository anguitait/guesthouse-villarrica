#!/usr/bin/env python3
"""Reparte la filigrana del isotipo por las secciones de cada pagina.

La variacion es deterministica, no aleatoria en tiempo de carga: se
deriva del nombre de la pagina y del indice de la seccion, asi el sitio
se ve igual en cada visita. Un patron que baila entre recargas se lee
como un error, no como intencion.

Solo varian la esquina y el tamano. El isotipo nunca se rota, se espeja
ni se recolorea fuera de sus variantes oficiales: el manual lo prohibe
en la seccion 9.

Reejecutable: primero limpia las filigranas que existan y despues las
vuelve a repartir, asi correrlo dos veces no duplica nada.

Uso: python3 tools/repartir-filigranas.py
"""
import pathlib
import re
import sys

ESQUINAS = ["sup-der", "inf-izq", "sup-izq", "inf-der"]
TAMANOS = ["", " filigrana--lg", " filigrana--sm"]

# Secciones con fondo oscuro: ahi va la variante blanca y mas tenue.
OSCUROS = ("section--dark", "section--oliva")

RE_SECCION = re.compile(r'^(\s*)<section class="section([^"]*)"([^>]*)>\s*$')
RE_FILIGRANA = re.compile(r'^\s*<img class="filigrana[^>]*>\s*\n', re.M)


def limpiar(texto):
    """Quita filigranas previas y la clase que las contiene."""
    texto = RE_FILIGRANA.sub("", texto)
    texto = texto.replace(" section--con-filigrana", "")
    return texto


def repartir(path):
    texto = limpiar(path.read_text())
    lineas = texto.splitlines(keepends=True)
    base = "images/logo" if path.name == "index.html" else "../images/logo"
    semilla = sum(ord(c) for c in path.name)

    salida, n = [], 0
    for linea in lineas:
        m = RE_SECCION.match(linea.rstrip("\n"))
        if not m:
            salida.append(linea)
            continue

        sangria, mods, resto = m.group(1), m.group(2), m.group(3)
        oscura = any(o in mods for o in OSCUROS)

        # Esquinas consecutivas siempre distintas: el indice avanza de a
        # uno sobre una lista cuyo orden ya alterna arriba/abajo.
        esquina = ESQUINAS[(semilla + n) % len(ESQUINAS)]
        tamano = TAMANOS[(semilla + n * 2) % len(TAMANOS)]
        archivo = "isotipo-blanco.svg" if oscura else "isotipo-verde.svg"
        clara = " filigrana--clara" if oscura else ""

        salida.append(f'{sangria}<section class="section{mods} section--con-filigrana"{resto}>\n')
        salida.append(
            f'{sangria}  <img class="filigrana filigrana--{esquina}{tamano}{clara}"'
            f' src="{base}/{archivo}" alt="" aria-hidden="true">\n'
        )
        n += 1

    path.write_text("".join(salida))
    return n


def main():
    paginas = [pathlib.Path("index.html")] + sorted(pathlib.Path("pages").glob("*.html"))
    total = 0
    for p in paginas:
        n = repartir(p)
        total += n
        print(f"{p.name:<22} {n} filigranas")
    print(f"\n{total} en total")
    return 0


if __name__ == "__main__":
    sys.exit(main())
