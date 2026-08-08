# Rediseño de marca Flor del Bosque — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alinear el sitio con el Manual de Marca Flor del Bosque — paleta, tipografía Montserrat y dirección de arte "Claros del bosque" en intensidad sobria — sin alterar arquitectura ni contenido.

**Architecture:** El sitio es HTML/CSS/JS estático sin build step. Todo el color y la tipografía pasan por `css/tokens.css`, así que el re-skin se concentra ahí y se propaga solo. La verificación no es un framework de tests sino dos scripts ejecutables (`tools/contraste.py` y `tools/verificar-marca.sh`) que se escriben **primero**, fallan contra el estado actual, y van pasando a verde tarea por tarea. Las imágenes se procesan con un script manual reproducible.

**Tech Stack:** HTML5, CSS custom properties, JS vanilla, Python 3 (stdlib), `sips` (macOS), `cwebp` opcional, Playwright MCP para capturas.

**Spec:** `docs/superpowers/specs/2026-08-08-rediseno-marca-flor-del-bosque-design.md`

---

## Estructura de archivos

**Se crean:**
- `tools/contraste.py` — parsea `css/tokens.css` y verifica ratios WCAG de los pares que el diseño usa de verdad. Única fuente de verdad de accesibilidad cromática.
- `tools/verificar-marca.sh` — aserciones de grep sobre el repo: nada de Fraunces, nada de colores fuera de marca, SVG de logo intactos, imágenes recortadas.
- `tools/prep-images.sh` — regenera derivadas desde los originales. Reejecutable cuando lleguen fotos nuevas.
- `docs/marca.md` — nota breve para quien mantenga el sitio: reglas de uso de color y logo.

**Se modifican:**
- `css/tokens.css` — reescritura completa (paleta + tipografía + aire).
- `css/base.css:32-44` — pesos de encabezado.
- `css/layout.css:22-90` — remapeo de secciones y clase `.section--oliva`.
- `css/components.css` — filigrana del isotipo, tamaño mínimo de logo, contención de fotos de interior.
- `index.html` + `pages/*.html` (10 archivos) — `<link>` de fuentes.
- Las 9 imágenes de 1250×834 — recorte del 7% inferior.

**No se tocan:** `images/logo/*.svg`, `js/main.js`, textos, estructura de navegación.

---

## Task 1: Arnés de verificación

Se escribe antes que nada. Debe fallar contra el estado actual: eso demuestra que mide algo real.

**Files:**
- Create: `tools/contraste.py`
- Create: `tools/verificar-marca.sh`

- [ ] **Step 1: Escribir el verificador de contraste**

Create `tools/contraste.py`:

```python
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
```

- [ ] **Step 2: Ejecutarlo y verificar que falla**

Run: `python3 tools/contraste.py; echo "exit=$?"`

Expected: `exit=1`. Los tokens `--brand-*`, `--on-*` no existen todavía, así que la mayoría de líneas imprimen `<-- ... falta`.

- [ ] **Step 3: Escribir el verificador de marca**

Create `tools/verificar-marca.sh`:

```bash
#!/usr/bin/env bash
# Aserciones sobre el cumplimiento del manual de marca.
# Se ejecuta desde la raiz del repositorio. Sale con 1 si algo falla.
set -uo pipefail
cd "$(dirname "$0")/.."

fallos=0
ok()    { printf '  OK    %s\n' "$1"; }
falla() { printf '  FALLA %s\n' "$1"; fallos=$((fallos + 1)); }

html_files=(index.html pages/*.html)

echo "Tipografia"
if grep -lq 'Fraunces\|Source+Sans' "${html_files[@]}" 2>/dev/null; then
  falla "quedan referencias a Fraunces o Source Sans 3"
else
  ok "sin Fraunces ni Source Sans 3"
fi

faltan_montserrat=()
for f in "${html_files[@]}"; do
  grep -q 'family=Montserrat' "$f" || faltan_montserrat+=("$f")
done
if [ ${#faltan_montserrat[@]} -eq 0 ]; then
  ok "Montserrat presente en los ${#html_files[@]} HTML"
else
  falla "sin Montserrat: ${faltan_montserrat[*]}"
fi

echo "Colores fuera de marca"
for hex in '#c45d3a' '#d97b5c' '#9e4a2e' '#3d6b6e' '#5a8a8d' '#2a4a4c' '#1a2e1f'; do
  if grep -riq -- "$hex" css/ index.html pages/ 2>/dev/null; then
    falla "sigue presente $hex"
  else
    ok "eliminado $hex"
  fi
done

if grep -rq -- '--color-river' css/ 2>/dev/null; then
  falla "quedan tokens --color-river"
else
  ok "tokens --color-river eliminados"
fi

echo "Assets de marca intactos"
if [ -z "$(git diff --name-only -- images/logo/)" ] \
   && [ -z "$(git diff --cached --name-only -- images/logo/)" ]; then
  ok "images/logo/ sin modificaciones"
else
  falla "images/logo/ fue modificado: $(git diff --name-only -- images/logo/ | tr '\n' ' ')"
fi

echo "Marca de agua recortada"
con_marca=(
  cowork/living-principal cowork/mesas-trabajo
  experiencias/gallinero-huerta experiencias/hamaca-bosque
  habitaciones/habitacion-verde hero/vista-aerea-drone
  lugar/casa-exterior lugar/piscina-casa lugar/piscina-jardin
)
for rel in "${con_marca[@]}"; do
  archivo="images/${rel}.jpg"
  if [ ! -f "$archivo" ]; then
    falla "no existe $archivo"
    continue
  fi
  alto=$(sips -g pixelHeight "$archivo" 2>/dev/null | awk '/pixelHeight/{print $2}')
  if [ "$alto" = "776" ]; then
    ok "recortada $rel (${alto}px)"
  else
    falla "$rel mide ${alto}px, se esperaba 776"
  fi
done

echo
if [ "$fallos" -eq 0 ]; then
  echo "OK — todas las aserciones pasan"
  exit 0
fi
echo "FALLA — $fallos asercion(es)"
exit 1
```

