# Sistema de reservas — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el visitante vea qué habitaciones están libres en las fechas que elige y envíe una solicitud que queda registrada en Airtable y notificada por correo.

**Architecture:** Airtable es la fuente de verdad. Un Cloudflare Worker la consulta cada 10 minutos, guarda el resultado en KV y lo sirve como JSON sin datos personales. Una página estática nueva se dibuja desde ese JSON y envía las solicitudes de vuelta al Worker.

**Tech Stack:** HTML/CSS/JS vanilla (módulos ES), Cloudflare Workers + KV + Cron Triggers + binding `send_email`, Airtable REST API, Cloudflare Turnstile, tests con el runner nativo de Node (`node --test`, sin dependencias).

**Spec:** `docs/superpowers/specs/2026-08-30-sistema-de-reservas-design.md`

---

## Cambio respecto del spec

El spec §2 dice que el correo sale por Web3Forms. **Se reemplaza por el binding `send_email` de Cloudflare Email Routing**, que envía a direcciones ya verificadas como destino. `hola@flordelbosque.cl` ya lo es.

Esto elimina un proveedor externo, una clave más que rotar y el riesgo de cuota que el spec dejaba por confirmar. La restricción del binding — sólo envía a destinos verificados — no molesta, porque el destinatario es siempre el mismo y es fijo.

## Estructura de archivos

**Sitio:**

| Archivo | Responsabilidad |
|---|---|
| `js/reservas-logica.js` | Lógica pura, sin DOM: solapamiento, noches, filtros, formato. Es lo único con tests unitarios del lado del sitio. |
| `js/reservas-ui.js` | Calendario, render de piezas y envío. Usa el módulo anterior. |
| `js/alojamiento-datos.js` | Mejora progresiva de `alojamiento.html` (§5 del spec). |
| `pages/reservas.html` | La página nueva. |
| `js/main.js` | Se modifica: widget del hero y claves i18n nuevas. |
| Los 10 HTML | Se modifican: los botones "Reservar" apuntan a la página nueva. |

**Worker** (directorio nuevo `worker/`):

| Archivo | Responsabilidad |
|---|---|
| `worker/src/transformar.js` | Airtable → contrato JSON. Puro y testeable. **Es la frontera de privacidad.** |
| `worker/src/airtable.js` | Cliente HTTP de Airtable: leer y crear. |
| `worker/src/correo.js` | Arma el MIME y envía por el binding. |
| `worker/src/index.js` | Router, cron y validación de Turnstile. |
| `worker/wrangler.toml` | Configuración y bindings. |

**Tests:** `tests/reservas-logica.test.js`, `tests/transformar.test.js`.

---

## Task 1: Mergear el rediseño a main

El spec se basa en el estado de `worktree-rediseno-marca`. Sin este merge, todas las rutas y textos de las tareas siguientes no calzan.

**Files:**
- Modify: la rama `main` completa

- [ ] **Step 1: Verificar que la rama está limpia**

```bash
cd /Users/la/Documents/FLORDELBOSQUE/guesthouse-villarrica
git -C .claude/worktrees/rediseno-marca status --short
```

Expected: sin salida (árbol limpio).

- [ ] **Step 2: Mergear**

```bash
git checkout main
git merge worktree-rediseno-marca --no-ff -m "Integrar el rediseño de marca a main"
```

Expected: merge sin conflictos. El spec de reservas sólo existe en `main`, y el rediseño no lo toca.

- [ ] **Step 3: Verificar que el estado quedó correcto**

```bash
grep -c "56985488233" js/main.js
grep -c "Consultar" pages/alojamiento.html
```

Expected: `1` y un número mayor que 0. Si el WhatsApp da 0, el merge no trajo el rediseño.

- [ ] **Step 4: Correr el arnés de marca que ya existe**

```bash
bash tools/verificar-marca.sh
```

Expected: el arnés pasa. Si falla, **detenerse y reportar** — no seguir construyendo sobre una base rota.

---

## Task 2: Configuración externa (manual, una sola vez)

Esta tarea no escribe código: crea las cuentas y recursos de los que dependen todas las demás. Requiere intervención humana.

**Files:** ninguno.

- [ ] **Step 1: Crear la base de Airtable**

En airtable.com, crear una base llamada `Flor del Bosque` con dos tablas.

Tabla `Habitaciones`, con estos campos exactos (los nombres importan, el código los usa tal cual):

| Campo | Tipo Airtable |
|---|---|
| `id` | Single line text |
| `nombre` | Single line text |
| `categoria` | Single select |
| `precio_noche` | Number (entero) |
| `capacidad` | Number (entero) |
| `metros2` | Number (entero) |
| `descripcion_es` | Long text |
| `descripcion_en` | Long text |
| `caracteristicas_es` | Long text |
| `caracteristicas_en` | Long text |
| `imagen` | Single line text |
| `activa` | Checkbox |
| `orden` | Number (entero) |

Tabla `Reservas`:

| Campo | Tipo Airtable |
|---|---|
| `habitacion` | Link to Habitaciones |
| `llegada` | Date (formato ISO) |
| `salida` | Date (formato ISO) |
| `huesped` | Single line text |
| `email` | Email |
| `telefono` | Phone |
| `estado` | Single select: `Solicitud`, `Confirmada`, `Cancelada` |
| `notas` | Long text |
| `origen` | Single select: `Sitio web`, `WhatsApp`, `Manual` |

- [ ] **Step 2: Cargar las 7 habitaciones**

El hostal tiene **7 habitaciones**, como declaran las estadísticas de la portada. `pages/alojamiento.html` sólo publica 4: esa página está incompleta, y el Task 18 la completa.

Cuatro salen del HTML actual. **`precio_noche` se deja vacío en todas** — las tarifas no están definidas (spec §6).

| `id` | `nombre` | `categoria` | `capacidad` | `metros2` | `imagen` | `activa` | `orden` |
|---|---|---|---|---|---|---|---|
| `vista-volcan` | Vista Volcán | Suite Premium | 2 | 35 | `images/habitaciones/vista-volcan.jpg` | ✓ | 1 |
| `bosque` | Habitación Bosque | Habitación Doble | 2 | 25 | `images/habitaciones/habitacion-verde.jpg` | ✓ | 2 |
| `familiar` | Suite Familiar | Suite Familiar | 4 | 45 | `images/habitaciones/suite-familiar.jpg` | ✓ | 3 |
| `rio` | Habitación Río | Habitación Doble | 2 | 25 | `images/lugar/piscina-jardin.jpg` | ✓ | 4 |

Las descripciones y características de esas cuatro se copian textualmente de sus fichas en `pages/alojamiento.html`. Para capacidad y metros², el dato está en la primera línea de cada lista (`2 huéspedes | 35 m2`).

**Las tres restantes las aporta el dueño**, porque no existen en ninguna parte del repositorio. Por cada una hace falta: `id` en minúsculas sin tildes, `nombre`, `categoria`, `capacidad`, `metros2`, `descripcion_es`, `caracteristicas_es` y una foto en `images/habitaciones/`. Se cargan con `orden` 5, 6 y 7.

Sin esos datos, esta tarea y el Task 18 quedan bloqueados; **el resto del plan avanza igual**, porque nada más depende de cuántas habitaciones haya.

**Verificar que cada ruta de `imagen` existe** con `ls images/habitaciones/`. Si un archivo no existe, dejar `imagen` vacío en vez de inventar una ruta.

- [ ] **Step 3: Crear una vista de seguimiento**

En `Reservas`, crear una vista llamada `Solicitudes sin resolver`: filtro `estado = Solicitud`, ordenada por fecha de creación ascendente. Es la mitigación del spec §1 para las solicitudes abandonadas que bloquean piezas.

- [ ] **Step 4: Crear el token de Airtable**

En airtable.com/create/tokens, crear un Personal Access Token con scopes `data.records:read` y `data.records:write`, con acceso **sólo** a la base `Flor del Bosque`. Guardarlo: se usa en el Task 8.

- [ ] **Step 5: Verificar que `hola@flordelbosque.cl` es destino verificado**

En el panel de Cloudflare → Email Routing → Destination addresses, confirmar que aparece como *Verified*. Sin eso el binding `send_email` rechaza los envíos.

- [ ] **Step 6: Crear las llaves de Turnstile**

En Cloudflare → Turnstile, crear un widget para el dominio `flordelbosque.cl`. Anotar la *Site Key* (pública, va en el HTML) y la *Secret Key* (va en los secretos del Worker).

---

## Task 3: Arnés de tests

Sin esto no se puede hacer TDD en las tareas siguientes. El repo no tiene `package.json` hoy.

**Files:**
- Create: `package.json`
- Create: `tests/arnes.test.js`

- [ ] **Step 1: Escribir el test que falla**

```bash
mkdir -p tests
```

`tests/arnes.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('el arnés de tests corre', () => {
  assert.equal(1 + 1, 2);
});
```

- [ ] **Step 2: Correrlo y verificar que falla**

Run: `node --test tests/`

Expected: falla con `SyntaxError: Cannot use import statement outside a module`. Node trata los `.js` como CommonJS mientras no exista un `package.json` que declare lo contrario.

- [ ] **Step 3: Crear el package.json**

`package.json`:

```json
{
  "name": "flordelbosque-sitio",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/"
  }
}
```

Este archivo existe sólo para los tests y el Worker. No agrega dependencias ni build al sitio, que sigue siendo HTML estático servido por GitHub Pages.

- [ ] **Step 4: Correrlo y verificar que pasa**

Run: `npm test`

Expected: `# pass 1`.

- [ ] **Step 5: Commit**

```bash
git add package.json tests/arnes.test.js
git commit -m "Agregar arnés de tests con el runner nativo de Node"
```

---

## Task 4: Solapamiento de rangos y disponibilidad

El corazón del sistema. La regla del spec §1: **la llegada ocupa, la salida no.**

**Files:**
- Create: `js/reservas-logica.js`
- Create: `tests/reservas-logica.test.js`

- [ ] **Step 1: Escribir los tests que fallan**

