# Correcciones de la propietaria — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar las siete correcciones que la propietaria entregó sobre cinco páginas del sitio, incluidas las tarifas de estadía larga y la casa completa, que son producto nuevo.

**Architecture:** Son ediciones de contenido en HTML más los textos en los dos diccionarios de `js/main.js`. Dos toques de código: el piso de cada habitación se muestra junto a la capacidad —en la ficha escrita a mano y en la fila que genera `js/reservas-ui.js`—, y `pages/agenda.html` cambia de rejilla de tarjetas con horario y botón a una lista de posibilidades.

**Tech Stack:** HTML estático, ES modules, tests con `node:test`.

**Spec:** `docs/superpowers/specs/2026-09-12-correcciones-de-la-propietaria-design.md`
**Origen:** `web correcciones.docx`, entregado el 2026-09-12.

---

## Contexto que el implementador necesita

**El sitio está en producción.** GitHub Pages sirve desde `main`; mergear publica.

**El piso ya está en el catálogo.** Cada habitación de `docs/habitaciones-airtable.csv` declara «Primer piso» o «Segundo piso» como **última** línea de `caracteristicas_es`. La ficha muestra sólo las cuatro primeras y la fila del listado también, así que hoy nunca se ve. No hay que agregar el dato: hay que dejar de cortarlo.

**Los precios del sitio están en «Consultar» desde agosto** por una decisión de negocio, y hay una herramienta que se usó para retirarlos (`tools/quitar-precios.py`). Esta tanda publica precios **sólo en coliving**, porque ahí sí están definidos. El resto del sitio no se toca.

**Premium ya dice «Todas las habitaciones (7)».** Sólo le falta la cocina. Es Clásico el que dice «4 habitaciones para familia» y hay que cambiarlo.

**Cada texto visible va en dos diccionarios.** Si un texto nuevo lleva `data-i18n`, tiene que existir en el bloque español y en el inglés de `js/main.js`, o el test `toda clave data-i18n usada existe en español y en inglés` falla.

**Lo que NO se toca:** el nombre de la sección «CoWork & Café» en el menú, el título y la dirección de la página. El pedido habla de los servicios listados, no del nombre.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `pages/alojamiento.html` | **Modificar.** El piso junto a la capacidad, en las siete fichas. |
| `js/reservas-ui.js` | **Modificar.** La fila del listado gana una ficha con capacidad y piso. |
| `pages/experiencias.html` | **Modificar.** Fuera la línea del próximo retiro. |
| `pages/cowork.html` | **Modificar.** Fuera café y monitores; entra el espacio de trabajo. |
| `pages/matrimonios.html` | **Modificar.** Habitaciones y cocina en Clásico y Premium. |
| `pages/agenda.html` | **Reescribir la sección de actividades.** De rejilla con horarios a lista de posibilidades. |
| `pages/coliving.html` | **Modificar.** Precios de 1 y 3 meses, y el bloque de casa completa. |
| `js/main.js` | **Modificar.** Los textos nuevos en los dos idiomas. |
| `tests/contenido.test.js` | **Modificar.** Un test por corrección. |

---

### Task 1: El piso de cada habitación

**Files:**
- Modify: `pages/alojamiento.html`, `js/reservas-ui.js`, `js/main.js`
- Test: `tests/contenido.test.js`

- [ ] **Step 1: Escribir el test que falla**

Al final de `tests/contenido.test.js`:

```javascript
// ── Correcciones de la propietaria (2026-09-12) ──────────

test('el catálogo declara el piso de cada pieza al final', () => {
  // La ficha lo muestra junto a la capacidad tomándolo de acá. Si alguien
  // reordena las características y el piso deja de ser el último, la ficha
  // empieza a mostrar otra cosa sin que se note.
  for (const h of habitaciones) {
    const lineas = h.caracteristicas_es.split('\n').map(l => l.trim()).filter(Boolean);
    assert.match(
      lineas.at(-1), /^(Primer|Segundo) piso$/,
      `${h.id}: la última característica es "${lineas.at(-1)}", no el piso`
    );
  }
});

test('cada ficha muestra el piso de su habitación', () => {
  for (const h of habitaciones) {
    const piso = h.caracteristicas_es.split('\n').map(l => l.trim()).filter(Boolean).at(-1);
    const ficha = fichaDe(alojamiento, h.id);
    assert.ok(ficha, `falta la ficha de ${h.id}`);
    assert.ok(
      ficha.includes(piso),
      `la ficha de ${h.id} no dice "${piso}"`
    );
  }
});
```