- [ ] **Step 4: Darle permisos y verificar que falla**

Run:
```bash
chmod +x tools/verificar-marca.sh && ./tools/verificar-marca.sh; echo "exit=$?"
```

Expected: `exit=1`. Debe reportar Fraunces presente, Montserrat ausente en los 10 HTML, `#c45d3a` y `#1a2e1f` presentes, tokens `--color-river` presentes, y las 9 imágenes a 834px en vez de 776.

- [ ] **Step 5: Capturar el estado "antes"**

El spec pide comparación antes/después, así que las capturas del estado actual hay que tomarlas ahora, antes de tocar nada.

```bash
cd /Users/la/Documents/FLORDELBOSQUE/guesthouse-villarrica
mkdir -p docs/capturas/antes
python3 -m http.server 8765 >/dev/null 2>&1 &
echo $! > /tmp/fdb-server.pid
sleep 1 && curl -s -o /dev/null -w 'HTTP %{http_code}\n' http://localhost:8765/
```

Con Playwright MCP, captura a 1440×900 y guarda en `docs/capturas/antes/` una imagen por página:

```
http://localhost:8765/                        -> antes/index.png
http://localhost:8765/pages/alojamiento.html  -> antes/alojamiento.png
http://localhost:8765/pages/cowork.html       -> antes/cowork.png
http://localhost:8765/pages/coliving.html     -> antes/coliving.png
http://localhost:8765/pages/experiencias.html -> antes/experiencias.png
http://localhost:8765/pages/matrimonios.html  -> antes/matrimonios.png
http://localhost:8765/pages/nosotros.html     -> antes/nosotros.png
http://localhost:8765/pages/contacto.html     -> antes/contacto.png
http://localhost:8765/pages/agenda.html       -> antes/agenda.png
http://localhost:8765/pages/en.html           -> antes/en.png
```

Luego baja el servidor:

Run: `kill "$(cat /tmp/fdb-server.pid)" && rm /tmp/fdb-server.pid`

Expected: 10 archivos en `docs/capturas/antes/`.

- [ ] **Step 6: Commit**

```bash
git add tools/contraste.py tools/verificar-marca.sh docs/capturas/antes/
git commit -m "Agregar arnés de verificación de marca

Dos scripts que miden el cumplimiento del manual: contraste WCAG
leyendo los tokens del CSS, y aserciones de grep sobre tipografía,
colores fuera de paleta, integridad de los SVG y recorte de imágenes.

Ambos fallan contra el estado actual, que es lo esperado. Incluye las
capturas del estado previo para comparar al cerrar.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Reescribir tokens.css

**Files:**
- Modify: `css/tokens.css` (reescritura completa)

- [ ] **Step 1: Reemplazar el bloque de color y tipografía**

Reemplaza `css/tokens.css` completo por:

```css
/* ===========================================
   FLOR DEL BOSQUE - DESIGN TOKENS
   Version: 2.0 — Manual de Marca (2026-08)
   =========================================== */