`tests/reservas-logica.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seSolapan, estaLibre } from '../js/reservas-logica.js';

test('un rango que envuelve a la reserva se solapa', () => {
  assert.equal(seSolapan('2026-09-10', '2026-09-20', '2026-09-12', '2026-09-15'), true);
});

test('un rango que entra por la izquierda se solapa', () => {
  assert.equal(seSolapan('2026-09-10', '2026-09-13', '2026-09-12', '2026-09-15'), true);
});

test('un rango que entra por la derecha se solapa', () => {
  assert.equal(seSolapan('2026-09-14', '2026-09-18', '2026-09-12', '2026-09-15'), true);
});

test('llegar el día que el otro se va NO se solapa', () => {
  // La reserva ocupa 12, 13 y 14. El 15 la pieza queda libre.
  assert.equal(seSolapan('2026-09-15', '2026-09-18', '2026-09-12', '2026-09-15'), false);
});

test('irse el día que el otro llega NO se solapa', () => {
  assert.equal(seSolapan('2026-09-08', '2026-09-12', '2026-09-12', '2026-09-15'), false);
});

test('una sola noche dentro de la reserva se solapa', () => {
  assert.equal(seSolapan('2026-09-13', '2026-09-14', '2026-09-12', '2026-09-15'), true);
});

test('una habitación sin ocupación está libre', () => {
  assert.equal(estaLibre({ ocupado: [] }, '2026-09-12', '2026-09-15'), true);
});

test('una habitación sin el campo ocupado está libre', () => {
  assert.equal(estaLibre({}, '2026-09-12', '2026-09-15'), true);
});

test('basta un rango ocupado que choque para no estar libre', () => {
  const h = { ocupado: [['2026-10-01', '2026-10-03'], ['2026-09-13', '2026-09-14']] };
  assert.equal(estaLibre(h, '2026-09-12', '2026-09-15'), false);
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm test`

Expected: `Cannot find module` — `js/reservas-logica.js` no existe.

- [ ] **Step 3: Implementar**

`js/reservas-logica.js`:

```js
/**
 * Lógica de disponibilidad. Sin DOM: se usa igual en el navegador y en los tests.
 *
 * Todas las fechas son civiles en formato YYYY-MM-DD, nunca instantes. Compararlas
 * como texto funciona porque el formato es de ancho fijo y ordena igual que el
 * calendario, y así se evitan los corrimientos de un día que produce America/Santiago
 * al cambiar de huso dos veces al año.
 */

/**
 * Dos estadías se solapan si cada una empieza antes de que termine la otra.
 * El día de salida NO cuenta como ocupado: quien se va el 15 libera esa noche.
 */
export function seSolapan(iniA, finA, iniB, finB) {
  return iniA < finB && iniB < finA;
}

export function estaLibre(habitacion, llegada, salida) {
  const ocupado = habitacion.ocupado || [];
  return !ocupado.some(([ini, fin]) => seSolapan(llegada, salida, ini, fin));
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm test`

Expected: los 10 tests pasan.

- [ ] **Step 5: Commit**

```bash
git add js/reservas-logica.js tests/reservas-logica.test.js
git commit -m "Agregar la lógica de solapamiento de estadías"
```

---

## Task 5: Noches, total y ausencia de tarifa

Implementa el spec §6: el sistema opera sin precios definidos.

**Files:**
- Modify: `js/reservas-logica.js`
- Modify: `tests/reservas-logica.test.js`

- [ ] **Step 1: Escribir los tests que fallan**

Agregar al final de `tests/reservas-logica.test.js`:

```js
import { noches, total, formatearPrecio, rangoValido } from '../js/reservas-logica.js';

test('tres noches entre el 12 y el 15', () => {
  assert.equal(noches('2026-09-12', '2026-09-15'), 3);
});

test('una noche', () => {
  assert.equal(noches('2026-09-12', '2026-09-13'), 1);
});

test('el cambio de horario de verano no altera el conteo', () => {
  // En Chile el horario de verano arranca el primer domingo de septiembre.
  // Contado como instantes locales, este rango daría 6.958... noches.
  assert.equal(noches('2026-09-04', '2026-09-11'), 7);
});

test('el total multiplica precio por noches', () => {
  assert.equal(total({ precio_noche: 85000 }, 3), 255000);
});

test('sin tarifa definida no hay total', () => {
  assert.equal(total({ precio_noche: null }, 3), null);
});

test('una tarifa ausente del registro tampoco produce total', () => {
  assert.equal(total({}, 3), null);
});

test('sin tarifa el precio se muestra como Consultar', () => {
  assert.equal(formatearPrecio(null, 'es'), 'Consultar');
  assert.equal(formatearPrecio(null, 'en'), 'On request');
});

test('con tarifa el precio se formatea en pesos', () => {
  assert.match(formatearPrecio(85000, 'es'), /85\.000/);
});

test('la salida debe ser posterior a la llegada', () => {
  assert.equal(rangoValido('2026-09-15', '2026-09-12', '2026-09-01'), false);
  assert.equal(rangoValido('2026-09-15', '2026-09-15', '2026-09-01'), false);
  assert.equal(rangoValido('2026-09-12', '2026-09-15', '2026-09-01'), true);
});

test('no se puede reservar hacia atrás', () => {
  assert.equal(rangoValido('2026-08-01', '2026-08-05', '2026-09-01'), false);
});

test('se puede reservar desde hoy mismo', () => {
  assert.equal(rangoValido('2026-09-01', '2026-09-03', '2026-09-01'), true);
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm test`

Expected: falla porque `noches`, `total`, `formatearPrecio` y `rangoValido` no están exportados.

- [ ] **Step 3: Implementar**

Agregar a `js/reservas-logica.js`:

```js
const MS_POR_DIA = 86400000;

function aUTC(fecha) {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return Date.UTC(anio, mes - 1, dia);
}

/**
 * Cuenta noches en UTC a propósito. Con fechas locales, un rango que cruza el
 * cambio de horario de verano mide 23 o 25 horas y el redondeo se equivoca.
 */
export function noches(llegada, salida) {
  return Math.round((aUTC(salida) - aUTC(llegada)) / MS_POR_DIA);
}

/**
 * Devuelve null cuando la tarifa no está definida, que hoy es el caso de todas
 * las piezas. Un total de 0 sería peor que no mostrar nada.
 */
export function total(habitacion, cantidadNoches) {
  const precio = habitacion.precio_noche;
  if (precio === null || precio === undefined) return null;
  return precio * cantidadNoches;
}

export function formatearPrecio(valor, idioma) {
  if (valor === null || valor === undefined) {
    return idioma === 'en' ? 'On request' : 'Consultar';
  }
  return valor.toLocaleString('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  });
}

export function rangoValido(llegada, salida, hoy) {
  if (!llegada || !salida) return false;
  if (llegada < hoy) return false;
  return llegada < salida;
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm test`

Expected: los 21 tests pasan.

- [ ] **Step 5: Commit**

```bash
git add js/reservas-logica.js tests/reservas-logica.test.js
git commit -m "Contar noches en UTC y tratar la tarifa ausente como Consultar"
```

---

## Task 6: Filtro de habitaciones disponibles

**Files:**
- Modify: `js/reservas-logica.js`
- Modify: `tests/reservas-logica.test.js`

- [ ] **Step 1: Escribir los tests que fallan**

Agregar a `tests/reservas-logica.test.js`:

```js
import { disponibles } from '../js/reservas-logica.js';

const CATALOGO = [
  { id: 'vista-volcan', capacidad: 2, ocupado: [['2026-09-12', '2026-09-15']] },
  { id: 'suite-familiar', capacidad: 4, ocupado: [] },
  { id: 'bosque', capacidad: 2, ocupado: [] }
];

test('excluye las piezas ocupadas en el rango', () => {
  const r = disponibles(CATALOGO, '2026-09-13', '2026-09-14', 2);
  assert.deepEqual(r.map(h => h.id), ['suite-familiar', 'bosque']);
});

test('excluye las piezas que no alcanzan para el grupo', () => {
  const r = disponibles(CATALOGO, '2026-10-01', '2026-10-03', 4);
  assert.deepEqual(r.map(h => h.id), ['suite-familiar']);
});

test('la capacidad justa alcanza', () => {
  const r = disponibles([{ id: 'x', capacidad: 2, ocupado: [] }], '2026-10-01', '2026-10-03', 2);
  assert.equal(r.length, 1);
});

test('una pieza sin capacidad declarada no se ofrece', () => {
  // Sin ese dato no se puede filtrar con seguridad, así que se omite.
  const r = disponibles([{ id: 'x', ocupado: [] }], '2026-10-01', '2026-10-03', 1);
  assert.deepEqual(r, []);
});

test('una pieza sin tarifa SÍ se ofrece', () => {
  // Es el estado normal hoy: las tarifas no están definidas.
  const r = disponibles([{ id: 'x', capacidad: 2, precio_noche: null, ocupado: [] }],
    '2026-10-01', '2026-10-03', 2);
  assert.equal(r.length, 1);
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm test`

Expected: falla porque `disponibles` no existe.

- [ ] **Step 3: Implementar**

Agregar a `js/reservas-logica.js`:

```js
/**
 * Una pieza sin capacidad declarada se omite: sin ese dato no hay forma segura
 * de filtrar. Una pieza sin tarifa, en cambio, se ofrece igual — es el estado
 * normal mientras el negocio no defina precios.
 */
export function disponibles(habitaciones, llegada, salida, huespedes) {
  return habitaciones.filter(h =>
    typeof h.capacidad === 'number' &&
    h.capacidad >= huespedes &&
    estaLibre(h, llegada, salida)
  );
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm test`

Expected: los 26 tests pasan.

- [ ] **Step 5: Commit**

```bash
git add js/reservas-logica.js tests/reservas-logica.test.js
git commit -m "Filtrar piezas por disponibilidad y capacidad"
```

---

## Task 7: Transformar Airtable al contrato público

Esta función es **la frontera de privacidad** del sistema: es el único punto donde se decide qué sale de Airtable hacia internet. Los registros de entrada traen nombres, correos y teléfonos de huéspedes; la salida no debe contener ninguno.

**Files:**
- Create: `worker/src/transformar.js`
- Create: `tests/transformar.test.js`

- [ ] **Step 1: Escribir los tests que fallan**

