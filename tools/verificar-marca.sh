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

# Los mismos colores viejos escritos como rgb(), que el grep de hex no ve.
# Es por donde se colaron un box-shadow naranjo y el fondo del header.
for triplete in '196, *93, *58' '26, *46, *31' '250, *248, *245' \
                '242, *237, *230' '139, *111, *74' '61, *107, *110'; do
  if grep -rqE "rgba?\($triplete" css/ 2>/dev/null; then
    falla "sigue presente rgb($triplete) del palette viejo"
  else
    ok "eliminado rgb($triplete)"
  fi
done

if grep -rq -- '--color-river' css/ 2>/dev/null; then
  falla "quedan tokens --color-river"
else
  ok "tokens --color-river eliminados"
fi

echo "Datos de contacto"
if grep -rq '56900000000\|+56 9 XXXX XXXX' index.html pages/ js/ 2>/dev/null; then
  falla "queda el telefono placeholder"
else
  ok "telefono real en todos los enlaces"
fi

correos_extra=$(grep -rhoE '[a-zA-Z0-9._%+-]+@flordelbosque\.cl' index.html pages/ 2>/dev/null \
  | grep -v '^hola@flordelbosque\.cl$' | sort -u)
if [ -z "$correos_extra" ]; then
  ok "hola@flordelbosque.cl es la unica direccion"
else
  falla "sobreviven otras direcciones: $(echo "$correos_extra" | tr '\n' ' ')"
fi

# Las tres fotos de interior tienen muros verde lima y rojo, fuera de la
# paleta. No se corrigen de color porque muestran piezas reales y un
# huesped reserva mirandolas. La regla es que nunca dominen una pantalla:
# valen dentro de una tarjeta o media columna, nunca como hero.
echo "Fotos de interior contenidas"
if python3 - <<'PY'
import pathlib, re, sys
saturadas = ("living-principal", "mesas-trabajo", "habitacion-verde")
patron = re.compile(r'<img[^>]*src="[^"]*(' + "|".join(saturadas) + r')')
malas = []
for p in [pathlib.Path("index.html")] + sorted(pathlib.Path("pages").glob("*.html")):
    t = p.read_text()
    for m in patron.finditer(t):
        antes = t[:m.start()]
        if re.search(r'<section class="hero"(?:(?!</section>).)*$', antes, re.S):
            malas.append(f"{p.name}:{m.group(1)}")
if malas:
    print(" ".join(malas))
    sys.exit(1)
PY
then
  ok "ninguna foto de interior se usa como hero"
else
  falla "foto de interior usada como hero: revisar salida anterior"
fi

# La filigrana se reparte por todas las secciones, variando esquina y
# tamano. Lo que hay que sostener es que cada una viva dentro de una
# seccion preparada (position:relative + overflow:hidden) y que ninguna
# seccion lleve dos. Que no queden sobre texto se mide en el navegador,
# con tools/filigrana-sobre-texto.js: aca no hay layout.
echo "Filigrana del isotipo"
if python3 tools/filigranas-bien-puestas.py >/dev/null 2>&1; then
  ok "cada filigrana en su seccion, ninguna seccion con dos"
else
  falla "revisar: python3 tools/filigranas-bien-puestas.py"
fi

# Marcadores de contenido sin completar. Esta asercion nace roja a
# proposito: pages/nosotros.html se publico con el relato de la
# fundadora sin escribir y con cuatro miembros del equipo llamados
# "[Nombre]". Es contenido, no marca, pero no deberia salir en vivo.
# Los precios salieron del sitio hasta que esten definidos. Esta
# asercion evita que vuelva a colarse uno suelto en una tarjeta o en
# prosa. Cuando existan los definitivos, se quita este bloque.
echo "Precios fuera"
if grep -rqE '\$\s?[0-9]|USD\s*[0-9]' index.html pages/ 2>/dev/null; then
  falla "reaparecieron importes: $(grep -rloE '\$\s?[0-9]|USD\s*[0-9]' index.html pages/ | tr '\n' ' ')"
else
  ok "sin importes en el sitio"
fi

echo "Contenido sin completar"
pendientes=$(grep -rhoE '\[(Nombre|Rol|Texto pendiente|Cierre del relato|Reemplazar)[^]]*\]' \
  index.html pages/ 2>/dev/null | sort -u | head -6)
if [ -z "$pendientes" ]; then
  ok "sin marcadores de relleno"
else
  falla "quedan marcadores: $(echo "$pendientes" | tr '\n' ' ')"
fi

echo "Assets de marca intactos"
if [ -z "$(git diff --name-only -- images/logo/)" ] \
   && [ -z "$(git diff --cached --name-only -- images/logo/)" ]; then
  ok "images/logo/ sin modificaciones"
else
  falla "images/logo/ fue modificado: $(git diff --name-only -- images/logo/ | tr '\n' ' ')"
fi

# 776px = 1250x834 menos el 7% inferior, que es donde va la marca "MP".
# La lista se comparte con tools/prep-images.sh: una sola fuente, para
# que agregar una foto no obligue a acordarse de editar dos archivos.
echo "Marca de agua recortada"
lista=tools/imagenes-con-marca.txt
con_marca=()
if [ ! -f "$lista" ]; then
  falla "falta $lista"
else
  # Sin mapfile: macOS trae bash 3.2 y no lo tiene.
  while IFS= read -r linea; do
    con_marca+=("$linea")
  done < <(grep -vE '^[[:space:]]*(#|$)' "$lista")
fi
for rel in ${con_marca[@]+"${con_marca[@]}"}; do
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
