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