`tests/transformar.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transformar } from '../worker/src/transformar.js';

const HABITACIONES = [
  {
    id: 'recAAA',
    fields: {
      id: 'vista-volcan', nombre: 'Vista Volcán', categoria: 'Suite Premium',
      capacidad: 2, metros2: 35, activa: true, orden: 1,
      descripcion_es: 'Nuestra suite más especial.', descripcion_en: 'Our finest suite.',
      caracteristicas_es: 'Cama King\nBañera', caracteristicas_en: 'King bed\nBathtub',
      imagen: 'images/habitaciones/vista-volcan.jpg'
    }
  },
  {
    id: 'recBBB',
    fields: { id: 'bosque', nombre: 'Habitación Bosque', capacidad: 2, activa: true, orden: 2 }
  },
  {
    id: 'recCCC',
    fields: { id: 'oculta', nombre: 'En remodelación', capacidad: 2, activa: false, orden: 3 }
  }
];

const RESERVAS = [
  {
    id: 'recR1',
    fields: {
      habitacion: ['recAAA'], llegada: '2026-09-12', salida: '2026-09-15',
      estado: 'Confirmada', huesped: 'Ana Pérez', email: 'ana@ejemplo.cl', telefono: '+56911111111'
    }
  },
  {
    id: 'recR2',
    fields: {
      habitacion: ['recBBB'], llegada: '2026-10-01', salida: '2026-10-04',
      estado: 'Solicitud', huesped: 'Juan Soto', email: 'juan@ejemplo.cl'
    }
  },
  {
    id: 'recR3',
    fields: {
      habitacion: ['recAAA'], llegada: '2026-11-01', salida: '2026-11-05',
      estado: 'Cancelada', huesped: 'Luis Díaz', email: 'luis@ejemplo.cl'
    }
  }
];

const AHORA = '2026-08-30T14:00:00.000Z';

test('el contrato no filtra ningún dato personal', () => {
  const json = JSON.stringify(transformar(HABITACIONES, RESERVAS, AHORA));
  for (const dato of ['Ana', 'Pérez', 'ana@ejemplo.cl', '+56911111111',
                      'Juan', 'Soto', 'juan@ejemplo.cl', 'Luis', 'luis@ejemplo.cl']) {
    assert.equal(json.includes(dato), false, `se filtró "${dato}" al contrato público`);
  }
});

test('omite las habitaciones inactivas', () => {
  const r = transformar(HABITACIONES, RESERVAS, AHORA);
  assert.deepEqual(r.habitaciones.map(h => h.id), ['vista-volcan', 'bosque']);
});

test('respeta el campo orden', () => {
  const alReves = [HABITACIONES[1], HABITACIONES[0]];
  const r = transformar(alReves, [], AHORA);
  assert.deepEqual(r.habitaciones.map(h => h.id), ['vista-volcan', 'bosque']);
});

test('las reservas confirmadas ocupan', () => {
  const r = transformar(HABITACIONES, RESERVAS, AHORA);
  const volcan = r.habitaciones.find(h => h.id === 'vista-volcan');
  assert.deepEqual(volcan.ocupado, [['2026-09-12', '2026-09-15']]);
});

test('las solicitudes también ocupan', () => {
  const r = transformar(HABITACIONES, RESERVAS, AHORA);
  const bosque = r.habitaciones.find(h => h.id === 'bosque');
  assert.deepEqual(bosque.ocupado, [['2026-10-01', '2026-10-04']]);
});

test('las canceladas no ocupan', () => {
  const r = transformar(HABITACIONES, RESERVAS, AHORA);
  const volcan = r.habitaciones.find(h => h.id === 'vista-volcan');
  assert.equal(volcan.ocupado.length, 1);
});

test('una tarifa ausente viaja como null, no como cero', () => {
  const r = transformar(HABITACIONES, [], AHORA);
  assert.equal(r.habitaciones[0].precio_noche, null);
});

test('los campos opcionales que faltan no rompen la transformación', () => {
  const r = transformar(HABITACIONES, [], AHORA);
  const bosque = r.habitaciones.find(h => h.id === 'bosque');
  assert.equal(bosque.metros2, null);
  assert.equal(bosque.imagen, null);
  assert.deepEqual(bosque.caracteristicas, { es: [], en: [] });
  assert.deepEqual(bosque.descripcion, { es: '', en: '' });
});

test('las características se parten por línea', () => {
  const r = transformar(HABITACIONES, [], AHORA);
  assert.deepEqual(r.habitaciones[0].caracteristicas.es, ['Cama King', 'Bañera']);
});

test('una reserva sin fechas se ignora', () => {
  const rota = [{ id: 'recX', fields: { habitacion: ['recAAA'], estado: 'Confirmada' } }];
  const r = transformar(HABITACIONES, rota, AHORA);
  assert.deepEqual(r.habitaciones[0].ocupado, []);
});

test('una reserva que apunta a una pieza inexistente se ignora', () => {
  const huerfana = [{
    id: 'recY',
    fields: { habitacion: ['recZZZ'], llegada: '2026-09-01', salida: '2026-09-02', estado: 'Confirmada' }
  }];
  assert.doesNotThrow(() => transformar(HABITACIONES, huerfana, AHORA));
});

test('incluye la marca de tiempo', () => {
  const r = transformar(HABITACIONES, [], AHORA);
  assert.equal(r.actualizado, AHORA);
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm test`

Expected: `Cannot find module '../worker/src/transformar.js'`.

- [ ] **Step 3: Implementar**

```bash
mkdir -p worker/src
```

`worker/src/transformar.js`:

```js
/**
 * Convierte los registros crudos de Airtable en el contrato público del sitio.
 *
 * Esta función es la frontera de privacidad del sistema: es el único lugar donde
 * se decide qué sale hacia internet. De la tabla Reservas sólo se leen habitación,
 * fechas y estado. Los campos huesped, email, telefono y notas no se tocan nunca,
 * y hay un test que lo verifica sobre el JSON serializado.
 */

const ESTADOS_QUE_OCUPAN = new Set(['Solicitud', 'Confirmada']);

function lineas(texto) {
  if (!texto) return [];
  return texto.split('\n').map(l => l.trim()).filter(Boolean);
}

function opcional(valor) {
  return valor === undefined ? null : valor;
}

export function transformar(registrosHabitaciones, registrosReservas, ahoraISO) {
  const porRecordId = new Map();

  const habitaciones = registrosHabitaciones
    .filter(r => r.fields.activa === true)
    .sort((a, b) => (a.fields.orden || 0) - (b.fields.orden || 0))
    .map(r => {
      const f = r.fields;
      const habitacion = {
        id: f.id,
        nombre: f.nombre,
        categoria: opcional(f.categoria),
        precio_noche: opcional(f.precio_noche),
        capacidad: opcional(f.capacidad),
        metros2: opcional(f.metros2),
        descripcion: { es: f.descripcion_es || '', en: f.descripcion_en || '' },
        caracteristicas: { es: lineas(f.caracteristicas_es), en: lineas(f.caracteristicas_en) },
        imagen: opcional(f.imagen),
        ocupado: []
      };
      porRecordId.set(r.id, habitacion);
      return habitacion;
    });

  for (const reserva of registrosReservas) {
    const f = reserva.fields;
    if (!ESTADOS_QUE_OCUPAN.has(f.estado)) continue;
    if (!f.llegada || !f.salida) continue;
    for (const recordId of f.habitacion || []) {
      const habitacion = porRecordId.get(recordId);
      if (habitacion) habitacion.ocupado.push([f.llegada, f.salida]);
    }
  }

  return { actualizado: ahoraISO, habitaciones };
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm test`

Expected: los 38 tests pasan.

- [ ] **Step 5: Commit**

```bash
git add worker/src/transformar.js tests/transformar.test.js
git commit -m "Transformar los registros de Airtable al contrato público sin datos personales"
```

---

## Task 8: Cliente de Airtable

**Files:**
- Create: `worker/src/airtable.js`

- [ ] **Step 1: Escribir el cliente**

No lleva test unitario: es puramente entrada/salida contra un servicio externo, y no se testea sin mocks que sólo verificarían el mock. La lógica que sí importa ya está cubierta en `transformar.js`. Se verifica de punta a punta en el Task 15.

`worker/src/airtable.js`:

```js
/**
 * Cliente mínimo de la API de Airtable. Sólo lo que el Worker necesita.
 */

const BASE_URL = 'https://api.airtable.com/v0';

async function pedir(env, ruta, opciones = {}) {
  const respuesta = await fetch(`${BASE_URL}/${env.AIRTABLE_BASE_ID}/${ruta}`, {
    ...opciones,
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json',
      ...(opciones.headers || {})
    }
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    throw new Error(`Airtable ${respuesta.status}: ${detalle}`);
  }
  return respuesta.json();
}

/**
 * Airtable pagina de a 100 registros. Con 4 piezas no hace falta hoy, pero
 * la tabla de reservas sí va a pasar ese umbral dentro del primer año.
 */
async function listarTodo(env, tabla) {
  const registros = [];
  let offset;

  do {
    const query = new URLSearchParams({ pageSize: '100' });
    if (offset) query.set('offset', offset);
    const pagina = await pedir(env, `${encodeURIComponent(tabla)}?${query}`);
    registros.push(...pagina.records);
    offset = pagina.offset;
  } while (offset);

  return registros;
}

export function listarHabitaciones(env) {
  return listarTodo(env, 'Habitaciones');
}

export function listarReservas(env) {
  return listarTodo(env, 'Reservas');
}

export function crearSolicitud(env, solicitud) {
  return pedir(env, 'Reservas', {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        habitacion: [solicitud.habitacionRecordId],
        llegada: solicitud.llegada,
        salida: solicitud.salida,
        huesped: solicitud.nombre,
        email: solicitud.email,
        telefono: solicitud.telefono || '',
        notas: solicitud.comentarios || '',
        estado: 'Solicitud',
        origen: 'Sitio web'
      }
    })
  });
}
```

- [ ] **Step 2: Verificar que el módulo carga**

Run: `node --input-type=module -e "import('./worker/src/airtable.js').then(m => console.log(Object.keys(m).join(',')))"`

Expected: `listarHabitaciones,listarReservas,crearSolicitud`

- [ ] **Step 3: Commit**

```bash
git add worker/src/airtable.js
git commit -m "Agregar el cliente de Airtable con paginación"
```

---