:root {
  /* ─────────────────────────────────────────
     PALETA DE MARCA  (Manual pag. 10)
     Capa cruda. No usar directo en componentes:
     usar la capa semantica de mas abajo.
     ───────────────────────────────────────── */

  --brand-oliva: #647157;      /* principal — debe predominar */
  --brand-profundo: #1d2a22;   /* secundario */
  --brand-salvia: #a7b19c;     /* secundario */
  --brand-arena: #d2b286;      /* complementario */
  --brand-terracota: #7b4e35;  /* acento */
  --brand-marfil: #f2ece2;     /* base */

  /* Texto legible sobre cada fondo de marca.
     El marfil sobre oliva da 4.42 y NO cumple AA:
     sobre oliva va blanco puro (5.20). */
  --on-oliva: #ffffff;
  --on-profundo: var(--brand-marfil);
  --on-terracota: #ffffff;

  /* Variantes de interaccion, derivadas de la paleta */
  --brand-oliva-dark: #4f5946;
  --brand-terracota-dark: #613d29;

  /* ─────────────────────────────────────────
     PUENTE CON EL SISTEMA ANTERIOR
     Los componentes ya referencian estos nombres.
     Remapeados, no renombrados: evita editar 29 usos.
     ───────────────────────────────────────── */

  --color-primary: var(--brand-oliva);
  --color-primary-light: var(--brand-salvia);
  --color-primary-dark: var(--brand-profundo);

  --color-secondary: var(--brand-arena);
  --color-secondary-light: #e0c9a8;
  --color-secondary-dark: #b8925f;

  --color-accent: var(--brand-terracota);
  --color-accent-light: var(--brand-arena);
  --color-accent-dark: var(--brand-terracota-dark);

  /* Neutrales recalibrados sobre el marfil */
  --color-neutral-50: #f7f3ec;
  --color-neutral-100: var(--brand-marfil);
  --color-neutral-200: #e4dcce;
  --color-neutral-300: #d0c7b6;
  --color-neutral-400: #a69c8c;
  --color-neutral-500: #857b6d;
  --color-neutral-600: #5a5348;
  --color-neutral-700: #3e392f;
  --color-neutral-800: #2a2620;
  --color-neutral-900: var(--brand-profundo);

  /* Semanticos. Sin uso hoy; los formularios de contacto y
     agenda los necesitaran. Rebasados sobre la paleta.
     --color-error es la excepcion documentada: mantiene un
     rojo porque un error debe leerse como error. */
  --color-success: var(--brand-oliva);
  --color-warning: var(--brand-arena);
  --color-error: #8c3b3b;
  --color-info: var(--brand-salvia);

  /* Superficies */
  --surface-primary: var(--brand-marfil);
  --surface-secondary: var(--color-neutral-50);
  --surface-elevated: #ffffff;
  --surface-dark: var(--brand-profundo);

  /* Texto */
  --text-primary: var(--brand-profundo);
  --text-secondary: var(--color-neutral-600);
  --text-muted: #6e665a;
  --text-inverse: var(--brand-marfil);
  --text-accent: var(--brand-terracota);

  /* Overlays — sobre el verde profundo del manual */
  --overlay-light: rgba(29, 42, 34, 0.4);
  --overlay-medium: rgba(29, 42, 34, 0.6);
  --overlay-heavy: rgba(29, 42, 34, 0.8);
  --overlay-gradient: linear-gradient(
    180deg,
    rgba(29, 42, 34, 0) 0%,
    rgba(29, 42, 34, 0.7) 100%
  );
  /* Hero: mas oscuro arriba para que el logo blanco del header
     se lea, y abajo para el titular. */
  --overlay-hero: linear-gradient(
    180deg,
    rgba(29, 42, 34, 0.62) 0%,
    rgba(29, 42, 34, 0.32) 45%,
    rgba(29, 42, 34, 0.8) 100%
  );

  /* ─────────────────────────────────────────
     TIPOGRAFIA  (Manual pag. 11)
     Montserrat como familia unica.
     600 titulos / 500 subtitulos / 400 texto.
     ───────────────────────────────────────── */

  --font-display: 'Montserrat', 'Helvetica Neue', Arial, sans-serif;
  --font-body: 'Montserrat', 'Helvetica Neue', Arial, sans-serif;

  --font-weight-light: 400;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 600;

  --text-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
  --text-sm: clamp(0.875rem, 0.8rem + 0.35vw, 1rem);
  --text-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
  --text-lg: clamp(1.125rem, 1rem + 0.6vw, 1.25rem);
  --text-xl: clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem);
  --text-2xl: clamp(1.5rem, 1.2rem + 1.5vw, 2rem);
  --text-3xl: clamp(1.75rem, 1.35rem + 2vw, 2.25rem);
  --text-4xl: clamp(2.125rem, 1.45rem + 3.4vw, 3.125rem);
  --text-5xl: clamp(2.75rem, 1.9rem + 4.5vw, 4.5rem);

  --leading-tight: 1.12;
  --leading-snug: 1.3;
  --leading-normal: 1.55;
  --leading-relaxed: 1.7;

  --tracking-tight: -0.015em;
  --tracking-normal: 0;
  --tracking-wide: 0.025em;
  --tracking-wider: 0.05em;
  --tracking-widest: 0.16em;

  /* ─────────────────────────────────────────
     SPACING
     Manual sec. 6: "composicion limpia y respirable"
     ───────────────────────────────────────── */

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;
  --space-24: 6rem;
  --space-32: 8rem;

  --space-section: clamp(5rem, 9vw, 10rem);
  --container-max: 1280px;
  --container-padding: clamp(1rem, 5vw, 3rem);
  --measure: 68ch;

  /* ─────────────────────────────────────────
     EFFECTS
     ───────────────────────────────────────── */

  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 8px;
  --radius-full: 9999px;

  --shadow-sm: 0 1px 3px rgba(29, 42, 34, 0.08);
  --shadow-md: 0 4px 12px rgba(29, 42, 34, 0.1);
  --shadow-lg: 0 8px 24px rgba(29, 42, 34, 0.12);
  --shadow-xl: 0 16px 48px rgba(29, 42, 34, 0.15);
  --shadow-hover: 0 8px 30px rgba(123, 78, 53, 0.15);

  --ease-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

  --duration-fast: 150ms;
  --duration-base: 250ms;
  --duration-slow: 400ms;
  --duration-slower: 600ms;

  /* Filigrana del isotipo. Una por pagina, nunca sobre texto. */
  --filigrana-opacity: 0.13;
  --filigrana-size: clamp(180px, 22vw, 320px);

  /* ─────────────────────────────────────────
     Z-INDEX
     ───────────────────────────────────────── */

  --z-dropdown: 50;
  --z-sticky: 100;
  --z-fixed: 100;
  --z-modal-backdrop: 200;
  --z-modal: 210;
  --z-tooltip: 300;
  --z-whatsapp: 1000;
}
```

- [ ] **Step 2: Ejecutar el verificador de contraste**

Run: `python3 tools/contraste.py; echo "exit=$?"`

Expected: `exit=0` y la línea final `OK — 12 pares cumplen WCAG AA`.

Si algún par falla, el ajuste va sobre el token de texto (oscurecerlo), nunca sobre `--brand-*`, que son valores del manual.

- [ ] **Step 3: Verificar que desaparecieron los colores fuera de marca**

Run: `./tools/verificar-marca.sh 2>&1 | grep -A20 'Colores fuera de marca'`

Expected: las 7 líneas de hex y la de `--color-river` en `OK`. Tipografía e imágenes siguen fallando: eso se resuelve en las tareas 3 y 6.

- [ ] **Step 4: Commit**

```bash
git add css/tokens.css
git commit -m "Reescribir tokens sobre la paleta del manual de marca

Paleta oficial como capa cruda mas capa semantica que codifica donde
puede usarse cada color. El oliva no se usa para texto pequeno sobre
marfil: 4.42:1 no alcanza AA. Sobre oliva el texto va en blanco puro.

--color-accent absorbe el cambio de naranjo a terracota sin tocar sus
29 usos. Los tokens muertos --color-river salen.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Cambiar la tipografía en los 10 HTML

