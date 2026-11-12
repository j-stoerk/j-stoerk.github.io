/* Animate the final achievement values without replacing them with interim numbers. */
(function () {
  'use strict';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || !('IntersectionObserver' in window)) return;
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      entry.target.classList.add('metric-rise');
    });
  }, { threshold: .65 });
  document.querySelectorAll('.exp-stats .num').forEach(function (element) { observer.observe(element); });
  reduced.addEventListener('change', function () {
    if (!reduced.matches) return;
    observer.disconnect();
    document.querySelectorAll('.metric-rise').forEach(function (element) { element.classList.remove('metric-rise'); });
  });
})();