## Task 9: El Worker — cron y endpoint de disponibilidad

**Files:**
- Create: `worker/wrangler.toml`
- Create: `worker/src/index.js`

- [ ] **Step 1: Escribir la configuración**

`worker/wrangler.toml`:

```toml
name = "flordelbosque-reservas"
main = "src/index.js"
compatibility_date = "2026-08-30"

# El cron del spec: cada 10 minutos.
[triggers]
crons = ["*/10 * * * *"]

# Dominio propio: evita depender de la URL workers.dev, que cambia con la cuenta,
# y deja el CORS apuntando a un origen estable.
routes = [
  { pattern = "reservas.flordelbosque.cl", custom_domain = true }
]

# Caché de la disponibilidad. El id se llena en el Step 3.
[[kv_namespaces]]
binding = "CACHE"
id = "REEMPLAZAR_CON_EL_ID_REAL"

# Envío de correo a un destino ya verificado en Email Routing.
[[send_email]]
name = "CORREO"
destination_address = "hola@flordelbosque.cl"

[vars]
ORIGEN_PERMITIDO = "https://flordelbosque.cl"
DESTINATARIO = "hola@flordelbosque.cl"
REMITENTE = "reservas@flordelbosque.cl"
```

- [ ] **Step 2: Ignorar los artefactos de wrangler**

Agregar a `.gitignore`:

```
.wrangler/
node_modules/
```

`npx wrangler` crea `.wrangler/` con estado local y caché de builds. Sin esto se cuela al repo en el primer despliegue.

- [ ] **Step 3: Crear el namespace de KV y pegar su id**

```bash
cd worker
npx wrangler kv namespace create CACHE
```

Expected: imprime un bloque con `id = "..."`. Copiar ese id y reemplazar `REEMPLAZAR_CON_EL_ID_REAL` en `wrangler.toml`.

- [ ] **Step 4: Cargar los secretos**

```bash
npx wrangler secret put AIRTABLE_TOKEN      # el PAT del Task 2 Step 4
npx wrangler secret put AIRTABLE_BASE_ID    # el id de la base, empieza con "app"
npx wrangler secret put TURNSTILE_SECRET    # la Secret Key del Task 2 Step 6
```

Expected: cada uno confirma `Success! Uploaded secret`.

- [ ] **Step 5: Escribir el Worker**

`worker/src/index.js`:

```js
import { listarHabitaciones, listarReservas, crearSolicitud } from './airtable.js';
import { transformar } from './transformar.js';

const CLAVE_CACHE = 'disponibilidad';

function cors(env) {
  return {
    'Access-Control-Allow-Origin': env.ORIGEN_PERMITIDO,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function json(cuerpo, env, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json', ...cors(env) }
  });
}

/**
 * Consulta Airtable y guarda el contrato en KV. Lo llaman el cron y, como
 * respaldo, la primera petición que encuentre la caché vacía.
 */
async function sincronizar(env) {
  const [habitaciones, reservas] = await Promise.all([
    listarHabitaciones(env),
    listarReservas(env)
  ]);
  const contrato = transformar(habitaciones, reservas, new Date().toISOString());
  await env.CACHE.put(CLAVE_CACHE, JSON.stringify(contrato));
  return contrato;
}

async function disponibilidad(env) {
  const guardado = await env.CACHE.get(CLAVE_CACHE);
  if (guardado) {
    return new Response(guardado, {
      headers: { 'Content-Type': 'application/json', ...cors(env) }
    });
  }
  // Primera petición tras un despliegue, antes de que corra el cron.
  return json(await sincronizar(env), env);
}

export default {
  async scheduled(evento, env, ctx) {
    ctx.waitUntil(sincronizar(env));
  },

  async fetch(peticion, env) {
    const url = new URL(peticion.url);

    if (peticion.method === 'OPTIONS') {
      return new Response(null, { headers: cors(env) });
    }

    if (url.pathname === '/api/disponibilidad' && peticion.method === 'GET') {
      return disponibilidad(env);
    }

    return json({ error: 'No encontrado' }, env, 404);
  }
};
```

- [ ] **Step 6: Desplegar y verificar**

```bash
npx wrangler deploy
curl -s "https://reservas.flordelbosque.cl/api/disponibilidad" | head -40
```

Expected: JSON con `actualizado` y las habitaciones cargadas en el Task 2, cada una con `precio_noche: null` y `ocupado: []`.

- [ ] **Step 7: Verificar la frontera de privacidad contra el servicio real**

```bash
curl -s "https://reservas.flordelbosque.cl/api/disponibilidad" \
  | grep -iE "huesped|email|telefono|notas" && echo "FUGA DE DATOS" || echo "sin datos personales"
```

Expected: `sin datos personales`. Si imprime `FUGA DE DATOS`, **detenerse** y revisar `transformar.js`.

- [ ] **Step 8: Commit**

```bash
git add .gitignore worker/wrangler.toml worker/src/index.js
git commit -m "Servir la disponibilidad desde el Worker con sincronización cada 10 minutos"
```

---

## Task 10: Envío de correo

Sin dependencias npm: el MIME se arma a mano. Es texto plano con un solo destinatario fijo, así que no justifica traer una librería.

**Files:**
- Create: `worker/src/correo.js`

- [ ] **Step 1: Escribir el módulo**

`worker/src/correo.js`:

```js
import { EmailMessage } from 'cloudflare:email';

/**
 * Codifica en base64 respetando UTF-8. btoa() por sí solo se cae con las
 * tildes y la ñ, que en un correo en español aparecen siempre.
 */
function base64Utf8(texto) {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario);
}

function asuntoCodificado(asunto) {
  return `=?utf-8?B?${base64Utf8(asunto)}?=`;
}

function cuerpoDeLaSolicitud(solicitud) {
  return [
    'Nueva solicitud de reserva desde el sitio web.',
    '',
    `Habitación: ${solicitud.nombreHabitacion}`,
    `Llegada:    ${solicitud.llegada}`,
    `Salida:     ${solicitud.salida}`,
    `Huéspedes:  ${solicitud.huespedes}`,
    '',
    `Nombre:   ${solicitud.nombre}`,
    `Email:    ${solicitud.email}`,
    `Teléfono: ${solicitud.telefono || '(no indicado)'}`,
    '',
    'Comentarios:',
    solicitud.comentarios || '(sin comentarios)',
    '',
    '---',
    'La solicitud quedó registrada en Airtable con estado "Solicitud".',
    'Confirmar o rechazar cambiando ese campo.'
  ].join('\r\n');
}

export async function enviarSolicitud(env, solicitud) {
  const mensaje = [
    `From: Reservas Flor del Bosque <${env.REMITENTE}>`,
    `To: ${env.DESTINATARIO}`,
    `Subject: ${asuntoCodificado(`Solicitud de reserva — ${solicitud.nombre} — ${solicitud.llegada}`)}`,
    `Message-ID: <${crypto.randomUUID()}@flordelbosque.cl>`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Utf8(cuerpoDeLaSolicitud(solicitud))
  ].join('\r\n');

  await env.CORREO.send(new EmailMessage(env.REMITENTE, env.DESTINATARIO, mensaje));
}
```

- [ ] **Step 2: Commit**

```bash
git add worker/src/correo.js
git commit -m "Agregar el envío de correo por el binding de Email Routing"
```

---

## Task 11: Endpoint de solicitud

Tres cosas que este endpoint **no** puede delegar al navegador: validar Turnstile, revalidar la disponibilidad y decidir el estado del registro. Un cliente con datos viejos —o alguien llamando el endpoint a mano— no debe poder tomar una pieza ocupada.

**Files:**
- Modify: `worker/src/index.js`

- [ ] **Step 1: Reescribir el Worker completo**

`worker/src/index.js`:

