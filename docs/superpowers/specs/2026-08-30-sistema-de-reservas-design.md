# Sistema de reservas con disponibilidad por habitación

**Fecha:** 2026-08-30
**Estado:** aprobado, pendiente de plan de implementación

## Problema

El sitio anuncia reservas pero no las procesa. Hoy existen tres puntos de fuga:

1. **El widget del hero no hace nada.** `index.html:135` tiene un formulario de llegada, salida y huéspedes cuyo botón "Buscar" no está conectado a ningún manejador. El usuario lo llena y no ocurre nada.
2. **Todos los CTA de reserva apuntan a ese widget muerto.** Las cuatro fichas de habitación en `pages/alojamiento.html` y los CTA del header de cada página enlazan a `index.html#reservar`.
3. **El número de WhatsApp es un placeholder.** `56900000000` aparece 20+ veces en el sitio. Las rutas de contacto que no pasan por el widget tampoco funcionan.

Detrás de esto hay un problema operativo mayor: **no existe hoy ningún registro de qué habitación está ocupada y en qué fechas.** El control se lleva de memoria, por WhatsApp y en papel. Cualquier solución que muestre disponibilidad real tiene que resolver primero dónde vive esa información.

## Alcance

Un sistema de **solicitudes de reserva con disponibilidad real por habitación**, donde el huésped ve qué piezas están libres en las fechas que elige, y la solicitud llega a los operadores por dos vías independientes.

La confirmación sigue siendo manual. No hay pago en línea.

### Fuera de alcance

- Pago o abono en línea.
- Confirmación automática de la reserva.
- Cancelación o modificación por parte del huésped.
- Sincronización con Booking o Airbnb. El diseño no la impide: se agrega como una fuente más en el Worker.
- Panel de administración propio. Airtable cumple ese rol.
- Reemplazar el número de WhatsApp placeholder. Es un problema real del sitio pero es independiente de este trabajo.
- Tarifas variables por temporada, mínimo de noches por fecha, o cupos de experiencias y talleres.

## Contexto técnico relevante

Sitio estático sin backend: HTML, CSS tokenizado y un único `js/main.js` de 399 líneas en vanilla JS. Publicado en GitHub Pages con dominio propio `flordelbosque.cl`.

Dos hechos del entorno condicionan el diseño:

- **El DNS ya está en Cloudflare**, con Email Routing activo. Un Worker en el plan gratuito no agrega proveedor nuevo ni costo.
- **`js/main.js` ya tiene un sistema i18n** basado en atributos `data-i18n` con diccionarios ES/EN. La página nueva se integra a él en vez de inventar otro.

Las habitaciones hoy están escritas a mano en el HTML: cuatro fichas en `pages/alojamiento.html` con sus precios (`$85.000`, `$65.000`, `$120.000`, `$70.000`), mientras las estadísticas del home declaran 7 habitaciones. Ya hay desfase entre lo que el sitio afirma en dos lugares distintos.

## Decisiones de diseño y por qué

Cuatro alternativas se descartaron durante el diseño. Se dejan registradas porque el razonamiento importa si mañana se reabre la discusión:

| Alternativa | Por qué se descartó |
|---|---|
| Un Google Calendar por habitación | No escala al alta de piezas: 7 calendarios en la barra lateral es una carga operativa que se abandona. |
| Un solo Calendar con la habitación en el título | Google Calendar guarda **texto libre**. Un typo en "Suite Familiar" deja una fecha ocupada mostrándose como libre — la falla más cara posible. |
| Un solo Calendar contando cupos solapados | Robusto y sin convenciones, pero sólo responde "quedan 4 libres", no **cuáles**. Requisito explícito del usuario. |
| GitHub Action que commitea un JSON | Su cron es *best-effort* y se atrasa bajo carga, así que no entrega los 10 minutos pedidos; y commitear cada 10 minutos son hasta 144 commits diarios de ruido permanente en el historial. |

El requisito de **disponibilidad por pieza** obliga a una fuente con campos tipados, no con texto libre. De ahí Airtable.

## Diseño

### §1 — Airtable como fuente de verdad