- [ ] **Step 2: Correrlo y confirmar que falla**

```bash
npm test
```

Esperado: el primero PASA —el catálogo ya está bien— y el segundo FALLA con `la ficha de llaima no dice "Primer piso"`.

- [ ] **Step 3: Poner el piso junto a la capacidad en las siete fichas**

En `pages/alojamiento.html`, la primera `<li>` de cada ficha dice la capacidad. Pasa a decir capacidad y piso separados por un punto medio:

```html
                <li data-i18n="hab.llaima.cap">2 huéspedes · Primer piso</li>
```

Las siete, con su propio piso: Llaima, Rukapillán, Sierra Nevada y Tolhuaca son **Primer piso**; Lanín, Sollipulli y Lonquimay, **Segundo piso**. Las capacidades no cambian: 2 salvo Lanín (3) y Sollipulli (4).

- [ ] **Step 4: Actualizar los dos diccionarios**

En `js/main.js`, las siete claves `hab.<slug>.cap` del bloque español pasan al mismo texto, y las del inglés a `2 guests · Ground floor` / `Second floor`:

```javascript
      'hab.llaima.cap': '2 huéspedes · Primer piso',
```

```javascript
      'hab.llaima.cap': '2 guests · Ground floor',
```

Lanín lleva `3 guests · Second floor` y Sollipulli `4 guests · Second floor`.

- [ ] **Step 5: Mostrarlo también en la fila del listado**

`js/reservas-ui.js` dibuja las características del contrato y la fila recorta a cuatro, así que el piso se pierde igual. La fila gana una primera ficha con capacidad y piso. En la función que construye la tarjeta, antes de la lista de características:

```javascript
    // El piso es la última característica del catálogo y la fila recorta a
    // cuatro, así que sin esto nunca se ve. Va primero, con la capacidad,
    // porque decidir entre primer y segundo piso pesa más que la cuarta
    // característica de la lista.
    const caracteristicas = habitacion.caracteristicas[idioma()] || [];
    const piso = caracteristicas.find(c => /piso|floor/i.test(c)) || '';
    const capacidad = habitacion.capacidad
      ? `${habitacion.capacidad} ${t().huespedes}${piso ? ` · ${piso}` : ''}`
      : piso;
```

y en la plantilla, la lista pasa a:

```javascript
        <ul class="card-room__features">
          ${capacidad ? `<li>${capacidad}</li>` : ''}
          ${caracteristicas.map(c => `<li>${c}</li>`).join('')}
        </ul>
```

Agregar la clave `huespedes` a los dos diccionarios de `TEXTOS` en `js/reservas-ui.js`: `'huéspedes'` en español y `'guests'` en inglés.

- [ ] **Step 6: Correr los tests**

```bash
npm test
node --check js/reservas-ui.js && node --check js/main.js
```

Esperado: 74 tests, 0 fallos, y los dos `--check` sin salida.

- [ ] **Step 7: Commit**

```bash
git add pages/alojamiento.html js/reservas-ui.js js/main.js tests/contenido.test.js
git commit -m "Decir en qué piso está cada habitación"
```

---

### Task 2: Fuera la línea del próximo retiro

**Files:**
- Modify: `pages/experiencias.html`
- Test: `tests/contenido.test.js`

- [ ] **Step 1: Escribir el test que falla**

```javascript
test('experiencias no anuncia un retiro con fecha', () => {
  // La fecha estaba quemada en el HTML —«15-17 Mayo 2026»— y para cuando la
  // propietaria lo pidió ya había pasado hacía cuatro meses. Una fecha fija en
  // una página estática siempre termina así.
  const exp = leer('pages/experiencias.html');
  assert.ok(!/Próximo retiro/i.test(exp), 'sigue anunciando un próximo retiro');
  assert.ok(!/Mayo 2026/i.test(exp), 'sigue con la fecha vieja');
});
```

- [ ] **Step 2: Correrlo y confirmar que falla**

