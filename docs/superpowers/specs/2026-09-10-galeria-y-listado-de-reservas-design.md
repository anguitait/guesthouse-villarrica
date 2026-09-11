# Galería y listado de reservas — diseño

**Fecha:** 2026-09-10
**Estado:** aprobado, pendiente de plan de implementación

## El problema

Con las fotografías reales publicadas, la página de reservas dejó de servir para
lo único que tiene que hacer: comparar habitaciones y elegir una.

Medido en el sitio real, a 1440×900:

| Elemento | Medida | Consecuencia |
|---|---|---|
| Tarjeta de resultado | 1184px de ancho | una por fila |
| Bloque de imagen | 1184×888 | más alto que la ventana |
| Panel del calendario | 318px | fijos, antes del primer resultado |

Una habitación ocupa más de una pantalla completa. Para ver la segunda hay que
desplazarse a ciegas, y comparar precios entre dos piezas es imposible sin
memoria.

**La causa es una sola línea.** `.reservas__resultados` declara `display: grid`
pero nunca `grid-template-columns`, así que cada tarjeta se estira al ancho del
contenedor. Como `.card-room__image` fija `aspect-ratio: 4/3`, la altura de la
imagen crece con el ancho: 1184 de ancho obliga a 888 de alto. No es que las
fotos sean grandes —miden 1250px y pesan entre 83 y 136 KB—, es que el
contenedor no tiene columnas.

Además falta una galería: cada pieza publica una sola fotografía, cuando el
material de origen trae entre 3 y 8 por habitación.

## Decisiones tomadas

**El listado pasa a filas horizontales, no a una rejilla.** Foto a la izquierda
con ancho fijo, datos y precio a la derecha. Entran tres o cuatro habitaciones
por pantalla y los precios quedan alineados en una columna, que es lo que
permite compararlos. Se descartó la rejilla de dos columnas —aunque era el
cambio más pequeño— porque un listado de reserva y una página de venta no
tienen el mismo trabajo.

**`pages/alojamiento.html` no cambia de forma.** Ahí la rejilla de dos columnas
está bien: es una página que vende, no un listado que se compara.

**El calendario se pliega.** Pasa a un `<details>` cerrado por defecto con el
resumen «Ver disponibilidad del mes». No es el selector de fechas —los campos ya
son `<input type="date">` nativos, con su propio calendario— sino un mapa de
disponibilidad para quien tiene fechas flexibles. Útil, pero no lo bastante como
para costar 318px antes del primer resultado. La preferencia se recuerda en
`localStorage`.

**La galería es mejora progresiva, no reemplazo.** La fotografía de portada
—campo `imagen` de Airtable— se sigue publicando como hasta ahora y es lo que se
ve sin JavaScript. La galería se monta encima si el manifiesto carga.

**El manifiesto vive en el repositorio, no en Airtable.** El campo `imagen` es
texto simple y una galería obligaría a un cambio de esquema y a que la
propietaria mantenga listas de nombres de archivo. Las fotos ya viven en el
repositorio, así que `tools/prep-fotos.py` genera
`images/habitaciones/galeria.json` y ambas páginas lo leen. Airtable no se toca.

## Arquitectura

Tres piezas, cada una con un trabajo:

**`tools/prep-fotos.py`** (existe) pasa de procesar una foto por pieza a
procesar una lista, y escribe el manifiesto. Su diccionario `FOTOS` pasa de
`slug → ruta` a `slug → [rutas]`, con la portada primero.

**`images/habitaciones/galeria.json`** es el contrato entre la herramienta y el
sitio:

```json
{
  "llaima": ["images/habitaciones/llaima.jpg",
             "images/habitaciones/llaima-2.jpg"],
  "sollipulli": ["images/habitaciones/sollipulli.jpg",
                 "images/habitaciones/sollipulli-2.jpg"]
}
```

La primera entrada de cada lista es siempre la portada, la misma que declara el
campo `imagen` del catálogo. Un test lo verifica: si se separan, la ficha y el
listado mostrarían fotos distintas de la misma habitación.

**`js/galeria.js`** (nuevo) es el componente. Expone una función que recibe un
elemento `.card-room__image` y un slug, y le monta encima las flechas, los
puntos y el clic que abre el visor. Lo usan las dos páginas:

- `pages/alojamiento.html` ya trae el `<img>` de portada escrito en el HTML; un
  script de mejora progresiva recorre las siete fichas y llama al componente.
- `js/reservas-ui.js` lo llama al terminar de construir cada fila.

Así la galería se escribe una vez. Hoy las tarjetas se dibujan en dos lugares
—escritas a mano en el HTML y generadas por JavaScript— y sin este punto común
el componente tendría que duplicarse.

**El visor** se monta una sola vez en el `<body>`, no uno por tarjeta: es un
diálogo que se rellena al abrirse. Cierra con `Esc` o con clic fuera, navega con
`←` `→` y con deslizamiento táctil, y devuelve el foco a la fotografía desde la
que se abrió.

**Construcción con API del DOM, no con `innerHTML`.** `js/reservas-ui.js` ya
interpola datos del contrato dentro de plantillas; no conviene agregar más
superficie por ahí, aunque el contrato venga de un origen propio.

## Curaduría de las fotografías

Entre 3 y 5 por habitación, la portada primero. Se descartan las casi
duplicadas —varias tomas del mismo encuadre con segundos de diferencia—, las que
están archivadas en la carpeta equivocada y las previas a la remodelación, ya
descartadas en el spec anterior.

Los baños entran cuando aportan: el de Sollipulli, con tragaluz y baldosa
hidráulica, es de lo mejor del lote y sostiene por sí solo el argumento de
«baño privado en la habitación».

## Verificación

Tests nuevos en `tests/contenido.test.js`:

- Cada pieza del catálogo tiene entrada en el manifiesto.
- Todos los archivos que el manifiesto nombra existen en disco.
- La primera foto de cada galería es exactamente la del campo `imagen`.
- Cada galería tiene al menos dos fotografías. Todas las piezas tienen material
  para eso, así que una galería de una sola foto significaría que la curaduría
  se quedó a medias.

Y una regla del componente, que el test anterior no cubre porque hoy no ocurre:
con una sola fotografía no debe montarse. Sin ella, una pieza que en el futuro
llegue con una foto única mostraría flechas que no llevan a ninguna parte.

Y revisión en navegador contra el sitio publicado: que entren tres o cuatro
habitaciones por pantalla, que el calendario arranque plegado, que las flechas
pasen fotos y que el visor abra, navegue y cierre con teclado.

## Riesgos

**Es un componente de interfaz nuevo, no un ajuste de CSS.** Los puntos del
listado y del calendario son pequeños; la galería trae visor, navegación por
teclado, comportamiento táctil y foco accesible, y se usa desde dos páginas que
hoy construyen sus tarjetas de forma distinta.

**El peso de la página sube.** Siete piezas × hasta 5 fotos son hasta 35
imágenes de ~110 KB. Todas menos las portadas se cargan con `loading="lazy"`, y
el visor pide la fotografía cuando se abre, no antes.

**Sin JavaScript no hay galería**, y es correcto: queda la portada, que es lo que
hay hoy.

## Fuera de alcance

Las fotos de espacios comunes y exteriores siguen esperando su propio spec.
Tampoco se toca el campo `categoria` de Airtable, que existe sólo en español.
