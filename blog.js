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
})();