```bash
npm test
```

Esperado: FALLA con `sigue anunciando un próximo retiro`.

- [ ] **Step 3: Quitar la línea**

Buscar el párrafo con `Próximo retiro` en `pages/experiencias.html` y eliminarlo completo, con su etiqueta contenedora. Si lleva `data-i18n`, quitar también esa clave de los dos diccionarios de `js/main.js`, o el test de claves huérfanas no se queja pero queda basura.

```bash
grep -n "Próximo retiro\|proximoRetiro\|Mayo 2026" pages/experiencias.html js/main.js
```

- [ ] **Step 4: Correr los tests**

```bash
npm test
```

Esperado: 75 tests, 0 fallos.

- [ ] **Step 5: Commit**

```bash
git add pages/experiencias.html js/main.js tests/contenido.test.js
git commit -m "Quitar el retiro con fecha, que ya pasó hace cuatro meses"
```

---

### Task 3: Los servicios del cowork

**Files:**
- Modify: `pages/cowork.html`
- Test: `tests/contenido.test.js`

- [ ] **Step 1: Escribir el test que falla**

```javascript
test('el cowork no ofrece café ni monitores', () => {
  // Se pidió quitar los dos servicios. Aparecían en tres lugares, no en los
  // dos que mostraba la captura: el café estaba también en lo que incluye un
  // día de cowork.
  const cw = leer('pages/cowork.html');
  assert.ok(!/Café ilimitado/i.test(cw), 'sigue ofreciendo café ilimitado');
  assert.ok(!/Monitores/i.test(cw), 'sigue ofreciendo monitores');
  assert.ok(
    /alejado de la ciudad/i.test(cw),
    'falta el recuadro del espacio de trabajo tranquilo'
  );
});
```

- [ ] **Step 2: Correrlo y confirmar que falla**

```bash
npm test
```

Esperado: FALLA con `sigue ofreciendo café ilimitado`.

- [ ] **Step 3: Quitar los dos recuadros y agregar el nuevo**

En `pages/cowork.html` hay tres menciones. Confírmalo antes de editar:

```bash
grep -n "Café ilimitado\|Monitores" pages/cowork.html
```

Esperado: la línea 121-122 (recuadro de monitores), 133-134 (recuadro de café) y 173 (dentro de lo que incluye el día de cowork).

- Eliminar el `div.feature-item` completo de **Monitores disponibles** y el de **Café ilimitado**, con su icono.
- Eliminar la `<li>Café ilimitado</li>` de la lista de lo que incluye el día.
- Agregar un `feature-item` nuevo en el lugar del primero que se quitó, con el mismo marcado que sus hermanos y el icono que ya usen los demás:

```html
              <div class="feature-item">
                <div class="feature-item__icon">
                  <!-- Mismo formato que sus hermanos: 24x24, trazo de 2 y
                       currentColor. El proyecto no usa librerías de iconos, los
                       dibuja a mano. Éste son unos árboles, que es de lo que
                       habla el recuadro. -->
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8 21V13M8 13 4 9h8L8 13ZM8 9 5 5.5h6L8 9Z"/>
                    <path d="M17 21v-6M17 15l-2.5-3h5L17 15Z"/>
                  </svg>
                </div>
                <div class="feature-item__content">
                  <h4>Espacio abierto y tranquilo</h4>
                  <p>Trabajo sin ruido, cerca de Villarrica y a la vez alejado de la ciudad.</p>
                </div>
              </div>
```

Si esos recuadros llevan `data-i18n`, agregar las claves nuevas a los dos diccionarios y quitar las dos que sobran.

- [ ] **Step 4: Correr los tests**

```bash
npm test
```

Esperado: 76 tests, 0 fallos.

- [ ] **Step 5: Commit**

```bash
git add pages/cowork.html js/main.js tests/contenido.test.js
git commit -m "Cambiar café y monitores por lo que el cowork sí ofrece"
```

---

### Task 4: Las habitaciones y la cocina en los paquetes de matrimonio

**Files:**
- Modify: `pages/matrimonios.html:411-448`
- Test: `tests/contenido.test.js`

- [ ] **Step 1: Escribir el test que falla**

