# Rediseño del sitio según el Manual de Marca Flor del Bosque

**Fecha:** 2026-08-08
**Estado:** aprobado, pendiente de plan de implementación
**Fuente:** `MANUAL DE MARCA FLOR DEL BOSQUE-2.pdf` (17 páginas), en `/Users/la/Documents/FLORDELBOSQUE/`

## Problema

Llegó el manual de marca y el sitio no lo cumple. El desfase es de tres tipos:

1. **Tipografía.** El sitio usa Fraunces (serif display) + Source Sans 3. El manual (pág. 11) exige Montserrat como familia única y advierte contra sustituir la tipografía oficial y contra tipografías decorativas.
2. **Paleta.** El sitio usa dos colores que no existen en la marca: naranjo volcán `#c45d3a` y teal río `#3d6b6e`. Además invierte la jerarquía: hace dominante el verde casi negro `#1a2e1f`, que en el manual es secundario, cuando el que debe predominar es el oliva `#647157`.
3. **Dirección de arte.** El manual (secciones 6 y 12) pide composición limpia y respirable, colores de baja saturación y fotografía luminosa y coherente con la paleta. El sitio no responde a eso.

Lo que **sí** está correcto: los SVG del logo ya están en `images/logo/` en las cuatro versiones permitidas y se usan sobre los tres fondos autorizados.

## Alcance

Re-skin de marca **más** revisión de dirección de arte. Se toca el layout donde la marca lo exige, no se rehace la arquitectura del sitio.

Dirección visual elegida: **"Claros del bosque", intensidad sobria (C1)**. El recurso gráfico orgánico sale del isotipo real, en dosis mínima.

### Fuera de alcance

- Arquitectura de información y navegación.
- Contenido y textos.
- Los archivos SVG de marca: no se editan, ni siquiera para corregir su hex.
- Corrección de color de las fotografías.
- La página en inglés (`pages/en.html`) recibe el mismo skin y nada más.

## Contexto técnico relevante

Sitio estático (HTML + CSS + un JS), publicado en GitHub Pages con dominio `flordelbosque.cl`. 10 páginas HTML, 63 secciones, ~7.300 líneas.

**El CSS está bien tokenizado.** Fuera de `tokens.css` existe un único color hardcodeado en todo el proyecto: `#25D366`, el verde de WhatsApp, que es legítimo y se conserva. Los tokens `--color-river-*` están definidos pero no tienen ninguna referencia: son código muerto.

Esto significa que el cambio cromático y tipográfico se concentra en un archivo. El esfuerzo real está en la dirección de arte, no en el re-skin.

## Hallazgo de accesibilidad que condiciona el diseño

La paleta del manual tiene un par que falla WCAG AA justo por debajo del umbral. Verificado con script (`tools/contraste.py`, a incorporar):

| Par | Ratio | Texto normal | Texto grande |
|---|---|---|---|
| marfil sobre oliva | 4.42 | **FALLA** | AA |
| oliva sobre arena | 2.59 | **FALLA** | **FALLA** |
| oliva sobre salvia | 2.33 | **FALLA** | **FALLA** |
| marfil sobre salvia | 1.90 | **FALLA** | **FALLA** |
| marfil sobre arena | 1.71 | **FALLA** | **FALLA** |
| blanco sobre oliva | 5.20 | AA | AAA |
| marfil sobre terracota | 5.99 | AA | AAA |
| profundo sobre arena | 7.43 | AAA | AAA |
| profundo sobre salvia | 6.69 | AA | AAA |
| marfil sobre profundo | 12.71 | AAA | AAA |
| blanco sobre profundo | 14.93 | AAA | AAA |

**Consecuencia:** el oliva no puede usarse para texto pequeño sobre marfil, que es justamente el uso más tentable dado que el manual pide que el oliva predomine. La regla se codifica en la capa semántica de tokens en vez de dejarla a la memoria.

## Diseño

### §1 — Sistema de tokens

`tokens.css` se reescribe en dos capas: los seis colores del manual en crudo, y encima una capa semántica que codifica dónde puede usarse cada uno.

