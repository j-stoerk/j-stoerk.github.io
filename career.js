/* The detailed timeline lives on Experience; no work runs on the homepage. */
(function () {
  'use strict';
  var timeline = document.querySelector('.career-timeline');
  if (!timeline) return;
  var entries = Array.from(timeline.querySelectorAll('.career-entry'));
  var milestones = Array.from(document.querySelectorAll('.career-milestones a'));
  var active, queued = false;
  timeline.classList.add('is-tracking');
  function draw() {
    queued = false;
    var readingLine = document.querySelector('.topbar').getBoundingClientRect().bottom + Math.min(120, innerHeight * .18);
    var selected = 0;
    entries.forEach(function (entry, index) { if (entry.getBoundingClientRect().top <= readingLine) selected = index; });
    var bounds = timeline.getBoundingClientRect();
    timeline.style.setProperty('--timeline-progress', Math.max(0, Math.min(1, (readingLine - bounds.top) / bounds.height)).toFixed(3));
    if (active === selected) return;
    active = selected;
    entries.forEach(function (entry, index) { entry.classList.toggle('is-active', index === selected); entry.classList.toggle('is-passed', index < selected); });
    milestones.forEach(function (link) {
      if (link.hash === '#' + entries[selected].id) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
    timeline.dataset.activeCareer = entries[selected].id;
    document.dispatchEvent(new CustomEvent('careerchange', { detail: entries[selected].id }));
  }
  function schedule() { if (!queued) { queued = true; requestAnimationFrame(draw); } }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  schedule();
})();
