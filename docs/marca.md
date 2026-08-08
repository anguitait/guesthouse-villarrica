# Reglas de marca para este sitio

Resumen operativo del Manual de Marca Flor del Bosque. El manual completo está
en `/Users/la/Documents/FLORDELBOSQUE/MANUAL DE MARCA FLOR DEL BOSQUE-2.pdf`; las
decisiones ya tomadas, en
`docs/superpowers/specs/2026-08-08-rediseno-marca-flor-del-bosque-design.md`.

## Antes de publicar

```bash
./tools/verificar-marca.sh && python3 tools/contraste.py
```

Ambos deben salir en 0. Lee además la sección "Lo que el arnés no cubre" al
final: hay tres cosas que solo se detectan mirando.

## Color

Los seis colores del manual viven en `css/tokens.css` como `--brand-*`. **No los
uses directo en componentes** — usa la capa semántica (`--text-primary`,
`--surface-primary`, `--surface-dark`, `--on-oliva`…), que ya codifica dónde es
seguro cada uno.

La regla que más se olvida: **el oliva `#647157` da 4,42:1 sobre marfil y no
alcanza AA.** No sirve para texto pequeño sobre el fondo de página; para títulos
de 24px o más, sí. Sobre fondo oliva el texto va en **blanco puro**, no en
marfil: 5,20 contra 4,42. La diferencia es invisible al ojo y decisiva para la
norma.

Esto ya causó un problema real: al adoptar la paleta, `--color-primary` pasó de
ser el verde casi negro a ser el oliva medio, y el footer y los encabezados de
páginas interiores lo seguían usando como fondo oscuro. Su texto atenuado quedó
en 3,47:1 durante varios commits. Si cambias lo que significa un token, audita a
sus consumidores.

Después de tocar cualquier color: `python3 tools/contraste.py`.

## Tipografía

Montserrat, familia única. 600 títulos, 500 subtítulos, 400 texto. No agregues
otra fuente: el manual lo prohíbe explícitamente.

Los tokens `--font-weight-light` y `-bold` existen porque el CSS ya los
referenciaba, pero resuelven a 400 y 600 respectivamente. El manual solo permite
tres pesos.

## Logo

Los SVG de `images/logo/` **no se editan nunca**, ni siquiera para corregir su
hex. Usan `#647156`/`#d7b286` y el manual dice `#647157`/`#D2B286`; la diferencia
es imperceptible y no vale la pena romper el archivo entregado.

Tampoco se redibuja ni se aproxima el isotipo. Si necesitas una forma orgánica,
sale del archivo real.

Fondos permitidos: claro (`logo-horizontal.svg`), color y oscuro
(`logo-horizontal-blanco.svg`). Mínimo digital 80px de ancho.

**La filigrana se reparte por las secciones**, al 13%, sangrando por un borde,
variando esquina y tamaño. Una por sección como máximo. La variación es
deterministica —se deriva del nombre de la página y del índice de la sección—
porque un patrón que cambia en cada recarga se lee como error, no como
intención. Solo varían posición y escala: el isotipo nunca se rota ni se
espeja, que el manual lo prohíbe en §9.6 y §9.7.

Se reparten con `python3 tools/repartir-filigranas.py`, que es reejecutable.

**Sobre "nunca encima de texto":** esa regla se relajó. Con una filigrana por
página era fácil de cumplir; con 53 en secciones de anchos distintos, exigirlo
obligaría a hacerlas casi invisibles. Lo que sí se sostiene es que no dañen la
lectura: al 13% sobre marfil el texto queda en 10,9:1, muy por encima de AA. Si
alguna te molesta visualmente, se cambia su esquina en el HTML.

## Ritmo de secciones

Cuatro fondos: marfil (base), blanco (respiro), verde profundo y oliva. Una
sección oliva por página, en el bloque de cierre o conversión, que es donde el
manual pide que el oliva predomine.

Nunca dos fondos oscuros seguidos — se leen como un solo bloque. Lo verifica
`tools/ritmo-secciones.py`, que además imprime la secuencia de cada página.

## Fotografía

Las tres fotos de interior (`living-principal`, `mesas-trabajo`,
`habitacion-verde`) tienen muros verde lima y rojo, fuera de la paleta. **No se
corrigen de color**: muestran piezas reales y un huésped reserva mirándolas. La
regla es que nunca dominen una pantalla — valen dentro de una tarjeta o media
columna, nunca como hero. Son la primera prioridad de reemplazo.

Al llegar fotos nuevas: reemplaza el original en `images/` y corre
`./tools/prep-images.sh`. Es idempotente. Los contenedores tienen `aspect-ratio`
fijo, así que cambiar una foto no mueve el layout.

`tools/prep-images.sh --variantes` genera además versiones de 640px y WebP. Hoy
no se generan por defecto porque ningún HTML las referencia.

**Cuidado con `sips`:** `-c` recorta desde el **centro**, no desde arriba. Un
recorte con offset 0 deja la mitad de la marca de agua abajo. El script ya
compensa con un offset negativo; si escribes otro recorte, tenlo presente.

## Lo que el arnés NO cubre

Tres huecos conocidos. Los tres ya dejaron pasar un bug real, así que vale
leerlos.

1. **`verificar-marca.sh` comprueba que las fotos midan 776px, no que la marca
   de agua no esté.** Durante un commit las nueve midieron 776 con el logo "MP"
   todavía visible, porque el recorte estaba mal anclado. Si vuelves a recortar,
   míralas.

2. **`contraste.py` verifica pares de tokens, no lo que el CSS declara.** La
   tabla `PARES_PINTADOS` afirma que, por ejemplo, el footer pinta
   `--text-inverse` sobre `--surface-dark`. Si mañana alguien cambia el fondo del
   footer en `components.css`, la tabla sigue diciendo lo mismo y el chequeo sigue
   en verde. Derivar los pares leyendo los selectores reales quedó pendiente.

3. **El grep de colores cubre hex y los tripletes `rgb()` conocidos del palette
   viejo, pero no un color nuevo inventado a mano.** Nada impide que alguien
   escriba `#ff0000` en un componente.

## Correo: pendiente fuera del repo

El sitio publica `hola@flordelbosque.cl` como única dirección de contacto, pero
**el dominio no tiene registros MX**: hoy esa casilla no recibe nada y lo que se
le envíe rebota. El DNS está en Cloudflare; se resuelve activando Cloudflare
Email Routing, que crea los MX y reenvía a un buzón real.

Verificar con: `dig +short MX flordelbosque.cl`
