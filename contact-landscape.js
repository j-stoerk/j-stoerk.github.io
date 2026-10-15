/* Pointer-lit photo tiles. One image, a bounded grid, and no idle animation loop. */
(function () {
  'use strict';
  const section = document.querySelector('.contact-landscape');
  const grid = section?.querySelector('.contact-photo-grid');
  const photo = section?.querySelector('.contact-landscape-photo');
  if (!grid || !photo) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let tiles = [], columns = 0, rows = 0, cell = 80, frame = 0, visible = false;
  let pointer = null, previous = null, width = 0, height = 0, startX = 0, startY = 0;
  let currentTile = null;
  const timers = new Map();

  function releaseCurrent() {
    currentTile?.classList.remove('is-lit'); currentTile = null;
  }
  function reset() {
    cancelAnimationFrame(frame); frame = 0;
    timers.forEach(clearTimeout); timers.clear();
    tiles.forEach(tile => tile.classList.remove('is-lit'));
    pointer = previous = null; currentTile = null;
  }
  function build() {
    if (!visible) return;
    const rect = section.getBoundingClientRect();
    if (rect.width === width && rect.height === height) return;
    reset(); width = rect.width; height = rect.height;
    // Keep the work bounded even when the mobile form grows vertically.
    cell = Math.max(width < 600 ? 64 : 80, Math.ceil(Math.sqrt(width * height / 240)));
    const anchor = section.querySelector('.contact-landscape-content').getBoundingClientRect();
    startX = (anchor.left - rect.left) % cell - cell;
    startY = (anchor.top - rect.top) % cell - cell;
    columns = Math.ceil((width - startX) / cell); rows = Math.ceil((height - startY) / cell);
    const scale = Math.max(width / 1600, height / 1200);
    const imageWidth = 1600 * scale, imageHeight = 1200 * scale;
    grid.style.setProperty('--photo-cell', cell + 'px');
    grid.style.setProperty('--photo-cols', columns);
    grid.style.setProperty('--photo-width', imageWidth + 'px');
    grid.style.setProperty('--photo-height', imageHeight + 'px');
    grid.style.left = startX + 'px'; grid.style.top = startY + 'px';
    grid.style.width = columns * cell + 'px';
    tiles = Array.from({ length: columns * rows }, (_, i) => {
      const tile = document.createElement('span');
      tile.className = 'contact-photo-tile';
      tile.style.setProperty('--photo-x', ((width - imageWidth) / 2 - startX - i % columns * cell) + 'px');
      tile.style.setProperty('--photo-y', ((height - imageHeight) / 2 - startY - Math.floor(i / columns) * cell) + 'px');
      return tile;
    });
    grid.replaceChildren(...tiles);
  }
  function light(column, row, hold = false) {
    const tile = tiles[row * columns + column];
    if (!tile) return;
    clearTimeout(timers.get(tile));
    timers.delete(tile);
    tile.classList.add('is-lit');
    if (!hold) timers.set(tile, setTimeout(() => {
      tile.classList.remove('is-lit'); timers.delete(tile);
    }, reduced.matches ? 0 : 110));
  }
  function draw() {
    frame = 0;
    if (!visible || document.hidden || !pointer || reduced.matches) return;
    const rect = section.getBoundingClientRect();
    const x = Math.floor((pointer.x - rect.left - startX) / cell), y = Math.floor((pointer.y - rect.top - startY) / cell);
    if (x < 0 || y < 0 || x >= columns || y >= rows) { previous = null; releaseCurrent(); return; }
    const tile = tiles[y * columns + x];
    if (currentTile !== tile) releaseCurrent();
    // Fill skipped cells on a fast sweep rather than leaving holes in the trail.
    const steps = previous ? Math.max(Math.abs(x - previous.x), Math.abs(y - previous.y)) : 0;
    for (let i = 0; i <= steps; i++) {
      light(previous && steps ? Math.round(previous.x + (x - previous.x) * i / steps) : x,
        previous && steps ? Math.round(previous.y + (y - previous.y) * i / steps) : y,
        i === steps && !pointer.touch);
    }
    currentTile = pointer.touch ? null : tile;
    previous = { x, y };
  }
  section.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    pointer = { x: event.clientX, y: event.clientY, touch: false };
    if (!frame && visible && !reduced.matches) frame = requestAnimationFrame(draw);
  }, { passive: true });
  // A tap lights its tile without consuming the gesture or blocking page scrolling.
  section.addEventListener('pointerdown', event => {
    pointer = { x: event.clientX, y: event.clientY, touch: event.pointerType === 'touch' };
    if (event.pointerType === 'touch') {
      // Touch pointerleave can arrive before the next frame; show the tap now.
      previous = null;
      cancelAnimationFrame(frame);
      draw();
    } else if (!frame && visible && !reduced.matches) frame = requestAnimationFrame(draw);
  }, { passive: true });
  section.addEventListener('pointerleave', () => { pointer = previous = null; releaseCurrent(); });
  window.addEventListener('scroll', () => { previous = null; releaseCurrent(); }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  reduced.addEventListener('change', reset);
  if ('ResizeObserver' in window) new ResizeObserver(build).observe(section);
  else window.addEventListener('resize', build, { passive: true });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) build(); else reset();
    }, { rootMargin: '160px' }).observe(section);
  } else { visible = true; build(); }
})();
