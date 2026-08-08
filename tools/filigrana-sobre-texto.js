// Detecta si la filigrana del isotipo queda por debajo de algun texto.
//
// Mide los rectangulos de los NODOS DE TEXTO con Range, no la caja del
// elemento: un <h2> de bloque ocupa todo el ancho de su columna aunque sus
// glifos lleguen mucho antes, y medir la caja da falsos positivos.
//
// Uso: pegar en browser_evaluate, o en la consola del navegador, sobre cada
// pagina. Devuelve {ok: true} o la lista de textos tapados.
() => {
  const fil = document.querySelector('.filigrana');
  if (!fil) return { ok: false, error: 'no hay filigrana en esta pagina' };

  const fb = fil.getBoundingClientRect();
  const sec = fil.closest('section');
  if (!sec) return { ok: false, error: 'la filigrana no esta dentro de un <section>' };

  const solapes = [];
  for (const el of sec.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,a,span,strong')) {
    for (const nodo of el.childNodes) {
      if (nodo.nodeType !== Node.TEXT_NODE || !nodo.textContent.trim()) continue;
      const rango = document.createRange();
      rango.selectNodeContents(nodo);
      for (const b of rango.getClientRects()) {
        const fuera = b.right < fb.left || b.left > fb.right ||
                      b.bottom < fb.top || b.top > fb.bottom;
        if (!fuera) {
          solapes.push(nodo.textContent.trim().slice(0, 40));
          break;
        }
      }
    }
  }

  return solapes.length
    ? { ok: false, solapes: [...new Set(solapes)] }
    : { ok: true, filigrana: [Math.round(fb.left), Math.round(fb.right)] };
};
