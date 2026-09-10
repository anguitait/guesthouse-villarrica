# Volcanes y fotografías — diseño

**Fecha:** 2026-09-10
**Estado:** aprobado, pendiente de plan de implementación

## Qué cambia

La propietaria entregó tres cosas a la vez, y conviene tratarlas como un solo
cambio porque se pisan entre ellas:

1. **Las siete habitaciones se renombran.** Salen los árboles nativos, entran los
   volcanes de la zona. El mapeo es 1:1 y respeta el orden actual.
2. **Las tarifas suben** y cambian de significado: `precio_noche` pasa de ser
   temporada baja *sin* desayuno a temporada baja *con* desayuno.
3. **Llegaron 70 fotografías** utilizables: las siete piezas, espacios comunes
   interiores y exteriores. Hasta hoy seis de las siete fichas usan el
   placeholder de marca.

Además, las tres piezas del segundo piso están tomadas por una estadía larga
entre el 22 de septiembre y el 13 de diciembre de 2026.

### El renombre

| Antes | Ahora | Piso |
|---|---|---|
| Magnolio | Volcán Llaima | 1° |
| Arrayán | Volcán Rukapillán | 1° |
| Canelo | Volcán Sierra Nevada | 1° |
| Laurel | Volcán Tolhuaca | 1° |
| Coihue | Volcán Lanín | 2° |
| Fuinque | Volcán Sollipulli | 2° |
| Tineo | Volcán Lonquimay | 2° |

Los `id` pasan a `llaima`, `rukapillan`, `sierra-nevada`, `tolhuaca`, `lanin`,
`sollipulli`, `lonquimay`. Son la llave que une Airtable, el contrato del Worker,
el ancla de `index.html` y el nombre del archivo de foto, así que se deciden una
vez y no se vuelven a tocar.

## Decisiones tomadas

**Ante una discrepancia entre la planilla y las fotos, manda la planilla.** Las
carpetas de fotos de Llaima y Rukapillán vienen cruzadas: la carpeta *Llaima*
contiene la pieza de dos camas y escritorio, que la planilla llama Rukapillán, y
viceversa. Se intercambian al importar; el texto no se toca.

**El bloqueo del segundo piso se modela como reserva, no como código.**
`transformar.js` ya marca ocupado cualquier tramo de la tabla `Reservas` en
estado `Solicitud` o `Confirmada`. Tres filas resuelven el caso sin tocar el
sitio, y desaparecen solas cuando la estadía termine. Se descartó desmarcar
`activa`, que habría escondido las piezas también para el verano y perdido las
reservas anticipadas de temporada alta.

**Las tarifas salen de la tabla, no de la leyenda.** La hoja *Tarifas* tiene la
tabla actualizada y un pie de página que quedó citando los valores anteriores.
Manda la tabla.

**Se descartan las fotografías previas a la remodelación.** Las cuatro de la
carpeta *Fotos Albert* muestran piezas que ya no existen en esta configuración.

**Sollipulli tiene dos literas, no una cama matrimonial.** La propietaria lo
confirmó: la fotografía estaba bien y la fila de la planilla arrastraba el texto
de la pieza anterior. Es la única excepción a la regla de arriba, y obliga a
reescribir la ficha completa:

| Campo | Planilla | Publicado |
|---|---|---|
| `categoria` | Habitación Doble Superior | Habitación Cuádruple – Literas |
| `capacidad` | 2 | 4 |
| Cama | Cama matrimonial | Dos literas (4 plazas) |

`categoria` es un Single select en Airtable: hay que agregar el valor nuevo antes
de guardar el registro, o la escritura falla en silencio. El selector de
huéspedes de `reservas.html` ya llega hasta 5, así que no necesita cambios;
Sollipulli pasa a ser la primera pieza que aparece al pedir 4.

Texto nuevo, español:

> Habitación amplia del segundo piso con dos literas, pensada para grupos o
> familias. Tiene baño privado dentro de la habitación, con ducha y tragaluz en
> el techo que le da mucha luz natural, y un arrimo de clóset para la ropa.

Inglés:

> Spacious second-floor room with two bunk beds, suited to groups or families. It
> has a private en-suite bathroom with shower and a ceiling skylight that fills
> it with natural light, plus a wardrobe unit for clothes.

Características: *Dos literas (4 plazas) · Baño privado en la habitación, con
ducha · Tragaluz en el techo · Arrimo de clóset · Segundo piso*. Se cae
"veladores con lámparas", que venía del texto anterior y no corresponde a una
pieza con literas.

## Trabajo

### 1. Higiene