| Token | Valor | Rol permitido |
|---|---|---|
| `--brand-oliva` | `#647157` | fondos, bordes, títulos ≥24px. **Nunca texto pequeño sobre marfil.** |
| `--brand-profundo` | `#1D2A22` | todo el texto pequeño; fondos oscuros |
| `--brand-salvia` | `#A7B19C` | texto sobre fondo profundo, divisores |
| `--brand-arena` | `#D2B286` | rótulos sobre fondo oscuro |
| `--brand-terracota` | `#7B4E35` | acento: CTA, enlaces, foco |
| `--brand-marfil` | `#F2ECE2` | fondo base de página |

Decisiones concretas:

- `--color-accent` pasa de `#c45d3a` a `--brand-terracota`. Absorbe los 29 usos existentes sin editarlos uno a uno.
- `--color-river`, `--color-river-light`, `--color-river-dark` se eliminan: el teal no existe en la marca y no tiene ninguna referencia fuera de su propia definición.
- Los tokens semánticos `--color-success`, `--color-warning`, `--color-error` e `--color-info` **tampoco tienen referencias hoy** — están definidos y no usados. Se conservan, porque las páginas de contacto y agenda tienen formularios que eventualmente necesitarán estados de validación, pero se rebasan sobre la paleta: `success` → oliva, `warning` → arena, `info` → salvia. `--color-error` es la única excepción documentada: mantiene un rojo (`#8C3B3B`, ajustado para armonizar con la paleta), porque un estado de error debe leerse como error y el manual no ofrece ningún color que cumpla esa función.
- `--text-primary` pasa a `--brand-profundo`, no a oliva. Esto es lo que resuelve el 4.42.
- Sobre fondo oliva el texto va en **blanco puro**, no en marfil: 5.20 contra 4.42.
- `--surface-primary` pasa de `#faf8f5` a `--brand-marfil`.
- `--font-display` y `--font-body` apuntan ambos a Montserrat. Se cargan tres pesos: 600 (títulos), 500 (subtítulos), 400 (texto), según la jerarquía de la pág. 11.
- El `<link>` de Google Fonts se reemplaza en los 10 HTML: salen Fraunces y Source Sans 3.

**Efecto secundario esperado:** hoy los `h1–h6` usan `font-weight: 400`, apropiado para un serif. Con Montserrat pasan a 600. Los encabezados quedarán notoriamente más presentes en todo el sitio. Es lo que pide el manual y es el cambio más visible después del color.

#### Discrepancia de hex entre los SVG y el manual

Los SVG oficiales usan `#647156` y `#d7b286`; el manual escrito indica `#647157` y `#D2B286`. Los SVG **no se tocan** — son los archivos entregados. Los tokens CSS siguen el manual. La diferencia es imperceptible y no afecta ningún cálculo de contraste de forma significativa.

### §2 — Pipeline de imágenes

Estrategia acordada: depurar ahora con el material existente, dejar el sistema listo para una sesión fotográfica futura.

**Marca de agua.** Los 9 archivos de 1250×834 llevan un logo "MP" centrado en el 6% inferior. Verificado uno por uno:

`cowork/living-principal`, `cowork/mesas-trabajo`, `experiencias/gallinero-huerta`, `experiencias/hamaca-bosque`, `habitaciones/habitacion-verde`, `hero/vista-aerea-drone`, `lugar/casa-exterior`, `lugar/piscina-casa`, `lugar/piscina-jardin`.

Un recorte del 7% inferior (834 → 776 px) la elimina sin alterar el encuadre. Los archivos de `matrimonios/` y `experiencias/domo-ceremonia` están a resolución completa y **sin** marca de agua: no se tocan.

*Supuesto declarado:* recortar la marca asume derechos de uso sobre las fotografías. Se da por sentado que fueron encargadas para el hostal.

**Limitaciones que el diseño no puede resolver:**

- *Resolución.* 1250×776 tras el recorte es poco para un hero a pantalla completa en retina. Se mitiga limitando la altura del hero y apoyándose en el degradado, pero es una limitación del material.
- *Interiores saturados.* `living-principal`, `mesas-trabajo` y `habitacion-verde` muestran muros verde lima, rojo y naranjo, contra la indicación de baja saturación.

**Decisión sobre los interiores: no se corrigen de color y no se eliminan.** Desaturar hasta que calcen con la paleta produciría fotos que no representan las piezas reales, y un huésped reserva mirando esas imágenes. Se prefiere un sitio honesto.

Eliminarlas tampoco es viable. Están repartidas por casi todo el sitio:

| Archivo | Páginas que lo usan |
|---|---|
| `living-principal` | `index`, `coliving`, `cowork`, `experiencias`, `en` |
| `mesas-trabajo` | `cowork`, `alojamiento` |
| `habitacion-verde` | `index`, `alojamiento` |