```javascript
test('los paquetes de matrimonio ofrecen las siete habitaciones y la cocina', () => {
  const m = leer('pages/matrimonios.html');
  const paquete = nombre => {
    const i = m.indexOf(`package-card__title">${nombre}<`);
    assert.ok(i !== -1, `no existe el paquete ${nombre}`);
    const fin = m.indexOf('</ul>', i);
    return m.slice(i, fin);
  };
  for (const nombre of ['Clásico', 'Premium']) {
    const bloque = paquete(nombre);
    assert.match(bloque, /7\b/, `${nombre} no menciona las 7 habitaciones`);
    assert.match(bloque, /cocina/i, `${nombre} no menciona el uso de cocina`);
  }
});
```

- [ ] **Step 2: Correrlo y confirmar que falla**

```bash
npm test
```

Esperado: FALLA con `Clásico no menciona las 7 habitaciones`. Premium ya dice «Todas las habitaciones (7)», así que a ése sólo le faltará la cocina.

- [ ] **Step 3: Editar los dos paquetes**

En **Clásico**, la línea `<li>4 habitaciones para familia</li>` pasa a:

```html
              <li>7 habitaciones disponibles</li>
              <li>Uso de cocina</li>
```

En **Premium**, que ya trae `<li>Todas las habitaciones (7)</li>`, agregar después:

```html
              <li>Uso de cocina</li>
```

- [ ] **Step 4: Correr los tests**

```bash
npm test
```

Esperado: 77 tests, 0 fallos.

- [ ] **Step 5: Commit**

```bash
git add pages/matrimonios.html tests/contenido.test.js
git commit -m "Ofrecer las siete habitaciones y la cocina en los paquetes de matrimonio"
```

---

### Task 5: La agenda pasa a ser una lista de posibilidades

**Files:**
- Modify: `pages/agenda.html`
- Test: `tests/contenido.test.js`

Es la corrección más grande: la página promete diez talleres con horario fijo y botón de reservar, y eso no existe. La propietaria fue explícita: «es sólo lo que me gustaría que ocurriera».

- [ ] **Step 1: Escribir el test que falla**

```javascript
test('la agenda ofrece posibilidades, no horarios que no existen', () => {
  const ag = leer('pages/agenda.html');
  // Nada de días fijos: la propietaria dijo que todavía no hay claridad.
  for (const patron of [/Sábados \d/, /Domingos \d/, /Un sábado al mes/]) {
    assert.ok(!patron.test(ag), `la agenda todavía anuncia "${patron.source}"`);
  }
  // Ni botones de reservar una actividad que no tiene fecha.
  assert.ok(
    !/>\s*Reservar\s*</i.test(ag),
    'la agenda todavía tiene botones de reservar'
  );
  // Y sí los siete tipos de evento que pidió.
  for (const tipo of ['cumpleaños', 'empresas', 'Despedidas',
                      'cocina', 'yoga', 'Congresos']) {
    assert.match(ag, new RegExp(tipo, 'i'), `la agenda no ofrece ${tipo}`);
  }
});
```

- [ ] **Step 2: Correrlo y confirmar que falla**

```bash
npm test
```

Esperado: FALLA con `la agenda todavía anuncia "Sábados \d"`.

- [ ] **Step 3: Ver qué hay hoy**

```bash
grep -n 'card-agenda\|<h3\|Sábados\|Domingos\|Un sábado\|Reservar' pages/agenda.html
```

Son diez tarjetas con categoría, título, horario, «Consultar» y un botón «Reservar».

- [ ] **Step 4: Reemplazar la rejilla por la lista**

La sección de actividades pasa a una sola lista, sin días, sin horas y sin botón por actividad. Conserva los diez nombres que ya están —Taller Cocina Km 0, Taller Huerta Orgánica, Cerámica Mapuche, Apicultura y Cosecha de Miel, Bioconstrucción, Observación de Aves, Noche de Astronomía, Forest Bathing, Velada del Fuego, Retiro Yoga & Naturaleza— y agrega los siete tipos de evento.

Usa la clase de fichas que ya existe en el proyecto para listas de este tipo, la misma que el listado de reservas usa para las características:

```html
        <h2>Lo que se puede hacer acá</h2>
        <p>
          Talleres, celebraciones y encuentros que armamos a pedido. No tienen
          día fijo: se coordinan según la fecha y el grupo.
        </p>

        <ul class="lista-posibilidades">
          <li>Taller Cocina Km 0</li>
          <li>Taller Huerta Orgánica</li>
          <li>Cerámica Mapuche</li>
          <li>Apicultura y cosecha de miel</li>
          <li>Bioconstrucción</li>
          <li>Observación de aves</li>
          <li>Noche de astronomía</li>
          <li>Forest bathing</li>
          <li>Velada del Fuego</li>
          <li>Retiro de yoga y naturaleza</li>
          <li>Celebra tu cumpleaños</li>
          <li>Fin de año de empresas</li>
          <li>Despedidas de soltera y soltero</li>
          <li>Clases de cocina</li>
          <li>Clases de yoga</li>
          <li>Congresos y encuentros</li>
        </ul>

        <a href="https://wa.me/56985488233?text=Hola!%20Quiero%20consultar%20por%20una%20actividad%20en%20Flor%20del%20Bosque"
           class="btn btn-primary" target="_blank" rel="noopener">Consultar por una actividad</a>