**Files:**
- Modify: `index.html`, `pages/agenda.html`, `pages/alojamiento.html`, `pages/coliving.html`, `pages/contacto.html`, `pages/cowork.html`, `pages/en.html`, `pages/experiencias.html`, `pages/matrimonios.html`, `pages/nosotros.html`
- Modify: `css/base.css:32-44`

- [ ] **Step 1: Reemplazar el link de Google Fonts en los 10 archivos**

El `<link>` actual es idéntico en todos. Se reemplaza en bloque:

```bash
cd /Users/la/Documents/FLORDELBOSQUE/guesthouse-villarrica
viejo='https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Source+Sans+3:wght@300;400;500;600;700&display=swap'
nuevo='https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap'
python3 - "$viejo" "$nuevo" <<'PY'
import pathlib, sys
viejo, nuevo = sys.argv[1], sys.argv[2]
archivos = [pathlib.Path("index.html")] + sorted(pathlib.Path("pages").glob("*.html"))
for p in archivos:
    t = p.read_text()
    if viejo not in t:
        print(f"AVISO: patron no encontrado en {p}")
        continue
    p.write_text(t.replace(viejo, nuevo))
    print(f"actualizado {p}")
PY
```

Expected: 10 líneas `actualizado ...`, ningún `AVISO`.

- [ ] **Step 2: Ajustar el peso de los encabezados**

En `css/base.css`, la regla `h1, h2, h3, h4, h5, h6` (línea 32) usa `--font-weight-regular`. Montserrat necesita 600 según la jerarquía del manual. Reemplaza:

```css
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
  font-weight: var(--font-weight-regular);
  line-height: var(--leading-tight);
  color: var(--text-primary);
}
```

por:

```css
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
  font-weight: var(--font-weight-semibold);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tight);
  color: var(--text-primary);
}
```

- [ ] **Step 3: Verificar tipografía**

Run: `./tools/verificar-marca.sh 2>&1 | grep -A4 '^Tipografia'`

Expected:
```
Tipografia
  OK    sin Fraunces ni Source Sans 3
  OK    Montserrat presente en los 10 HTML
```

- [ ] **Step 4: Commit**

```bash
git add index.html pages/*.html css/base.css
git commit -m "Cambiar a Montserrat como tipografia unica

Reemplaza Fraunces y Source Sans 3 por Montserrat en los 10 HTML y
sube los encabezados a peso 600, segun la jerarquia de la pag. 11 del
manual. Los titulos quedan bastante mas presentes: es el efecto
esperado del cambio de serif a geometrica sans.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Ritmo de secciones y clase `.section--oliva`

**Files:**
- Modify: `css/layout.css:22-101`

- [ ] **Step 1: Reemplazar el bloque de secciones**

En `css/layout.css`, reemplaza desde `/* Sections */` (línea 22) hasta el cierre de `.section__header--center` (línea 101) por:

```css
/* Sections */
.section {
  padding: var(--space-section) 0;
  background: var(--surface-primary);
}

/* Bloque oscuro — verde profundo del manual */
.section--dark {
  background: var(--brand-profundo);
  color: var(--on-profundo);
}

.section--dark h1,
.section--dark h2,
.section--dark h3,
.section--dark h4,
.section--dark h5,
.section--dark h6 {
  color: var(--on-profundo);
}

.section--dark p,
.section--dark .lead {
  color: var(--brand-salvia);
}

.section--dark .feature-item__content h4 {
  color: var(--on-profundo);
}

.section--dark .feature-item__content p {
  color: var(--brand-salvia);
}

.section--dark strong {
  color: var(--on-profundo);
}

.section--dark .feature-item__icon {
  background: rgba(255, 255, 255, 0.1);
}

.section--dark .overline {
  color: var(--brand-arena);
}

.section--dark .pricing-card {
  background: var(--surface-elevated);
}

.section--dark .pricing-card h3,
.section--dark .pricing-card__title {
  color: var(--text-primary);
}

.section--dark .pricing-card p,
.section--dark .pricing-card__period {
  color: var(--text-muted);
}

.section--dark .pricing-card__features li {
  color: var(--text-secondary);
}

/* Bloque oliva — el color que el manual pide que predomine.
   Una o dos por pagina, tipicamente reserva y CTA.
   El texto va en blanco puro: el marfil sobre oliva da 4.42
   y no alcanza AA. */
.section--oliva {
  background: var(--brand-oliva);
  color: var(--on-oliva);
}

.section--oliva h1,
.section--oliva h2,
.section--oliva h3,
.section--oliva h4,
.section--oliva h5,
.section--oliva h6,
.section--oliva strong {
  color: var(--on-oliva);
}

.section--oliva p,
.section--oliva .lead,
.section--oliva li {
  color: var(--on-oliva);
}

.section--oliva .overline {
  color: var(--brand-arena);
}

.section--oliva .feature-item__icon {
  background: rgba(255, 255, 255, 0.12);
}

/* Respiro sutil sobre el marfil */
.section--cream {
  background: var(--surface-elevated);
}

.section--white {
  background: var(--surface-elevated);
}

.section__header {
  margin-bottom: var(--space-16);
}

.section__header--center {
  text-align: center;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
}

/* Ancho de lectura — manual sec. 6, "composicion respirable" */
.section__header p,
.section .lead,
.prose {
  max-width: var(--measure);
}

.section__header--center p {
  margin-left: auto;
  margin-right: auto;
}
```

- [ ] **Step 2: Verificar que ninguna página quedó sin fondo**

Run:
```bash
python3 - <<'PY'
import pathlib, re
for p in [pathlib.Path("index.html")] + sorted(pathlib.Path("pages").glob("*.html")):
    clases = re.findall(r'<section[^>]*class="([^"]*)"', p.read_text())
    desconocidas = set()
    for c in clases:
        for token in c.split():
            if token.startswith("section--") and token not in {
                "section--dark", "section--cream", "section--white", "section--oliva"
            }:
                desconocidas.add(token)
    estado = "OK" if not desconocidas else f"REVISAR {sorted(desconocidas)}"
    print(f"{p.name:<24}{len(clases):>3} secciones  {estado}")