Una base con dos tablas.

**`Habitaciones`** — el registro administrable que reemplaza el HTML escrito a mano:

| Campo | Tipo | Notas |
|---|---|---|
| `id` | texto | Identificador estable, ej. `vista-volcan`. No cambia nunca. |
| `nombre` | texto | "Vista Volcán" |
| `categoria` | select | "Suite Premium", "Habitación Doble", "Suite Familiar" |
| `precio_noche` | número | En pesos chilenos, sin decimales |
| `capacidad` | número | Máximo de huéspedes |
| `descripcion_es` / `descripcion_en` | texto largo | El Worker los agrupa como `descripcion: { es, en }` en su respuesta |
| `imagen` | texto | Ruta desde la raíz del sitio, ej. `images/habitaciones/vista-volcan.jpg` |
| `activa` | checkbox | Desmarcada = no se ofrece ni se muestra |
| `orden` | número | Orden de despliegue |

**`Reservas`**:

| Campo | Tipo | Notas |
|---|---|---|
| `habitacion` | vínculo a `Habitaciones` | |
| `llegada` / `salida` | fecha | |
| `huesped`, `email`, `telefono` | texto | Datos personales; nunca salen del Worker |
| `estado` | select | `Solicitud`, `Confirmada`, `Cancelada` |
| `notas` | texto largo | |
| `origen` | select | `Sitio web`, `Manual` |

**Regla de ocupación — la llegada ocupa, la salida no.** Una reserva del 12 al 15 ocupa los días 12, 13 y 14. El 15 la pieza queda libre para el siguiente huésped. Sin esta regla se pierde una noche vendible por cada reserva.

Sólo los estados `Solicitud` y `Confirmada` ocupan. `Cancelada` no.

Que `Solicitud` ocupe es deliberado: evita que dos personas pidan la misma pieza el mismo día. El costo es que una solicitud abandonada bloquea la habitación hasta que alguien la cancele en Airtable. Se acepta a cambio de la simplicidad, y se mitiga con una vista de Airtable que liste las solicitudes con más de 48 horas sin resolver.

### §2 — El Cloudflare Worker

Tres responsabilidades y una frontera de seguridad.

**Cron cada 10 minutos:** consulta la API de Airtable, transforma la respuesta y la guarda en KV.

**`GET /api/disponibilidad`:** sirve el JSON desde KV. CORS restringido a `flordelbosque.cl`. Nunca consulta Airtable en caliente, así que un peak de tráfico no golpea la API de Airtable ni depende de su latencia.

**`POST /api/solicitud`:** recibe la solicitud del huésped y hace dos cosas en paralelo: crea la fila en `Reservas` con estado `Solicitud`, y reenvía el correo a `reservas@flordelbosque.cl` vía Web3Forms.

**Los dos envíos son independientes a propósito.** Si falla el email, la solicitud igual quedó en la tabla. Si falla Airtable, el correo igual llegó. Al huésped se le confirma éxito si **al menos una** vía funcionó; si fallan ambas, se le muestra error con el contacto directo. Los fallos parciales se registran en los logs del Worker.

**Frontera de seguridad:** el token de Airtable vive sólo en los secretos del Worker. Si estuviera en el navegador, cualquiera podría leer la tabla completa con nombres, correos y teléfonos de los huéspedes. El Worker filtra y sólo emite rangos de fechas.

Contrato de `GET /api/disponibilidad`:

```json
{
  "actualizado": "2026-08-30T14:00:00Z",
  "habitaciones": [
    {
      "id": "vista-volcan",
      "nombre": "Vista Volcán",
      "categoria": "Suite Premium",
      "precio_noche": 85000,
      "capacidad": 2,
      "descripcion": { "es": "...", "en": "..." },
      "imagen": "images/habitaciones/vista-volcan.jpg",
      "ocupado": [["2026-09-12", "2026-09-15"]]
    }
  ]
}
```

Los rangos de `ocupado` usan la misma semántica que §1: primer día inclusive, último exclusive.

**Ninguna respuesta del Worker contiene datos personales de huéspedes.** Es requisito, no detalle de implementación.

