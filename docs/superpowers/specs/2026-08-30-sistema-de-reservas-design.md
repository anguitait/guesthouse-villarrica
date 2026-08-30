# Sistema de reservas con disponibilidad por habitación

**Fecha:** 2026-08-30
**Estado:** aprobado, pendiente de plan de implementación
**Base:** rama `worktree-rediseno-marca` una vez mergeada a `main`. Todo lo que sigue describe **ese** estado del sitio, no el de `main` antes del merge.

## Problema

El sitio ya no tiene el problema de que "reservar" no haga nada: el commit `825f3f3` conectó los 13 botones a la página de contacto y el widget del hero arma una consulta de WhatsApp con las fechas y huéspedes elegidos.

Lo que falta es lo otro, y es lo caro: **nadie sabe qué pieza está libre.** Ni el visitante, que pregunta por WhatsApp y espera respuesta, ni los operadores, que llevan la ocupación de memoria, por WhatsApp y en papel. No existe hoy ningún registro de qué habitación está ocupada en qué fechas.

De ahí se siguen dos costos: el huésped que escribe a las 11 de la noche no obtiene respuesta hasta el otro día, y no hay nada que impida comprometer dos veces la misma pieza.

## Alcance

Un sistema de **solicitudes de reserva con disponibilidad real por habitación**: el huésped ve qué piezas están libres en las fechas que elige, y la solicitud queda registrada además de notificada.

La confirmación sigue siendo manual y no hay pago en línea.

### Fuera de alcance

- Pago o abono en línea.
- Confirmación automática.
- Cancelación o modificación por el huésped.
- Sincronización con Booking o Airbnb. El diseño no la impide: se agrega como otra fuente en el Worker.
- Panel de administración propio. Airtable cumple ese rol.
- **Definir las tarifas.** Es una decisión del negocio que está pendiente, y el sistema debe funcionar sin ellas (§6).
- Tarifas por temporada, mínimo de noches por fecha, y cupos de talleres o experiencias.

## Contexto técnico relevante

Sitio estático: HTML, CSS tokenizado y un `js/main.js` en vanilla JS. GitHub Pages con dominio `flordelbosque.cl`.

Cinco hechos del estado actual condicionan el diseño:

1. **El DNS está en Cloudflare y el correo ya funciona.** Verificado el 2026-08-30: los MX apuntan a `route1/2/3.mx.cloudflare.net` con SPF `include:_spf.mx.cloudflare.net`. Esto invalida la premisa del commit `825f3f3`, que eligió WhatsApp "mientras el dominio no tenga registros MX". Esa restricción ya no existe. Un Worker en plan gratuito tampoco agrega proveedor ni costo.
2. **Hay una sola dirección de contacto: `hola@flordelbosque.cl`**, usada 20 veces tras una consolidación deliberada. No se reintroducen direcciones nuevas.
3. **El WhatsApp real es `56985488233`**, ya en todo el sitio.
4. **`js/main.js` tiene el sistema i18n** con atributos `data-i18n` y diccionarios ES/EN, más el manejador que arma la consulta de WhatsApp desde el widget. La página nueva se integra a ambos.
5. **Los CSS y JS se enlazan con `?v=AAAAMMDD`** en los 10 HTML. Sin eso el navegador sirve versiones viejas. Todo archivo nuevo sigue la convención.

### Las tarifas no existen todavía

`tools/quitar-precios.py` reemplazó todos los precios por "Consultar", documentando la intención: *"hasta que estén definidos… para que las tarjetas no queden con un hueco y reponerlos sea cambiar una palabra por una cifra"*.

**Esto es un requisito, no un estado transitorio a ignorar.** El sistema debe operar sin tarifas y absorberlas cuando existan, sin cambios de código.

La capacidad, en cambio, **sí** está documentada en cada ficha ("2 huéspedes | 35 m²"), así que el filtro por número de huéspedes se sostiene desde el día uno.

## Decisiones de diseño y por qué

| Alternativa | Por qué se descartó |
|---|---|
| Un Google Calendar por habitación | No escala al alta de piezas: 7 calendarios en la barra lateral es carga operativa que se abandona. |
| Un solo Calendar con la habitación en el título | Calendar guarda **texto libre**. Un typo en "Suite Familiar" deja una fecha ocupada mostrándose libre — la falla más cara posible. |
| Un solo Calendar contando cupos solapados | Robusto, pero sólo responde "quedan 4 libres", no **cuáles**. Requisito explícito. |
| GitHub Action que commitea un JSON | Su cron es *best-effort* y no entrega los 10 minutos pedidos; y commitear cada 10 minutos son hasta 144 commits diarios de ruido permanente. |

El requisito de **disponibilidad por pieza** obliga a una fuente con campos tipados, no con texto libre. De ahí Airtable.

## Diseño

### §1 — Airtable como fuente de verdad