```js
import { listarHabitaciones, listarReservas, crearSolicitud } from './airtable.js';
import { transformar } from './transformar.js';
import { enviarSolicitud } from './correo.js';
import { estaLibre, rangoValido } from '../../js/reservas-logica.js';

const CLAVE_CACHE = 'disponibilidad';
const CLAVE_MAPA = 'mapa-habitaciones';

function cors(env) {
  return {
    'Access-Control-Allow-Origin': env.ORIGEN_PERMITIDO,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function json(cuerpo, env, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json', ...cors(env) }
  });
}

/**
 * Guarda dos cosas: el contrato público y, aparte, el mapa de id público a
 * record id de Airtable. El mapa nunca se sirve — sólo lo usa el POST para
 * saber a qué registro vincular la solicitud.
 */
async function sincronizar(env) {
  const [habitaciones, reservas] = await Promise.all([
    listarHabitaciones(env),
    listarReservas(env)
  ]);

  const contrato = transformar(habitaciones, reservas, new Date().toISOString());

  const mapa = {};
  for (const registro of habitaciones) {
    if (registro.fields.id) mapa[registro.fields.id] = registro.id;
  }

  await Promise.all([
    env.CACHE.put(CLAVE_CACHE, JSON.stringify(contrato)),
    env.CACHE.put(CLAVE_MAPA, JSON.stringify(mapa))
  ]);

  return contrato;
}

async function contratoVigente(env) {
  const guardado = await env.CACHE.get(CLAVE_CACHE);
  if (guardado) return JSON.parse(guardado);
  return sincronizar(env);
}

async function turnstileValido(env, token, ip) {
  if (!token) return false;
  const cuerpo = new FormData();
  cuerpo.append('secret', env.TURNSTILE_SECRET);
  cuerpo.append('response', token);
  if (ip) cuerpo.append('remoteip', ip);

  const respuesta = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    { method: 'POST', body: cuerpo }
  );
  const datos = await respuesta.json();
  return datos.success === true;
}

function hoyEnSantiago() {
  // en-CA da directamente el formato YYYY-MM-DD.
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
}

async function solicitud(peticion, env) {
  const datos = await peticion.json();

  // Trampa para robots: el campo está oculto por CSS, una persona nunca lo llena.
  if (datos.sitio_web) return json({ ok: true }, env);

  const valido = await turnstileValido(
    env, datos.turnstile, peticion.headers.get('CF-Connecting-IP')
  );
  if (!valido) return json({ error: 'verificacion_fallida' }, env, 403);

  for (const campo of ['habitacion', 'llegada', 'salida', 'nombre', 'email']) {
    if (!datos[campo]) return json({ error: 'faltan_datos', campo }, env, 400);
  }

  if (!rangoValido(datos.llegada, datos.salida, hoyEnSantiago())) {
    return json({ error: 'rango_invalido' }, env, 400);
  }

  const contrato = await contratoVigente(env);
  const habitacion = contrato.habitaciones.find(h => h.id === datos.habitacion);
  if (!habitacion) return json({ error: 'habitacion_desconocida' }, env, 400);

  // Revalidación del lado del servidor: el navegador pudo quedarse con datos
  // de hace rato, o alguien pudo llamar el endpoint directamente.
  if (!estaLibre(habitacion, datos.llegada, datos.salida)) {
    return json({ error: 'ya_no_disponible' }, env, 409);
  }

  const mapa = JSON.parse(await env.CACHE.get(CLAVE_MAPA) || '{}');
  const recordId = mapa[datos.habitacion];

  const paraAirtable = { ...datos, habitacionRecordId: recordId };
  const paraCorreo = { ...datos, nombreHabitacion: habitacion.nombre };

  // Las dos entregas son independientes a propósito: si una falla, la otra
  // igual llega. Se le confirma al huésped si al menos una funcionó.
  const [registro, correo] = await Promise.allSettled([
    recordId ? crearSolicitud(env, paraAirtable) : Promise.reject(new Error('sin record id')),
    enviarSolicitud(env, paraCorreo)
  ]);

  if (registro.status === 'rejected') console.error('Airtable falló:', registro.reason);
  if (correo.status === 'rejected') console.error('Correo falló:', correo.reason);

  if (registro.status === 'rejected' && correo.status === 'rejected') {
    return json({ error: 'no_se_pudo_entregar' }, env, 502);
  }

  // La solicitud recién creada ocupa la pieza, así que la caché quedó vieja.
  if (registro.status === 'fulfilled') await sincronizar(env);

  return json({ ok: true }, env);
}

export default {
  async scheduled(evento, env, ctx) {
    ctx.waitUntil(sincronizar(env));
  },

  async fetch(peticion, env) {
    const url = new URL(peticion.url);

    if (peticion.method === 'OPTIONS') {
      return new Response(null, { headers: cors(env) });
    }

    if (url.pathname === '/api/disponibilidad' && peticion.method === 'GET') {
      const guardado = await env.CACHE.get(CLAVE_CACHE);
      if (guardado) {
        return new Response(guardado, {
          headers: { 'Content-Type': 'application/json', ...cors(env) }
        });
      }
      return json(await sincronizar(env), env);
    }

    if (url.pathname === '/api/solicitud' && peticion.method === 'POST') {
      return solicitud(peticion, env);
    }

    return json({ error: 'No encontrado' }, env, 404);
  }
};
```

- [ ] **Step 2: Desplegar**

```bash
cd worker && npx wrangler deploy
```

Expected: despliegue exitoso, sin errores de importación del módulo compartido `js/reservas-logica.js`.

- [ ] **Step 3: Verificar que rechaza sin Turnstile**

```bash
curl -s -X POST "https://reservas.flordelbosque.cl/api/solicitud" \
  -H "Content-Type: application/json" \
  -d '{"habitacion":"bosque","llegada":"2027-01-10","salida":"2027-01-12","nombre":"Prueba","email":"p@ejemplo.cl"}'
```

Expected: `{"error":"verificacion_fallida"}` con estado 403. **Que rechace es el resultado correcto**: confirma que el endpoint no se puede usar sin pasar por el widget.

- [ ] **Step 4: Verificar que el honeypot traga silenciosamente**

```bash
curl -s -X POST "https://reservas.flordelbosque.cl/api/solicitud" \
  -H "Content-Type: application/json" -d '{"sitio_web":"http://spam.example"}'
```

Expected: `{"ok":true}`. Le responde éxito al robot sin escribir nada, que es justamente el punto.

- [ ] **Step 5: Commit**

```bash
git add worker/src/index.js
git commit -m "Agregar el endpoint de solicitud con Turnstile y revalidación de disponibilidad"
```

---

## Task 12: Días sin cupo para el calendario

El calendario necesita saber qué días no queda ninguna pieza. Un día está sin cupo cuando **todas** las habitaciones están ocupadas esa noche.

**Files:**
- Modify: `js/reservas-logica.js`
- Modify: `tests/reservas-logica.test.js`

- [ ] **Step 1: Escribir los tests que fallan**

Agregar a `tests/reservas-logica.test.js`:

```js
import { diasDelRango, diasSinCupo } from '../js/reservas-logica.js';

test('el rango incluye la llegada y excluye la salida', () => {
  assert.deepEqual(diasDelRango('2026-09-12', '2026-09-15'),
    ['2026-09-12', '2026-09-13', '2026-09-14']);
});

test('el rango cruza el fin de mes', () => {
  assert.deepEqual(diasDelRango('2026-09-29', '2026-10-02'),
    ['2026-09-29', '2026-09-30', '2026-10-01']);
});

test('el rango cruza un año bisiesto', () => {
  assert.deepEqual(diasDelRango('2028-02-28', '2028-03-01'),
    ['2028-02-28', '2028-02-29']);
});

test('un día queda sin cupo sólo si todas las piezas están ocupadas', () => {
  const catalogo = [
    { id: 'a', ocupado: [['2026-09-12', '2026-09-14']] },
    { id: 'b', ocupado: [['2026-09-13', '2026-09-15']] }
  ];
  // El 12 sólo cae 'a'; el 13 caen ambas; el 14 sólo cae 'b'.
  assert.deepEqual([...diasSinCupo(catalogo)].sort(), ['2026-09-13']);
});

test('sin ocupación no hay días sin cupo', () => {
  assert.equal(diasSinCupo([{ id: 'a', ocupado: [] }]).size, 0);
});

test('un catálogo vacío no marca días', () => {
  assert.equal(diasSinCupo([]).size, 0);
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm test`

Expected: falla porque `diasDelRango` y `diasSinCupo` no existen.

- [ ] **Step 3: Implementar**

Agregar a `js/reservas-logica.js`:

```js
function aTexto(utc) {
  return new Date(utc).toISOString().slice(0, 10);
}

/** Los días que una estadía ocupa: incluye la llegada, excluye la salida. */
export function diasDelRango(llegada, salida) {
  const dias = [];
  for (let dia = aUTC(llegada); dia < aUTC(salida); dia += MS_POR_DIA) {
    dias.push(aTexto(dia));
  }
  return dias;
}

/**
 * Un día se marca sin cupo sólo cuando no queda ninguna pieza libre. Marcarlo
 * porque una sola esté ocupada escondería disponibilidad real.
 */
export function diasSinCupo(habitaciones) {
  if (habitaciones.length === 0) return new Set();

  const ocupacionPorDia = new Map();
  for (const habitacion of habitaciones) {
    for (const [ini, fin] of habitacion.ocupado || []) {
      for (const dia of diasDelRango(ini, fin)) {
        ocupacionPorDia.set(dia, (ocupacionPorDia.get(dia) || 0) + 1);
      }
    }
  }

  const sinCupo = new Set();
  for (const [dia, cuantas] of ocupacionPorDia) {
    if (cuantas >= habitaciones.length) sinCupo.add(dia);
  }
  return sinCupo;
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm test`

Expected: los 44 tests pasan.

- [ ] **Step 5: Commit**

```bash
git add js/reservas-logica.js tests/reservas-logica.test.js
git commit -m "Calcular los días sin cupo del calendario"
```

---

## Task 13: La página de reservas

**Files:**
- Create: `pages/reservas.html`
- Modify: `js/main.js`

- [ ] **Step 1: Crear la página**

Copiar `pages/contacto.html` como base para heredar el header, la navegación, el footer y el botón flotante de WhatsApp exactamente como están:

```bash
cp pages/contacto.html pages/reservas.html
```

Reemplazar todo lo que va entre `<main>` y `</main>` por:

```html
  <main>
    <section class="page-header">
      <div class="container">
        <h1 class="page-header__title" data-i18n="reservas.titulo">Reservar</h1>
        <p class="page-header__subtitle" data-i18n="reservas.bajada">Elige tus fechas y te mostramos qué habitaciones están libres.</p>
      </div>
    </section>

    <section class="section">
      <div class="container">

        <!-- Aviso de degradación: sólo aparece si algo falla -->
        <p class="reservas__aviso" id="reservas-aviso" hidden></p>

        <form class="reservas__fechas" id="reservas-fechas">
          <div class="booking-widget__field">
            <label class="booking-widget__label" for="llegada" data-i18n="booking.checkin">Llegada</label>
            <input type="date" id="llegada" class="booking-widget__input" required>
          </div>
          <div class="booking-widget__field">
            <label class="booking-widget__label" for="salida" data-i18n="booking.checkout">Salida</label>
            <input type="date" id="salida" class="booking-widget__input" required>
          </div>
          <div class="booking-widget__field">
            <label class="booking-widget__label" for="huespedes" data-i18n="booking.guests">Huéspedes</label>
            <select id="huespedes" class="booking-widget__input">
              <option value="1">1</option>
              <option value="2" selected>2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary" data-i18n="reservas.buscar">Ver disponibilidad</button>
        </form>

        <div class="reservas__calendario" id="reservas-calendario"></div>

        <p class="reservas__error" id="reservas-error" hidden></p>

        <div class="reservas__resultados" id="reservas-resultados"></div>

        <!-- Formulario de contacto: se muestra al elegir una habitación -->
        <form class="reservas__form" id="reservas-form" hidden>
          <h2 data-i18n="reservas.tusDatos">Tus datos</h2>
          <p class="reservas__resumen" id="reservas-resumen"></p>

          <label for="nombre" data-i18n="reservas.nombre">Nombre</label>
          <input type="text" id="nombre" required>

          <label for="email" data-i18n="reservas.email">Email</label>
          <input type="email" id="email" required>

          <label for="telefono" data-i18n="reservas.telefono">Teléfono</label>
          <input type="tel" id="telefono">

          <label for="comentarios" data-i18n="reservas.comentarios">Comentarios</label>
          <textarea id="comentarios" rows="4"></textarea>

          <!-- Honeypot: oculto por CSS, una persona nunca lo llena -->
          <div class="reservas__trampa" aria-hidden="true">
            <label for="sitio_web">No llenar</label>
            <input type="text" id="sitio_web" tabindex="-1" autocomplete="off">
          </div>

          <div class="cf-turnstile" data-sitekey="REEMPLAZAR_CON_LA_SITE_KEY"></div>

          <p class="reservas__nota" data-i18n="reservas.nota">
            Esto es una solicitud, no una reserva confirmada. Te respondemos para
            confirmar disponibilidad y tarifa.
          </p>

          <button type="submit" class="btn btn-primary" data-i18n="reservas.enviar">Enviar solicitud</button>
        </form>

        <div class="reservas__exito" id="reservas-exito" hidden></div>

      </div>
    </section>
  </main>
```

