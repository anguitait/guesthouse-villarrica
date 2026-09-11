# Cimientos de SEO — diseño

**Fecha:** 2026-09-11
**Estado:** aprobado, pendiente de plan de implementación

## El objetivo, dicho con honestidad

El encargo fue «quedar en la primera página de Google». Eso depende de **qué**
se busque, y conviene separarlo antes de trabajar:

| Búsqueda | ¿Alcanzable? | Por qué |
|---|---|---|
| `flor del bosque villarrica` | **Ya está** | Búsqueda de marca, el sitio sale primero |
| `coliving villarrica` · `cowork araucanía` | **Sí** | Competencia casi nula |
| `alojamiento orillas río toltén` | **Sí** | Seña propia, nadie más la usa |
| `retiro yoga araucanía` · `casa para grupos villarrica` | **Sí** | Nicho poco disputado |
| `matrimonios villarrica` | **Parcial** | Mandan matrimonios.cl e invitalo.cl; hay que estar dentro de ellos |
| `hotel villarrica` · `cabañas pucón` | **No** | Booking, Despegar y Atrápalo llevan años y miles de páginas |

Verificado el 2026-09-11: el sitio **está indexado** y aparece con su título
propio al buscar por sus señas —río Toltén, vista al volcán—, pero no figura en
las búsquedas comerciales.

## La conclusión incómoda: lo que más rinde no es código

**Flor del Bosque no tiene Perfil de Empresa de Google ni Search Console.**

Para un alojamiento, la ficha del Perfil de Empresa es la pieza que más tráfico
trae: es la que aparece en el mapa, por encima de los resultados normales, con
fotos, teléfono y reseñas. Es el único lugar donde un hostal de siete
habitaciones compite de igual a igual con Booking, porque ese espacio es de las
fichas y no de los portales. Sin ella, el hostal no existe para «hoteles cerca
de mí», «dónde alojar en Villarrica» ni para Google Maps.

Sin Search Console, además, se trabaja a ciegas: no hay manera de saber por qué
términos aparece el sitio, en qué posición, ni si algo de esto sirvió.

Las dos son gratuitas y las tiene que crear la propietaria: piden verificar que
el negocio es suyo. **Este spec incluye el instructivo**, porque sin esas dos
cuentas el resto rinde una fracción.

## Lo que se hace en el sitio

### 1. Los cimientos técnicos que faltan por completo

- **`robots.txt`** — no existe. Va con la referencia al sitemap.
- **`sitemap.xml`** — no existe. Lo genera `tools/sitemap.py` recorriendo los
  HTML del repositorio, para que no envejezca cada vez que se agregue una
  página. Escrito a mano, se desactualiza al segundo cambio.
- **`rel="canonical"`** — no lo declara ninguna de las once páginas. Sin él, dos
  direcciones que sirvan lo mismo (`/`, `/index.html`, con y sin querystring)
  compiten entre ellas.

### 2. Los datos estructurados, hoy un esqueleto

La portada declara un `Hotel` con nombre, descripción y ciudad. Nada más. Le
faltan justo los campos que Google usa para construir una ficha, y todos existen
ya en el sitio:

| Campo | Valor, tomado del sitio |
|---|---|
| `telephone` | +56 9 8548 8233 |
| `email` | hola@flordelbosque.cl |
| `address` | Orillas Río Toltén, Villarrica, Araucanía, CL |
| `geo` | -39.2614638, -72.2383335 (del mapa de contacto) |
| `sameAs` | instagram.com/hostalflordelbosque |
| `priceRange` | CLP 50.000–55.000 |
| `image` | La imagen Open Graph que ya existe |

Se agrega además `makesOffer` con las **siete habitaciones**, generado desde
`docs/habitaciones-airtable.csv`. Es el mismo patrón que `tools/habitaciones.py`
y `tools/prep-fotos.py`: el dato vive en un lugar y el artefacto se genera, para
que el catálogo y lo que lee Google no se separen en silencio.

`pages/matrimonios.html` ya tiene sus propios datos estructurados y se revisa,
no se reescribe.

### 3. Títulos y encabezados que digan dónde queda esto

Ninguno de los títulos genéricos contiene «Villarrica», «volcán» ni «Toltén».
Nadie teclea «alojamiento» a secas.

