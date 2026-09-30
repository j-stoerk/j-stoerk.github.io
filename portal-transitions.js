/* Publication portals use ordinary document navigation and bounded animations.
   Native cross-document transitions can stall history rendering in Chromium. */
(function () {
  'use strict';
  const key = 'portfolio-paper-visit';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let navigating = false;
  function motionAllowed() {
    let preference = null;
    try { preference = localStorage.getItem('portfolio-motion'); } catch (_) { }
    return !reduced.matches && preference !== 'paused' && !document.documentElement.classList.contains('motion-paused') && !!Element.prototype.animate;
  }
  function readVisit() { try { return JSON.parse(sessionStorage.getItem(key)); } catch (_) { return null; } }
  function saveVisit(visit) { try { sessionStorage.setItem(key, JSON.stringify(visit)); } catch (_) { /* Navigation remains available without storage. */ } }
  function clearFlight() { document.querySelectorAll('.portal-flight').forEach(e => e.remove()); navigating = false; }
  function flight(figure, from, to) {
    const art = figure.querySelector('svg');
    if (!art) return Promise.resolve();
    const overlay = document.createElement('div');
    overlay.className = 'portal-flight'; overlay.setAttribute('aria-hidden', 'true'); overlay.inert = true;
    const clone = art.cloneNode(true);
    clone.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
    clone.removeAttribute('aria-labelledby');
    clone.querySelectorAll('[style]').forEach(e => { e.style.strokeDashoffset = '0'; });
    overlay.appendChild(clone);
    Object.assign(overlay.style, { left: to.left + 'px', top: to.top + 'px', width: to.width + 'px', height: to.height + 'px' });
    document.body.appendChild(overlay);
    const transform = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
    const animation = overlay.animate([{ transform, opacity: .85 }, { transform: 'none', opacity: 1 }], { duration: 340, easing: 'cubic-bezier(.22,.7,.2,1)', fill: 'forwards' });
    return new Promise(resolve => {
      let done = false;
      const finish = () => { if (done) return; done = true; clearTimeout(timer); animation.cancel(); overlay.remove(); resolve(); };
      const timer = setTimeout(finish, 450);
      animation.finished.then(finish, finish);
    });
  }
  function expandedBox() {
    const main = document.querySelector('main').getBoundingClientRect();
    return { left: main.left, top: Math.min(130, innerHeight * .18), width: main.width, height: Math.min(460, innerHeight * .55) };
  }
  document.querySelectorAll('.publication-portal').forEach(link => {
    link.addEventListener('click', async event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const figure = link.querySelector('[data-paper]');
      if (!figure || navigating) return;
      saveVisit({ paper: figure.dataset.paper, from: location.pathname, to: new URL(link.href).pathname, time: Date.now(), scroll: scrollY, width: innerWidth, cardTop: figure.getBoundingClientRect().top });
      if (!motionAllowed()) return;
      event.preventDefault(); navigating = true;
      try { await flight(figure, figure.getBoundingClientRect(), expandedBox()); }
      finally { location.assign(link.href); }
    });
  });
  window.addEventListener('pageshow', event => {
    clearFlight();
    const visit = readVisit();
    if (!visit || !['forgetting', 'calendering'].includes(visit.paper) || Date.now() - visit.time > 15 * 60 * 1000) return;
    const article = document.querySelector('.post-cover[data-paper="' + visit.paper + '"]');
    if (article && location.pathname === visit.to) {
      if (motionAllowed()) article.animate([{ opacity: .45, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'ease-out' });
      return;
    }
    const navigation = performance.getEntriesByType('navigation')[0];
    if (location.pathname !== visit.from || !(event.persisted || navigation?.type === 'back_forward')) return;
    // Interactive panels change the initial document height. Restore the exact
    // source position after their layout, or the card offset if width changed.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const figure = document.querySelector('.publication-portal [data-paper="' + visit.paper + '"]');
      if (!figure) return;
      if (Number.isFinite(visit.scroll)) {
        const top = innerWidth === visit.width ? visit.scroll : scrollY + figure.getBoundingClientRect().top - clampOffset(visit.cardTop);
        window.scrollTo({ top, behavior: 'instant' });
      }
      const rect = figure.getBoundingClientRect();
      if (motionAllowed() && rect.bottom > 0 && rect.top < innerHeight) flight(figure, expandedBox(), rect);
    }));
  });
  function clampOffset(offset) { return Math.max(100, Math.min(innerHeight / 2, Number(offset) || 100)); }
})();