`docs/` se sirve público. `.gitignore` incorpora `docs/CambiosFDB/`,
`docs/*.xlsx` y `docs/*.zip` para que el material de trabajo —dos cotizaciones
con nombre de cliente y la tabla de tarifas internas de temporada alta— no
termine indexado. Las fotos entran al repositorio sólo procesadas, bajo
`images/`.

### 2. Datos

Se regenera `docs/habitaciones-airtable.csv` desde la planilla y se actualizan
los siete registros de Airtable: `id`, `nombre`, `categoria`, `precio_noche`,
descripciones, características e `imagen`.

La planilla no trae `descripcion_en`, sólo `caracteristicas_en`. Se reconstruye
desde las traducciones vigentes, que son el mismo texto cambiando el nombre
propio.

Como `precio_noche` ahora incluye desayuno, hay que retirar de las catorce
descripciones la frase que ofrece agregarlo por $5.000. Dejarla contradiría el
precio mostrado.

### 3. Fotografías

`tools/prep-fotos.py`, hermano del `prep-images.py` existente:

- Aplica la orientación EXIF. Veintitrés de las fotos vienen giradas 90° y
  `object-fit` no las endereza; publicarlas tal cual las deja de canto.
- Reescala a 1250px de ancho, el formato del resto del sitio.
- Limpia metadatos y guarda con el slug de la pieza en `images/habitaciones/`.
- Recorta el 7% inferior **sólo** en las `z*.jpeg`, que traen la marca de agua
  del fotógrafo, igual que las nueve ya publicadas. Las `FB2027_*` y las
  `20260909_*` vienen limpias y no se tocan.

Foto principal de cada pieza:

| Pieza | Archivo | Origen |
|---|---|---|
| Llaima | `FB2027_10` | carpeta *Rukapillán* |
| Rukapillán | `20260909_151428` | carpeta *Llaima* |
| Sierra Nevada | `20260909_151844` | propia |
| Tolhuaca | `20260909_151631` | propia |
| Lanín | `FB2027_2` | propia |
| Sollipulli | `FB2027_4` | propia |
| Lonquimay | `FB2027_7` | propia |

En las fichas, el `<div class="card-room__image--marca">` se reemplaza por un
`<img>`. El comentario en `css/components.css` ya describe ese reemplazo.

### 4. Texto

El renombre alcanza 210 lugares: 116 claves i18n en `js/main.js` (español e
inglés), 74 referencias en `pages/alojamiento.html` y 13 en `index.html`. En la
portada, las tres piezas destacadas —Coihue, Laurel y Magnolio— pasan a Lanín,
Tolhuaca y Llaima, con sus anclas.

### 5. Bloqueo del segundo piso

Tres filas en `Reservas`, una por pieza: llegada `2026-09-22`, salida
`2026-12-13`, estado `Confirmada`, huésped `Bloqueo — larga estadía`. De paso se
borra la reserva `PRUEBA FINAL - borrar`, que sigue tapando marzo en la pieza que
ahora se llama Llaima.

### 6. Verificación

`npm test` para los tres archivos de test existentes, un `GET` a
`https://reservas.flordelbosque.cl/api/disponibilidad` tras purgar la clave de KV,
y revisión en navegador de las siete fichas y del calendario con los tres tramos
bloqueados.

## Riesgos y puntos abiertos

**Sollipulli queda a $55.000 con cuatro plazas**, el mismo valor que las dobles
del segundo piso. Sale de la tabla de tarifas, que fue escrita cuando la pieza
figuraba como matrimonial para dos. Conviene revisarlo con la propietaria: no
bloquea nada, pero es la pieza que más rinde por noche y la que quedó más barata
por huésped.

**El escalonamiento de precios se aplanó.** Antes había tres niveles
($35.000 / $40.000 / $45.000); ahora quedan dos, y cinco de las siete piezas
comparten el mismo valor. Es una decisión de negocio, no un error, pero conviene
confirmarla.

**Llaima y Rukapillán comparten baño y deberían costar lo mismo.** En temporada
baja lo hacen; en temporada alta la planilla las dejó con $5.000 de diferencia.
No afecta al sitio, que sólo publica `precio_noche`, pero es un error a corregir
en la planilla.

**Quince fotografías llegaron en 0 bytes** desde Drive. Se dan por perdidas: diez
eran duplicados "(1)" y ninguna de las cinco restantes era la principal de su
pieza. Las carpetas *Baño compartido* y *Plan de negocios* llegaron vacías a
propósito.

## Fuera de alcance

Galería por pieza con lightbox. Hay material —entre 4 y 11 fotos por habitación—
y sería la evolución natural, pero es trabajo de front nuevo y no debe demorar el
renombre ni el bloqueo, que tiene fecha.
