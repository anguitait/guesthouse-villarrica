#!/usr/bin/env bash
# Prepara las imagenes del sitio.
#
# 1. Recorta el 7% inferior de las fotos que traen la marca de agua "MP"
#    (la lista vive en tools/imagenes-con-marca.txt, compartida con el
#    verificador). 1250x834 menos ese 7% da 776px de alto.
# 2. Genera una variante de 640px de ancho para movil, en images/640/.
# 3. Genera WebP junto a cada JPEG, si cwebp esta disponible.
#
# Es idempotente: una foto que ya mide 776px de alto no se vuelve a
# recortar, asi que se puede correr las veces que haga falta. Cuando
# llegue la sesion fotografica nueva, se reemplaza el original y se
# vuelve a ejecutar.
#
# El recorte sobrescribe el original. El respaldo es git: no lo corras
# con cambios sin commitear en images/.
set -euo pipefail
cd "$(dirname "$0")/.."

ALTO_OBJETIVO=776
LISTA=tools/imagenes-con-marca.txt

if [ ! -f "$LISTA" ]; then
  echo "falta $LISTA" >&2
  exit 1
fi

# Ignora comentarios y lineas en blanco.
# Sin mapfile: macOS trae bash 3.2 y no lo tiene.
CON_MARCA=()
while IFS= read -r linea; do
  CON_MARCA+=("$linea")
done < <(grep -vE '^[[:space:]]*(#|$)' "$LISTA")

echo "── Recorte de marca de agua (${#CON_MARCA[@]} archivos en la lista)"
for rel in "${CON_MARCA[@]}"; do
  archivo="images/${rel}.jpg"
  if [ ! -f "$archivo" ]; then
    echo "  omitido, no existe: $archivo"
    continue
  fi
  ancho=$(sips -g pixelWidth  "$archivo" | awk '/pixelWidth/{print $2}')
  alto=$(sips  -g pixelHeight "$archivo" | awk '/pixelHeight/{print $2}')
  if [ "$alto" -le "$ALTO_OBJETIVO" ]; then
    echo "  ya recortada: $rel (${ancho}x${alto})"
    continue
  fi
  # OJO: sips -c recorta desde el CENTRO, no desde arriba. Con offset 0
  # quitaria mitad arriba y mitad abajo, dejando parte de la marca. El
  # offset negativo de la mitad del sobrante ancla la ventana arriba, que
  # es lo unico que elimina la marca del borde inferior.
  offset=$(( (alto - ALTO_OBJETIVO) / 2 ))
  sips -c "$ALTO_OBJETIVO" "$ancho" --cropOffset "-$offset" 0 "$archivo" --out "$archivo" >/dev/null
  echo "  recortada: $rel (${ancho}x${alto} -> ${ancho}x${ALTO_OBJETIVO}, anclada arriba)"
done

if [ "${1:-}" != "--variantes" ]; then
  echo
  echo "Listo. Revisa con: ./tools/verificar-marca.sh"
  echo "(Las variantes de 640px y WebP no se generan por defecto: hoy no las"
  echo " referencia ningun HTML. Corre con --variantes cuando se cableen.)"
  exit 0
fi

echo "── Variantes de 640px"
mkdir -p images/640
while IFS= read -r archivo; do
  destino="images/640/$(basename "$archivo")"
  sips -Z 640 "$archivo" --out "$destino" >/dev/null
  echo "  $destino"
done < <(find images -maxdepth 2 -name '*.jpg' -not -path 'images/640/*' | sort)

echo "── WebP"
if command -v cwebp >/dev/null 2>&1; then
  while IFS= read -r archivo; do
    cwebp -quiet -q 82 "$archivo" -o "${archivo%.jpg}.webp"
    echo "  ${archivo%.jpg}.webp"
  done < <(find images -maxdepth 2 -name '*.jpg' | sort)
else
  echo "  cwebp no instalado, se omite (brew install webp)"
fi

echo
echo "Listo. Revisa con: ./tools/verificar-marca.sh"
