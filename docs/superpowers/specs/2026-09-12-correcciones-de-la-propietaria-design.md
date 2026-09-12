# Correcciones de la propietaria — diseño

**Fecha:** 2026-09-12
**Estado:** aprobado, pendiente de plan de implementación
**Origen:** `web correcciones.docx`, entregado el 2026-09-12

## Qué pidió

Siete correcciones sobre cinco páginas, entregadas en un documento con tres
capturas señalando los elementos concretos.

| # | Página | Pedido |
|---|---|---|
| 1 | `alojamiento` | Que se vea en qué piso está cada habitación |
| 2 | `alojamiento` | Faltan fotos de baño: Tolhuaca, el compartido y Sierra Nevada |
| 3 | `experiencias` | Quitar la línea «Próximo retiro» |
| 4 | `agenda` | Agregar los tipos de evento; quitar horarios fijos y botones de reservar |
| 5 | `coliving` | Agregar estadías largas con precio, y la casa completa |
| 6 | `cowork` | Quitar «Café ilimitado» y «Monitores disponibles»; agregar el espacio de trabajo |
| 7 | `matrimonios` | En clásico y premium, las siete habitaciones y el uso de cocina |

## Decisiones tomadas

**El piso ya está en el catálogo; lo que falla es el recorte.** Cada habitación
declara «Primer piso» o «Segundo piso» como **última** característica, y la
ficha muestra sólo las cuatro primeras, así que el piso nunca se ve. No hay que
agregar un dato: hay que dejar de cortarlo. Va junto a la capacidad, en la
primera línea —«2 huéspedes · Primer piso»—, que no cuesta una línea nueva y
sirve igual en las filas del listado de reservas, donde el recorte a cuatro es
más agresivo.

**Los planes de coliving se suman, no se reemplazan.** El pedido dice «falta
algo que diga estadías largas de 3 meses o 1 mes», y «falta» es agregar. El plan
Semanal se queda como está, en «Consultar», y el Eco Work Retreat tampoco se
toca porque no se mencionó.

**La casa completa va en su propio bloque.** Es otro producto: la casa entera
para 17 personas, mínimo dos noches, con piscina compartida con las demás casas
de la parcela. Junto a «una habitación por un mes» confundiría las dos ofertas.

**Del cowork se quitan los servicios, no el nombre.** El pedido habla de los
recuadros listados. La sección se sigue llamando «CoWork & Café» en el menú, en
el título y en la dirección de la página; cambiarlo sería una decisión de marca y
además rehacer el SEO recién publicado.

**Los talleres pasan a ser posibilidades, no agenda.** Una sola lista sin días ni
horas ni botones de reservar, con un «Consultar» al final. Es lo fiel a lo que
escribió: «es sólo lo que me gustaría que ocurriera». Hoy la página promete diez
talleres con horario fijo y botón de reserva, y eso no existe.

## Las tarifas nuevas

Confirmadas antes de publicar, porque el documento decía «350 diario» sin
unidad y equivocarse habría significado cobrar mil veces de menos:

| Producto | Precio | Incluye |
|---|---|---|
| 1 mes | $450.000 | Baño privado, cocina 24/7, huerta y gallinero, espacios comunes |
| 3 meses | $1.200.000 | Lo mismo |
| Casa completa, temporada baja | $350.000 por noche | 17 plazas, piscina compartida, lavandería, cocina equipada, camas con sábanas, estacionamiento, Starlink. Mínimo 2 noches |
| Casa completa, temporada alta | $400.000 por noche | Lo mismo |

**Esto revierte una decisión anterior del proyecto, a propósito.** Desde agosto
los precios del sitio están en «Consultar» porque el negocio no los había
definido; existe incluso `tools/quitar-precios.py`, que se usó para retirarlos.
Ahora están definidos para coliving, así que publicarlos es lo correcto. Queda
escrito para que no se lea después como un descuido.

## Verificación

Tests nuevos en `tests/contenido.test.js`:

- Cada ficha de habitación nombra su piso, y el que nombra coincide con la
  característica del catálogo. Es lo que se pidió y es lo que hoy se corta.
- `pages/agenda.html` no contiene botones de reservar ni horarios fijos: nada de
  «Sábados», «Domingos» ni «Un sábado al mes» en las tarjetas de actividad.
- `pages/cowork.html` no menciona «Café ilimitado» ni «Monitores».
- `pages/experiencias.html` no contiene «Próximo retiro».
- Los precios nuevos aparecen en `coliving` escritos con separador de miles, y
  ninguna cifra de tres dígitos suelta: `$350` en vez de `$350.000` es el error
  que este test existe para impedir.

Y revisión en navegador de las cinco páginas, en las dos anchuras, contra el
sitio publicado.

## Riesgos

**La casa completa y el sistema de reservas no se hablan.** Si alguien arrienda
la casa entera, las siete habitaciones siguen ofreciéndose por separado. Se
resuelve como el bloqueo del segundo piso: siete filas a mano en Airtable. Es
operativo, no del sitio, y va al informe.

**Las traducciones al inglés.** Los textos nuevos van en los dos diccionarios de
`js/main.js` o quedan en castellano al cambiar de idioma. Las cifras no se
traducen, pero los nombres de los planes y lo que incluyen, sí.

## Fuera de alcance

Las fotos de los cuatro baños que faltan, que dependen de la propietaria. El
sitio en inglés con direcciones propias. Y el nombre de la sección CoWork & Café,
que queda pendiente de su decisión.
