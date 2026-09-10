/**
 * GUESTHOUSE VILLARRICA - Main JavaScript
 * Vanilla JS for optimal performance
 */

(function() {
  'use strict';

  // ─────────────────────────────────────────
  // DOM Elements
  // ─────────────────────────────────────────

  const header = document.querySelector('.header');
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  const overlay = document.querySelector('.overlay');
  const langSwitch = document.querySelectorAll('.lang-switch');
  const scrollRevealElements = document.querySelectorAll('.scroll-reveal');
  const accordionItems = document.querySelectorAll('.accordion__item');

  // ─────────────────────────────────────────
  // Header Scroll Effect
  // ─────────────────────────────────────────

  let lastScroll = 0;

  function handleHeaderScroll() {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 50) {
      header.classList.add('header--scrolled');
    } else {
      header.classList.remove('header--scrolled');
    }

    lastScroll = currentScroll;
  }

  window.addEventListener('scroll', handleHeaderScroll, { passive: true });

  // ─────────────────────────────────────────
  // Mobile Menu
  // ─────────────────────────────────────────

  function toggleMobileMenu() {
    const isActive = mobileNav.classList.contains('active');

    menuToggle.classList.toggle('active');
    mobileNav.classList.toggle('active');
    overlay.classList.toggle('active');

    // Prevent body scroll when menu is open
    document.body.style.overflow = isActive ? '' : 'hidden';
  }

  function closeMobileMenu() {
    menuToggle.classList.remove('active');
    mobileNav.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', toggleMobileMenu);
  }

  if (overlay) {
    overlay.addEventListener('click', closeMobileMenu);
  }

  // Close menu on link click
  document.querySelectorAll('.mobile-nav__link').forEach(link => {
    link.addEventListener('click', closeMobileMenu);
  });

  // Close menu on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
      closeMobileMenu();
    }
  });

  // ─────────────────────────────────────────
  // Scroll Reveal Animation
  // ─────────────────────────────────────────

  function handleScrollReveal() {
    const windowHeight = window.innerHeight;
    const revealPoint = 150;

    scrollRevealElements.forEach(element => {
      const elementTop = element.getBoundingClientRect().top;

      if (elementTop < windowHeight - revealPoint) {
        element.classList.add('is-visible');
      }
    });
  }

  // Initial check
  handleScrollReveal();

  // Throttled scroll handler
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    if (scrollTimeout) return;

    scrollTimeout = setTimeout(() => {
      handleScrollReveal();
      scrollTimeout = null;
    }, 50);
  }, { passive: true });

  // ─────────────────────────────────────────
  // FAQ Accordion
  // ─────────────────────────────────────────

  accordionItems.forEach(item => {
    const header = item.querySelector('.accordion__header');

    header.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close all other items
      accordionItems.forEach(otherItem => {
        otherItem.classList.remove('active');
      });

      // Toggle current item
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });

  // ─────────────────────────────────────────
  // Language Switcher (i18n)
  // ─────────────────────────────────────────

  const translations = {
    es: {
      'nav.accommodation': 'Alojamiento',
      'nav.experiences': 'Experiencias',
      'nav.agenda': 'Agenda',
      'nav.weddings': 'Matrimonios',
      'nav.cowork': 'CoWork & Café',
      'nav.about': 'Nosotros',
      'nav.book': 'Reservar',
      'hero.overline': 'Flor del Bosque',
      'hero.title': 'Vive La Araucanía desde adentro',
      'hero.subtitle': 'Un espacio de hospitalidad regenerativa donde viajeros de todo el mundo viven, trabajan, aprenden y participan en experiencias de sustentabilidad, cultura local y bienestar a orillas del río Toltén.',
      'hero.cta.book': 'Reservar estadía',
      'hero.cta.explore': 'Conocer experiencias',
      'hero.cta.coliving': 'Estadías largas (Eco Work Retreat)',
      'booking.checkin': 'Llegada',
      'booking.checkout': 'Salida',
      'booking.guests': 'Huéspedes',
      'booking.search': 'Buscar',
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
      'section.place.overline': 'El Lugar',
      'section.place.title': 'Donde el bosque se encuentra con el volcán',
      'section.place.text': 'Ubicados en las orillas del Río Toltén, con vista privilegiada al Volcán Villarrica. Una hectárea de naturaleza, madera nativa y tranquilidad absoluta.',
      'section.rooms.overline': 'Alojamiento',
      'section.rooms.title': 'Habitaciones con alma',
      'section.rooms.cta': 'Ver todas las habitaciones',
      'section.experiences.overline': 'Experiencias',
      'section.experiences.title': 'Más que un lugar para dormir',
      'section.weddings.title': 'Tu matrimonio a orillas del río',
      'section.weddings.text': 'Celebra el día más importante en un entorno natural único. Capacidad para más de 600 invitados.',
      'section.weddings.cta': 'Conocer más',
      'section.cowork.overline': 'CoWork & Café',
      'section.cowork.title': 'Trabaja con vista al volcán',
      'section.reviews.overline': 'Reseñas',
      'section.reviews.title': 'Lo que dicen nuestros huéspedes',
      'newsletter.title': 'Agenda y novedades',
      'newsletter.text': 'Recibe el calendario mensual de talleres, la Velada del Fuego y la programación de temporada de Flor del Bosque.',
      'newsletter.placeholder': 'Tu email para recibir la agenda mensual',
      'newsletter.button': 'Suscribirse',
      'footer.description': 'Un espacio donde la naturaleza, el arte y la hospitalidad se encuentran.',
      'footer.explore': 'Explorar',
      'footer.services': 'Servicios',
      'footer.contact': 'Contacto',
      'footer.rights': 'Todos los derechos reservados.',
      'footer.privacy': 'Privacidad',
      'footer.terms': 'Términos',
      'hab.llaima.cat': 'Habitación Doble – Baño Compartido',
      'hab.llaima.desc': 'Habitación del primer piso con cama matrimonial y piso de madera. Cuenta con un gran clóset, veladores con lámparas y un ventanal con salida directa al jardín. Comparte un baño completo con ducha con la habitación Volcán Rukapillán.',
      'hab.llaima.cap': '2 huéspedes',
      'hab.llaima.c1': 'Cama matrimonial',
      'hab.llaima.c2': 'Baño compartido con ducha (con Volcán Rukapillán)',
      'hab.llaima.c3': 'Salida directa al jardín',
      'hab.llaima.c4': 'Ventanal al jardín',
      'hab.rukapillan.cat': 'Habitación Twin – Baño Compartido',
      'hab.rukapillan.desc': 'Habitación del primer piso con dos camas y escritorio de trabajo, piso de madera y gran clóset. Ventanal con salida directa al jardín y veladores con lámparas. Comparte un baño completo con ducha con la habitación Volcán Llaima.',
      'hab.rukapillan.cap': '2 huéspedes',
      'hab.rukapillan.c1': '2 camas',
      'hab.rukapillan.c2': 'Escritorio',
      'hab.rukapillan.c3': 'Baño compartido con ducha (con Volcán Llaima)',
      'hab.rukapillan.c4': 'Salida directa al jardín',
      'hab.sierra-nevada.cat': 'Habitación Twin – Baño Exterior',
      'hab.sierra-nevada.desc': 'Habitación del primer piso con dos camas y clóset amplio, piso de madera y ventanal con salida directa al jardín. El baño completo con ducha se encuentra fuera de la habitación y es de uso exclusivo.',
      'hab.sierra-nevada.cap': '2 huéspedes',
      'hab.sierra-nevada.c1': '2 camas',
      'hab.sierra-nevada.c2': 'Baño con ducha fuera de la habitación, de uso exclusivo',
      'hab.sierra-nevada.c3': 'Salida directa al jardín',
      'hab.sierra-nevada.c4': 'Ventanal al jardín',
      'hab.tolhuaca.cat': 'Habitación Doble',
      'hab.tolhuaca.desc': 'Habitación del primer piso con baño privado dentro de la habitación y ducha. Gran clóset, piso de madera y ventanal con salida directa al jardín.',
      'hab.tolhuaca.cap': '2 huéspedes',
      'hab.tolhuaca.c1': 'Cama matrimonial',
      'hab.tolhuaca.c2': 'Baño privado en la habitación, con ducha',
      'hab.tolhuaca.c3': 'Salida directa al jardín',
      'hab.tolhuaca.c4': 'Ventanal al jardín',
      'hab.lanin.cat': 'Suite Premium',
      'hab.lanin.desc': 'Habitación amplia del segundo piso con baño privado dentro y ducha. Cuenta con cama matrimonial y una cama chica adicional, dos veladores y una linda vista al jardín y a la piscina. Capacidad para 2 adultos y 1 niño.',
      'hab.lanin.cap': '3 huéspedes',
      'hab.lanin.c1': 'Cama matrimonial + cama chica adicional',
      'hab.lanin.c2': 'Baño privado en la habitación, con ducha',
      'hab.lanin.c3': 'Vista al jardín y a la piscina',
      'hab.lanin.c4': '2 veladores',
      'hab.sollipulli.cat': 'Habitación Cuádruple – Literas',
      'hab.sollipulli.desc': 'Habitación amplia del segundo piso con dos literas, pensada para grupos o familias. Tiene baño privado dentro de la habitación, con ducha y tragaluz en el techo que le da mucha luz natural, y un arrimo de clóset para la ropa.',
      'hab.sollipulli.cap': '4 huéspedes',
      'hab.sollipulli.c1': 'Dos literas (4 plazas)',
      'hab.sollipulli.c2': 'Baño privado en la habitación, con ducha',
      'hab.sollipulli.c3': 'Tragaluz en el techo',
      'hab.sollipulli.c4': 'Arrimo de clóset',
      'hab.lonquimay.cat': 'Habitación Doble',
      'hab.lonquimay.desc': 'Habitación del segundo piso con cama matrimonial y baño privado dentro de la habitación, con ducha. Cuenta con repisas para guardar y ordenar la ropa.',
      'hab.lonquimay.cap': '2 huéspedes',
      'hab.lonquimay.c1': 'Cama matrimonial',
      'hab.lonquimay.c2': 'Baño privado en la habitación, con ducha',
      'hab.lonquimay.c3': 'Repisas para la ropa',
      'hab.lonquimay.c4': 'Veladores con lámparas',
      'hab.consultar': 'Consultar',
      'hab.reservar': 'Reservar',
      'hab.ver': 'Ver',
      'hab.dest.lanin.cat': 'Suite',
      'hab.dest.lanin.desc': 'Habitación amplia del segundo piso, con baño privado y vista al jardín y a la piscina. Cama matrimonial más una cama chica.',
      'hab.dest.tolhuaca.cat': 'Doble',
      'hab.dest.tolhuaca.desc': 'Baño privado dentro de la habitación, gran clóset y un ventanal con salida directa al jardín.',
      'hab.dest.llaima.cat': 'Doble',
      'hab.dest.llaima.desc': 'Cama matrimonial, piso de madera y ventanal con salida directa al jardín. Baño compartido con Volcán Rukapillán.',
      'room.night': 'noche',
      'room.people': 'personas'
    },
    en: {
      'nav.accommodation': 'Accommodation',
      'nav.experiences': 'Experiences',
      'nav.agenda': 'Agenda',
      'nav.weddings': 'Weddings',
      'nav.cowork': 'CoWork & Café',
      'nav.about': 'About Us',
      'nav.book': 'Book Now',
      'hero.overline': 'Flor del Bosque',
      'hero.title': 'Experience La Araucanía from within',
      'hero.subtitle': 'A regenerative hospitality space where travelers from all over the world live, work, learn and take part in experiences of sustainability, local culture and wellbeing on the banks of the Toltén River.',
      'hero.cta.book': 'Book your stay',
      'hero.cta.explore': 'Discover experiences',
      'hero.cta.coliving': 'Long stays (Eco Work Retreat)',
      'booking.checkin': 'Check-in',
      'booking.checkout': 'Check-out',
      'booking.guests': 'Guests',
      'booking.search': 'Search',
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
      'section.place.overline': 'The Place',
      'section.place.title': 'Where the forest meets the volcano',
      'section.place.text': 'Located on the banks of the Toltén River, with a privileged view of Villarrica Volcano. One hectare of nature, native wood and absolute tranquility.',
      'section.rooms.overline': 'Accommodation',
      'section.rooms.title': 'Rooms with soul',
      'section.rooms.cta': 'View all rooms',
      'section.experiences.overline': 'Experiences',
      'section.experiences.title': 'More than a place to sleep',
      'section.weddings.title': 'Your wedding by the river',
      'section.weddings.text': 'Celebrate your most important day in a unique natural setting. Capacity for over 600 guests.',
      'section.weddings.cta': 'Learn more',
      'section.cowork.overline': 'CoWork & Café',
      'section.cowork.title': 'Work with a volcano view',
      'section.reviews.overline': 'Reviews',
      'section.reviews.title': 'What our guests say',
      'newsletter.title': 'Agenda & news',
      'newsletter.text': 'Get the monthly calendar of workshops, the Velada del Fuego gathering and Flor del Bosque\'s seasonal program.',
      'newsletter.placeholder': 'Your email to receive the monthly agenda',
      'newsletter.button': 'Subscribe',
      'footer.description': 'A space where nature, art and hospitality meet.',
      'footer.explore': 'Explore',
      'footer.services': 'Services',
      'footer.contact': 'Contact',
      'footer.rights': 'All rights reserved.',
      'footer.privacy': 'Privacy',
      'footer.terms': 'Terms',
      'hab.llaima.cat': 'Double Room – Shared Bathroom',
      'hab.llaima.desc': 'Ground-floor room with a double bed and wooden floors. It features a large closet, bedside tables with lamps and a full-height window opening directly onto the garden. Shares a full bathroom with shower with the Volcán Rukapillán room.',
      'hab.llaima.cap': '2 guests',
      'hab.llaima.c1': 'Double bed',
      'hab.llaima.c2': 'Shared bathroom with shower (with Volcán Rukapillán)',
      'hab.llaima.c3': 'Direct garden access',
      'hab.llaima.c4': 'Garden-facing picture window',
      'hab.rukapillan.cat': 'Twin Room – Shared Bathroom',
      'hab.rukapillan.desc': 'Ground-floor room with two beds and a work desk, wooden floors and a large closet. Full-height window with direct garden access and bedside tables with lamps. Shares a full bathroom with shower with the Volcán Llaima room.',
      'hab.rukapillan.cap': '2 guests',
      'hab.rukapillan.c1': '2 beds',
      'hab.rukapillan.c2': 'Desk',
      'hab.rukapillan.c3': 'Shared bathroom with shower (with Volcán Llaima)',
      'hab.rukapillan.c4': 'Direct garden access',
      'hab.sierra-nevada.cat': 'Twin Room – External Bathroom',
      'hab.sierra-nevada.desc': 'Ground-floor room with two beds and a spacious closet, wooden floors and a full-height window opening onto the garden. The full bathroom with shower is for the exclusive use of this room and is located just outside it.',
      'hab.sierra-nevada.cap': '2 guests',
      'hab.sierra-nevada.c1': '2 beds',
      'hab.sierra-nevada.c2': 'Exclusive-use bathroom with shower, outside the room',
      'hab.sierra-nevada.c3': 'Direct garden access',
      'hab.sierra-nevada.c4': 'Garden-facing picture window',
      'hab.tolhuaca.cat': 'Double Room',
      'hab.tolhuaca.desc': 'Ground-floor room with a private en-suite bathroom with shower. Large closet, wooden floors and a full-height window opening directly onto the garden.',
      'hab.tolhuaca.cap': '2 guests',
      'hab.tolhuaca.c1': 'Double bed',
      'hab.tolhuaca.c2': 'Private en-suite bathroom with shower',
      'hab.tolhuaca.c3': 'Direct garden access',
      'hab.tolhuaca.c4': 'Garden-facing picture window',
      'hab.lanin.cat': 'Premium Suite',
      'hab.lanin.desc': 'Spacious second-floor room with a private en-suite bathroom and shower. It has a double bed plus an extra small bed, two bedside tables and lovely views over the garden and the pool. Sleeps 2 adults and 1 child.',
      'hab.lanin.cap': '3 guests',
      'hab.lanin.c1': 'Double bed + extra small bed',
      'hab.lanin.c2': 'Private en-suite bathroom with shower',
      'hab.lanin.c3': 'Garden and pool views',
      'hab.lanin.c4': '2 bedside tables',
      'hab.sollipulli.cat': 'Quadruple Room – Bunk Beds',
      'hab.sollipulli.desc': 'Spacious second-floor room with two bunk beds, suited to groups or families. It has a private en-suite bathroom with shower and a ceiling skylight that fills it with natural light, plus a wardrobe unit for clothes.',
      'hab.sollipulli.cap': '4 guests',
      'hab.sollipulli.c1': 'Two bunk beds (sleeps 4)',
      'hab.sollipulli.c2': 'Private en-suite bathroom with shower',
      'hab.sollipulli.c3': 'Ceiling skylight',
      'hab.sollipulli.c4': 'Wardrobe unit',
      'hab.lonquimay.cat': 'Double Room',
      'hab.lonquimay.desc': 'Second-floor room with a double bed and a private en-suite bathroom with shower. It has open shelving for storing and organising clothes.',
      'hab.lonquimay.cap': '2 guests',
      'hab.lonquimay.c1': 'Double bed',
      'hab.lonquimay.c2': 'Private en-suite bathroom with shower',
      'hab.lonquimay.c3': 'Open clothing shelves',
      'hab.lonquimay.c4': 'Bedside tables with lamps',
      'hab.consultar': 'On request',
      'hab.reservar': 'Book',
      'hab.ver': 'View',
      'hab.dest.lanin.cat': 'Suite',
      'hab.dest.lanin.desc': 'Spacious second-floor room with a private bathroom and views over the garden and the pool. Double bed plus an extra small bed.',
      'hab.dest.tolhuaca.cat': 'Double',
      'hab.dest.tolhuaca.desc': 'Private en-suite bathroom, a large closet and a full-height window opening directly onto the garden.',
      'hab.dest.llaima.cat': 'Double',
      'hab.dest.llaima.desc': 'Double bed, wooden floors and a full-height window opening onto the garden. Bathroom shared with Volcán Rukapillán.',
      'room.night': 'night',
      'room.people': 'people'
    }
  };

  let currentLang = localStorage.getItem('gh-lang') || 'es';

  function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('gh-lang', lang);

    // Update all translatable elements
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      if (translations[lang] && translations[lang][key]) {
        // Handle input placeholders
        if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
          element.placeholder = translations[lang][key];
        } else {
          element.textContent = translations[lang][key];
        }
      }
    });

    // Update lang switcher display
    langSwitch.forEach(btn => {
      btn.textContent = lang.toUpperCase() === 'ES' ? 'EN' : 'ES';
    });

    // Update HTML lang attribute
    document.documentElement.lang = lang;

    // Los modulos que pintan datos del Worker (precios en vivo) no pueden
    // usar data-i18n: su texto no esta en el diccionario. Se les avisa para
    // que vuelvan a pintar en el idioma nuevo.
    document.dispatchEvent(new CustomEvent('idiomacambiado', { detail: lang }));
  }

  // Initialize language
  setLanguage(currentLang);

  // Language switch click handler
  langSwitch.forEach(btn => {
    btn.addEventListener('click', () => {
      const newLang = currentLang === 'es' ? 'en' : 'es';
      setLanguage(newLang);
    });
  });

  // ─────────────────────────────────────────
  // Smooth Scroll for Anchor Links
  // ─────────────────────────────────────────

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');

      if (targetId === '#') return;

      const targetElement = document.querySelector(targetId);

      if (targetElement) {
        e.preventDefault();

        const headerHeight = header.offsetHeight;
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });

        // Close mobile menu if open
        closeMobileMenu();
      }
    });
  });

  // ─────────────────────────────────────────
  // Form Validation
  // ─────────────────────────────────────────

  const forms = document.querySelectorAll('form[data-validate]');

  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      let isValid = true;

      // Check required fields
      form.querySelectorAll('[required]').forEach(field => {
        if (!field.value.trim()) {
          isValid = false;
          field.classList.add('error');
        } else {
          field.classList.remove('error');
        }
      });

      // Check email format
      form.querySelectorAll('[type="email"]').forEach(field => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (field.value && !emailRegex.test(field.value)) {
          isValid = false;
          field.classList.add('error');
        }
      });

      if (!isValid) {
        e.preventDefault();
        return;
      }

      // El sitio no tiene backend: sin esto el formulario hacia un submit
      // nativo sin action, la pagina se recargaba con los campos limpios y
      // el visitante creia haber enviado su mensaje. No llegaba a nadie.
      // Mientras no exista un servicio de formularios, el contenido se
      // entrega por WhatsApp, que es el unico canal que hoy funciona: el
      // dominio todavia no tiene registros MX.
      e.preventDefault();
      window.open(enlaceWhatsApp(textoDelFormulario(form)), '_blank', 'noopener');
      form.reset();
    });
  });

  // ─────────────────────────────────────────
  // Reserva y formularios: entrega por WhatsApp
  // ─────────────────────────────────────────

  const TELEFONO = '56985488233';

  function enlaceWhatsApp(texto) {
    return 'https://wa.me/' + TELEFONO + '?text=' + encodeURIComponent(texto);
  }

  function textoDelFormulario(form) {
    const partes = ['Hola! Escribo desde el sitio web.'];
    form.querySelectorAll('input, select, textarea').forEach(campo => {
      const valor = (campo.value || '').trim();
      if (!valor || campo.type === 'submit' || campo.type === 'button') return;
      const etiqueta = form.querySelector('label[for="' + campo.id + '"]');
      const nombre = etiqueta ? etiqueta.textContent.trim() : (campo.name || campo.id || 'Dato');
      partes.push(nombre.replace(/\s*\*$/, '') + ': ' + valor);
    });
    return partes.join('\n');
  }

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

  // ─────────────────────────────────────────
  // Lazy Loading Images
  // ─────────────────────────────────────────

  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;

          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }

          if (img.dataset.srcset) {
            img.srcset = img.dataset.srcset;
            img.removeAttribute('data-srcset');
          }

          img.classList.add('loaded');
          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px 0px'
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }

  // ─────────────────────────────────────────
  // Booking Widget Date Handling
  // ─────────────────────────────────────────

  const checkinInput = document.querySelector('#checkin');
  const checkoutInput = document.querySelector('#checkout');

  if (checkinInput && checkoutInput) {
    // Set min date to today
    const today = new Date().toISOString().split('T')[0];
    checkinInput.min = today;
    checkoutInput.min = today;

    // Update checkout min date when checkin changes
    checkinInput.addEventListener('change', () => {
      const checkinDate = new Date(checkinInput.value);
      checkinDate.setDate(checkinDate.getDate() + 1);
      checkoutInput.min = checkinDate.toISOString().split('T')[0];

      // Clear checkout if it's before new checkin
      if (new Date(checkoutInput.value) <= new Date(checkinInput.value)) {
        checkoutInput.value = '';
      }
    });
  }

})();