PY
```

Expected: 10 líneas, todas `OK`. Si aparece un modificador desconocido, hay que darle fondo explícito antes de seguir.

- [ ] **Step 3: Commit**

```bash
git add css/layout.css
git commit -m "Remapear el ritmo de secciones a la paleta de marca

.section base pasa a marfil, --dark al verde profundo del manual y
entra .section--oliva para los bloques donde el oliva manda, con
texto en blanco puro por contraste.

Sube el aire entre secciones y entra --measure para limitar el ancho
de lectura.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Aplicar `.section--oliva` en las páginas

**Files:**
- Modify: `index.html` y las páginas con bloque de reserva o CTA final

- [ ] **Step 1: Listar el candidato exacto de cada página**

Este script imprime, por página, la **última** sección `--dark` con su número de línea. Esa es la que se convierte.

```bash
cd /Users/la/Documents/FLORDELBOSQUE/guesthouse-villarrica
python3 - <<'PY'
import pathlib, re
for p in [pathlib.Path("index.html")] + sorted(pathlib.Path("pages").glob("*.html")):
    lineas = p.read_text().splitlines()
    hits = [(i + 1, l.strip()) for i, l in enumerate(lineas)
            if re.search(r'<section[^>]*class="[^"]*section--dark', l)]
    if not hits:
        print(f"{p.name:<24} sin section--dark — elegir a mano una .section de cierre")
        continue
    n, texto = hits[-1]
    print(f"{p.name:<24} linea {n:<5} ({len(hits)} dark en total)  {texto[:60]}")
PY
```

Expected: una línea por página. Anota el número de línea de cada una — es el objetivo del paso siguiente.

- [ ] **Step 2: Convertir una sección por página**

Para cada página, cambia **una** sección de cierre de `section--dark` a `section--oliva`. Ejemplo en `index.html` — la sección de CTA final:

```html
<!-- antes -->
<section class="section section--dark">

<!-- despues -->
<section class="section section--oliva">
```

Regla: si una página tiene dos `section--dark` consecutivas, convierte solo la última. Nunca dejes dos `--oliva` seguidas ni más de dos por página.

- [ ] **Step 3: Verificar la distribución**

Run:
```bash
for f in index.html pages/*.html; do
  printf '%-28s oliva=%s dark=%s\n' "$f" \
    "$(grep -c 'section--oliva' $f)" "$(grep -c 'section--dark' $f)"
done
```

Expected: cada archivo con `oliva` entre 1 y 2.

- [ ] **Step 4: Commit**

```bash
git add index.html pages/*.html
git commit -m "Aplicar secciones oliva en los bloques de cierre

Una o dos por pagina, en reserva y CTA, para que el oliva tenga la
presencia que el manual le pide sin convertir el sitio en un bloque
de color.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Pipeline de imágenes

**Files:**
- Create: `tools/prep-images.sh`
- Modify: las 9 imágenes de 1250×834

- [ ] **Step 1: Escribir el script**

Create `tools/prep-images.sh`:

```bash
#!/usr/bin/env bash
# Prepara las imagenes del sitio.
#
# 1. Recorta el 7% inferior de los archivos que llevan la marca de agua
#    "MP" (solo el lote de 1250x834; los de matrimonios y el domo estan
#    limpios y no se tocan).
# 2. Genera una variante de 640px de ancho para movil.
# 3. Genera WebP si cwebp esta disponible.
#
# Reejecutable: si un archivo ya mide 776px de alto, no lo vuelve a
# recortar. Cuando lleguen fotos nuevas, se reemplaza el original y se
# vuelve a correr.
set -euo pipefail
cd "$(dirname "$0")/.."

CON_MARCA=(
  cowork/living-principal cowork/mesas-trabajo
  experiencias/gallinero-huerta experiencias/hamaca-bosque
  habitaciones/habitacion-verde hero/vista-aerea-drone
  lugar/casa-exterior lugar/piscina-casa lugar/piscina-jardin
)

ALTO_OBJETIVO=776

echo "── Recorte de marca de agua"
for rel in "${CON_MARCA[@]}"; do
  archivo="images/${rel}.jpg"
  [ -f "$archivo" ] || { echo "  omitido (no existe): $archivo"; continue; }
  ancho=$(sips -g pixelWidth  "$archivo" | awk '/pixelWidth/{print $2}')
  alto=$(sips  -g pixelHeight "$archivo" | awk '/pixelHeight/{print $2}')
  if [ "$alto" -le "$ALTO_OBJETIVO" ]; then
    echo "  ya recortada: $rel (${ancho}x${alto})"
    continue
  fi
  sips -c "$ALTO_OBJETIVO" "$ancho" --cropOffset 0 0 "$archivo" --out "$archivo" >/dev/null
  echo "  recortada: $rel (${ancho}x${alto} -> ${ancho}x${ALTO_OBJETIVO})"
done

echo "── Variantes de 640px"
mkdir -p images/640
while IFS= read -r archivo; do
  base=$(basename "$archivo" .jpg)
  destino="images/640/${base}.jpg"
  sips -Z 640 "$archivo" --out "$destino" >/dev/null
  echo "  $destino"
done < <(find images -maxdepth 2 -name '*.jpg' -not -path 'images/640/*')

echo "── WebP"
if command -v cwebp >/dev/null 2>&1; then
  while IFS= read -r archivo; do
    cwebp -quiet -q 82 "$archivo" -o "${archivo%.jpg}.webp"
    echo "  ${archivo%.jpg}.webp"
  done < <(find images -maxdepth 2 -name '*.jpg')
