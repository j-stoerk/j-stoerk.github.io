/* Interactive figures for blog.html.
   Both simulations are illustrative: the functional forms reproduce the
   qualitative behaviour under discussion, they are not the fitted models. */
(function () {
  'use strict';

  /* =========================================================
     Widget 1 — interference and the IGFA gate
     Sigma_A = diag(LAMBDA_1, LAMBDA_2), update length fixed.
     F(theta) = l1*cos^2 + l2*sin^2, normalised to l1.
     ========================================================= */
  var LAMBDA_1 = 1.00;   // variance along Task A's dominant direction
  var LAMBDA_2 = 0.05;   // residual variance orthogonal to it
  var TAU = 0.40;        // gate threshold on |cos(theta)|
  var CX = 140, CY = 140, LEN = 80;

  var clSlider = document.getElementById('cl-angle-slider');

  function setArrowhead(el, tipX, tipY, rad) {
    var dx = Math.cos(rad), dy = -Math.sin(rad);
    var px = -dy, py = dx;
    var bx = tipX - 10 * dx, by = tipY - 10 * dy;
    el.setAttribute('points',
      tipX + ',' + tipY + ' ' +
      (bx + 4 * px) + ',' + (by + 4 * py) + ' ' +
      (bx - 4 * px) + ',' + (by - 4 * py));
  }

  function updateVectorSim() {
    var angle = parseInt(clSlider.value, 10);
    var rad = angle * Math.PI / 180;
    var cos = Math.cos(rad), sin = Math.sin(rad);

    var rawF = LAMBDA_1 * cos * cos + LAMBDA_2 * sin * sin;      // in [l2, l1]
    var gated = Math.abs(cos) > TAU;

    // Under the gate the update becomes its projection onto the orthogonal
    // complement of the dominant direction: length |d|*sin(theta), and the
    // interference it can still cause is l2*sin^2(theta).
    var postF = gated ? LAMBDA_2 * sin * sin : rawF;
    var stepFrac = gated ? Math.abs(sin) : 1;

    document.getElementById('cl-angle-val').textContent = angle + '°';
    document.getElementById('cl-cos-val').textContent = cos.toFixed(2);

    var eRaw = document.getElementById('cl-energy-val');
    eRaw.textContent = Math.round(100 * rawF / LAMBDA_1) + '%';
    eRaw.style.color = rawF / LAMBDA_1 > 0.5 ? 'var(--color-danger)' : 'var(--color-text)';

    document.getElementById('cl-energy-post-val').textContent =
      Math.round(100 * postF / LAMBDA_1) + '%';
    document.getElementById('cl-step-val').textContent =
      Math.round(100 * stepFrac) + '%';

    var status = document.getElementById('cl-status-val');
    if (gated) {
      status.textContent = 'Projecting — Task A protected';
      status.style.color = 'var(--color-warn)';
    } else {
      status.textContent = 'Open — capacity shared';
      status.style.color = 'var(--color-ok)';
    }

    // Proposed update.
    var xB = CX + LEN * cos;
    var yB = CY - LEN * sin;
    var vecB = document.getElementById('vector-b');
    vecB.setAttribute('x2', xB);
    vecB.setAttribute('y2', yB);
    setArrowhead(document.getElementById('arrowhead-b'), xB, yB, rad);

    var labelB = document.getElementById('label-b');
    labelB.setAttribute('x', xB + 12 * cos);
    labelB.setAttribute('y', yB - 12 * sin + 4);

    // Post-gate update: vertical component only when gated, else unchanged.
    var projRad = gated ? Math.PI / 2 : rad;
    var projLen = gated ? LEN * Math.abs(sin) : LEN;
    var pX = CX + projLen * Math.cos(projRad);
    var pY = CY - projLen * Math.sin(projRad);

    var vecP = document.getElementById('vector-b-proj');
    vecP.setAttribute('x2', pX);
    vecP.setAttribute('y2', pY);
    setArrowhead(document.getElementById('arrowhead-b-proj'), pX, pY, projRad);

    var labelP = document.getElementById('label-b-proj');
    labelP.setAttribute('x', pX - 30);
    labelP.setAttribute('y', pY - 8);
    labelP.style.display = projLen < 14 ? 'none' : 'block';

    // Angle arc between Task A and the proposal.
    var arc = document.getElementById('interference-arc');
    if (angle > 2) {
      var r = 30;
      arc.setAttribute('d', 'M ' + (CX + r) + ' ' + CY + ' A ' + r + ' ' + r +
        ' 0 0 0 ' + (CX + r * cos) + ' ' + (CY - r * sin));
      arc.setAttribute('stroke', rawF / LAMBDA_1 > 0.5 ? 'var(--color-danger)' : 'var(--color-warn)');
      arc.style.display = '';
    } else {
      arc.style.display = 'none';
    }
  }

  if (clSlider) {
    clSlider.addEventListener('input', updateVectorSim);
    updateVectorSim();
  }

  /* =========================================================
     Widget 2 — calendering and the U-shape
     ========================================================= */
  var calSlider = document.getElementById('cal-comp-slider');

  var particlesData = [
    { x: 45, y: 35, rx: 22, ry: 7, rot: 35 },
    { x: 100, y: 40, rx: 24, ry: 8, rot: -20 },
    { x: 160, y: 30, rx: 20, ry: 6, rot: 55 },
    { x: 215, y: 35, rx: 23, ry: 7, rot: -45 },
    { x: 70, y: 70, rx: 25, ry: 9, rot: -10 },
    { x: 130, y: 65, rx: 21, ry: 7, rot: 40 },
    { x: 185, y: 75, rx: 24, ry: 8, rot: -30 },
    { x: 230, y: 70, rx: 19, ry: 6, rot: 15 },
    { x: 105, y: 95, rx: 26, ry: 9, rot: 5 },
    { x: 165, y: 95, rx: 22, ry: 7, rot: -15 }
  ];

  // Schematic closures. x in [0,1] is normalised compaction.
  function lamPorosity(x) { return 0.6 + 1.1 * x; }            // monotone, linear
  function lamStatic(x) { return 0.6 + 1.3 * x * x; }          // monotone, convex
  function lamCalAware(x) { return 0.6 - 0.5 * x + 1.8 * x * x * x; } // U-shaped

  // Plot box: x in [40,240], lambda in [0.2,2.0] mapped to y in [170,20].
  function mapCoords(x, lambda) {
    var X = 40 + x * 200;
    var Y = 170 - ((lambda - 0.2) / 1.8) * 150;
    return X.toFixed(1) + ',' + Y.toFixed(1);
  }

  function buildPath(fn) {
    var d = 'M ';
    for (var i = 0; i <= 40; i++) {
      var x = i / 40;
      d += (i === 0 ? '' : ' L ') + mapCoords(x, fn(x));
    }
    return d;
  }

  function updateCalenderingSim() {
    var comp = parseInt(calSlider.value, 10);
    var x = comp / 60;

    var porosity = 45 - 30 * x;                 // linear, illustrative
    var lambda = lamCalAware(x);

    document.getElementById('cal-comp-val').textContent = comp + '%';
    document.getElementById('cal-por-val').textContent = porosity.toFixed(1) + '%';
    document.getElementById('cal-cond-val').textContent = lambda.toFixed(2) + ' W/mK';

    var pressY = 10 + 42 * x;
    var plate = document.getElementById('press-plate');
    plate.setAttribute('y1', pressY);
    plate.setAttribute('y2', pressY);
    var bulk = document.getElementById('electrode-bulk');
    bulk.setAttribute('y', pressY);
    bulk.setAttribute('height', 112 - pressY);

    var group = document.getElementById('particles-group');
    var ns = 'http://www.w3.org/2000/svg';
    group.textContent = '';
    particlesData.forEach(function (p) {
      var newY = 112 - (112 - p.y) * (1 - 0.38 * x);
      var newRx = p.rx * (1 + 0.15 * x);
      var newRy = p.ry * (1 - 0.32 * x);
      var newRot = p.rot * (1 - x);      // flakes rotate toward horizontal

      var e = document.createElementNS(ns, 'ellipse');
      e.setAttribute('cx', p.x);
      e.setAttribute('cy', newY);
      e.setAttribute('rx', newRx);
      e.setAttribute('ry', newRy);
      e.setAttribute('fill', x > 0.45 ? '#5a6268' : '#6d757d');
      e.setAttribute('stroke', x > 0.45 ? 'var(--color-primary)' : '#343a40');
      e.setAttribute('stroke-width', x > 0.45 ? '1.5' : '1');
      e.setAttribute('transform', 'rotate(' + newRot + ' ' + p.x + ' ' + newY + ')');
      group.appendChild(e);
    });

    var dot = mapCoords(x, lambda).split(',');
    var plotDot = document.getElementById('plot-dot');
    plotDot.setAttribute('cx', dot[0]);
    plotDot.setAttribute('cy', dot[1]);
  }

  if (calSlider) {
    document.getElementById('path-porosity').setAttribute('d', buildPath(lamPorosity));
    document.getElementById('path-static').setAttribute('d', buildPath(lamStatic));
    document.getElementById('path-calaware').setAttribute('d', buildPath(lamCalAware));
    calSlider.addEventListener('input', updateCalenderingSim);
    updateCalenderingSim();
  }

  /* =========================================================
     Widget 3 — CausalPFN posterior concentration (schematic)
     Illustrates Proposition 1 / Figure 7 behaviour: an
     identifiable prior concentrates on the truth as context
     grows; an OOD DGP yields a narrow interval in the wrong
     place; temperature calibration widens it until it covers.
     ========================================================= */
  var cpSlider = document.getElementById('cp-n-slider');

  var CP_TRUE = 1.0;          // true effect, plot units
  var CP_X0 = 30, CP_X1 = 290, CP_BASE = 160, CP_TOP = 30;
  var CP_TMIN = 0.0, CP_TMAX = 2.0;

  function cpX(tau) { return CP_X0 + (tau - CP_TMIN) / (CP_TMAX - CP_TMIN) * (CP_X1 - CP_X0); }

  function updateCausalPFN() {
    var v = parseInt(cpSlider.value, 10);
    var N = Math.round(50 * Math.pow(10, v / 50));       // 50 .. 5000, log scale
    var ood = document.getElementById('cp-ood').checked;
    var cal = document.getElementById('cp-cal').checked;

    // Posterior sd shrinks ~1/sqrt(N); OOD is biased and overconfident.
    var sigma = 0.45 / Math.sqrt(N / 50);
    var mean = CP_TRUE;
    if (ood) { mean = CP_TRUE + 0.38; sigma *= 0.6; }
    if (cal) sigma *= (ood ? 2.6 : 1.1);
    sigma = Math.max(sigma, 0.015);

    // 90% interval: mean +/- 1.645 sigma.
    var lo = mean - 1.645 * sigma, hi = mean + 1.645 * sigma;
    var covered = CP_TRUE >= lo && CP_TRUE <= hi;

    document.getElementById('cp-n-val').textContent = N.toLocaleString('en-US');
    document.getElementById('cp-width-val').textContent = (hi - lo).toFixed(2);
    var cover = document.getElementById('cp-cover-val');
    cover.textContent = covered ? 'Yes' : 'No';
    cover.style.color = covered ? 'var(--color-ok)' : 'var(--color-danger)';

    var band = document.getElementById('cp-band');
    var bx0 = Math.max(CP_X0, cpX(lo)), bx1 = Math.min(CP_X1, cpX(hi));
    band.setAttribute('x', bx0.toFixed(1));
    band.setAttribute('width', Math.max(0, bx1 - bx0).toFixed(1));

    // Density curve, peak-normalised to the plot height.
    var d = 'M';
    for (var i = 0; i <= 80; i++) {
      var tau = CP_TMIN + (CP_TMAX - CP_TMIN) * i / 80;
      var z = (tau - mean) / sigma;
      var y = CP_BASE - (CP_BASE - CP_TOP) * Math.exp(-0.5 * z * z);
      d += (i ? ' L' : ' ') + cpX(tau).toFixed(1) + ' ' + y.toFixed(1);
    }
    document.getElementById('cp-curve').setAttribute('d', d);
  }

  if (cpSlider) {
    cpSlider.addEventListener('input', updateCausalPFN);
    document.getElementById('cp-ood').addEventListener('change', updateCausalPFN);
    document.getElementById('cp-cal').addEventListener('change', updateCausalPFN);
    updateCausalPFN();
  }

  /* =========================================================
     Widget A — the physical loop (post-physical-ai)
     A ring split into one clickable segment per stage, with
     the stage name written along the segment. The selected
     stage's constraint shows in the centre of the ring.
     ========================================================= */
  var loopSegs = document.getElementById('loop-segments');

  var LOOP = [
    ['Electricity', ['grid connection', 'price and availability', 'carbon intensity']],
    ['Chip', ['supply', 'memory bandwidth', 'utilisation']],
    ['Heat', ['rack density', 'cooling topology', 'water and heat reuse']],
    ['Inference', ['latency', 'reliability', 'concurrency']],
    ['Decision', ['uncertainty', 'safety', 'operator trust']],
    ['Actuation', ['mechanical limits', 'safe envelope', 'wear and drift']],
    ['Sensor', ['calibration', 'drift', 'context and sampling rate']]
  ];

  var LC = 100, L_RO = 90, L_RI = 56, L_RT = 73, L_SEG = 360 / LOOP.length, L_PAD = 1.6;

  function loopPt(r, deg) {
    var a = deg * Math.PI / 180;
    return [LC + r * Math.cos(a), LC + r * Math.sin(a)];
  }
  function loopFmt(p) { return p[0].toFixed(2) + ' ' + p[1].toFixed(2); }
  function loopSector(a0, a1, ro, ri) {
    var p0 = loopPt(ro, a0), p1 = loopPt(ro, a1), p2 = loopPt(ri, a1), p3 = loopPt(ri, a0);
    return 'M' + loopFmt(p0) + 'A' + ro + ' ' + ro + ' 0 0 1 ' + loopFmt(p1) +
      'L' + loopFmt(p2) + 'A' + ri + ' ' + ri + ' 0 0 0 ' + loopFmt(p3) + 'Z';
  }

  function loopSelect(idx) {
    var paths = loopSegs.querySelectorAll('.loop-segment');
    var labels = loopSegs.querySelectorAll('.loop-seg-label');
    for (var i = 0; i < paths.length; i += 1) {
      paths[i].setAttribute('aria-selected', String(i === idx));
      labels[i].classList.toggle('on', i === idx);
    }
    var center = document.getElementById('loop-center');
    center.textContent = '';
    var strong = document.createElement('strong');
    strong.textContent = LOOP[idx][0];
    var span = document.createElement('span');
    span.textContent = LOOP[idx][1].join(' · ');
    center.appendChild(strong);
    center.appendChild(span);
  }

  if (loopSegs) {
    var lns = 'http://www.w3.org/2000/svg';
    LOOP.forEach(function (stage, i) {
      var base = -90 + i * L_SEG;
      var a0 = base + L_PAD, a1 = base + L_SEG - L_PAD, mid = base + L_SEG / 2;

      var seg = document.createElementNS(lns, 'path');
      seg.setAttribute('d', loopSector(a0, a1, L_RO, L_RI));
      seg.setAttribute('class', 'loop-segment');
      seg.setAttribute('tabindex', '0');
      seg.setAttribute('role', 'button');
      seg.setAttribute('aria-label', stage[0]);
      seg.setAttribute('aria-selected', String(i === 0));
      seg.addEventListener('click', function () { loopSelect(i); });
      seg.addEventListener('keydown', function (evt) {
        if (evt.key === 'Enter' || evt.key === ' ') { loopSelect(i); evt.preventDefault(); }
      });
      loopSegs.appendChild(seg);

      // straight label, rotated tangent to the ring, kept upright
      var lp = loopPt(L_RT, mid);
      var rot = mid + 90;
      if (Math.sin(mid * Math.PI / 180) > 0.01) rot += 180;   // flip lower half
      var t = document.createElementNS(lns, 'text');
      t.setAttribute('x', lp[0].toFixed(2));
      t.setAttribute('y', lp[1].toFixed(2));
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('dominant-baseline', 'central');
      t.setAttribute('transform', 'rotate(' + rot.toFixed(2) + ' ' + lp[0].toFixed(2) + ' ' + lp[1].toFixed(2) + ')');
      t.setAttribute('class', 'loop-seg-label' + (i === 0 ? ' on' : ''));
      t.textContent = stage[0];
      loopSegs.appendChild(t);
    });
    loopSelect(0);
  }

  /* =========================================================
     Widget B - capability is not deployability (post-physical-ai)
     Draggable radar over 7 factors. Score is model capability
     gated by the weakest physical interface (blend of min/mean).
     ========================================================= */
  var radarSvg = document.getElementById('svg-radar');

  var DEP = [
    ['Model capability', 90],
    ['Sensor quality', 55],
    ['Data context', 45],
    ['Edge compute', 60],
    ['Network', 70],
    ['Energy', 65],
    ['Safe actuation', 60]
  ];
  var DEP_CX = 130, DEP_CY = 120, DEP_MAXR = 82;

  function depAngle(i) { return -Math.PI / 2 + i * (2 * Math.PI / DEP.length); }
  function depPoint(i, frac) {
    var a = depAngle(i);
    return [DEP_CX + frac * DEP_MAXR * Math.cos(a), DEP_CY + frac * DEP_MAXR * Math.sin(a)];
  }

  function updateDep() {
    var capability = DEP[0][1];
    var interfaces = DEP.slice(1).map(function (d) { return d[1]; });
    var minI = Math.min.apply(null, interfaces);
    var meanI = interfaces.reduce(function (s, v) { return s + v; }, 0) / interfaces.length;
    var gate = (0.6 * minI + 0.4 * meanI) / 100;
    var score = Math.round(capability * gate);

    document.getElementById('dep-score').textContent = score;
    var pts = DEP.map(function (d, i) {
      return depPoint(i, d[1] / 100).map(function (n) { return n.toFixed(1); }).join(',');
    });
    document.getElementById('radar-area').setAttribute('points', pts.join(' '));

    var minV = Math.min.apply(null, DEP.map(function (d) { return d[1]; }));
    DEP.forEach(function (d, i) {
      var p = depPoint(i, d[1] / 100);
      var lowest = d[1] === minV;
      var h = document.getElementById('radar-h-' + i);
      if (h) {
        h.setAttribute('cx', p[0].toFixed(1)); h.setAttribute('cy', p[1].toFixed(1));
        h.setAttribute('aria-valuenow', d[1]);
        h.classList.toggle('low', lowest);
      }
      var pct = document.getElementById('radar-pct-' + i);
      if (pct) { pct.textContent = d[1] + '%'; pct.classList.toggle('low', lowest); }
    });

    var limitEl = document.getElementById('dep-limit');
    var weakIdx = interfaces.indexOf(minI) + 1;
    if (capability >= 80 && minI <= 45) {
      limitEl.textContent = 'High capability, but ' + DEP[weakIdx][0].toLowerCase() + ' caps the system.';
    } else if (score >= 70) {
      limitEl.textContent = 'Balanced: no single interface is starving the loop.';
    } else {
      limitEl.textContent = 'Weakest link: ' + DEP[weakIdx][0].toLowerCase() + '.';
    }
  }

  if (radarSvg) {
    var rns = 'http://www.w3.org/2000/svg';
    var rGrid = document.getElementById('radar-grid');
    var rAxes = document.getElementById('radar-axes');
    var rHandles = document.getElementById('radar-handles');
    var rLabels = document.getElementById('radar-labels');

    [0.34, 0.67, 1].forEach(function (f) {
      var poly = document.createElementNS(rns, 'polygon');
      poly.setAttribute('points', DEP.map(function (d, i) { return depPoint(i, f).map(function (n) { return n.toFixed(1); }).join(','); }).join(' '));
      poly.setAttribute('fill', 'none');
      poly.setAttribute('stroke', 'var(--color-divider)');
      poly.setAttribute('stroke-width', '1');
      rGrid.appendChild(poly);
    });

    DEP.forEach(function (d, i) {
      var a = depAngle(i);
      var e = depPoint(i, 1);
      var axis = document.createElementNS(rns, 'line');
      axis.setAttribute('x1', DEP_CX); axis.setAttribute('y1', DEP_CY);
      axis.setAttribute('x2', e[0].toFixed(1)); axis.setAttribute('y2', e[1].toFixed(1));
      axis.setAttribute('stroke', 'var(--color-divider)');
      axis.setAttribute('stroke-width', '0.75');
      rAxes.appendChild(axis);

      var lp = depPoint(i, 1.24);
      var anchor = Math.cos(a) > 0.3 ? 'start' : Math.cos(a) < -0.3 ? 'end' : 'middle';
      var t = document.createElementNS(rns, 'text');
      t.setAttribute('x', lp[0].toFixed(1)); t.setAttribute('y', lp[1].toFixed(1));
      t.setAttribute('text-anchor', anchor);
      t.setAttribute('class', 'text-label-faint');
      t.setAttribute('style', 'font-size:7px');
      t.textContent = d[0];
      var pct = document.createElementNS(rns, 'tspan');
      pct.setAttribute('id', 'radar-pct-' + i);
      pct.setAttribute('class', 'radar-pct');
      pct.setAttribute('x', lp[0].toFixed(1)); pct.setAttribute('dy', '9');
      pct.setAttribute('style', 'font-size:8px');
      pct.textContent = d[1] + '%';
      t.appendChild(pct);
      rLabels.appendChild(t);

      var h = document.createElementNS(rns, 'circle');
      h.setAttribute('id', 'radar-h-' + i);
      h.setAttribute('r', '4.5');
      h.setAttribute('stroke', 'var(--color-bg)');
      h.setAttribute('stroke-width', '1.5');
      h.setAttribute('class', 'radar-handle');
      h.setAttribute('tabindex', '0');
      h.setAttribute('role', 'slider');
      h.setAttribute('aria-label', d[0]);
      h.setAttribute('aria-valuemin', '0');
      h.setAttribute('aria-valuemax', '100');
      h.setAttribute('aria-valuenow', d[1]);
      rHandles.appendChild(h);
    });

    function svgPoint(evt) {
      var pt = radarSvg.createSVGPoint();
      pt.x = evt.clientX; pt.y = evt.clientY;
      return pt.matrixTransform(radarSvg.getScreenCTM().inverse());
    }
    function setFromPointer(i, evt) {
      var p = svgPoint(evt);
      var a = depAngle(i);
      var proj = (p.x - DEP_CX) * Math.cos(a) + (p.y - DEP_CY) * Math.sin(a);
      var frac = Math.max(0.03, Math.min(1, proj / DEP_MAXR));
      DEP[i][1] = Math.round(frac * 100);
      updateDep();
    }

    var dragging = null;
    DEP.forEach(function (d, i) {
      var h = document.getElementById('radar-h-' + i);
      h.addEventListener('pointerdown', function (evt) {
        dragging = i; h.setPointerCapture(evt.pointerId); evt.preventDefault();
      });
      h.addEventListener('pointermove', function (evt) {
        if (dragging === i) setFromPointer(i, evt);
      });
      h.addEventListener('pointerup', function (evt) {
        dragging = null;
        try { h.releasePointerCapture(evt.pointerId); } catch (err) { }
      });
      h.addEventListener('keydown', function (evt) {
        var step = (evt.key === 'ArrowUp' || evt.key === 'ArrowRight') ? 5 :
          (evt.key === 'ArrowDown' || evt.key === 'ArrowLeft') ? -5 : 0;
        if (step) {
          DEP[i][1] = Math.max(0, Math.min(100, DEP[i][1] + step));
          updateDep(); evt.preventDefault();
        }
      });
    });

    updateDep();
  }

  /* ============================================================
     post-dendrites-dandelions widgets
     ============================================================ */
  var NS = 'http://www.w3.org/2000/svg';
  function svel(parent, tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  }
  // t in [0,1] blends red -> orange -> green (0 = bad, 1 = good).
  function mixColor(t) {
    t = Math.max(0, Math.min(1, t));
    var R = [197, 55, 44], O = [216, 138, 31], G = [31, 140, 74], a, b, f;
    if (t < 0.5) { a = R; b = O; f = t / 0.5; } else { a = O; b = G; f = (t - 0.5) / 0.5; }
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * f) + ',' +
      Math.round(a[1] + (b[1] - a[1]) * f) + ',' + Math.round(a[2] + (b[2] - a[2]) * f) + ')';
  }

  /* D1 — weakest defect sets J_crit (J ~ c^-3/2) */
  var ddC = document.getElementById('dd-c');
  if (ddC) {
    var DD_K = 8216;                          // J = K / c^1.5  [mA/cm2], anchored J(30)=50
    var LMIN = -0.3, LMAX = 3.3;              // log10 J axis
    function ddX(c) { return 45 + (c - 5) / 55 * 240; }
    function ddY(j) { return 170 - (Math.log(j) / Math.LN10 - LMIN) / (LMAX - LMIN) * 150; }
    var ddGrid = document.getElementById('dd1-grid');
    [1, 10, 100, 1000].forEach(function (j) {
      var y = ddY(j);
      svel(ddGrid, 'line', { x1: 45, y1: y, x2: 285, y2: y, stroke: 'var(--color-divider)', 'stroke-width': 1 });
      svel(ddGrid, 'text', { x: 42, y: y + 3, 'text-anchor': 'end', 'class': 'text-tick' }).textContent = j;
    });
    [5, 20, 40, 60].forEach(function (c) {
      svel(ddGrid, 'text', { x: ddX(c), y: 182, 'text-anchor': 'middle', 'class': 'text-tick' }).textContent = c;
    });
    var ddCurve = document.getElementById('dd1-curve');
    var dd = 'M';
    for (var c = 5; c <= 60; c += 1) dd += (c === 5 ? '' : ' L') + ddX(c).toFixed(1) + ' ' + ddY(DD_K / Math.pow(c, 1.5)).toFixed(1);
    ddCurve.setAttribute('d', dd);
    var ddExp = document.getElementById('dd1-exp');
    ddExp.setAttribute('y1', ddY(1)); ddExp.setAttribute('y2', ddY(1));
    svel(document.getElementById('svg-dd1'), 'text', { x: 48, y: ddY(1) - 3, 'class': 'text-label-faint', style: 'font-size:8px' }).textContent = 'measured band';
    var DD_LO = Math.log(DD_K / Math.pow(60, 1.5)), DD_HI = Math.log(DD_K / Math.pow(5, 1.5));
    function ddUpdate() {
      var c = parseInt(ddC.value, 10);
      var j = DD_K / Math.pow(c, 1.5);
      // high J_crit = tolerant of dendrites = good (green); low = bad (red)
      var color = mixColor((Math.log(j) - DD_LO) / (DD_HI - DD_LO));
      document.getElementById('dd-c-val').textContent = c + ' µm';
      var jv = document.getElementById('dd-j');
      jv.textContent = (j >= 100 ? Math.round(j / 10) * 10 : j.toFixed(0)) + ' mA/cm²';
      jv.style.color = color;
      document.getElementById('dd-ratio').textContent = '≈ ' + Math.round(j) + '×';
      var dot = document.getElementById('dd1-dot');
      dot.setAttribute('cx', ddX(c)); dot.setAttribute('cy', ddY(j)); dot.setAttribute('fill', color);
    }
    ddC.addEventListener('input', ddUpdate);
    ddUpdate();
  }

  /* D2 — three regimes: stable / subcritical / catastrophic */
  var ddJ = document.getElementById('dd-J');
  if (ddJ) {
    var ddTe = document.getElementById('dd-te');
    function d2x(pct) { return 45 + pct / 110 * 240; }
    function d2Update() {
      var J = parseInt(ddJ.value, 10), teN = parseInt(ddTe.value, 10) / 100;
      var Jsub = 30 + 40 * (1 - teN);
      document.getElementById('dd-J-val').textContent = J + '%';
      document.getElementById('dd-te-val').textContent = teN.toFixed(2);
      var xs = d2x(Jsub), xc = d2x(100);
      var st = document.getElementById('dd2-stable'); st.setAttribute('width', Math.max(0, xs - 45));
      var su = document.getElementById('dd2-sub'); su.setAttribute('x', xs); su.setAttribute('width', Math.max(0, xc - xs));
      var cr = document.getElementById('dd2-crit'); cr.setAttribute('x', xc); cr.setAttribute('width', 285 - xc);
      var mk = document.getElementById('dd2-mark'); mk.setAttribute('x1', d2x(J)); mk.setAttribute('x2', d2x(J));
      var sx = document.getElementById('dd2-subx'); sx.setAttribute('x', xs);
      var regime = document.getElementById('dd-regime'), tau = document.getElementById('dd-tau');
      if (J >= 100) {
        regime.textContent = 'Catastrophic'; regime.style.color = 'var(--color-danger)';
        tau.textContent = '≈ seconds';
      } else if (J >= Jsub) {
        var th = 300 / (teN * J);
        if (th > 48) { regime.textContent = 'Suppressed'; regime.style.color = 'var(--color-ok)'; tau.textContent = '> 2 days'; }
        else {
          regime.textContent = 'Subcritical growth'; regime.style.color = 'var(--color-warn)';
          tau.textContent = th < 1 ? Math.round(th * 60) + ' min' : th.toFixed(1) + ' h';
        }
      } else {
        regime.textContent = 'Stable'; regime.style.color = 'var(--color-ok)';
        tau.textContent = '—';
      }
    }
    ddJ.addEventListener('input', d2Update);
    ddTe.addEventListener('input', d2Update);
    d2Update();
  }

  /* ============================================================
     post-race-to-on widgets
     ============================================================ */
  /* O1 — attention cost scaling (log-log) */
  var onT = document.getElementById('on-t');
  if (onT) {
    function denseOps(T) { return 0.5 * T * T; }
    function linOps(T) { return 128 * T; }
    function selOps(T) { return 128 * T + (128 / 52000) * T * T; }
    function o1x(v) { return 46 + (v - 17) / 7 * 242; }
    function o1y(ops) { return 172 - (Math.log(ops) / Math.LN10 - 7) / 8 * 156; }
    var o1grid = document.getElementById('on1-grid');
    [[8, '10⁸'], [10, '10¹⁰'], [12, '10¹²'], [14, '10¹⁴']].forEach(function (g) {
      var y = o1y(Math.pow(10, g[0]));
      svel(o1grid, 'line', { x1: 46, y1: y, x2: 288, y2: y, stroke: 'var(--color-divider)', 'stroke-width': 1 });
      svel(o1grid, 'text', { x: 43, y: y + 3, 'text-anchor': 'end', 'class': 'text-tick' }).textContent = g[1];
    });
    [[17, '128K'], [20, '1M'], [24, '16M']].forEach(function (g) {
      svel(o1grid, 'text', { x: o1x(g[0]), y: 184, 'text-anchor': 'middle', 'class': 'text-tick' }).textContent = g[1];
    });
    function o1path(id, fn) {
      var d = 'M';
      for (var v = 17; v <= 24; v += 0.1) d += (v === 17 ? '' : ' L') + o1x(v).toFixed(1) + ' ' + o1y(fn(Math.pow(2, v))).toFixed(1);
      document.getElementById(id).setAttribute('d', d);
    }
    o1path('on1-dense', denseOps); o1path('on1-sel', selOps); o1path('on1-lin', linOps);
    var o1svg = document.getElementById('svg-on1');
    function o1dot(color) { return svel(o1svg, 'circle', { r: 4, fill: color, stroke: 'var(--color-bg)', 'stroke-width': 1.5 }); }
    var o1dD = o1dot('var(--color-danger)'), o1dS = o1dot('var(--color-warn)'), o1dL = o1dot('var(--color-ok)');
    function fmtOps(x) {
      if (x >= 1e12) return (x / 1e12).toFixed(1) + ' T';
      if (x >= 1e9) return (x / 1e9).toFixed(0) + ' G';
      if (x >= 1e6) return (x / 1e6).toFixed(0) + ' M';
      return Math.round(x).toString();
    }
    function fmtT(T) { return T >= 1e6 ? (T / 1e6).toFixed(1) + 'M' : Math.round(T / 1e3) + 'K'; }
    function o1Update() {
      var v = parseFloat(onT.value), T = Math.pow(2, v);
      document.getElementById('on-t-val').textContent = fmtT(T);
      document.getElementById('on-dense').textContent = fmtOps(denseOps(T));
      document.getElementById('on-lin').textContent = fmtOps(linOps(T));
      document.getElementById('on-sel').textContent = fmtOps(selOps(T));
      var vt = document.getElementById('on1-vt'); vt.setAttribute('x1', o1x(v)); vt.setAttribute('x2', o1x(v));
      o1dD.setAttribute('cx', o1x(v)); o1dD.setAttribute('cy', o1y(denseOps(T)));
      o1dS.setAttribute('cx', o1x(v)); o1dS.setAttribute('cy', o1y(selOps(T)));
      o1dL.setAttribute('cx', o1x(v)); o1dL.setAttribute('cy', o1y(linOps(T)));
    }
    onT.addEventListener('input', o1Update);
    o1Update();
  }

  /* O2 — routing absorption bars */
  var raBars = document.getElementById('ra-bars');
  if (raBars) {
    var RA = [
      { learned: 48.73, random: 49.83, gap: '1.10 ppl', verdict: 'Barely wins (≈9% of oracle)' },
      { learned: 71.22, random: 71.24, gap: '0.02 ppl', verdict: 'Indistinguishable' }
    ];
    function raDraw(idx) {
      raBars.textContent = '';
      var d = RA[idx];
      var lo = Math.min(d.learned, d.random) - 2, hi = Math.max(d.learned, d.random) + 1;
      function by(v) { return 150 - (v - lo) / (hi - lo) * 128; }
      [['Learned', d.learned, 'var(--color-primary)', 96], ['Frozen random', d.random, 'var(--color-text-faint)', 168]].forEach(function (b) {
        var y = by(b[1]);
        svel(raBars, 'rect', { x: b[3], y: y, width: 60, height: 150 - y, rx: 3, fill: b[2] });
        svel(raBars, 'text', { x: b[3] + 30, y: y - 5, 'text-anchor': 'middle', 'class': 'fig-label-primary' }).textContent = b[1].toFixed(2);
        svel(raBars, 'text', { x: b[3] + 30, y: 165, 'text-anchor': 'middle', 'class': 'text-tick' }).textContent = b[0];
      });
      svel(raBars, 'text', { x: 168, y: 182, 'text-anchor': 'middle', 'class': 'text-label-faint' }).textContent = 'perplexity (lower is better)';
      document.getElementById('ra-gap').textContent = d.gap;
      document.getElementById('ra-verdict').textContent = d.verdict;
    }
    var raTabs = document.querySelectorAll('[data-ra]');
    raTabs.forEach(function (t, i) {
      t.addEventListener('click', function () {
        raTabs.forEach(function (o, j) { o.setAttribute('aria-selected', String(i === j)); });
        raDraw(i);
      });
    });
    raDraw(0);
  }

  /* ============================================================
     post-optimizing-reasoning widgets
     ============================================================ */
  /* R1 — inverted-U: CoT length vs accuracy */
  var rrLen = document.getElementById('rr-len');
  if (rrLen) {
    var rrCap = document.getElementById('rr-cap');
    function rrTokens(l) { return Math.round(20 * Math.pow(150, l / 100)); }
    function r1x(l) { return 44 + l / 100 * 244; }
    function r1y(a) { return 170 - (a - 0.1) / 0.9 * 154; }
    var r1grid = document.getElementById('rr1-grid');
    [0.25, 0.5, 0.75, 1.0].forEach(function (a) {
      var y = r1y(a);
      svel(r1grid, 'line', { x1: 44, y1: y, x2: 288, y2: y, stroke: 'var(--color-divider)', 'stroke-width': 1 });
      svel(r1grid, 'text', { x: 41, y: y + 3, 'text-anchor': 'end', 'class': 'text-tick' }).textContent = Math.round(a * 100) + '%';
    });
    function r1Update() {
      var l = parseInt(rrLen.value, 10), cap = parseInt(rrCap.value, 10);
      var lenOpt = 70 - 0.45 * cap, accMax = 0.55 + 0.004 * cap, floor = 0.2, w = 24;
      function acc(x) { return floor + (accMax - floor) * Math.exp(-Math.pow((x - lenOpt) / w, 2)); }
      var d = 'M';
      for (var x = 0; x <= 100; x += 2) d += (x === 0 ? '' : ' L') + r1x(x).toFixed(1) + ' ' + r1y(acc(x)).toFixed(1);
      document.getElementById('rr1-curve').setAttribute('d', d);
      var opt = document.getElementById('rr1-opt'); opt.setAttribute('x1', r1x(lenOpt)); opt.setAttribute('x2', r1x(lenOpt));
      var dot = document.getElementById('rr1-dot'); dot.setAttribute('cx', r1x(l)); dot.setAttribute('cy', r1y(acc(l)));
      document.getElementById('rr-len-val').textContent = rrTokens(l) + ' tok';
      document.getElementById('rr-cap-val').textContent = cap < 34 ? 'Base' : cap < 67 ? 'Strong' : 'Frontier';
      document.getElementById('rr-acc').textContent = Math.round(acc(l) * 100) + '%';
      document.getElementById('rr-opt').textContent = '≈ ' + rrTokens(lenOpt) + ' tok';
    }
    rrLen.addEventListener('input', r1Update);
    rrCap.addEventListener('input', r1Update);
    r1Update();
  }

  /* R2 — effort vs faithfulness */
  var rrEff = document.getElementById('rr-eff');
  if (rrEff) {
    var rrFr = document.getElementById('rr-fr');
    function r2x(e) { return 44 + e / 100 * 244; }
    function r2y(v) { return 170 - v * 154; }
    var r2grid = document.getElementById('rr2-grid');
    [0.25, 0.5, 0.75, 1.0].forEach(function (v) {
      var y = r2y(v);
      svel(r2grid, 'line', { x1: 44, y1: y, x2: 288, y2: y, stroke: 'var(--color-divider)', 'stroke-width': 1 });
      svel(r2grid, 'text', { x: 41, y: y + 3, 'text-anchor': 'end', 'class': 'text-tick' }).textContent = Math.round(v * 100) + '%';
    });
    document.getElementById('rr2-ceil').setAttribute('y1', r2y(0.2));
    document.getElementById('rr2-ceil').setAttribute('y2', r2y(0.2));
    var rr2svg = document.getElementById('svg-rr2');
    function rr2dot(c) { return svel(rr2svg, 'circle', { r: 4, fill: c, stroke: 'var(--color-bg)', 'stroke-width': 1.5 }); }
    var rr2da = rr2dot('var(--color-primary)'), rr2df = rr2dot('var(--color-danger)');
    function acc2(e) { return 0.5 + 0.4 * (1 - Math.exp(-e / 28)); }
    function faith2(e, r) { return r ? 0.4 + 0.42 * (1 - Math.exp(-e / 30)) : 0.12 + 0.08 * (1 - Math.exp(-e / 22)); }
    function r2Update() {
      var e = parseInt(rrEff.value, 10), r = rrFr.checked;
      function pathOf(fn) { var d = 'M'; for (var x = 0; x <= 100; x += 2) d += (x === 0 ? '' : ' L') + r2x(x).toFixed(1) + ' ' + r2y(fn(x)).toFixed(1); return d; }
      document.getElementById('rr2-acc').setAttribute('d', pathOf(acc2));
      document.getElementById('rr2-faith').setAttribute('d', pathOf(function (x) { return faith2(x, r); }));
      var mk = document.getElementById('rr2-mark'); mk.setAttribute('x1', r2x(e)); mk.setAttribute('x2', r2x(e));
      rr2da.setAttribute('cx', r2x(e)); rr2da.setAttribute('cy', r2y(acc2(e)));
      rr2df.setAttribute('cx', r2x(e)); rr2df.setAttribute('cy', r2y(faith2(e, r)));
      var LV = ['Light', 'Low', 'Medium', 'High', 'Heavy', 'Ultra'];
      document.getElementById('rr-eff-val').textContent = LV[Math.min(5, Math.floor(e / 17))];
      document.getElementById('rr-acc2').textContent = Math.round(acc2(e) * 100) + '%';
      var f = document.getElementById('rr-faith');
      f.textContent = Math.round(faith2(e, r) * 100) + '%';
      f.style.color = faith2(e, r) < 0.25 ? 'var(--color-danger)' : 'var(--color-ok)';
    }
    rrEff.addEventListener('input', r2Update);
    rrFr.addEventListener('change', r2Update);
    r2Update();
  }


  /* ============================================================
     post-student-becomes-teacher widgets
     ============================================================ */
  /* MV — majority vote is not truth (live Monte Carlo) */
  var mvP = document.getElementById('mv-p');
  if (mvP) {
    var mvRho = document.getElementById('mv-rho');
    var mvBars = document.getElementById('mv-bars');
    var MV_LBL = ['A', 'B', 'C', 'D'];      // A = truth (0); B = shared blind spot
    var MV_MAX = 200, MV_MIN = 15, MV_THRESH = 0.60;
    var mvCounts, mvTotal, mvLocked, mvTimer = null;

    function mvLead() { var l = 0; for (var k = 1; k < 4; k++) if (mvCounts[k] > mvCounts[l]) l = k; return l; }
    function mvDraw() {
      mvBars.textContent = '';
      var base = 162, top = 22, H = base - top, bw = 42, gap = (236 - 4 * bw) / 3;
      var lead = mvLead(), cons = mvTotal ? mvCounts[lead] / mvTotal : 0;
      for (var i = 0; i < 4; i++) {
        var x = 52 + i * (bw + gap);
        var share = mvTotal ? mvCounts[i] / mvTotal : 0, h = share * H;
        var color = (i === 0) ? 'var(--color-primary-highlight)' : 'var(--color-surface-2)';
        if (mvLocked && i === lead) color = (lead === 0) ? 'var(--color-ok)' : 'var(--color-danger)';
        svel(mvBars, 'rect', { x: x, y: base - h, width: bw, height: h, rx: 2, fill: color });
        svel(mvBars, 'text', { x: x + bw / 2, y: 174, 'text-anchor': 'middle', 'class': 'text-tick' }).textContent = MV_LBL[i] + (i === 0 ? ' ✓' : '');
        if (share > 0.02) svel(mvBars, 'text', { x: x + bw / 2, y: base - h - 3, 'text-anchor': 'middle', 'class': 'text-label-faint' }).textContent = Math.round(share * 100) + '%';
      }
      var ty = base - MV_THRESH * H;
      var th = document.getElementById('mv-thresh'); th.setAttribute('y1', ty); th.setAttribute('y2', ty);
      document.getElementById('mv-n').textContent = 'n = ' + mvTotal;
      document.getElementById('mv-cons').textContent = Math.round(cons * 100) + '%';
      var lab = document.getElementById('mv-label');
      if (mvLocked) { lab.textContent = MV_LBL[lead] + (lead === 0 ? ' (correct)' : ' (WRONG)'); lab.style.color = lead === 0 ? 'var(--color-ok)' : 'var(--color-danger)'; }
      else { lab.textContent = '… voting'; lab.style.color = 'var(--color-text-muted)'; }
    }
    function mvSample() {
      var p = parseInt(mvP.value, 10) / 100, rho = parseInt(mvRho.value, 10) / 100;
      if (Math.random() < p) return 0;                 // truth
      if (Math.random() < rho) return 1;               // shared blind spot B
      return 1 + Math.floor(Math.random() * 3);        // uniform over B/C/D
    }
    function mvStop() { if (mvTimer) { clearInterval(mvTimer); mvTimer = null; } }
    function mvTick() {
      mvCounts[mvSample()]++; mvTotal++;
      var lead = mvLead(), cons = mvCounts[lead] / mvTotal;
      if ((mvTotal >= MV_MIN && cons >= MV_THRESH) || mvTotal >= MV_MAX) { mvLocked = true; mvStop(); }
      mvDraw();
    }
    function mvStart() { mvStop(); mvCounts = [0, 0, 0, 0]; mvTotal = 0; mvLocked = false; mvDraw(); mvTimer = setInterval(mvTick, 45); }
    mvP.addEventListener('input', function () { document.getElementById('mv-p-val').textContent = mvP.value + '%'; mvStart(); });
    mvRho.addEventListener('input', function () { document.getElementById('mv-rho-val').textContent = (parseInt(mvRho.value, 10) / 100).toFixed(2); mvStart(); });
    document.getElementById('mv-run').addEventListener('click', mvStart);
    document.getElementById('mv-p-val').textContent = mvP.value + '%';
    document.getElementById('mv-rho-val').textContent = (parseInt(mvRho.value, 10) / 100).toFixed(2);
    mvStart();
  }

  /* DC — the degenerate basin (gradient descent on a two-basin loss) */
  var dcM = document.getElementById('dc-m');
  if (dcM) {
    var dcHeat = document.getElementById('dc-heat');
    var dcMarks = document.getElementById('dc-marks');
    var dcPath = document.getElementById('dc-path');
    var dcBall = document.getElementById('dc-ball');
    var PX0 = 36, PX1 = 288, PY0 = 20, PY1 = 180;
    var A = [0.72, 0.30], B = [0.30, 0.66], S = [0.42, 0.58];  // informative, mirror, start
    var dcTimer = null;
    function sx(u) { return PX0 + u * (PX1 - PX0); }
    function sy(v) { return PY0 + v * (PY1 - PY0); }
    function g2(u, v, c, w) { var du = u - c[0], dv = v - c[1]; return Math.exp(-(du * du + dv * dv) / (w * w)); }
    function loss(u, v, m) {
      return 0.95 - 0.70 * g2(u, v, A, 0.20) - 0.62 * g2(u, v, B, 0.17) + (m / 0.05) * 0.85 * g2(u, v, B, 0.15);
    }
    function dcHeatmap(m) {
      dcHeat.textContent = '';
      var NX = 26, NY = 17, lo = 1e9, hi = -1e9, vals = [], i, j, u, v, L;
      for (j = 0; j < NY; j++) for (i = 0; i < NX; i++) { u = (i + 0.5) / NX; v = (j + 0.5) / NY; L = loss(u, v, m); vals.push(L); if (L < lo) lo = L; if (L > hi) hi = L; }
      var cw = (PX1 - PX0) / NX, ch = (PY1 - PY0) / NY, idx = 0;
      for (j = 0; j < NY; j++) for (i = 0; i < NX; i++) {
        var t = (vals[idx++] - lo) / (hi - lo);
        svel(dcHeat, 'rect', { x: PX0 + i * cw, y: PY0 + j * ch, width: cw + 0.6, height: ch + 0.6, fill: 'var(--color-primary)', opacity: ((1 - t) * 0.55).toFixed(3) });
      }
    }
    function dcMark(c, label) {
      svel(dcMarks, 'circle', { cx: sx(c[0]), cy: sy(c[1]), r: 3, fill: 'none', stroke: 'var(--color-text)', 'stroke-width': 1 });
      svel(dcMarks, 'text', { x: sx(c[0]), y: sy(c[1]) - 6, 'text-anchor': 'middle', 'class': 'text-label-faint', style: 'font-size:8px' }).textContent = label;
    }
    function dcDescent(m) {
      var u = S[0], v = S[1], lr = 0.03, e = 0.004, pts = [[u, v]], s;
      for (s = 0; s < 110; s++) {
        var gu = (loss(u + e, v, m) - loss(u - e, v, m)) / (2 * e);
        var gv = (loss(u, v + e, m) - loss(u, v - e, m)) / (2 * e);
        u = Math.max(0, Math.min(1, u - lr * gu)); v = Math.max(0, Math.min(1, v - lr * gv));
        pts.push([u, v]);
      }
      return pts;
    }
    function dcStop() { if (dcTimer) { clearInterval(dcTimer); dcTimer = null; } }
    function dcRun() {
      dcStop();
      var m = parseInt(dcM.value, 10) / 100;
      dcHeatmap(m);
      dcMarks.textContent = '';
      dcMark(A, 'informative'); dcMark(B, 'mirror');
      var pts = dcDescent(m), end = pts[pts.length - 1];
      var toA = (end[0] - A[0]) * (end[0] - A[0]) + (end[1] - A[1]) * (end[1] - A[1]);
      var toB = (end[0] - B[0]) * (end[0] - B[0]) + (end[1] - B[1]) * (end[1] - B[1]);
      var reachedA = toA < toB;
      document.getElementById('dc-basin').textContent = '…';
      document.getElementById('dc-score').textContent = '…';
      dcPath.setAttribute('d', '');
      var i = 0;
      dcTimer = setInterval(function () {
        i += 2;
        if (i >= pts.length) {
          i = pts.length - 1; dcStop();
          document.getElementById('dc-basin').textContent = reachedA ? 'Informative' : 'Mirror (degenerate)';
          var sc = document.getElementById('dc-score');
          sc.textContent = reachedA ? '0.637' : '0.551';
          sc.style.color = reachedA ? 'var(--color-ok)' : 'var(--color-danger)';
        }
        var d = 'M', k;
        for (k = 0; k <= i; k++) d += (k ? ' L' : '') + sx(pts[k][0]).toFixed(1) + ' ' + sy(pts[k][1]).toFixed(1);
        dcPath.setAttribute('d', d);
        dcBall.setAttribute('cx', sx(pts[i][0])); dcBall.setAttribute('cy', sy(pts[i][1]));
      }, 28);
    }
    dcM.addEventListener('input', function () { document.getElementById('dc-m-val').textContent = (parseInt(dcM.value, 10) / 100).toFixed(2); dcRun(); });
    document.getElementById('dc-run').addEventListener('click', dcRun);
    document.getElementById('dc-m-val').textContent = (parseInt(dcM.value, 10) / 100).toFixed(2);
    dcRun();
  }

})();
