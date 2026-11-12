/* A short, on-view replay. No player dependency, video, canvas or frame loop. */
(function () {
  'use strict';
  const console = document.querySelector('[data-code-console]');
  if (!console) return;
  const tabs = [...console.querySelectorAll('[role="tab"]')];
  const panels = [...console.querySelectorAll('.code-session')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0, timer = 0, visible = false, started = false;
  function settle() {
    clearTimeout(timer);
    panels.forEach(panel => panel.classList.remove('is-playing'));
  }
  function play() {
    settle();
    if (reduced.matches || document.hidden || !visible) return;
    const panel = panels[current];
    // A single layout read restarts CSS only when the visitor requests a replay.
    void panel.offsetWidth;
    panel.classList.add('is-playing');
    timer = setTimeout(settle, 3000);
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
  });
  console.querySelector('.console-tabs').hidden = false;
  console.querySelector('[data-session-replay]').hidden = false;
  console.dataset.ready = '';
  select(0, false);
  console.querySelector('[data-session-replay]').addEventListener('click', play);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (!visible) settle();
      else if (!started) { started = true; play(); }
    }, { threshold: .25 });
    observer.observe(console);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });
  reduced.addEventListener('change', () => { if (reduced.matches) settle(); });
})();