else
  echo "  cwebp no instalado — se omite (brew install webp)"
fi

echo
echo "Listo. Revisa con: ./tools/verificar-marca.sh"
```

- [ ] **Step 2: Respaldar antes de recortar en sitio**

El recorte sobrescribe los originales, y el repositorio git es el respaldo. Verifica que el árbol está limpio antes:

Run: `git status --porcelain images/`

Expected: sin salida. Si hay cambios sin commitear en `images/`, commitéalos antes de continuar — el script no es reversible sin git.

- [ ] **Step 3: Ejecutar**

Run: `chmod +x tools/prep-images.sh && ./tools/prep-images.sh`

Expected: 9 líneas `recortada:` en el primer bloque, luego las variantes de 640.

- [ ] **Step 4: Verificar que la marca de agua desapareció**

Run: `./tools/verificar-marca.sh 2>&1 | grep -A11 'Marca de agua'`

Expected: las 9 líneas en `OK — recortada ... (776px)`.

Además, confirmación visual: abre `images/hero/vista-aerea-drone.jpg` y comprueba que no queda rastro del logo "MP" en el borde inferior.

- [ ] **Step 5: Commit**

```bash
git add tools/prep-images.sh images/
git commit -m "Recortar la marca de agua de las fotos y agregar pipeline

Las 9 imagenes de 1250x834 llevaban un logo MP en el 6% inferior. Un
recorte del 7% lo elimina sin alterar el encuadre. Las de matrimonios
y el domo estaban limpias y no se tocaron.

prep-images.sh es reejecutable e idempotente: cuando lleguen fotos
nuevas se reemplaza el original y se vuelve a correr.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Contener las fotos de interior

Las tres fotos de interior tienen muros verde lima, rojo y naranjo. No se corrigen de color ni se eliminan: se contienen para que nunca dominen una pantalla.

**Files:**
- Modify: `css/components.css` (agregar al final)
- Modify: las páginas donde estas fotos aparecen a sangre o como hero

- [ ] **Step 1: Agregar la regla de contención**

Añade al final de `css/components.css`:

```css
/* ===========================================
   CONTENCION DE FOTOS DE INTERIOR SATURADO
   living-principal, mesas-trabajo y habitacion-verde
   muestran muros verde lima y rojo, fuera de la paleta.
   No se corrigen de color: un huesped reserva mirando
   esas fotos. Se contienen para que no dominen una
   pantalla. Se eliminan al llegar la sesion nueva.
   =========================================== */

.img-contenida {
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: var(--radius-lg);
  max-width: 560px;
}

.img-contenida img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Nunca a sangre completa ni como fondo de hero */
.hero__background img[src*="living-principal"],
.hero__background img[src*="mesas-trabajo"],
.hero__background img[src*="habitacion-verde"] {
  display: none;
}
```

- [ ] **Step 2: Localizar usos a sangre**

Run:
```bash
grep -n 'living-principal\|mesas-trabajo\|habitacion-verde' index.html pages/*.html
```

Revisa cada resultado. Si la imagen está dentro de `.hero__background`, `.card-experience__image` a ancho completo, o cualquier contenedor sin límite de ancho, envuélvela en `.img-contenida`:

```html
<!-- antes -->
<img src="images/cowork/living-principal.jpg" alt="Living principal">

<!-- despues -->
<div class="img-contenida">
  <img src="images/cowork/living-principal.jpg" alt="Living principal">
</div>
```

Si ya está dentro de una tarjeta de grilla con ancho acotado, déjala como está.

- [ ] **Step 3: Verificar que ninguna es hero**

Run:
```bash
python3 - <<'PY'
import pathlib, re
saturadas = ("living-principal", "mesas-trabajo", "habitacion-verde")
problemas = []
for p in [pathlib.Path("index.html")] + sorted(pathlib.Path("pages").glob("*.html")):
    t = p.read_text()
    for m in re.finditer(r'<section class="hero".*?</section>', t, re.S):
        for s in saturadas:
            if s in m.group(0):
                problemas.append(f"{p.name}: {s} usada en hero")
print("\n".join(problemas) if problemas else "OK — ninguna foto saturada en un hero")
PY
```

Expected: `OK — ninguna foto saturada en un hero`

- [ ] **Step 4: Commit**

```bash
git add css/components.css index.html pages/*.html
git commit -m "Contener las fotos de interior saturado

Los tres interiores con muros verde lima y rojo se conservan pero
nunca a sangre ni como hero, para que no dominen una pantalla. No se
corrigen de color: representan piezas reales y un huesped reserva
mirandolas.

Son la primera prioridad de reemplazo cuando exista la sesion nueva.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Filigrana del isotipo

**Files:**
- Modify: `css/components.css` (agregar al final)
- Modify: `index.html` y `pages/*.html` — una filigrana por página

- [ ] **Step 1: Agregar el componente**

Añade al final de `css/components.css`:

```css
/* ===========================================
   FILIGRANA DEL ISOTIPO
   Direccion "Claros del bosque", intensidad sobria.
   Reglas duras:
     - una sola por pagina
     - nunca sobre texto
     - solo variantes oficiales de images/logo/
     - jamas redibujada ni recoloreada
   =========================================== */

.filigrana {
  position: absolute;
  width: var(--filigrana-size);
  height: auto;
  opacity: var(--filigrana-opacity);
  pointer-events: none;
  user-select: none;
  z-index: 0;
}

/* Sangra por el borde superior derecho */
.filigrana--sup-der {
  top: calc(var(--filigrana-size) * -0.22);
  right: calc(var(--filigrana-size) * -0.18);
}