**`Habitaciones`** — el registro administrable que reemplaza el HTML escrito a mano:

| Campo | Tipo | Notas |
|---|---|---|
| `id` | texto | Identificador estable, ej. `vista-volcan`. No cambia nunca. |
| `nombre` | texto | "Vista Volcán" |
| `categoria` | select | "Suite Premium", "Habitación Doble", "Suite Familiar" |
| `precio_noche` | número | **Opcional.** Vacío = "Consultar". Ver §6. |
| `capacidad` | número | Obligatorio. Máximo de huéspedes. |
| `metros2` | número | Opcional, para la ficha |
| `descripcion_es` / `descripcion_en` | texto largo | El Worker los agrupa como `descripcion: { es, en }` |
| `caracteristicas_es` / `caracteristicas_en` | texto largo | Una por línea, alimentan la lista de la ficha |
| `imagen` | texto | Ruta desde la raíz, ej. `images/habitaciones/vista-volcan.jpg` |
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
| `origen` | select | `Sitio web`, `WhatsApp`, `Manual` |

**Regla de ocupación — la llegada ocupa, la salida no.** Una reserva del 12 al 15 ocupa los días 12, 13 y 14; el 15 la pieza queda libre para el siguiente huésped. Sin esta regla se pierde una noche vendible por reserva.

Ocupan sólo los estados `Solicitud` y `Confirmada`. `Cancelada` no.

Que `Solicitud` ocupe es deliberado: evita comprometer dos veces la misma pieza. El costo es que una solicitud abandonada bloquea la habitación hasta que alguien la cancele. Se acepta a cambio de la simplicidad, y se mitiga con una vista en Airtable que liste las solicitudes con más de 48 horas sin resolver.

### §2 — El Cloudflare Worker

Tres responsabilidades y una frontera de seguridad.

**Cron cada 10 minutos:** consulta Airtable, transforma y guarda en KV.

**`GET /api/disponibilidad`:** sirve el JSON desde KV, con CORS restringido a `flordelbosque.cl`. Nunca consulta Airtable en caliente, así que un peak de tráfico no golpea su API ni hereda su latencia.

**`POST /api/solicitud`:** crea la fila en `Reservas` con estado `Solicitud` y origen `Sitio web`, y envía el correo a `hola@flordelbosque.cl`.

**Los dos envíos son independientes a propósito.** Si falla el correo, la solicitud quedó en la tabla; si falla Airtable, el correo llegó igual. Al huésped se le confirma éxito si **al menos uno** funcionó; si fallan ambos, se le muestra error con el contacto directo. Los fallos parciales quedan en los logs del Worker.

**Frontera de seguridad:** el token de Airtable vive sólo en los secretos del Worker. En el navegador daría acceso de lectura a la tabla completa con nombres, correos y teléfonos de huéspedes. El Worker filtra y sólo emite rangos de fechas.

Contrato de `GET /api/disponibilidad`:

```json
{
  "actualizado": "2026-08-30T14:00:00Z",
  "habitaciones": [
    {
      "id": "vista-volcan",
      "nombre": "Vista Volcán",
      "categoria": "Suite Premium",
      "precio_noche": null,
      "capacidad": 2,
      "metros2": 35,
      "descripcion": { "es": "…", "en": "…" },
      "caracteristicas": { "es": ["Cama King | Bañera"], "en": ["…"] },
      "imagen": "images/habitaciones/vista-volcan.jpg",
      "ocupado": [["2026-09-12", "2026-09-15"]]
    }
  ]
}
```

`precio_noche: null` es un valor válido y esperado, no un error.

Los rangos de `ocupado` usan la semántica del §1: primer día inclusive, último exclusive.

**Ninguna respuesta del Worker contiene datos personales de huéspedes.** Es requisito, no detalle de implementación.

### §3 — `pages/reservas.html`

Página nueva, con los componentes y tokens de marca ya existentes, y `?v=` en sus enlaces a CSS y JS.

El flujo: calendario de dos meses navegable con los días sin cupo marcados → selección del rango → piezas libres para esas fechas filtradas por `capacidad >= huéspedes` → elección de pieza → datos de contacto → envío.

Se dibuja íntegramente desde `/api/disponibilidad`. No hay habitaciones escritas en el HTML.

**El copy debe dejar explícito que es una solicitud sujeta a confirmación, no una reserva confirmada.** Sin pago y con confirmación manual, el huésped no puede quedar con la impresión de tener la pieza tomada.

Al enviar, además de la confirmación en pantalla, se ofrece un **botón de WhatsApp con el mensaje ya armado** (fechas, pieza y nombre). Es coherente con el resto del sitio, que hoy conversa por ese canal, y da una segunda vía si el correo se demora.

**Textos vía `data-i18n`** con entradas nuevas en ambos diccionarios de `js/main.js`.

**Antispam:** honeypot oculto más Cloudflare Turnstile, gratuito y de la misma cuenta. El Worker rechaza lo que no traiga token válido.