Sacar `living-principal` abriría cinco huecos de contenido sin reemplazo disponible, y `habitacion-verde` es la única fotografía de habitación que existe: omitirla dejaría la página de alojamiento sin mostrar una pieza, lo que es peor que mostrarla verde.

**Regla única para las tres:** se conservan, siempre **contenidas dentro de la grilla** y nunca a sangre completa ni como hero, de modo que el verde lima y el rojo nunca dominen una pantalla. Son la primera prioridad de reemplazo cuando exista la sesión nueva.

**Estructura para el reemplazo.** Script `tools/prep-images.sh`, documentado y de ejecución manual:

1. Lee los originales intactos del repositorio.
2. Recorta el 7% inferior de los 9 archivos con marca de agua.
3. Redimensiona a dos anchos (640 y 1250).
4. Genera WebP junto al JPEG.

Los resultados se commitean. No hay build step ni CI. En el CSS, cada contenedor de imagen lleva `aspect-ratio` fijo, de modo que reemplazar una foto no desplaza el layout.

### §3 — Componentes y layout

**Ritmo de secciones.** Se remapean los modificadores existentes y se agrega uno:

| Clase | Hoy | Pasa a |
|---|---|---|
| `.section` | `#faf8f5` | marfil `#F2ECE2` (base) |
| `.section--cream` | `#f2ede6` | blanco puro (respiro sutil) |
| `.section--dark` | `#1a2e1f` | profundo `#1D2A22` |
| `.section--white` | `#ffffff` | sin cambio |
| `.section--oliva` | — | **nueva**: oliva `#647157`, texto en blanco |

**Por qué la clase nueva.** C1 es una dirección sobria basada en alternar marfil y profundo, lo que dejaría al oliva relegado a detalles — en contradicción con la instrucción del manual de que el oliva predomine. La reconciliación: el oliva toma el mobiliario estructural (header con scroll, footer, botones secundarios, bordes) **más una o dos secciones `--oliva` por página**, típicamente los bloques de reserva y CTA. Esto es una interpretación, no una instrucción literal del manual.

**Aire.** `--space-section` sube de `clamp(4rem, 8vw, 8rem)` a `clamp(5rem, 9vw, 10rem)`. Entra `--measure: 68ch` para limitar el ancho de los bloques de texto. Es donde más se percibirá la dirección de arte.

**Filigrana del isotipo.** Una sola vez por página: `isotipo.svg` al 13% de opacidad, sangrando por un borde, con `aria-hidden="true"` y `pointer-events: none`. Reglas duras: nunca sobre texto, nunca dos en la misma página, nunca redibujado ni recoloreado fuera de las variantes oficiales.

**Logos.** No requieren corrección. Ya se usa `logo-horizontal.svg` (isotipo arena + wordmark verde) sobre fondo claro y `logo-horizontal-blanco.svg` sobre fotografía y footer, que son los tres fondos permitidos de la pág. 7. Se agrega el mínimo digital de 80 px (pág. 10) como `min-width` y el área de seguridad como padding.

## Riesgos y puntos a validar

1. **El uso del isotipo como recurso gráfico.** C1 lo usa solo como filigrana a baja opacidad, lo que el manual sí contempla ("el isotipo puede utilizarse de manera independiente"). Se descartó la variante C2, que lo usaba como máscara de fotografía, por no estar contemplada en el manual. Si más adelante se quiere recuperar, conviene validarlo con quien elaboró el manual.
2. **Peso tipográfico.** El salto de 400 a 600 en encabezados es fuerte. Si resulta excesivo en revisión visual, la salida es ajustar tamaños, no el peso, que está fijado por el manual.
3. **Calidad fotográfica.** El sitio quedará limitado por el material. El diseño lo compensa pero no lo resuelve.

## Verificación

- `tools/contraste.py` corriendo sobre los pares de color reales que produzca el CSS final; ningún par de texto por debajo de 4.5 (o 3.0 si es texto grande).
- Capturas antes/después de las 10 páginas.
- Revisión de que las 63 secciones renderizan con el modificador correcto.
- Confirmación de que ningún archivo en `images/` conserva la marca de agua.
- Confirmación de que los SVG de `images/logo/` no fueron modificados (`git diff --stat` limpio en ese directorio).