```

El estilo de `.lista-posibilidades` va en `css/components.css`, reutilizando la forma de ficha que ya existe:

```css
/* Las actividades que se pueden hacer, sin día ni hora: la propietaria pidió
   dejar de prometer una agenda que todavía no existe. Se leen de un vistazo,
   así que van en línea y no apiladas. */
.lista-posibilidades {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  list-style: none;
  margin: var(--space-6) 0;
  padding: 0;
}

.lista-posibilidades li {
  background: var(--surface-elevated);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  color: var(--text-primary);
}
```

Subir el `?v=` de `components.css` en las once páginas, de `20260911` a `20260912`.

- [ ] **Step 5: Correr los tests**

```bash
npm test
```

Esperado: 78 tests, 0 fallos.

- [ ] **Step 6: Commit**

```bash
git add pages/agenda.html css/components.css index.html pages/ tests/contenido.test.js
git commit -m "Mostrar la agenda como posibilidades y no como horarios que no existen"
```

---

### Task 6: Las tarifas de estadía larga y la casa completa

**Files:**
- Modify: `pages/coliving.html`
- Test: `tests/contenido.test.js`

- [ ] **Step 1: Escribir el test que falla**

```javascript
test('coliving publica las tarifas de estadía larga', () => {
  const co = leer('pages/coliving.html');
  for (const precio of ['$450.000', '$1.200.000', '$350.000', '$400.000']) {
    assert.ok(co.includes(precio), `falta la tarifa ${precio}`);
  }
});

test('ninguna tarifa quedó escrita sin los miles', () => {
  // El documento de la propietaria decía «350 diario» sin unidad. Publicar
  // "$350" en vez de "$350.000" sería cobrar mil veces menos, y es el tipo de
  // error que nadie nota hasta que alguien reserva.
  const co = leer('pages/coliving.html');
  const sospechosas = [...co.matchAll(/\$\s?(\d{1,3})(?![\d.])/g)].map(m => m[0]);
  assert.deepEqual(sospechosas, [], `cifras sin separador de miles: ${sospechosas}`);
});

test('la casa completa dice su capacidad y su mínimo', () => {
  const co = leer('pages/coliving.html');
  const i = co.toLowerCase().indexOf('casa completa');
  assert.ok(i !== -1, 'no existe el bloque de casa completa');
  const bloque = co.slice(i, i + 2000);
  assert.match(bloque, /17\b/, 'no dice la capacidad de 17 personas');
  assert.match(bloque, /2 noches/i, 'no dice el mínimo de dos noches');
});
```

- [ ] **Step 2: Correrlo y confirmar que falla**

```bash
npm test
```

Esperado: FALLA con `falta la tarifa $450.000`.

- [ ] **Step 3: Poner precio a los planes de mes**

En `pages/coliving.html`, la tarjeta **Plan Mensual** cambia su precio y su período:

```html
            <h3 class="pricing-card__title">Plan Mensual</h3>
            <div class="pricing-card__price">$450.000</div>
            <div class="pricing-card__period">1 mes</div>
