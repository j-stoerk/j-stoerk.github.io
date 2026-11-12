/* Timed terminal transcripts. Only incoming lines trigger work; no frame loop. */
(function () {
  'use strict';
  const widget = document.querySelector('[data-code-console]');
  if (!widget) return;
  const tabs = [...widget.querySelectorAll('[role="tab"]')];
  const panels = [...widget.querySelectorAll('.code-session')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0, timer = 0, visible = false, started = false, follow = true;
  function settle() {
    clearTimeout(timer);
    panels.forEach(panel => {
      panel.classList.remove('is-playing');
      panel.querySelector('.session-scroll').setAttribute('aria-busy', 'false');
    });
  }
  function play() {
    settle();
    if (reduced.matches || document.hidden || !visible) return;
    const panel = panels[current], viewport = panel.querySelector('.session-scroll');
    let elapsed = 0, index = 0;
    const steps = [...panel.querySelectorAll('[data-session-step]')].map(element => {
      element.classList.remove('is-shown');
      if (element.dataset.type) element.style.setProperty('--type-duration', element.dataset.type + 'ms');
      elapsed += Number(element.dataset.delay) || 0;
      return { element, at: elapsed };
    });
    viewport.scrollTop = 0; follow = true;
    viewport.setAttribute('aria-busy', 'true');
    // Commit the reset once so command typing also restarts on Replay.
    void viewport.offsetHeight;
    panel.classList.add('is-playing');
    const start = performance.now();
    function advance() {
      const now = performance.now() - start;
      let last;
      // Batch lines whose deadlines fall in the same browser tick.
      while (index < steps.length && steps[index].at <= now) {
        last = steps[index++].element;
        last.classList.add('is-shown');
      }
      if (last && follow) viewport.scrollTop = Math.max(0, last.offsetTop + last.offsetHeight - viewport.clientHeight + 8);
      if (index < steps.length) timer = setTimeout(advance, Math.max(16, steps[index].at - now));
      else timer = setTimeout(settle, 450);
    }
    advance();
  }
  function select(index, focus) {
    settle(); current = index;
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    if (focus) tabs[index].focus();
    play();
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i, false));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (i + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); select(next, true); }
    });
  });
  panels.forEach((panel, i) => {
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tabs[i].id);
    panel.tabIndex = 0;
    const viewport = panel.querySelector('.session-scroll');
    // Let visitors inspect earlier output without fighting auto-follow.
    ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(event => {
      viewport.addEventListener(event, () => { follow = false; }, { passive: true });
    });
  });
  widget.querySelector('.console-tabs').hidden = false;
  widget.querySelector('[data-session-replay]').hidden = false;
  widget.dataset.ready = '';
  select(0, false);
  widget.querySelector('[data-session-replay]').addEventListener('click', play);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (!visible) settle();
      else if (!started) { started = true; play(); }
    }, { threshold: .25 });
    observer.observe(widget);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });
  reduced.addEventListener('change', () => { if (reduced.matches) settle(); });
})();
