#!/usr/bin/env python3
"""Quita los precios del sitio hasta que esten definidos.

No los borra a secas: los reemplaza por "Consultar" en los elementos de
precio, para que las tarjetas no queden con un hueco y reponerlos sea
cambiar una palabra por una cifra. En la carta del cafe, donde el precio
es una columna suelta sin clase, se elimina el <span>.

Reejecutable: correrlo dos veces no rompe nada.

Uso: python3 tools/quitar-precios.py
"""
import pathlib
import re
import sys

CONSULTAR_ES = "Consultar"
CONSULTAR_EN = "On request"

# Elementos cuyo contenido completo es un precio.
CLASES_PRECIO = ("card-room__price", "pricing-card__price", "package-card__price")


def limpiar(path):
    texto = path.read_text()
    original = texto
    ingles = path.name == "en.html"
    etiqueta = CONSULTAR_EN if ingles else CONSULTAR_ES
    cuenta = 0

    # 1. Elementos de precio: se vacia su contenido.
    for clase in CLASES_PRECIO:
        patron = re.compile(
            r'(<(div|span)[^>]*class="[^"]*' + clase + r'[^"]*"[^>]*>)(.*?)(</\2>)',
            re.S)

        def sub(m):
            nonlocal cuenta
            if m.group(3).strip() == etiqueta:
                return m.group(0)
            cuenta += 1
            return m.group(1) + etiqueta + m.group(4)

        texto = patron.sub(sub, texto)

    # 2. Carta del cafe: <span>Producto</span><span>$1.800</span>
    def sub_carta(m):
        nonlocal cuenta
        cuenta += 1
        return m.group(1)

    texto, _ = re.subn(
        r'(<span>[^<]*</span>)\s*<span>\s*\$[\d.,]+\s*</span>',
        sub_carta, texto)

    # 3. "Desde $35.000" en textos sueltos.
    def sub_desde(m):
        nonlocal cuenta
        cuenta += 1
        return etiqueta

    texto = re.sub(r'Desde\s+\$[\d.,]+', sub_desde, texto)
    texto = re.sub(r'From\s+(USD\s*)?[\d.,]+', sub_desde, texto)

    if texto != original:
        path.write_text(texto)
    return cuenta


def main():
    paginas = [pathlib.Path("index.html")] + sorted(pathlib.Path("pages").glob("*.html"))
    total = 0
    for p in paginas:
        n = limpiar(p)
        total += n
        if n:
            print(f"{p.name:<22} {n} precios")
    print(f"\n{total} en total")

    # Lo que quede con simbolo de moneda necesita mano humana: suele ser
    # prosa, como la tarifa de mascotas en las preguntas frecuentes.
    resto = []
    for p in paginas:
        for i, linea in enumerate(p.read_text().splitlines(), 1):
            if re.search(r'\$\s?[\d]|USD\s*[\d]', linea):
                resto.append(f"  {p.name}:{i}  {linea.strip()[:96]}")
    if resto:
        print("\nQuedan importes en prosa, hay que redactarlos a mano:")
        print("\n".join(resto))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