Reemplazar `REEMPLAZAR_CON_LA_SITE_KEY` por la Site Key del Task 2 Step 6.

En el `<head>`, cambiar el `<title>` y la descripción a "Reservar | Flor del Bosque", y actualizar las etiquetas Open Graph con `og:url` apuntando a `https://flordelbosque.cl/pages/reservas.html`.

Antes de `</body>`, agregar Turnstile y el módulo de la página:

```html
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
  <script type="module" src="../js/reservas-ui.js?v=20260830"></script>
```

- [ ] **Step 2: Agregar las claves i18n**

En `js/main.js`, dentro del diccionario `es`, agregar junto a las claves `booking.*`:

```js
      'reservas.titulo': 'Reservar',
      'reservas.bajada': 'Elige tus fechas y te mostramos qué habitaciones están libres.',
      'reservas.buscar': 'Ver disponibilidad',
      'reservas.tusDatos': 'Tus datos',
      'reservas.nombre': 'Nombre',
      'reservas.email': 'Email',
      'reservas.telefono': 'Teléfono',
      'reservas.comentarios': 'Comentarios',
      'reservas.enviar': 'Enviar solicitud',
      'reservas.nota': 'Esto es una solicitud, no una reserva confirmada. Te respondemos para confirmar disponibilidad y tarifa.',
```

Y en el diccionario `en`:

```js
      'reservas.titulo': 'Book',
      'reservas.bajada': 'Pick your dates and we will show you which rooms are free.',
      'reservas.buscar': 'Check availability',
      'reservas.tusDatos': 'Your details',
      'reservas.nombre': 'Name',
      'reservas.email': 'Email',
      'reservas.telefono': 'Phone',
      'reservas.comentarios': 'Comments',
      'reservas.enviar': 'Send request',
      'reservas.nota': 'This is a request, not a confirmed booking. We will reply to confirm availability and rates.',
```

- [ ] **Step 3: Verificar que la página carga**

```bash
python3 -m http.server 8000 &
open "http://localhost:8000/pages/reservas.html"
```

Expected: la página se ve con el header, el formulario de fechas y el footer del sitio. Los resultados están vacíos porque `reservas-ui.js` todavía no existe: la consola mostrará un 404 por ese archivo, y es lo esperado en este paso.

- [ ] **Step 4: Commit**

```bash
git add pages/reservas.html js/main.js
git commit -m "Agregar la página de reservas con sus textos en ES y EN"
```

---

## Task 14: El módulo de interfaz

**Files:**
- Create: `js/reservas-ui.js`

- [ ] **Step 1: Escribir el módulo**

`js/reservas-ui.js`:

```js
/**
 * Interfaz de la página de reservas. Toda la lógica de fechas y filtros vive en
 * reservas-logica.js, que está cubierta por tests; acá sólo hay DOM y red.
 */
import {
  disponibles, noches, total, formatearPrecio, rangoValido, diasSinCupo
} from './reservas-logica.js?v=20260830';

const API = 'https://reservas.flordelbosque.cl';
const WHATSAPP = '56985488233';
const MINUTOS_TOLERADOS = 30;

const TEXTOS = {
  es: {
    sinConexion: 'No pudimos cargar la disponibilidad en línea. Puedes enviarnos igual tu solicitud y te confirmamos por correo.',
    datosViejos: 'La disponibilidad puede no estar al día. La confirmamos al responderte.',
    sinResultados: 'No hay habitaciones libres para esas fechas. Prueba con otras.',
    rangoInvalido: 'Revisa las fechas: la salida debe ser posterior a la llegada y no puede ser una fecha pasada.',
    noches: n => n === 1 ? '1 noche' : `${n} noches`,
    porNoche: 'por noche',
    elegir: 'Elegir',
    exito: 'Recibimos tu solicitud. Te respondemos a la brevedad para confirmar disponibilidad y tarifa.',
    yaNoDisponible: 'Esa habitación se ocupó recién. Vuelve a buscar, por favor.',
    errorEnvio: 'No pudimos enviar la solicitud. Escríbenos a hola@flordelbosque.cl o por WhatsApp.',
    seguirWhatsapp: 'Seguir por WhatsApp',
    resumen: (h, ll, s, n) => `${h} · ${ll} a ${s} · ${n}`
  },
  en: {
    sinConexion: 'We could not load live availability. Send your request anyway and we will confirm by email.',
    datosViejos: 'Availability may not be up to date. We will confirm when we reply.',
    sinResultados: 'No rooms available for those dates. Try different ones.',
    rangoInvalido: 'Check the dates: check-out must be after check-in and cannot be in the past.',
    noches: n => n === 1 ? '1 night' : `${n} nights`,
    porNoche: 'per night',
    elegir: 'Choose',
    exito: 'We received your request. We will reply shortly to confirm availability and rates.',
    yaNoDisponible: 'That room was just taken. Please search again.',
    errorEnvio: 'We could not send the request. Email hola@flordelbosque.cl or reach us on WhatsApp.',
    seguirWhatsapp: 'Continue on WhatsApp',
    resumen: (h, ll, s, n) => `${h} · ${ll} to ${s} · ${n}`
  }
};

const el = id => document.getElementById(id);
const idioma = () => (document.documentElement.lang === 'en' ? 'en' : 'es');
const t = () => TEXTOS[idioma()];

let contrato = null;
let elegida = null;

function hoy() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
}

// ── Carga ────────────────────────────────────────────────

async function cargar() {
  try {
    const respuesta = await fetch(`${API}/api/disponibilidad`);
    if (!respuesta.ok) throw new Error(respuesta.status);
    contrato = await respuesta.json();
  } catch (error) {
    // Modo consulta: nunca mostrar todo libre ni bloquear todo.
    console.warn('Sin disponibilidad en línea:', error);
    contrato = null;
    avisar(t().sinConexion);
    return;
  }

  const antiguedad = (Date.now() - new Date(contrato.actualizado)) / 60000;
  if (antiguedad > MINUTOS_TOLERADOS) avisar(t().datosViejos);

  dibujarCalendario();
}

function avisar(mensaje) {
  const aviso = el('reservas-aviso');
  aviso.textContent = mensaje;
  aviso.hidden = false;
}

function mostrarError(mensaje) {
  const error = el('reservas-error');
  error.textContent = mensaje;
  error.hidden = !mensaje;
}

// ── Calendario ───────────────────────────────────────────

function dibujarCalendario() {
  if (!contrato) return;

  const sinCupo = diasSinCupo(contrato.habitaciones);
  const contenedor = el('reservas-calendario');
  contenedor.innerHTML = '';

  const inicio = new Date();
  for (let salto = 0; salto < 2; salto++) {
    contenedor.appendChild(dibujarMes(inicio.getFullYear(), inicio.getMonth() + salto, sinCupo));
  }
}

function dibujarMes(anio, mes, sinCupo) {
  const primero = new Date(anio, mes, 1);
  const tabla = document.createElement('table');
  tabla.className = 'calendario';

  const titulo = primero.toLocaleDateString(idioma() === 'en' ? 'en-GB' : 'es-CL',
    { month: 'long', year: 'numeric' });
  tabla.innerHTML = `<caption>${titulo}</caption>`;

  const cuerpo = document.createElement('tbody');
  let fila = document.createElement('tr');

  // getDay() da 0 para domingo; la semana chilena parte en lunes.
  const relleno = (primero.getDay() + 6) % 7;
  for (let i = 0; i < relleno; i++) fila.appendChild(document.createElement('td'));

  const ultimoDia = new Date(anio, mes + 1, 0).getDate();
  for (let dia = 1; dia <= ultimoDia; dia++) {
    const fecha = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const celda = document.createElement('td');
    celda.textContent = dia;
    celda.className = 'calendario__dia';

    if (fecha < hoy()) celda.classList.add('calendario__dia--pasado');
    else if (sinCupo.has(fecha)) celda.classList.add('calendario__dia--ocupado');
    else {
      celda.classList.add('calendario__dia--libre');
      celda.tabIndex = 0;
      celda.addEventListener('click', () => elegirDia(fecha));
      celda.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegirDia(fecha); }
      });
    }

    fila.appendChild(celda);
    if (fila.children.length === 7) { cuerpo.appendChild(fila); fila = document.createElement('tr'); }
  }
  if (fila.children.length) cuerpo.appendChild(fila);

  tabla.appendChild(cuerpo);
  return tabla;
}

/** El primer clic fija la llegada; el segundo, la salida. */
function elegirDia(fecha) {
  const llegada = el('llegada');
  const salida = el('salida');

  if (!llegada.value || salida.value || fecha <= llegada.value) {
    llegada.value = fecha;
    salida.value = '';
  } else {
    salida.value = fecha;
    buscar();
  }
}

// ── Resultados ───────────────────────────────────────────

function buscar() {
  const llegada = el('llegada').value;
  const salida = el('salida').value;
  const huespedes = Number(el('huespedes').value);

  el('reservas-form').hidden = true;
  el('reservas-exito').hidden = true;

  if (!rangoValido(llegada, salida, hoy())) {
    el('reservas-resultados').innerHTML = '';
    mostrarError(t().rangoInvalido);
    return;
  }
  mostrarError('');

  // Modo consulta: sin datos no se puede filtrar, así que se pide contacto directo.
  if (!contrato) {
    elegida = null;
    el('reservas-resultados').innerHTML = '';
    abrirFormulario(null, llegada, salida);
    return;
  }

  const libres = disponibles(contrato.habitaciones, llegada, salida, huespedes);
  dibujarResultados(libres, llegada, salida);
}

function dibujarResultados(libres, llegada, salida) {
  const contenedor = el('reservas-resultados');
  contenedor.innerHTML = '';

  if (libres.length === 0) {
    contenedor.innerHTML = `<p class="reservas__vacio">${t().sinResultados}</p>`;
    return;
  }

  const cantidadNoches = noches(llegada, salida);

  for (const habitacion of libres) {
    const totalEstadia = total(habitacion, cantidadNoches);
    const tarjeta = document.createElement('article');
    tarjeta.className = 'card-room';

    const imagen = habitacion.imagen
      ? `<div class="card-room__image"><img src="../${habitacion.imagen}" alt="${habitacion.nombre}"></div>`
      : '';

    tarjeta.innerHTML = `
      ${imagen}
      <div class="card-room__content">
        <span class="card-room__category">${habitacion.categoria || ''}</span>
        <h3 class="card-room__title">${habitacion.nombre}</h3>
        <p class="card-room__description">${habitacion.descripcion[idioma()] || ''}</p>
        <ul class="card-room__features">
          ${(habitacion.caracteristicas[idioma()] || []).map(c => `<li>${c}</li>`).join('')}
        </ul>
        <div class="card-room__footer">
          <div class="card-room__price">
            ${formatearPrecio(totalEstadia, idioma())}
            <span>${totalEstadia === null ? '' : t().noches(cantidadNoches)}</span>
          </div>
          <button class="btn btn-sm btn-primary">${t().elegir}</button>
        </div>
      </div>`;

    tarjeta.querySelector('button')
      .addEventListener('click', () => abrirFormulario(habitacion, llegada, salida));
    contenedor.appendChild(tarjeta);
  }
}

// ── Envío ────────────────────────────────────────────────

function abrirFormulario(habitacion, llegada, salida) {
  elegida = habitacion;
  const formulario = el('reservas-form');
  formulario.hidden = false;

  el('reservas-resumen').textContent = habitacion
    ? t().resumen(habitacion.nombre, llegada, salida, t().noches(noches(llegada, salida)))
    : `${llegada} — ${salida}`;

  formulario.scrollIntoView({ behavior: 'smooth' });
}

function mensajeWhatsApp() {
  const partes = ['Hola! Envié una solicitud de reserva desde el sitio.'];
  if (elegida) partes.push(`Habitación: ${elegida.nombre}`);
  partes.push(`Llegada: ${el('llegada').value}`);
  partes.push(`Salida: ${el('salida').value}`);
  partes.push(`Nombre: ${el('nombre').value}`);
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(partes.join('\n'))}`;
}