/* Sangra por el borde inferior izquierdo */
.filigrana--inf-izq {
  bottom: calc(var(--filigrana-size) * -0.28);
  left: calc(var(--filigrana-size) * -0.22);
}

/* El contenedor necesita contexto de apilamiento y recorte */
.section--con-filigrana {
  position: relative;
  overflow: hidden;
}

.section--con-filigrana > .container {
  position: relative;
  z-index: 1;
}

@media (prefers-reduced-motion: no-preference) {
  .filigrana {
    transition: opacity var(--duration-slower) var(--ease-out);
  }
}
```

- [ ] **Step 2: Insertar una filigrana por página**

En cada uno de los 10 HTML, elige **una** sección de fondo marfil que no sea el hero — típicamente la primera sección de contenido — y añádele la clase más el SVG. Sobre marfil va la variante verde; sobre `--dark` u `--oliva`, la blanca.

```html
<!-- antes -->
<section class="section">
  <div class="container">
    ...
  </div>
</section>

<!-- despues -->
<section class="section section--con-filigrana">
  <img class="filigrana filigrana--sup-der"
       src="images/logo/isotipo-verde.svg"
       alt="" aria-hidden="true">
  <div class="container">
    ...
  </div>
</section>
```

En `pages/*.html` la ruta es `../images/logo/isotipo-verde.svg`.

- [ ] **Step 3: Verificar una por página y que no se redibujó nada**

Run:
```bash
for f in index.html pages/*.html; do
  n=$(grep -c 'class="filigrana' $f)
  estado=$([ "$n" -eq 1 ] && echo OK || echo "REVISAR ($n)")
  printf '%-28s %s\n' "$f" "$estado"
done
echo "--- SVG de marca intactos ---"
git diff --name-only -- images/logo/ | grep . && echo "MODIFICADOS" || echo "OK sin cambios"
```

Expected: 10 líneas `OK`, y `OK sin cambios`.

- [ ] **Step 4: Verificar que no queda sobre texto**

Abre `index.html` en el navegador y confirma visualmente que la filigrana sangra por el borde y no se cruza con ningún párrafo. Si se cruza, cambia el modificador a `--inf-izq` o muévela a otra sección.

- [ ] **Step 5: Commit**

```bash
git add css/components.css index.html pages/*.html
git commit -m "Agregar la filigrana del isotipo

Direccion 'Claros del bosque' en intensidad sobria: el isotipo oficial
una vez por pagina, al 13%, sangrando por un borde, aria-hidden y sin
capturar eventos.

Usa el SVG entregado sin modificar. Nunca sobre texto, nunca dos en la
misma pagina.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Tamaño mínimo y área de seguridad del logo

**Files:**
- Modify: `css/components.css:168-195`

- [ ] **Step 1: Aplicar las reglas de la pág. 10**

El área de seguridad va como padding en el ancla `.header__logo`, no en las `img`: el segundo logo está en `position: absolute` y se posiciona contra la caja de padding del ancestro, así que ambas variantes se desplazan igual y el cross-fade no se descuadra.

En `css/components.css`, reemplaza el bloque de las líneas 168-183:

```css
.header__logo {
  position: relative;
  display: block;
  flex-shrink: 0;
  line-height: 0;
  text-decoration: none;
}

.header__logo img {
  display: block;
  width: auto;
  height: 40px;
  transition:
    opacity var(--duration-slow) var(--ease-out),
    height var(--duration-slow) var(--ease-out);
}
```

por:

```css
/* Manual pag. 10: area de seguridad equivalente a X alrededor del
   logotipo. Va en el ancla para que la variante absoluta se desplace
   con la otra. */
.header__logo {
  position: relative;
  display: block;
  flex-shrink: 0;
  line-height: 0;
  text-decoration: none;
  padding: 0.35em;
}

/* Manual pag. 10: minimo digital de 80px de ancho para el logo
   completo. Con height 40px y la proporcion 3.365:1 del SVG el ancho
   real es ~135px, asi que esta regla no llega a activarse: es una red
   de seguridad contra regresiones. */
.header__logo img {
  display: block;
  width: auto;
  height: 40px;
  min-width: 80px;
  transition:
    opacity var(--duration-slow) var(--ease-out),
    height var(--duration-slow) var(--ease-out);
}
```

- [ ] **Step 2: Verificar que ninguna media query baja del mínimo**

Run:
```bash
grep -n 'header__logo' css/components.css css/main.css
```

Revisa cada resultado: si alguno fija `height` por debajo de 24px (que con la proporción 3.365:1 daría menos de 80px de ancho), súbelo. La regla `.header--scrolled .header__logo img { height: 34px; }` da ~114px y está bien.

- [ ] **Step 3: Commit**

```bash
git add css/components.css
git commit -m "Aplicar minimo digital y area de seguridad del logo

80px de ancho minimo y padding equivalente a X, segun la pag. 10 del
manual.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Nota de mantenimiento

**Files:**
- Create: `docs/marca.md`

- [ ] **Step 1: Escribir la nota**

Create `docs/marca.md`:

```markdown
# Reglas de marca para este sitio

Resumen operativo del Manual de Marca Flor del Bosque. El manual completo
está en `/Users/la/Documents/FLORDELBOSQUE/MANUAL DE MARCA FLOR DEL BOSQUE-2.pdf`.
Las decisiones de diseño ya tomadas están en
`docs/superpowers/specs/2026-08-08-rediseno-marca-flor-del-bosque-design.md`.

## Color

Los seis colores viven en `css/tokens.css` como `--brand-*`. **No los uses
directo en componentes** — usa la capa semántica (`--text-primary`,
`--surface-primary`, etc.), que ya codifica dónde es seguro cada uno.

La regla que más se olvida: **el oliva `#647157` da 4.42:1 sobre marfil y no
alcanza AA.** No sirve para texto pequeño sobre el fondo de página. Para
títulos de 24px o más sí. Sobre fondo oliva el texto va en blanco puro,
no en marfil.

