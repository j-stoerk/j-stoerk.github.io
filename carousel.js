/* Accessible, low-overhead carousels shared by the homepage and blog.
   Rotation uses a single timeout per carousel—no continuous animation loop. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelectorAll('[data-carousel]').forEach(function (carousel) {
    var viewport = carousel.querySelector('[data-carousel-viewport]');
    var track = carousel.querySelector('.carousel-track');
    var slides = Array.prototype.slice.call(carousel.querySelectorAll('.carousel-slide'));
    var previous = carousel.querySelector('[data-carousel-prev]');
    var next = carousel.querySelector('[data-carousel-next]');
    var toggle = carousel.querySelector('[data-carousel-toggle]');
    var status = carousel.querySelector('[data-carousel-status]');
    var delay = Number(carousel.getAttribute('data-autoplay')) || 8000;
    var index = 0;
    var timer = 0;
    var userPaused = reduceMotion.matches;
    var hovering = false;
    var focusWithin = false;
    var touchStartX = null;

    if (!viewport || !track || slides.length < 2) return;

    carousel.setAttribute('role', 'region');
    carousel.setAttribute('aria-roledescription', 'carousel');
    slides.forEach(function (slide, slideIndex) {
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', (slideIndex + 1) + ' of ' + slides.length);
    });

    function setViewportHeight() {
      var height = slides[index].offsetHeight;
      if (height) viewport.style.height = height + 'px';
    }

    function updateToggle() {
      toggle.textContent = userPaused ? 'Play' : 'Pause';
      toggle.setAttribute('aria-label', userPaused ? 'Start automatic rotation' : 'Pause automatic rotation');
    }

    function render(instant) {
      track.style.transitionDuration = instant || reduceMotion.matches ? '0ms' : '';
      track.style.transform = 'translate3d(' + (-index * 100) + '%, 0, 0)';
      slides.forEach(function (slide, slideIndex) {
        var active = slideIndex === index;
        slide.setAttribute('aria-hidden', String(!active));
        if ('inert' in slide) slide.inert = !active;
      });
      status.textContent = (index + 1) + ' / ' + slides.length;
      requestAnimationFrame(setViewportHeight);
    }

    function clearRotation() {
      if (timer) window.clearTimeout(timer);
      timer = 0;
    }

    function schedule() {
      clearRotation();
      if (userPaused || hovering || focusWithin || document.hidden || reduceMotion.matches) return;
      timer = window.setTimeout(function () {
        index = (index + 1) % slides.length;
        render(false);
        schedule();
      }, delay);
    }

    function goTo(nextIndex, manual) {
      index = (nextIndex + slides.length) % slides.length;
      render(false);
      if (manual) {
        status.setAttribute('aria-live', 'polite');
        window.setTimeout(function () { status.removeAttribute('aria-live'); }, 500);
      }
      schedule();
    }

    previous.addEventListener('click', function () { goTo(index - 1, true); });
    next.addEventListener('click', function () { goTo(index + 1, true); });
    toggle.addEventListener('click', function () {
      userPaused = !userPaused;
      updateToggle();
      schedule();
    });

    viewport.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goTo(index - 1, true);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goTo(index + 1, true);
      }
    });

    carousel.addEventListener('mouseenter', function () {
      hovering = true;
      clearRotation();
    });
    carousel.addEventListener('mouseleave', function () {
      hovering = false;
      schedule();
    });
    carousel.addEventListener('focusin', function () {
      focusWithin = true;
      clearRotation();
    });
    carousel.addEventListener('focusout', function () {
      window.setTimeout(function () {
        focusWithin = carousel.contains(document.activeElement);
        schedule();
      }, 0);
    });

    viewport.addEventListener('touchstart', function (event) {
      touchStartX = event.changedTouches[0].clientX;
    }, { passive: true });
    viewport.addEventListener('touchend', function (event) {
      if (touchStartX === null) return;
      var distance = event.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      if (Math.abs(distance) > 45) goTo(index + (distance < 0 ? 1 : -1), true);
    }, { passive: true });

    document.addEventListener('visibilitychange', schedule);
    window.addEventListener('resize', setViewportHeight, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(setViewportHeight);
    if (reduceMotion.addEventListener) {
      reduceMotion.addEventListener('change', function () {
        if (reduceMotion.matches) userPaused = true;
        updateToggle();
        render(true);
        schedule();
      });
    }

    updateToggle();
    render(true);
    schedule();
  });
})();