### §3 — `pages/reservas.html`

Página nueva, construida con los componentes y tokens CSS existentes.

El flujo: calendario de dos meses navegable con los días sin cupo marcados → selección del rango → lista de piezas libres para esas fechas, filtradas por `capacidad >= huéspedes`, cada una con su total calculado (`precio_noche × noches`) → elección de pieza → datos de contacto → envío.

Se dibuja íntegramente desde `/api/disponibilidad`. No hay habitaciones escritas en el HTML.

**El copy debe dejar explícito que esto es una solicitud sujeta a confirmación, no una reserva confirmada.** Sin pago de por medio y con confirmación manual, el huésped no puede quedarse con la impresión de tener la pieza tomada.

El widget del hero deja de ser decorativo: pasa sus valores por querystring a `pages/reservas.html?llegada=…&salida=…&huespedes=2`, que la página lee y aplica.

Textos vía `data-i18n` con entradas nuevas en ambos diccionarios de `js/main.js`.

**Antispam:** honeypot oculto más Cloudflare Turnstile, gratuito y de la misma cuenta. El Worker rechaza lo que no traiga token válido.

### §4 — Degradación

Este es el punto donde una decisión ingenua causa sobreventa.

| Situación | Comportamiento |
|---|---|
| El Worker no responde | **Modo consulta**: el formulario sigue operativo sin calendario, avisando que la disponibilidad se confirma por correo. Nunca mostrar todo libre; nunca bloquear todo. |
| `actualizado` con más de 30 minutos | Aviso visible de que los datos pueden estar desactualizados. |
| Habitación sin precio o capacidad | No se ofrece. Un dato faltante nunca se interpreta como disponible. |
| Rango inválido (salida ≤ llegada, o fecha pasada) | Validación en la UI antes de permitir avanzar. |
| Ambos envíos fallan | Error explícito con el correo y el teléfono de contacto directo. |

### §5 — `pages/alojamiento.html` por mejora progresiva

Las fichas de habitación quedan en el HTML tal como están hoy, con sus precios. Si el Worker responde, JS actualiza precios y disponibilidad; si no responde, la página se ve exactamente como hoy.

Así una página de marketing que hoy siempre funciona no pasa a depender de un servicio externo para renderizar. El peor caso es un precio algo desactualizado, no una página en blanco.

## Riesgos y puntos a validar

- **Dependencia de un SaaS de terceros.** El plan gratuito de Airtable lo definen ellos. El límite de 1.000 registros por base equivale a unos dos o tres años de reservas; habrá que archivar. La mitigación estructural es que el contrato JSON del §2 es la única superficie que el sitio conoce: cambiar de fuente afecta al Worker, no a la página.
- **Zona horaria.** Todas las fechas se manejan como fechas civiles (`YYYY-MM-DD`), sin hora ni conversión de zona. `America/Santiago` cambia de huso dos veces al año y tratar las fechas como instantes produce corrimientos de un día.
- **Solicitudes abandonadas** que bloquean piezas. Mitigado con la vista de seguimiento del §1, no con código.
- **Precios duplicados** entre Airtable y el HTML de `alojamiento.html` mientras dure la mejora progresiva. Airtable manda; el HTML es respaldo.
- **La cuota de Web3Forms y de Turnstile** no está verificada contra el volumen esperado. A confirmar durante la implementación.

## Verificación

La lógica real está en tres puntos, y son los que llevan tests unitarios:

1. **Solapamiento de rangos.** Casos: reserva que envuelve el rango consultado, que lo intersecta por cada extremo, adyacente sin tocarlo (el caso de la salida exclusiva), y de una sola noche.
2. **Filtro por capacidad**, incluyendo el límite exacto `capacidad == huéspedes`.
3. **Cálculo de noches y total**, incluyendo un rango que cruce un cambio de horario de verano.

El resto se verifica manualmente en el navegador: los cinco escenarios de degradación del §4 forzando fallos del Worker, y el flujo completo de punta a punta hasta ver la fila aparecer en Airtable y el correo llegar a `reservas@flordelbosque.cl`.