function mostrarExito(mensaje) {
  const exito = el('reservas-exito');
  exito.innerHTML = `
    <p>${mensaje}</p>
    <a class="btn btn-outline" href="${mensajeWhatsApp()}" target="_blank" rel="noopener">
      ${t().seguirWhatsapp}
    </a>`;
  exito.hidden = false;
  el('reservas-form').hidden = true;
  exito.scrollIntoView({ behavior: 'smooth' });
}

async function enviar(evento) {
  evento.preventDefault();

  const token = document.querySelector('[name="cf-turnstile-response"]');
  const cuerpo = {
    habitacion: elegida ? elegida.id : null,
    llegada: el('llegada').value,
    salida: el('salida').value,
    huespedes: el('huespedes').value,
    nombre: el('nombre').value,
    email: el('email').value,
    telefono: el('telefono').value,
    comentarios: el('comentarios').value,
    sitio_web: el('sitio_web').value,
    turnstile: token ? token.value : ''
  };

  try {
    const respuesta = await fetch(`${API}/api/solicitud`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo)
    });

    if (respuesta.status === 409) {
      mostrarError(t().yaNoDisponible);
      await cargar();
      return;
    }
    if (!respuesta.ok) throw new Error(respuesta.status);

    mostrarExito(t().exito);
  } catch (error) {
    console.error('Envío fallido:', error);
    mostrarExito(t().errorEnvio);
  }
}

// ── Arranque ─────────────────────────────────────────────

function aplicarQuerystring() {
  const parametros = new URLSearchParams(location.search);
  for (const [clave, campo] of [['llegada', 'llegada'], ['salida', 'salida'], ['huespedes', 'huespedes']]) {
    const valor = parametros.get(clave);
    if (valor) el(campo).value = valor;
  }
  return parametros.has('llegada') && parametros.has('salida');
}

el('reservas-fechas').addEventListener('submit', e => { e.preventDefault(); buscar(); });
el('reservas-form').addEventListener('submit', enviar);

cargar().then(() => {
  if (aplicarQuerystring()) buscar();
});
```

- [ ] **Step 2: Verificar el flujo en el navegador**

```bash
python3 -m http.server 8000 &
open "http://localhost:8000/pages/reservas.html"
```

Expected: se dibujan dos meses de calendario; los días pasados aparecen apagados. Al elegir dos días aparecen las habitaciones que alcanzan para el número de huéspedes, con "Consultar" como precio y **sin** número de noches al lado, porque no hay tarifas.

- [ ] **Step 3: Commit**

```bash
git add js/reservas-ui.js
git commit -m "Agregar el calendario, los resultados y el envío de la solicitud"
```

---

## Task 15: Estilos de la página

**Files:**
- Modify: `css/components.css`

- [ ] **Step 1: Agregar los estilos**

Agregar al final de `css/components.css`, usando sólo tokens ya existentes para no romper el arnés de marca:

```css
/* ─── Reservas ─────────────────────────────────────── */

.reservas__fechas {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  align-items: flex-end;
  margin-bottom: var(--space-8);
}

.reservas__aviso,
.reservas__error {
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-sand);
  color: var(--color-deep);
  margin-bottom: var(--space-6);
}

.reservas__calendario {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-8);
  margin-bottom: var(--space-8);
}

.calendario { border-collapse: collapse; }
.calendario caption {
  text-transform: capitalize;
  font-weight: 600;
  padding-bottom: var(--space-2);
}
.calendario__dia {
  width: 2.5rem;
  height: 2.5rem;
  text-align: center;
  border-radius: var(--radius-sm);
}
.calendario__dia--libre { cursor: pointer; }
.calendario__dia--libre:hover,
.calendario__dia--libre:focus { background: var(--color-sage); }
.calendario__dia--ocupado {
  opacity: 0.35;
  text-decoration: line-through;
}
.calendario__dia--pasado { opacity: 0.25; }

.reservas__resultados {
  display: grid;
  gap: var(--space-6);
  margin-bottom: var(--space-8);
}

.reservas__form { display: grid; gap: var(--space-3); max-width: 40rem; }
.reservas__nota { font-size: var(--text-sm); }