```

Y se agrega una tarjeta nueva después, con el mismo marcado que sus hermanas:

```html
          <div class="pricing-card">
            <h3 class="pricing-card__title">Plan Trimestral</h3>
            <div class="pricing-card__price">$1.200.000</div>
            <div class="pricing-card__period">3 meses</div>
            <ul class="pricing-card__features">
              <li>Baño privado</li>
              <li>Cocina 24/7</li>
              <li>Huerta y gallinero</li>
              <li>Living, comedor y espacio de trabajo</li>
            </ul>
            <a href="https://wa.me/56985488233?text=Hola!%20Quiero%20el%20Plan%20Trimestral%20de%20Coliving"
               class="btn btn-primary btn-full" target="_blank" rel="noopener">Consultar disponibilidad</a>
          </div>
```

**El Plan Semanal se queda en «Consultar»** y el **Eco Work Retreat no se toca**: la propietaria no los mencionó, y «falta algo que diga estadías largas» es agregar, no reemplazar.

- [ ] **Step 4: Agregar el bloque de casa completa**

Va **después** de la rejilla de planes, como bloque propio, porque es otro producto: la casa entera y no una habitación.

```html
        <div class="casa-completa">
          <h3>La casa completa</h3>
          <p>
            Para grupos, familias grandes y encuentros: la casa entera con
            capacidad para 17 personas, mínimo dos noches.
          </p>
          <ul>
            <li>Cocina equipada y lavandería</li>
            <li>Camas con sábanas y estacionamiento</li>
            <li>Internet Starlink</li>
            <li>Piscina compartida con las demás casas de la parcela</li>
          </ul>
          <p class="casa-completa__tarifas">
            <strong>$350.000</strong> por noche en temporada baja ·
            <strong>$400.000</strong> por noche en temporada alta
          </p>
          <a href="https://wa.me/56985488233?text=Hola!%20Quiero%20consultar%20por%20la%20casa%20completa"
             class="btn btn-primary" target="_blank" rel="noopener">Consultar por la casa completa</a>
        </div>
```

Con su estilo en `css/components.css`:

```css
/* La casa completa es otro producto que los planes por habitación —17 plazas,
   la casa entera— así que va en su propio bloque y no en la rejilla, donde se
   leería como un plan más. */
