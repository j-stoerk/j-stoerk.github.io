/* Build a finite patch of the aperiodic hat tiling. The site reveals crops of
   this single SVG, never a periodically repeated background. No generator or
   P5.js dependency is shipped to the browser. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

module.exports = function generateContactHats() {
  const vendor = path.join(__dirname, 'vendor', 'hatviz');
  const source = ['geometry.js', 'hat.js'].map(file => fs.readFileSync(path.join(vendor, file), 'utf8')).join('\n');
  const patch = vm.runInNewContext(source + `
    let states = [H_init, T_init, P_init, F_init];
    for (let step = 0; step < 4; step++) states = constructMetatiles(constructPatch(...states));
    const placements = [];
    states[0].getText(placements, ident);
    ({ shape: hat_outline, boundary: states[0].shape, placements });
  `, { cos: Math.cos, sin: Math.sin, PI: Math.PI }, { timeout: 5000 });

  const size = 1600, unit = 20;
  // The crop's corners are inside the H supertile, with another hat's margin.
  const inradius = Math.min(...patch.boundary.map((a, i) => {
    const b = patch.boundary[(i + 1) % patch.boundary.length];
    return Math.abs(a.x * b.y - a.y * b.x) / Math.hypot(b.x - a.x, b.y - a.y);
  }));
  if (inradius * unit < size / Math.SQRT2 + 80) throw new Error('Hat patch is too small for the contact crop');

  const format = value => Number(value.toFixed(5)).toString();
  const shape = patch.shape.map(p => `${format(p.x)} ${format(p.y)}`).join('L');
  const fills = { H1: '.18', H: '.075', T: '.025', P: '.045', F: '.035' };
  const tiles = [];
  for (const placement of patch.placements) {
    const [label, ...numbers] = placement.split(/\s+/);
    const m = numbers.map(Number);
    const points = patch.shape.map(p => ({
      x: (m[0] * p.x + m[1] * p.y + m[2]) * unit + size / 2,
      y: (m[3] * p.x + m[4] * p.y + m[5]) * unit + size / 2,
    }));
    if (Math.max(...points.map(p => p.x)) < 0 || Math.min(...points.map(p => p.x)) > size
      || Math.max(...points.map(p => p.y)) < 0 || Math.min(...points.map(p => p.y)) > size) continue;
    const matrix = [m[0] * unit, m[3] * unit, m[1] * unit, m[4] * unit,
      m[2] * unit + size / 2, m[5] * unit + size / 2].map(format).join(' ');
    tiles.push(`  <use href="#hat" transform="matrix(${matrix})" fill-opacity="${fills[label]}"/>`);
  }
  const license = fs.readFileSync(path.join(vendor, 'LICENSE'), 'utf8').trim();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<title>Aperiodic Einstein hat tiling</title>
<metadata><![CDATA[Generated with an adapted version of Craig S. Kaplan's hatviz:
https://github.com/isohedral/hatviz
Hat tiling: David Smith, Joseph Samuel Myers, Craig S. Kaplan, Chaim Goodman-Strauss (2023).
Recoloured and cropped for Julius Störk's portfolio.

${license}
]]></metadata>
<defs><path id="hat" d="M${shape}Z" vector-effect="non-scaling-stroke"/></defs>
<g fill="#9cbce0" stroke="#abc5e1" stroke-opacity=".5" stroke-width=".65" stroke-linejoin="round">
${tiles.join('\n')}
</g>
</svg>
`;
  fs.writeFileSync(path.join(__dirname, '..', 'images', 'contact-hat-pattern.svg'), svg);
  return { hats: tiles.length, bytes: Buffer.byteLength(svg) };
};

if (require.main === module) console.log(module.exports());