/* El honeypot no puede usar display:none: algunos robots lo detectan. */
.reservas__trampa {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
```

- [ ] **Step 2: Verificar contra el arnés de marca**

Run: `bash tools/verificar-marca.sh`

Expected: pasa. Si reclama por un token inexistente, reemplazarlo por el token equivalente que sí exista en `css/tokens.css` — **no** agregar colores literales.

- [ ] **Step 3: Actualizar el `?v=` de los estilos**

Cambiar `css/main.css?v=20260808` por `css/main.css?v=20260830` en los 11 HTML:

```bash
grep -rl "main.css?v=" --include="*.html" . | xargs sed -i '' 's/main\.css?v=[0-9]*/main.css?v=20260830/g'
grep -rc "main.css?v=20260830" index.html pages/reservas.html
```

Expected: `1` en ambos.

- [ ] **Step 4: Commit**

```bash
git add css/components.css index.html pages/
git commit -m "Estilar el calendario y el formulario de reservas"
```

---

## Task 16: Redirigir los botones de reserva

**Files:**
- Modify: `js/main.js:376-392`
- Modify: `index.html`, `pages/alojamiento.html`, `pages/agenda.html`, `pages/experiencias.html`, `pages/contacto.html`, `pages/nosotros.html`

- [ ] **Step 1: Cambiar el comportamiento del widget del hero**

En `js/main.js`, reemplazar el bloque completo del botón de búsqueda —desde el comentario `// El widget de fechas no tenia ningun comportamiento` hasta el cierre del `if (botonBuscar) { ... }`— por:

```js
  // Antes esto abría WhatsApp con las fechas, que era lo mejor posible cuando no
  // existía dónde consultar disponibilidad. Ahora esa página existe y las fechas
  // viajan hacia ella. No es una regresión: es el destino que le faltaba.
  const botonBuscar = document.getElementById('buscar-disponibilidad');

  if (botonBuscar) {
    botonBuscar.addEventListener('click', function() {
      const llegada = document.getElementById('checkin');
      const salida = document.getElementById('checkout');
      const huespedes = document.getElementById('guests');

      const parametros = new URLSearchParams();
      if (llegada && llegada.value) parametros.set('llegada', llegada.value);
      if (salida && salida.value) parametros.set('salida', salida.value);
      if (huespedes && huespedes.value) parametros.set('huespedes', huespedes.value);

      // El widget sólo existe en la portada, así que la ruta es relativa a la raíz.
      const consulta = parametros.toString();
      window.location.href = 'pages/reservas.html' + (consulta ? '?' + consulta : '');
    });
  }
```

`enlaceWhatsApp` y `textoDelFormulario` **se conservan**: los siguen usando los formularios de contacto y matrimonios.

- [ ] **Step 2: Redirigir los botones "Reservar"**

Los botones de la portada usan rutas relativas distintas a los de `pages/`. Se hacen en dos pasadas:

```bash
sed -i '' 's|href="pages/contacto.html" class="btn btn-primary btn-sm header__cta"|href="pages/reservas.html" class="btn btn-primary btn-sm header__cta"|g; s|href="pages/contacto.html" class="btn btn-primary btn-full"|href="pages/reservas.html" class="btn btn-primary btn-full"|g' index.html

sed -i '' 's|href="contacto.html" class="btn btn-primary btn-sm header__cta"|href="reservas.html" class="btn btn-primary btn-sm header__cta"|g; s|href="contacto.html" class="btn btn-primary btn-full"|href="reservas.html" class="btn btn-primary btn-full"|g; s|href="contacto.html" class="btn btn-sm btn-primary"|href="reservas.html" class="btn btn-sm btn-primary"|g' pages/*.html
```

- [ ] **Step 3: Verificar el resultado**

```bash
grep -rc 'reservas.html' index.html pages/alojamiento.html
grep -rn 'href="[^"]*contacto.html"' index.html pages/*.html | grep -c "btn-primary"
```

Expected: la primera cuenta es mayor que 0 en ambos archivos. La segunda debe dar `0`: ningún botón primario debe seguir apuntando a contacto.

Los enlaces a `contacto.html` que **no** son botones de reserva —el del menú, el del pie de página, el de "Consultar disponibilidad" del coliving— se conservan intactos.

- [ ] **Step 4: Verificar en el navegador**

Abrir `http://localhost:8000/` y apretar "Buscar" en el widget con fechas puestas.

Expected: navega a `pages/reservas.html?llegada=…&salida=…&huespedes=2` y la página abre con esas fechas ya cargadas y los resultados desplegados.

- [ ] **Step 5: Commit**

```bash
git add js/main.js index.html pages/
git commit -m "Llevar los botones de reserva y el widget a la página de reservas"
```

---

## Task 17: Precios en vivo en alojamiento

Implementa el spec §5. Las fichas se quedan en el HTML y funcionan sin JS; si el Worker responde, se actualizan.

**Files:**
- Create: `js/alojamiento-datos.js`
- Modify: `pages/alojamiento.html`

- [ ] **Step 1: Escribir el módulo**

Los `id` de los `<article>` en `pages/alojamiento.html` —`vista-volcan`, `bosque`, `familiar`, `rio`— coinciden con los `id` cargados en Airtable, así que el emparejamiento es directo.

`js/alojamiento-datos.js`:

```js
/**
 * Mejora progresiva de las fichas de alojamiento.
 *
 * El HTML ya trae las habitaciones y sirve tal cual sin JS. Esto sólo refresca
 * el precio cuando el Worker responde, para que la tarifa no se bifurque entre
 * esta página y la de reservas. Si algo falla, no toca nada: una página de
 * marketing no puede quedar en blanco por un servicio externo caído.
 */
import { formatearPrecio } from './reservas-logica.js?v=20260830';

const API = 'https://reservas.flordelbosque.cl';

async function actualizar() {
  let contrato;
  try {
    const respuesta = await fetch(`${API}/api/disponibilidad`);
    if (!respuesta.ok) return;
    contrato = await respuesta.json();
  } catch (error) {
    console.warn('Precios en vivo no disponibles:', error);
    return;
  }

  const idioma = document.documentElement.lang === 'en' ? 'en' : 'es';

  for (const habitacion of contrato.habitaciones) {
    const ficha = document.getElementById(habitacion.id);
    if (!ficha) continue;

    const precio = ficha.querySelector('.card-room__price');
    if (!precio) continue;

    const texto = formatearPrecio(habitacion.precio_noche, idioma);
    precio.textContent = habitacion.precio_noche === null
      ? texto
      : `${texto} / ${idioma === 'en' ? 'night' : 'noche'}`;
  }
}

actualizar();
```

- [ ] **Step 2: Enlazarlo**

En `pages/alojamiento.html`, antes de `</body>`:

```html
  <script type="module" src="../js/alojamiento-datos.js?v=20260830"></script>
```

- [ ] **Step 3: Verificar los dos caminos**

Con el Worker respondiendo, abrir `http://localhost:8000/pages/alojamiento.html`.

Expected: todas las fichas siguen mostrando "Consultar", porque no hay tarifas cargadas. **Que no cambie nada visible es el resultado correcto.**

Para comprobar que el mecanismo funciona, cargar `precio_noche = 85000` en la fila `vista-volcan` de Airtable, esperar 10 minutos o forzar el cron con `npx wrangler triggers` y recargar.

Expected: esa ficha pasa a "$85.000 / noche" y las demás siguen en "Consultar". Ése es el estado mixto del spec §6. Dejar el campo vacío otra vez al terminar.

Para el camino de falla, cortar la red del navegador y recargar.

Expected: las fichas se ven exactamente igual, con su "Consultar" del HTML.

- [ ] **Step 4: Commit**

```bash
git add js/alojamiento-datos.js pages/alojamiento.html
git commit -m "Refrescar los precios de alojamiento sin que la página dependa del Worker"
```

---

## Task 18: Publicar las tres habitaciones faltantes

`pages/alojamiento.html` publica 4 de las 7 habitaciones. Esta tarea completa la página para que coincida con las estadísticas de la portada y con Airtable.

**Bloqueada** hasta tener los datos del Task 2 Step 2. No impide ninguna otra tarea.

**Files:**
- Modify: `pages/alojamiento.html`

- [ ] **Step 1: Confirmar que las fotos existen**

```bash
ls images/habitaciones/
```

Expected: una imagen por cada habitación nueva. Si falta alguna, **detenerse y pedirla** — no reutilizar la foto de otra pieza ni dejar la ficha sin imagen.

- [ ] **Step 2: Agregar las fichas**

Por cada habitación nueva, insertar dentro del mismo `<div class="grid">` que contiene las cuatro existentes, después de la ficha `rio`, copiando su estructura exacta:

```html
          <!-- Room: NOMBRE -->
          <article class="card-room scroll-reveal" id="ID_DE_AIRTABLE">
            <div class="card-room__image">
              <img src="../images/habitaciones/ARCHIVO.jpg" alt="NOMBRE">
            </div>
            <div class="card-room__content">
              <span class="card-room__category">CATEGORIA</span>
              <h2 class="card-room__title">NOMBRE</h2>
              <p class="card-room__description">
                DESCRIPCION
              </p>
              <ul style="font-size: var(--text-sm); color: var(--text-secondary); margin: var(--space-4) 0;">
                <li>N huéspedes | M m2</li>
                <li>CARACTERISTICA</li>
              </ul>
              <div class="card-room__footer">
                <div class="card-room__price">Consultar</div>
                <a href="reservas.html" class="btn btn-sm btn-primary">Reservar</a>
              </div>
            </div>
          </article>
```

El `id` del `<article>` **debe ser idéntico** al campo `id` de Airtable: de eso depende que `js/alojamiento-datos.js` empareje la ficha con sus datos.

El precio va como `Consultar`, igual que las otras: las tarifas siguen sin definirse.

- [ ] **Step 3: Verificar**

```bash
grep -c 'article class="card-room' pages/alojamiento.html
grep -c 'card-room__price">Consultar' pages/alojamiento.html
bash tools/verificar-marca.sh
```

Expected: `7`, `7`, y el arnés de marca pasa.

- [ ] **Step 4: Verificar el emparejamiento con Airtable**

Abrir `http://localhost:8000/pages/alojamiento.html` con la consola del navegador abierta.

Expected: ningún error, y las 7 fichas visibles. Para probar el emparejamiento, cargar un `precio_noche` en Airtable a una de las tres nuevas, forzar el cron y recargar: esa ficha debe cambiar. Dejar el campo vacío al terminar.

- [ ] **Step 5: Commit**

```bash
git add pages/alojamiento.html
git commit -m "Publicar las tres habitaciones que faltaban en alojamiento"
```

---

## Task 19: Verificación de punta a punta

Los tests cubren la lógica; esto cubre que las piezas conversen entre sí. Ninguno de estos pasos se puede automatizar sin montar más andamio del que la verificación justifica.

**Files:** ninguno.

- [ ] **Step 1: Correr toda la batería de tests**

Run: `npm test`

Expected: los 44 tests pasan, sin ninguno saltado.

- [ ] **Step 2: Enviar una solicitud real**

En `pages/reservas.html`, elegir fechas libres, una habitación, completar los datos con un correo propio y enviar.

Expected, las cuatro cosas:
1. Aparece el mensaje de éxito con el botón de WhatsApp.
2. En Airtable aparece una fila nueva en `Reservas`, con estado `Solicitud` y origen `Sitio web`, vinculada a la habitación correcta.
3. Llega el correo a `hola@flordelbosque.cl` con las fechas y los datos.
4. **El correo no cae en spam.** Si cae, es el riesgo de entregabilidad del spec: revisar SPF y agregar DMARC al dominio.

- [ ] **Step 3: Verificar que la solicitud bloquea la pieza**

Recargar `pages/reservas.html` y buscar las mismas fechas.

Expected: esa habitación ya no aparece entre las disponibles. Confirma que `Solicitud` ocupa, según el spec §1.

- [ ] **Step 4: Verificar la revalidación del servidor**

Con la página aún abierta y mostrando la habitación como libre (antes de recargar), enviar una segunda solicitud para la misma pieza y fechas.

Expected: mensaje de "esa habitación se ocupó recién" y **ninguna fila nueva en Airtable**. Esto prueba que el servidor no confía en el navegador.

- [ ] **Step 5: Verificar el modo consulta**

En las herramientas del navegador, bloquear `reservas.flordelbosque.cl` y recargar la página.

Expected: aparece el aviso de que no se pudo cargar la disponibilidad, no hay calendario, y el formulario **sigue enviable**. No debe mostrarse ninguna habitación como disponible ni bloquearse todo.

- [ ] **Step 6: Verificar el aviso de datos viejos**

```bash
cd worker
npx wrangler kv key get --binding=CACHE disponibilidad --remote > /tmp/cache.json
python3 -c "
import json
d = json.load(open('/tmp/cache.json'))
d['actualizado'] = '2020-01-01T00:00:00.000Z'
json.dump(d, open('/tmp/viejo.json','w'))
"
npx wrangler kv key put --binding=CACHE disponibilidad --path=/tmp/viejo.json --remote
```

Recargar la página.

Expected: aparece el aviso de que la disponibilidad puede no estar al día. Restaurar con `npx wrangler triggers` o esperar al próximo cron.

- [ ] **Step 7: Verificar el sitio completo**

```bash
bash tools/verificar-marca.sh
npm test
```

Expected: ambos pasan.

- [ ] **Step 8: Limpiar los datos de prueba**

Borrar en Airtable las filas de prueba creadas durante esta verificación, y forzar una sincronización:

```bash
cd worker && npx wrangler triggers
```

- [ ] **Step 9: Commit final**

```bash
git add -A
git commit -m "Cerrar la verificación del sistema de reservas"
```