#### Cambios en páginas existentes

- Los 13 botones "Reservar" pasan de `pages/contacto.html` a `pages/reservas.html`. `contacto.html` se mantiene para consultas que no son reservas.
- El widget del hero deja de armar la consulta de WhatsApp y pasa sus valores por querystring: `pages/reservas.html?llegada=…&salida=…&huespedes=2`. **Esto reemplaza a propósito el comportamiento del commit `825f3f3`**, que era la mejor salida posible cuando no había dónde consultar disponibilidad. No es una regresión.

### §4 — Degradación

El punto donde una decisión ingenua causa sobreventa.

| Situación | Comportamiento |
|---|---|
| El Worker no responde | **Modo consulta**: formulario operativo sin calendario, avisando que la disponibilidad se confirma por contacto directo, con el botón de WhatsApp visible. Nunca mostrar todo libre; nunca bloquear todo. |
| `actualizado` con más de 30 minutos | Aviso visible de que los datos pueden estar desactualizados. |
| Habitación sin `capacidad` | No se ofrece: sin ese dato no se puede filtrar con seguridad. |
| Habitación sin `precio_noche` | **Se ofrece igual, con "Consultar".** Es el estado normal hoy (§6). |
| Rango inválido (salida ≤ llegada, o fecha pasada) | Validación en la UI antes de permitir avanzar. |
| Ambos envíos fallan | Error explícito con `hola@flordelbosque.cl` y el WhatsApp directo. |

### §5 — `pages/alojamiento.html` por mejora progresiva

Las fichas quedan en el HTML tal como están, con su "Consultar". Si el Worker responde, JS actualiza datos y disponibilidad; si no, la página se ve exactamente como hoy.

Así una página de marketing que hoy siempre funciona no pasa a depender de un servicio externo para renderizar. El peor caso es un dato algo desactualizado, no una página en blanco.

### §6 — Cómo se comporta el sistema sin tarifas

Mientras `precio_noche` esté vacío:

- La ficha muestra **"Consultar"** en español y **"On request"** en inglés, los mismos textos que ya usa `tools/quitar-precios.py`.
- **No se calcula ni se muestra total.** Un total de `$0` o un "desde —" es peor que no mostrar nada.
- La habitación se ofrece y se puede solicitar con normalidad. La tarifa se conversa al confirmar, que es lo que ocurre hoy.

Cuando las tarifas se definan, se llenan en Airtable y el precio y el total aparecen solos, sin tocar código ni volver a desplegar. Esa es exactamente la propiedad que el script de precios quiso preservar.

El sistema debe soportar el estado mixto — algunas piezas con tarifa y otras sin ella — porque es lo que va a ocurrir mientras se definen.

## Riesgos y puntos a validar

- **Dependencia de un SaaS de terceros.** El plan gratuito de Airtable lo definen ellos, y su límite de 1.000 registros por base equivale a unos dos o tres años de reservas: habrá que archivar. La mitigación estructural es que el contrato JSON del §2 es la única superficie que el sitio conoce; cambiar de fuente afecta al Worker, no a la página.
- **Zona horaria.** Todas las fechas se manejan como fechas civiles (`YYYY-MM-DD`), sin hora ni conversión de zona. `America/Santiago` cambia de huso dos veces al año y tratar las fechas como instantes produce corrimientos de un día.
- **Solicitudes abandonadas** que bloquean piezas. Mitigado con la vista de seguimiento del §1, no con código.
- **Doble registro de las habitaciones** entre Airtable y el HTML de `alojamiento.html` mientras dure la mejora progresiva. Airtable manda; el HTML es respaldo.
- **Entregabilidad del correo.** Los MX están, pero el envío desde el Worker es otra cosa que recibir: hay que verificar que el correo llegue y no caiga en spam. Falta DMARC en el dominio.
- **Cuotas de Turnstile y del proveedor de envío** no verificadas contra el volumen esperado. A confirmar durante la implementación.

## Verificación

La lógica real está en cuatro puntos, y son los que llevan tests unitarios:

1. **Solapamiento de rangos.** Casos: reserva que envuelve el rango consultado, que lo intersecta por cada extremo, adyacente sin tocarlo (el caso de la salida exclusiva), y de una sola noche.
2. **Filtro por capacidad**, incluyendo el límite exacto `capacidad == huéspedes`.
3. **Cálculo de noches y total**, incluyendo un rango que cruce un cambio de horario de verano.
4. **Ausencia de tarifa:** una habitación con `precio_noche: null` se ofrece, muestra "Consultar" y **no** produce total; una lista mixta muestra cada pieza como corresponde.

El resto se verifica manualmente en el navegador: los seis escenarios de degradación del §4 forzando fallos del Worker, y el flujo completo de punta a punta hasta ver la fila aparecer en Airtable y el correo llegar a `hola@flordelbosque.cl`.
