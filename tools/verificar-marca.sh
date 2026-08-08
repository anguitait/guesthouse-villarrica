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