Después de tocar cualquier color: `python3 tools/contraste.py`

## Tipografía

Montserrat, familia única. 600 títulos, 500 subtítulos, 400 texto. No agregues
otra fuente: el manual lo prohíbe explícitamente.

## Logo

Los SVG de `images/logo/` **no se editan nunca**, ni para corregir su hex
(usan `#647156`/`#d7b286` y el manual dice `#647157`/`#D2B286`; la diferencia
es imperceptible y no vale romper el asset entregado).

Tampoco se redibuja ni se aproxima el isotipo. Si necesitas una forma orgánica,
sale del archivo real.

Fondos permitidos: claro (`logo-horizontal.svg`), color y oscuro
(`logo-horizontal-blanco.svg`). Mínimo digital 80px de ancho.

La filigrana va **una vez por página**, al 13%, sangrando por un borde, y nunca
sobre texto.

## Fotografía

Las tres fotos de interior (`living-principal`, `mesas-trabajo`,
`habitacion-verde`) tienen muros verde lima y rojo, fuera de la paleta. **No se
corrigen de color** — representan piezas reales y un huésped reserva mirándolas.
Se mantienen contenidas con `.img-contenida`, nunca a sangre ni como hero.
Son la primera prioridad de reemplazo.

Al llegar fotos nuevas: reemplaza el original en `images/` y corre
`./tools/prep-images.sh`. Los contenedores tienen `aspect-ratio` fijo, así que
el layout no se mueve.

## Antes de publicar

    ./tools/verificar-marca.sh && python3 tools/contraste.py
```

- [ ] **Step 2: Commit**

```bash
git add docs/marca.md
git commit -m "Documentar las reglas de marca para mantenimiento

Resumen operativo: la regla de contraste del oliva, la prohibicion de
editar los SVG, el manejo de las fotos de interior y los comandos de
verificacion.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Pasada visual y verificación final

**Files:**
- Ninguno nuevo; correcciones puntuales si la revisión las pide

- [ ] **Step 1: Levantar el sitio**

Run:
```bash
cd /Users/la/Documents/FLORDELBOSQUE/guesthouse-villarrica
python3 -m http.server 8765 >/dev/null 2>&1 &
echo $! > /tmp/fdb-server.pid
sleep 1 && curl -s -o /dev/null -w 'HTTP %{http_code}\n' http://localhost:8765/
```

Expected: `HTTP 200`

- [ ] **Step 2: Capturar las 10 páginas y comparar con el "antes"**

Con Playwright MCP, navega y captura cada una a 1440×900 (guardando en `docs/capturas/despues/`, mismos nombres que en `antes/`) y además a 390×844 para revisar móvil:

```
http://localhost:8765/
http://localhost:8765/pages/alojamiento.html
http://localhost:8765/pages/cowork.html
http://localhost:8765/pages/coliving.html
http://localhost:8765/pages/experiencias.html
http://localhost:8765/pages/matrimonios.html
http://localhost:8765/pages/nosotros.html
http://localhost:8765/pages/contacto.html
http://localhost:8765/pages/agenda.html
http://localhost:8765/pages/en.html
```

Revisa en cada captura, abriendo el par `antes/X.png` y `despues/X.png`:
- Ningún texto oliva pequeño sobre marfil.
- La filigrana no cruza texto.
- El logo se lee sobre el hero.
- Los encabezados en 600 no desbordan en móvil.
- Ninguna foto de interior a ancho completo.
- Ninguna sección perdió su fondo respecto del "antes".

- [ ] **Step 3: Corregir lo que aparezca**

Los desbordes de titular en móvil se arreglan bajando el `clamp` mínimo de `--text-4xl` o `--text-5xl` en `tokens.css`, nunca el peso.

- [ ] **Step 4: Bajar el servidor**

Run: `kill "$(cat /tmp/fdb-server.pid)" && rm /tmp/fdb-server.pid`

- [ ] **Step 5: Verificación completa en verde**

Run:
```bash
./tools/verificar-marca.sh && python3 tools/contraste.py; echo "exit=$?"
```

Expected: `exit=0`, con `OK — todas las aserciones pasan` y `OK — 12 pares cumplen WCAG AA`.

- [ ] **Step 6: Confirmar que los assets de marca siguen intactos**

Run: `git log --oneline -- images/logo/ | head -3`

Expected: solo el commit histórico de integración del logo (`7a7ff0e`), ninguno nuevo.

- [ ] **Step 7: Commit final**

```bash
git add -A
git commit -m "Ajustes de la pasada visual del rediseno de marca

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Cobertura del spec

| Requisito del spec | Tarea |
|---|---|
| Tokens sobre la paleta oficial, dos capas | 2 |
| Regla de contraste del oliva codificada | 1, 2 |
| `--color-accent` de naranjo a terracota | 2 |
| Eliminar `--color-river` | 2 |
| Semánticos rebasados, `--color-error` como excepción | 2 |
| Montserrat, tres pesos, en los 10 HTML | 3 |
| Encabezados a peso 600 | 3 |
| SVG de marca sin modificar | 1, 8, 11 |
| Remapeo de secciones y `.section--oliva` | 4, 5 |
| Aire y `--measure` | 2, 4 |
| Recorte de la marca de agua en 9 archivos | 6 |
| Pipeline reejecutable, `aspect-ratio` fijo | 6, 7 |
| Interiores contenidos, sin corrección de color | 7 |
| Filigrana una por página | 8 |
| Mínimo de logo y área de seguridad | 9 |
| Verificación: contraste, capturas, 63 secciones | 1, 4, 11 |
