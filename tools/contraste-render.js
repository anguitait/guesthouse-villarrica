// Chequeo de contraste sobre la pagina RENDERIZADA.
//
// tools/contraste.py compara pares de tokens: sirve para el sistema de
// color, pero no ve lo que termina pintado. Este archivo si: recorre
// todos los nodos de texto visibles, resuelve el fondo efectivo subiendo
// por los ancestros hasta encontrar uno opaco, compone la opacidad y
// calcula el ratio real.
//
// Habria cazado los tres bugs que se nos escaparon: el footer sobre
// oliva, el hover del boton secundario y el gris de .feature-item__content
// sobre la seccion oliva.
//
// Uso: pegar en browser_evaluate o en la consola, pagina por pagina.
// Antes conviene revelar las animaciones:
//   document.querySelectorAll('.scroll-reveal').forEach(e => e.classList.add('is-visible'))
() => {
  const lum = ([r, g, b]) => {
    const f = c => {
      c /= 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const parse = s => (s.match(/[\d.]+/g) || []).map(Number);
  const ratio = (a, b) => {
    const [la, lb] = [lum(a), lum(b)];
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };

  // Fondo efectivo: sube hasta el primer ancestro con alpha 1.
  // Devuelve {color, sobreFoto}. Las capas semitransparentes se COMPONEN
  // sobre lo que hay debajo, no se toman crudas: tomarlas crudas hacia
  // ver blanco donde hay un velo blanco al 10% sobre un bosque oscuro.
  const fondo = el => {
    const capas = [];
    let sobreFoto = false;
    let n = el;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') sobreFoto = true;
      // Un ancestro posicionado sobre una imagen (hero, tarjetas con foto)
      // no se puede resolver leyendo colores: hay pixeles debajo.
      if (n.querySelector && n.matches('.hero, .hero__content, .banner-cta, [class*="__image"], [class*="__overlay"], [class*="__content"]')) sobreFoto = true;
      const c = parse(cs.backgroundColor);
      if (c.length >= 3) {
        const a = c.length === 4 ? c[3] : 1;
        if (a > 0) {
          capas.push({ rgb: c.slice(0, 3), a });
          if (a === 1) break;
        }
      }
      n = n.parentElement;
    }
    let base = [255, 255, 255];
    for (let i = capas.length - 1; i >= 0; i--) {
      const { rgb, a } = capas[i];
      base = rgb.map((c, k) => Math.round(a * c + (1 - a) * base[k]));
    }
    return { color: base, sobreFoto };
  };

  const fallos = [];
  const vistos = new Set();

  document.querySelectorAll('body *').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return;
    if (parseFloat(cs.opacity) === 0) return;

    // Solo elementos con texto propio, no contenedores.
    const propio = [...el.childNodes]
      .filter(n => n.nodeType === 3 && n.textContent.trim())
      .map(n => n.textContent.trim())
      .join(' ');
    if (!propio) return;

    const b = el.getBoundingClientRect();
    if (!b.width || !b.height) return;

    const col = parse(cs.color).slice(0, 3);
    const { color: bg, sobreFoto } = fondo(el);
    // Sobre fotografia el fondo real son pixeles: no se puede afirmar
    // nada leyendo CSS, y forzarlo solo produce ruido. Se revisa a ojo.
    if (sobreFoto) return;

    // Compone la opacidad heredada del elemento sobre su fondo.
    let alpha = 1;
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      alpha *= parseFloat(getComputedStyle(n).opacity);
    }
    const pintado = col.map((c, i) => Math.round(alpha * c + (1 - alpha) * bg[i]));

    const px = parseFloat(cs.fontSize);
    const peso = parseInt(cs.fontWeight, 10) || 400;
    const grande = px >= 24 || (px >= 18.66 && peso >= 700);
    const minimo = grande ? 3 : 4.5;

    const r = ratio(pintado, bg);
    if (r < minimo) {
      const clave = el.className + '|' + propio.slice(0, 20);
      if (vistos.has(clave)) return;
      vistos.add(clave);
      fallos.push({
        txt: propio.slice(0, 34),
        clase: (typeof el.className === 'string' ? el.className : '').slice(0, 40),
        ratio: +r.toFixed(2),
        minimo,
        color: `rgb(${pintado})`,
        fondo: `rgb(${bg})`
      });
    }
  });

  return { pagina: location.pathname, fallos: fallos.length, detalle: fallos.slice(0, 12) };
};
