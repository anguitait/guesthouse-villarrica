#!/usr/bin/env python3
"""Verifica los ratios de contraste WCAG 2.1 de los tokens de color.

Lee los valores directamente de css/tokens.css, de modo que el chequeo
sigue al CSS y no a una copia que se desincroniza. Sale con codigo 1 si
algun par obligatorio no cumple.

Uso: python3 tools/contraste.py
"""
import pathlib
import re
import sys

TOKENS = pathlib.Path(__file__).resolve().parent.parent / "css" / "tokens.css"

# (token_texto, token_fondo, ratio_minimo, descripcion)
PARES = [
    ("--text-primary",    "--surface-primary",  4.5, "texto base sobre pagina"),
    ("--text-secondary",  "--surface-primary",  4.5, "texto secundario sobre pagina"),
    ("--text-muted",      "--surface-primary",  4.5, "texto atenuado sobre pagina"),
    ("--brand-terracota", "--surface-primary",  4.5, "enlaces y CTA sobre pagina"),
    ("--text-primary",    "--surface-elevated", 4.5, "texto base sobre blanco"),
    ("--on-oliva",        "--brand-oliva",      4.5, "texto sobre seccion oliva"),
    ("--on-profundo",     "--brand-profundo",   4.5, "texto sobre seccion profunda"),
    ("--on-terracota",    "--brand-terracota",  4.5, "texto de boton primario"),
    ("--brand-arena",     "--brand-profundo",   4.5, "rotulos sobre fondo profundo"),
    ("--brand-salvia",    "--brand-profundo",   4.5, "texto suave sobre profundo"),
    ("--color-error",     "--surface-primary",  4.5, "mensaje de error"),
    # Titulos grandes (>=24px) solo necesitan 3.0
    ("--brand-oliva",     "--surface-primary",  3.0, "titulo grande en oliva"),
]


def cargar_tokens():
    """Devuelve {nombre_token: '#rrggbb'} resolviendo alias var(--otro)."""
    texto = TOKENS.read_text()
    crudo = dict(re.findall(r"(--[\w-]+)\s*:\s*([^;]+);", texto))
    resuelto = {}

    def resolver(nombre, visto=()):
        if nombre in resuelto:
            return resuelto[nombre]
        if nombre in visto:
            raise SystemExit(f"ciclo de alias en {nombre}")
        valor = crudo.get(nombre, "").strip()
        alias = re.fullmatch(r"var\((--[\w-]+)\)", valor)
        if alias:
            valor = resolver(alias.group(1), visto + (nombre,))
        # Un alias puede resolver a None (p. ej. apunta a un gradiente).
        # Sin esta guarda, re.fullmatch(patron, None) revienta.
        if valor is None or not re.fullmatch(r"#[0-9a-fA-F]{6}", valor):
            return None
        resuelto[nombre] = valor.lower()
        return resuelto[nombre]

    for nombre in crudo:
        resolver(nombre)
    return resuelto


def luminancia(hexstr):
    r, g, b = (int(hexstr[i:i + 2], 16) / 255 for i in (1, 3, 5))
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = f(r), f(g), f(b)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(hex_a, hex_b):
    la, lb = luminancia(hex_a), luminancia(hex_b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def main():
    tokens = cargar_tokens()
    fallos = []
    print(f"{'par':<44}{'ratio':>7} {'min':>6}")
    print("-" * 60)
    for t_texto, t_fondo, minimo, desc in PARES:
        hex_texto, hex_fondo = tokens.get(t_texto), tokens.get(t_fondo)
        if not hex_texto or not hex_fondo:
            faltante = t_texto if not hex_texto else t_fondo
            fallos.append(f"token no definido o no resoluble: {faltante}")
            print(f"{desc:<44}{'?':>7} {minimo:>6.1f}  <-- {faltante} falta")
            continue
        r = ratio(hex_texto, hex_fondo)
        marca = "" if r >= minimo else "  <-- FALLA"
        print(f"{desc:<44}{r:>7.2f} {minimo:>6.1f}{marca}")
        if r < minimo:
            fallos.append(f"{desc}: {r:.2f} < {minimo}")

    print()
    if fallos:
        print(f"FALLA — {len(fallos)} problema(s):")
        for f in fallos:
            print(f"  - {f}")
        return 1
    print(f"OK — {len(PARES)} pares cumplen WCAG AA")
    return 0


if __name__ == "__main__":
    sys.exit(main())
