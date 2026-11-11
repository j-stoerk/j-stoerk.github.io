/* Bake a warped, ordered-dither field once, at build time. The browser decodes
   one small alpha mask, rather than drawing thousands of dots every frame. */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const clamp = n => Math.max(0, Math.min(1, n));
const smooth = (a, b, n) => { const t = clamp((n - a) / (b - a)); return t * t * (3 - 2 * t); };
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const length = Buffer.alloc(4), checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length); checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}
module.exports = function generateAmbientDither() {
  const width = 1536, height = 1024, pitch = 6, stride = width * 2 + 1;
  const pixels = Buffer.alloc(stride * height);
  // Eight-by-eight Bayer thresholds vary occupancy without random flicker.
  let bayer = [[0]];
  while (bayer.length < 8) {
    const old = bayer, n = old.length;
    bayer = Array.from({ length: n * 2 }, (_, y) => Array.from({ length: n * 2 }, (_, x) =>
      old[y % n][x % n] * 4 + [[0, 2], [3, 1]][Math.floor(y / n)][Math.floor(x / n)]));
  }
  for (let row = 0, y = 3; y < height; row++, y += pitch) {
    for (let col = 0, x = 3; x < width; col++, x += pitch) {
      const nx = x / width * 2 - 1, ny = y / height * 2 - 1;
      const u = 1.8 * nx + 1.2 * ny + .38 * Math.sin(3 * ny - 1.4 * nx);
      const v = 1.4 * ny - nx + .3 * Math.sin(3 * nx);
      const field = .5 + .27 * Math.sin(3.8 * u) + .17 * Math.cos(4 * v)
        + .08 * Math.sin(8 * (nx - ny));
      const density = smooth(.23, .78, field);
      if (density <= (bayer[row % 8][col % 8] + .5) / 64) continue;
      // Eight radii retain soft edges while making repeated dot sprites compress
      // well, rather than shipping a different alpha value for every dot.
      const radius = .65 + .65 * Math.round(density * 7) / 7;
      for (let py = y - 2; py <= y + 2; py++) for (let px = x - 2; px <= x + 2; px++) {
        if (px < 0 || py < 0 || px >= width || py >= height) continue;
        const alpha = Math.round(255 * clamp(radius + .5 - Math.hypot(px + .5 - x, py + .5 - y)));
        const offset = py * stride + 1 + px * 2;
        pixels[offset] = 255; pixels[offset + 1] = alpha;
      }
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 4; // 8-bit grayscale + alpha, no colour profile.
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(pixels, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
  const target = path.join(__dirname, '..', 'images', 'ambient-dither.png');
  fs.writeFileSync(target, png);
};
