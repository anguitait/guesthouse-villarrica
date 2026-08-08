#!/usr/bin/env python3
"""Imprime el ritmo de fondos de cada pagina y marca choques.

Un choque es dos secciones oscuras seguidas (profundo u oliva) sin un
fondo claro que las separe: se leen como un solo bloque de color.
"""
import pathlib
import re
import sys

MAPA = {
    "section--dark": "PROFUNDO",
    "section--oliva": "OLIVA",
    "section--cream": "blanco",
    "section--white": "blanco",
}
OSCUROS = ("PROFUNDO", "OLIVA")


def ritmo(path):
    orden = []
    for linea in path.read_text().splitlines():
        m = re.search(r'<section class="section([^"]*)"', linea)
        if not m:
            continue
        etiqueta = "marfil"
        for mod in m.group(1).split():
            if mod in MAPA:
                etiqueta = MAPA[mod]
        orden.append(etiqueta)
    return orden


def main():
    paginas = [pathlib.Path("index.html")] + sorted(pathlib.Path("pages").glob("*.html"))
    choques = 0
    for p in paginas:
        orden = ritmo(p)
        pares = list(zip(orden, orden[1:]))
        malos = [i for i, (a, b) in enumerate(pares) if a in OSCUROS and b in OSCUROS]
        choques += len(malos)
        estado = f"CHOQUE x{len(malos)}" if malos else "ok"
        print(f"{p.name:<20} {estado:<10} {' > '.join(orden)}")
    print()
    print(f"{choques} choque(s)")
    return 1 if choques else 0


if __name__ == "__main__":
    sys.exit(main())
