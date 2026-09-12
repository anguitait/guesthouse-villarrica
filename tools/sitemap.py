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
from xml.sax.saxutils import escape

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "sitemap.xml"

# Lo mismo que `exclude` en _config.yml: son carpetas que GitHub Pages ya no
# publica, así que una dirección suya en el sitemap sería un 404 anunciado.
EXCLUIDOS = {"docs", "tools", "tests", "worker"}


def paginas():
    """Todos los HTML publicados, a cualquier profundidad.

    Recursivo y no sólo la raíz y pages/: el día que existan las direcciones
    /en/ tienen que entrar solas. Se salta lo que Jekyll tampoco publica —lo
    que empieza por punto o guion bajo— y ahí va incluido .claude/worktrees/,
    que en el checkout principal contiene copias enteras del sitio y llenaría
    el sitemap de direcciones fantasma.
    """
    for f in sorted(RAIZ.rglob("*.html")):
        partes = f.relative_to(RAIZ).parts
        if any(p.startswith((".", "_")) for p in partes):
            continue
        if partes[0] in EXCLUIDOS:
            continue
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
        # Escapado aunque hoy las once direcciones sean ASCII sin `&`: un
        # og:url con querystring rompería el XML y Search Console rechaza el
        # sitemap entero, no la línea.
        lineas.append(f"    <loc>{escape(direccion(archivo))}</loc>")
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
