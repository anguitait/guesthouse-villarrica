/**
 * La galería de fotos de una habitación.
 *
 * Es mejora progresiva: la foto de portada ya viene en el HTML (o la dibuja
 * reservas-ui) y es lo que se ve sin JavaScript. Esto le monta encima las
 * flechas, los puntos y el visor a pantalla completa.
 *
 * El manifiesto lo genera tools/prep-fotos.py. Vive en el repositorio y no en
 * Airtable porque el campo `imagen` es texto simple: una galería habría exigido
 * cambiar el esquema y que la propietaria mantuviera listas de nombres de
 * archivo.
 *
 * Las rutas del manifiesto son relativas a la raíz del sitio, pero las páginas
 * que lo consumen viven en pages/. Se resuelven contra la URL de este módulo en
 * vez de adivinar cuántos `../` hacen falta.
 */

const RAIZ = new URL('../', import.meta.url);
const url = ruta => new URL(ruta, RAIZ).href;

let manifiesto = null;

/** Una sola petición aunque la llamen las siete tarjetas. */
async function cargarManifiesto() {
  if (manifiesto) return manifiesto;
  const respuesta = await fetch(url('images/habitaciones/galeria.json'));
  if (!respuesta.ok) throw new Error(`galeria.json: ${respuesta.status}`);
  manifiesto = await respuesta.json();
  return manifiesto;
}

// ── El visor ─────────────────────────────────────────────
//
// Uno solo para toda la página, no uno por tarjeta: es un <dialog> que se
// rellena al abrirse. `showModal()` trae gratis el cierre con Esc, el foco
// atrapado y la devolución del foco al elemento que lo abrió.

let visor = null;

function construirVisor() {
  if (visor) return visor;

  const dialogo = document.createElement('dialog');
  dialogo.className = 'visor';

  const figura = document.createElement('figure');
  figura.className = 'visor__figura';

  const imagen = document.createElement('img');
  imagen.className = 'visor__imagen';
  figura.appendChild(imagen);

  const anterior = boton('‹', 'visor__flecha visor__flecha--anterior');
  const siguiente = boton('›', 'visor__flecha visor__flecha--siguiente');
  const contador = document.createElement('p');
  contador.className = 'visor__contador';

  const cerrar = boton('×', 'visor__cerrar');
  cerrar.addEventListener('click', () => dialogo.close());

  dialogo.append(cerrar, anterior, figura, siguiente, contador);
  document.body.appendChild(dialogo);

  // Clic fuera de la figura cierra. El <dialog> ocupa toda la pantalla, así que
  // "fuera" es el propio diálogo y no sus hijos.
  dialogo.addEventListener('click', evento => {
    if (evento.target === dialogo) dialogo.close();
  });

  visor = { dialogo, imagen, anterior, siguiente, contador };
  return visor;
}

function boton(texto, clase) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = clase;
  b.textContent = texto;
  return b;
}

function abrirVisor(fotos, indiceInicial, nombrePieza) {
  const v = construirVisor();
  let indice = indiceInicial;

  const pintar = () => {
    v.imagen.src = url(fotos[indice]);
    v.imagen.alt = `${nombrePieza} — fotografía ${indice + 1} de ${fotos.length}`;
    v.contador.textContent = `${indice + 1} / ${fotos.length}`;
  };

  const mover = salto => {
    indice = (indice + salto + fotos.length) % fotos.length;
    pintar();
  };

  // Los oyentes se reemplazan en cada apertura porque cambian las fotos.
  v.anterior.onclick = () => mover(-1);
  v.siguiente.onclick = () => mover(1);
  v.dialogo.onkeydown = evento => {
    if (evento.key === 'ArrowLeft') mover(-1);
    if (evento.key === 'ArrowRight') mover(1);
  };

  // Deslizamiento táctil. 40px de umbral: por debajo suele ser un toque torcido
  // al intentar cerrar, no un gesto.
  let inicioX = null;
  v.dialogo.onpointerdown = evento => { inicioX = evento.clientX; };
  v.dialogo.onpointerup = evento => {
    if (inicioX === null) return;
    const recorrido = evento.clientX - inicioX;
    if (Math.abs(recorrido) > 40) mover(recorrido < 0 ? 1 : -1);
    inicioX = null;
  };

  pintar();
  v.dialogo.showModal();
}

// ── El carrusel de la tarjeta ────────────────────────────

/**
 * Monta la galería sobre un bloque `.card-room__image` que ya trae su <img>.
 * Con una sola foto no monta nada: unas flechas que no llevan a ninguna parte
 * son peor que no tenerlas.
 */
function montarUna(bloque, fotos, nombrePieza) {
  if (!Array.isArray(fotos) || fotos.length < 2) return;

  const imagen = bloque.querySelector('img');
  if (!imagen) return;

  const tira = document.createElement('div');
  tira.className = 'galeria__puntos';
  const puntos = fotos.map(() => {
    const punto = document.createElement('span');
    punto.className = 'galeria__punto';
    tira.appendChild(punto);
    return punto;
  });

  let indice = 0;
  const pintar = () => {
    imagen.src = url(fotos[indice]);
    puntos.forEach((p, i) => p.classList.toggle('galeria__punto--activo', i === indice));
  };

  const mover = salto => {
    indice = (indice + salto + fotos.length) % fotos.length;
    pintar();
  };

  const anterior = boton('‹', 'galeria__flecha galeria__flecha--anterior');
  const siguiente = boton('›', 'galeria__flecha galeria__flecha--siguiente');
  anterior.setAttribute('aria-label', 'Foto anterior');
  siguiente.setAttribute('aria-label', 'Foto siguiente');
  anterior.addEventListener('click', () => mover(-1));
  siguiente.addEventListener('click', () => mover(1));

  const ampliar = boton('', 'galeria__ampliar');
  ampliar.setAttribute('aria-label', `Ver las ${fotos.length} fotos de ${nombrePieza}`);
  ampliar.addEventListener('click', () => abrirVisor(fotos, indice, nombrePieza));

  bloque.classList.add('galeria');
  bloque.append(ampliar, anterior, siguiente, tira);
  pintar();
}

/**
 * Busca los bloques de imagen que declaren su pieza y les monta la galería.
 * `raiz` permite montar sólo una tarjeta recién creada en vez de repasar todo
 * el documento.
 */
export async function montarGalerias(raiz = document) {
  const bloques = [...raiz.querySelectorAll('.card-room__image[data-habitacion]')];
  if (!bloques.length) return;

  let fotos;
  try {
    fotos = await cargarManifiesto();
  } catch (error) {
    // Sin manifiesto queda la portada, que es lo que había antes de la galería.
    console.warn('Galería no disponible:', error);
    return;
  }

  for (const bloque of bloques) {
    const id = bloque.dataset.habitacion;
    // El título de la tarjeta y no el `alt` de la portada: en la ficha de
    // alojamiento ese alt describe la escena ("Las dos literas bajo el techo
    // inclinado...") y en el listado es el nombre. Para anunciar "fotografía 2
    // de 4" hace falta el nombre de la pieza, igual en las dos páginas.
    const titulo = bloque.closest('article')?.querySelector('.card-room__title');
    const nombre = titulo?.textContent.trim() || bloque.querySelector('img')?.alt || id;
    montarUna(bloque, fotos[id], nombre);
  }
}