| Página | Título hoy | Propuesto |
|---|---|---|
| `index` | Flor del Bosque \| Despierta frente al Volcán | Flor del Bosque \| Alojamiento frente al Volcán Villarrica |
| `alojamiento` | Alojamiento \| Flor del Bosque | Habitaciones frente al volcán, Villarrica \| Flor del Bosque |
| `coliving` | Coliving \| Flor del Bosque | Coliving para nómadas en Villarrica \| Flor del Bosque |
| `cowork` | CoWork & Café \| Flor del Bosque | CoWork y café en Villarrica, La Araucanía \| Flor del Bosque |
| `experiencias` | Experiencias \| Flor del Bosque | Retiros y talleres en Villarrica \| Flor del Bosque |
| `agenda` | Agenda \| Flor del Bosque | Agenda de talleres y eventos en Villarrica \| Flor del Bosque |
| `nosotros` | Nosotros \| Flor del Bosque | Nuestra historia \| Flor del Bosque, Villarrica |
| `contacto` | Contacto \| Flor del Bosque | Cómo llegar y contacto \| Flor del Bosque, Villarrica |
| `reservas` | Reservar \| Flor del Bosque | Reservar habitación en Villarrica \| Flor del Bosque |
| `matrimonios` | Matrimonios en Villarrica \| Tu Boda a Orillas del Río Toltén | **sin cambio**, ya apunta bien |

Los tres títulos más largos se recortaron para caber en los 60 caracteres que
Google muestra antes de cortar: un título truncado pierde justo la parte final,
que suele ser la marca.

**Los H1 evocativos se conservan.** «Vive La Araucanía desde adentro» y «Tu boda
a orillas del Río Toltén» son la voz de la marca y valen más que una palabra
clave. Sólo se cambian los tres que no dicen nada —`Alojamiento`, `Contacto`,
`Experiencias`— por versiones que nombran el lugar sin sonar a folleto:

- `Alojamiento` → **Habitaciones a orillas del Río Toltén**
- `Experiencias` → **Retiros, talleres y experiencias**
- `Contacto` → **Cómo llegar a Flor del Bosque**

Hay una tensión real entre la voz de la marca y el término que la gente teclea.
La regla que se aplica: el **título** —que se lee en el resultado de Google—
carga el término; el **H1** —que se lee ya dentro de la página— carga la voz.

### 4. El `hreflang` que hoy miente

`index.html` declara una alternativa en inglés que apunta a `pages/en.html`, una
página suelta que no es la traducción de la portada sino una landing distinta.
Se corrige para que no prometa lo que no hay. **El sitio en inglés con
direcciones propias es la tanda siguiente**, no ésta: hoy sólo dos de las once
páginas tienen el cuerpo traducido, y generar `/en/` desde el diccionario
publicaría nueve páginas a medio traducir.

## Verificación

Tests nuevos en `tests/contenido.test.js`, que es donde ya vive lo que amarra el
contenido:

- Cada página declara su canónica, y apunta a su propia dirección.
- Toda página del repositorio está en el sitemap, y el sitemap no nombra
  ninguna que no exista.
- Los datos estructurados de cada página parsean como JSON válido.
- El `Hotel` de la portada trae los campos que Google necesita y las siete
  habitaciones del catálogo.
- Ningún título pasa de 60 caracteres ni ninguna descripción de 160, que es lo
  que Google muestra antes de cortar. **Dos descripciones se pasan hoy** y hay
  que recortarlas: `coliving` con 200 caracteres y `en` con 234. El resto está
  dentro.

Y después de publicar: comprobar las páginas en la herramienta de resultados
enriquecidos de Google, y enviar el sitemap desde Search Console.

## Lo que tiene que hacer la propietaria

Esto no lo puede hacer nadie más: las dos cuentas piden demostrar que el negocio
es suyo.

**1. Perfil de Empresa de Google** — `google.com/business`. Categoría principal
«Hostal» o «Hotel». Dirección, teléfono `+56 9 8548 8233`, sitio
`https://flordelbosque.cl`, horario y las fotografías que ya están publicadas.
Google verifica por código postal o por vídeo, y demora días: **conviene
empezarlo antes que nada**. Después, pedir reseñas a los huéspedes que ya
pasaron — es lo que ordena el mapa.

**2. Search Console** — `search.google.com/search-console`. Se verifica el
dominio con un registro TXT en Cloudflare, que es donde vive el DNS. Una vez
verificado, se envía `https://flordelbosque.cl/sitemap.xml`.

**3. Estar donde la gente busca matrimonios** — fichas en `matrimonios.cl` e
`invitalo.cl`. Son los que ocupan los primeros lugares de esa búsqueda, y ahí se
entra listándose, no compitiendo.

## Fuera de alcance

El sitio en inglés con direcciones propias, que necesita traducir unos 200
bloques de texto en nueve páginas. Las fotos de espacios comunes y exteriores,
que siguen esperando su propio spec. Y el campo `categoria` de Airtable, que
existe sólo en castellano.