.casa-completa {
  background: var(--surface-elevated);
  border: 1px solid var(--color-neutral-200);
  border-left: 3px solid var(--brand-terracota);
  border-radius: var(--radius-lg);
  padding: var(--space-6) var(--space-7);
  margin-top: var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.casa-completa h3 {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  margin: 0;
}

.casa-completa p, .casa-completa ul { margin: 0; color: var(--text-secondary); }
.casa-completa ul { padding-left: var(--space-5); }
.casa-completa__tarifas { color: var(--text-primary); }
.casa-completa .btn { align-self: flex-start; }
```

- [ ] **Step 5: Corregir la descripción de la página**

La descripción dice «Estadías por semana o por mes», y ahora hay tres meses y casa completa. En `pages/coliving.html`, en los tres lugares —`description`, `og:description` y `twitter:description`—:

```
Coliving en Villarrica para nómadas: habitación privada, cowork con Starlink y bosque nativo. Por mes, por trimestre o la casa completa para 17 personas.
```

Mide 153 caracteres, dentro de los 160 que exige el test de longitudes. La
versión larga y obvia —«habitación privada, cowork con Starlink, cocina
compartida y bosque nativo. Por mes, por trimestre o la casa completa»— se pasa
a 163 y Google la cortaría a mitad de frase.

- [ ] **Step 6: Correr los tests**

```bash
npm test
```

Esperado: 81 tests, 0 fallos.

- [ ] **Step 7: Commit**

```bash
git add pages/coliving.html css/components.css tests/contenido.test.js
git commit -m "Publicar las tarifas de estadía larga y la casa completa"
```

---

### Task 7: Los textos nuevos en inglés

**Files:**
- Modify: `js/main.js`

Los textos que llevan `data-i18n` y se agregaron en las tareas 3, 5 y 6 tienen que existir en los dos diccionarios, o el test `toda clave data-i18n usada existe en español y en inglés` falla.

- [ ] **Step 1: Ver qué claves nuevas quedaron sin traducir**

```bash
npm test 2>&1 | grep "aparece 0 veces"
```

Si no devuelve nada, los textos nuevos se escribieron sin `data-i18n` y esta tarea no tiene trabajo: anótalo y pasa a la siguiente. Si devuelve claves, son las que hay que traducir.

- [ ] **Step 2: Traducir lo que falte**

Las traducciones de los textos nuevos:

| Español | Inglés |
|---|---|
| Espacio abierto y tranquilo | Open, quiet workspace |
| Trabajo sin ruido, cerca de Villarrica y a la vez alejado de la ciudad. | Quiet work, close to Villarrica yet away from town. |
| Lo que se puede hacer acá | What you can do here |
| Consultar por una actividad | Ask about an activity |
| Plan Trimestral | Quarterly Plan |
| La casa completa | The whole house |
| Consultar por la casa completa | Ask about the whole house |
| 7 habitaciones disponibles | 7 rooms available |
| Uso de cocina | Kitchen access |

**Las cifras no se traducen:** `$450.000` queda igual en los dos idiomas, como ya ocurre con las tarifas de las habitaciones.

- [ ] **Step 3: Correr los tests**

```bash
npm test
node --check js/main.js
```

Esperado: 81 tests, 0 fallos.

- [ ] **Step 4: Commit**

```bash
git add js/main.js
git commit -m "Traducir los textos nuevos al inglés"
```

---

### Task 8: Verificación en el navegador

- [ ] **Step 1: Levantar una copia con el contrato real**

El Worker rechaza `localhost` por CORS, así que sin esto la página de reservas no muestra resultados:

```bash
S=$(mktemp -d)
cp -R css js images pages index.html "$S/" && mkdir -p "$S/api"
curl -s https://reservas.flordelbosque.cl/api/disponibilidad > "$S/api/disponibilidad"
sed -i '' "s|const API = 'https://reservas.flordelbosque.cl';|const API = '..';|" "$S/js/reservas-ui.js" "$S/js/alojamiento-datos.js"
cd "$S" && python3 -m http.server 8781
```

- [ ] **Step 2: El piso, en las dos páginas**

En `http://localhost:8781/pages/alojamiento.html`, las siete fichas deben decir el piso en su primera línea. Y en `pages/reservas.html`, buscando del 20 al 23 de diciembre para 2 huéspedes, la primera ficha de cada fila debe decir capacidad y piso.

```javascript
[...document.querySelectorAll('article.card-room')].map(f =>
  `${f.querySelector('.card-room__title').textContent.trim()} → ${f.querySelector('li').textContent.trim()}`)
```

Esperado: las siete con «Primer piso» o «Segundo piso» según corresponda.

- [ ] **Step 3: La agenda**

En `pages/agenda.html`: dieciséis actividades en fichas, sin ningún día ni hora, y un solo botón al final. Comprobar que no hay desborde horizontal a 390px de ancho.

- [ ] **Step 4: Coliving**

Las tarifas visibles y escritas con separador de miles. El bloque de casa completa debajo de la rejilla, no dentro. Y que a 390px la rejilla se apile sin desbordar.

- [ ] **Step 5: Cowork y matrimonios**

Que no quede rastro de café ni monitores, que el recuadro nuevo esté en su lugar con el mismo aspecto que sus hermanos, y que Clásico y Premium digan las habitaciones y la cocina.

- [ ] **Step 6: El cambio de idioma**

En cada página tocada, pasar a inglés y volver. Ningún texto nuevo debe quedarse en castellano, y ninguno debe desaparecer.

- [ ] **Step 7: Limpiar**

```bash
rm -rf "$S"
cd /Users/la/Documents/FLORDELBOSQUE/guesthouse-villarrica
git status --short
```

Esperado: árbol limpio.

---

## Lo que queda para la propietaria

1. **Las fotos de los cuatro baños** que ella misma listó: Tolhuaca, el compartido de Llaima y Rukapillán, y Sierra Nevada. Que nadie salga reflejado en los espejos.
2. **Si alguien arrienda la casa completa, hay que bloquear las siete habitaciones a mano en Airtable**, igual que el segundo piso. El sistema de reservas no sabe de la casa completa y seguirá ofreciendo las piezas por separado.
3. **El nombre de la sección CoWork & Café** queda como está. Si ya no hay café de especialidad, decidir si el nombre cambia.
