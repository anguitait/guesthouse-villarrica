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
      'hab.magnolio.cat': 'Habitación Doble – Baño Compartido',
      'hab.magnolio.desc': 'Habitación del primer piso con cama matrimonial y piso de madera. Cuenta con un gran clóset, veladores con lámparas y un ventanal con salida directa al jardín. Comparte un baño completo con ducha con la habitación Arrayán. El desayuno no está incluido y se puede agregar por $5.000 por noche.',
      'hab.magnolio.cap': '2 huéspedes',
      'hab.magnolio.c1': 'Cama matrimonial',
      'hab.magnolio.c2': 'Baño compartido con ducha (con Arrayán)',
      'hab.magnolio.c3': 'Salida directa al jardín',
      'hab.magnolio.c4': 'Ventanal al jardín',
      'hab.arrayan.cat': 'Habitación Twin – Baño Compartido',
      'hab.arrayan.desc': 'Habitación del primer piso con dos camas y escritorio de trabajo, piso de madera y gran clóset. Ventanal con salida directa al jardín y veladores con lámparas. Comparte un baño completo con ducha con la habitación Magnolio. El desayuno no está incluido y se puede agregar por $5.000 por noche.',
      'hab.arrayan.cap': '2 huéspedes',
      'hab.arrayan.c1': '2 camas',
      'hab.arrayan.c2': 'Escritorio',
      'hab.arrayan.c3': 'Baño compartido con ducha (con Magnolio)',
      'hab.arrayan.c4': 'Salida directa al jardín',
      'hab.canelo.cat': 'Habitación Twin – Baño Exterior',
      'hab.canelo.desc': 'Habitación del primer piso con dos camas y clóset amplio, piso de madera y ventanal con salida directa al jardín. El baño completo con ducha es de uso exclusivo de la habitación y se encuentra fuera de ella. El desayuno no está incluido y se puede agregar por $5.000 por noche.',
      'hab.canelo.cap': '2 huéspedes',
      'hab.canelo.c1': '2 camas',
      'hab.canelo.c2': 'Baño exclusivo con ducha, fuera de la habitación',
      'hab.canelo.c3': 'Salida directa al jardín',
      'hab.canelo.c4': 'Ventanal al jardín',
      'hab.laurel.cat': 'Habitación Doble',
      'hab.laurel.desc': 'Habitación del primer piso con baño privado dentro de la habitación y ducha. Gran clóset, piso de madera y ventanal con salida directa al jardín. El desayuno no está incluido y se puede agregar por $5.000 por noche.',
      'hab.laurel.cap': '2 huéspedes',
      'hab.laurel.c1': 'Cama matrimonial',
      'hab.laurel.c2': 'Baño privado en la habitación, con ducha',
      'hab.laurel.c3': 'Salida directa al jardín',
      'hab.laurel.c4': 'Ventanal al jardín',
      'hab.coihue.cat': 'Suite Premium',
      'hab.coihue.desc': 'Habitación amplia del segundo piso con baño privado dentro y ducha. Cuenta con cama matrimonial y una cama chica adicional, dos veladores y una linda vista al jardín y a la piscina. Capacidad para 2 adultos y 1 niño. El desayuno no está incluido y se puede agregar por $5.000 por noche.',
      'hab.coihue.cap': '3 huéspedes',
      'hab.coihue.c1': 'Cama matrimonial + cama chica adicional',
      'hab.coihue.c2': 'Baño privado en la habitación, con ducha',
      'hab.coihue.c3': 'Vista al jardín y a la piscina',
      'hab.coihue.c4': '2 veladores',
      'hab.fuinque.cat': 'Habitación Doble Superior',
      'hab.fuinque.desc': 'Habitación del segundo piso con cama matrimonial y baño privado dentro de la habitación, con ducha y tragaluces en el techo que le dan mucha luz natural. Incluye un arrimo de clóset para la ropa. El desayuno no está incluido y se puede agregar por $5.000 por noche.',
      'hab.fuinque.cap': '2 huéspedes',
      'hab.fuinque.c1': 'Cama matrimonial',
      'hab.fuinque.c2': 'Baño privado en la habitación, con ducha',
      'hab.fuinque.c3': 'Tragaluces en el techo',
      'hab.fuinque.c4': 'Arrimo de clóset',
      'hab.tineo.cat': 'Habitación Doble',
      'hab.tineo.desc': 'Habitación del segundo piso con cama matrimonial y baño privado dentro de la habitación, con ducha. Cuenta con repisas para guardar y ordenar la ropa. El desayuno no está incluido y se puede agregar por $5.000 por noche.',
      'hab.tineo.cap': '2 huéspedes',
      'hab.tineo.c1': 'Cama matrimonial',
      'hab.tineo.c2': 'Baño privado en la habitación, con ducha',
      'hab.tineo.c3': 'Repisas para la ropa',
      'hab.tineo.c4': 'Veladores con lámparas',
      'hab.consultar': 'Consultar',
      'hab.reservar': 'Reservar',
      'hab.ver': 'Ver',
      'hab.dest.coihue.cat': 'Suite',
      'hab.dest.coihue.desc': 'Habitación amplia del segundo piso, con baño privado y vista al jardín y a la piscina. Cama matrimonial más una cama chica.',
      'hab.dest.laurel.cat': 'Doble',
      'hab.dest.laurel.desc': 'Baño privado dentro de la habitación, gran clóset y un ventanal con salida directa al jardín.',
      'hab.dest.magnolio.cat': 'Doble',
      'hab.dest.magnolio.desc': 'Cama matrimonial, piso de madera y ventanal con salida directa al jardín. Baño compartido con Arrayán.',
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
      'hab.magnolio.cat': 'Double Room – Shared Bathroom',
      'hab.magnolio.desc': 'Ground-floor room with a double bed and wooden floors. It features a large closet, bedside tables with lamps and a full-height window opening directly onto the garden. Shares a full bathroom with shower with the Arrayán room. Breakfast is not included and can be added for CLP 5,000 per night.',
      'hab.magnolio.cap': '2 guests',
      'hab.magnolio.c1': 'Double bed',
      'hab.magnolio.c2': 'Shared bathroom with shower (with Arrayán)',
      'hab.magnolio.c3': 'Direct garden access',
      'hab.magnolio.c4': 'Garden-facing picture window',
      'hab.arrayan.cat': 'Twin Room – Shared Bathroom',
      'hab.arrayan.desc': 'Ground-floor room with two beds and a work desk, wooden floors and a large closet. Full-height window with direct garden access and bedside tables with lamps. Shares a full bathroom with shower with the Magnolio room. Breakfast is not included and can be added for CLP 5,000 per night.',
      'hab.arrayan.cap': '2 guests',
      'hab.arrayan.c1': '2 beds',
      'hab.arrayan.c2': 'Desk',
      'hab.arrayan.c3': 'Shared bathroom with shower (with Magnolio)',
      'hab.arrayan.c4': 'Direct garden access',
      'hab.canelo.cat': 'Twin Room – External Bathroom',
      'hab.canelo.desc': 'Ground-floor room with two beds and a spacious closet, wooden floors and a full-height window opening onto the garden. The full bathroom with shower is for the exclusive use of this room and is located just outside it. Breakfast is not included and can be added for CLP 5,000 per night.',
      'hab.canelo.cap': '2 guests',
      'hab.canelo.c1': '2 beds',
      'hab.canelo.c2': 'Exclusive-use bathroom with shower, outside the room',
      'hab.canelo.c3': 'Direct garden access',
      'hab.canelo.c4': 'Garden-facing picture window',
      'hab.laurel.cat': 'Double Room',
      'hab.laurel.desc': 'Ground-floor room with a private en-suite bathroom with shower. Large closet, wooden floors and a full-height window opening directly onto the garden. Breakfast is not included and can be added for CLP 5,000 per night.',
      'hab.laurel.cap': '2 guests',
      'hab.laurel.c1': 'Double bed',
      'hab.laurel.c2': 'Private en-suite bathroom with shower',
      'hab.laurel.c3': 'Direct garden access',
      'hab.laurel.c4': 'Garden-facing picture window',
      'hab.coihue.cat': 'Premium Suite',
      'hab.coihue.desc': 'Spacious second-floor room with a private en-suite bathroom and shower. It has a double bed plus an extra small bed, two bedside tables and lovely views over the garden and the pool. Sleeps 2 adults and 1 child. Breakfast is not included and can be added for CLP 5,000 per night.',
      'hab.coihue.cap': '3 guests',
      'hab.coihue.c1': 'Double bed + extra small bed',
      'hab.coihue.c2': 'Private en-suite bathroom with shower',
      'hab.coihue.c3': 'Garden and pool views',
      'hab.coihue.c4': '2 bedside tables',
      'hab.fuinque.cat': 'Superior Double Room',
      'hab.fuinque.desc': 'Second-floor room with a double bed and a private en-suite bathroom with shower and ceiling skylights that fill the space with natural light. Includes a wardrobe unit for clothes. Breakfast is not included and can be added for CLP 5,000 per night.',
      'hab.fuinque.cap': '2 guests',
      'hab.fuinque.c1': 'Double bed',
      'hab.fuinque.c2': 'Private en-suite bathroom with shower',
      'hab.fuinque.c3': 'Ceiling skylights',
      'hab.fuinque.c4': 'Wardrobe unit',
      'hab.tineo.cat': 'Double Room',
      'hab.tineo.desc': 'Second-floor room with a double bed and a private en-suite bathroom with shower. It has open shelving for storing and organising clothes. Breakfast is not included and can be added for CLP 5,000 per night.',
      'hab.tineo.cap': '2 guests',
      'hab.tineo.c1': 'Double bed',
      'hab.tineo.c2': 'Private en-suite bathroom with shower',
      'hab.tineo.c3': 'Open clothing shelves',
      'hab.tineo.c4': 'Bedside tables with lamps',
      'hab.consultar': 'On request',
      'hab.reservar': 'Book',
      'hab.ver': 'View',
      'hab.dest.coihue.cat': 'Suite',
      'hab.dest.coihue.desc': 'Spacious second-floor room with a private bathroom and views over the garden and the pool. Double bed plus an extra small bed.',
      'hab.dest.laurel.cat': 'Double',
      'hab.dest.laurel.desc': 'Private en-suite bathroom, a large closet and a full-height window opening directly onto the garden.',
      'hab.dest.magnolio.cat': 'Double',
      'hab.dest.magnolio.desc': 'Double bed, wooden floors and a full-height window opening onto the garden. Bathroom shared with Arrayán.',
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
