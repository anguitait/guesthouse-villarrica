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
      'nav.weddings': 'Matrimonios',
      'nav.cowork': 'CoWork & Café',
      'nav.about': 'Nosotros',
      'nav.book': 'Reservar',
      'hero.overline': 'Villarrica, Chile',
      'hero.title': 'Despierta frente al Volcán Villarrica',
      'hero.subtitle': 'Un refugio en la naturaleza a orillas del Río Toltén. Alojamiento, experiencias y eventos en 1 hectárea de bosque nativo.',
      'hero.cta.book': 'Reservar ahora',
      'hero.cta.explore': 'Explorar',
      'booking.checkin': 'Llegada',
      'booking.checkout': 'Salida',
      'booking.guests': 'Huéspedes',
      'booking.search': 'Buscar',
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
      'newsletter.title': 'Mantente conectado',
      'newsletter.text': 'Recibe novedades, ofertas especiales y lo mejor de la Araucanía.',
      'newsletter.placeholder': 'Tu email',
      'newsletter.button': 'Suscribirse',
      'footer.description': 'Un espacio donde la naturaleza, el arte y la hospitalidad se encuentran.',
      'footer.explore': 'Explorar',
      'footer.services': 'Servicios',
      'footer.contact': 'Contacto',
      'footer.rights': 'Todos los derechos reservados.',
      'footer.privacy': 'Privacidad',
      'footer.terms': 'Términos',
      'room.night': 'noche',
      'room.people': 'personas'
    },
    en: {
      'nav.accommodation': 'Accommodation',
      'nav.experiences': 'Experiences',
      'nav.weddings': 'Weddings',
      'nav.cowork': 'CoWork & Café',
      'nav.about': 'About Us',
      'nav.book': 'Book Now',
      'hero.overline': 'Villarrica, Chile',
      'hero.title': 'Wake up facing Villarrica Volcano',
      'hero.subtitle': 'A nature retreat on the banks of the Toltén River. Accommodation, experiences and events in 1 hectare of native forest.',
      'hero.cta.book': 'Book Now',
      'hero.cta.explore': 'Explore',
      'booking.checkin': 'Check-in',
      'booking.checkout': 'Check-out',
      'booking.guests': 'Guests',
      'booking.search': 'Search',
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
      'newsletter.title': 'Stay connected',
      'newsletter.text': 'Receive news, special offers and the best of Araucanía.',
      'newsletter.placeholder': 'Your email',
      'newsletter.button': 'Subscribe',
      'footer.description': 'A space where nature, art and hospitality meet.',
      'footer.explore': 'Explore',
      'footer.services': 'Services',
      'footer.contact': 'Contact',
      'footer.rights': 'All rights reserved.',
      'footer.privacy': 'Privacy',
      'footer.terms': 'Terms',
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
      }
    });
  });

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
