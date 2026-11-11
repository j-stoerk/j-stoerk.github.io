/* Build-only share cards. All text is outlined from bundled fonts, so rendering
   does not depend on the host's installed fonts. Nothing here runs in a browser. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const fontkit = require('fontkit');
const { Resvg } = require('@resvg/resvg-js');
const jpeg = require('jpeg-js');
const ROOT = path.join(__dirname, '../..');
const OUT = path.join(ROOT, 'images/share');
const WIDTH = 2400, HEIGHT = 1260;
const FONT_PATH = path.join(__dirname, 'fonts');
const serifFile = path.join(FONT_PATH, 'SourceSerif4Display-Semibold.ttf');
const sansFile = path.join(FONT_PATH, 'NotoSans-Regular.ttf');
const serif = fontkit.openSync(serifFile), sans = fontkit.openSync(sansFile);
const descriptions = require('./descriptions.json');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fontHash = sha(Buffer.concat([fs.readFileSync(serifFile), fs.readFileSync(sansFile)]));
const templateHash = sha(fs.readFileSync(__filename).toString().replace(/\r\n/g, '\n'));
const escape = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const round = value => Number(value.toFixed(3));

function measure(text, font, size) {
  return font.layout(text).positions.reduce((sum, pos) => sum + pos.xAdvance, 0) * size / font.unitsPerEm;
}
function wrap(text, font, size, width) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? line + ' ' + word : word;
      if (line && measure(candidate, font, size) > width) { lines.push(line); line = word; }
      else line = candidate;
    }
    if (line) lines.push(line);
  }
  return lines;
}
function textLine(text, font, size, x, top, fill) {
  const scale = size / font.unitsPerEm;
  const baseline = top + (font.capHeight || font.ascent) * scale;
  const run = font.layout(text);
  let pen = x;
  return `<g fill="${fill}">` + run.glyphs.map((glyph, i) => {
    if (glyph.id === 0) throw new Error(`Share-card font has no glyph for ${JSON.stringify(text)}`);
    const pos = run.positions[i], outline = glyph.path.toSVG();
    const result = outline ? `<path d="${outline}" transform="translate(${round(pen + pos.xOffset * scale)} ${round(baseline - pos.yOffset * scale)}) scale(${round(scale)} ${round(-scale)})"/>` : '';
    pen += pos.xAdvance * scale;
    return result;
  }).join('') + '</g>';
}
function artwork(post) {
  const html = fs.readFileSync(path.join(ROOT, '_src/pages', post.file), 'utf8').replace(/\r\n/g, '\n');
  let svg = html.match(/<svg\b[^>]*class="cover-art"[\s\S]*?<\/svg>/)?.[0];
  if (!svg) throw new Error(`${post.file}: missing share-card artwork`);
  if (!/^<svg\b[^>]*\sxmlns=/.test(svg)) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  return svg;
}
function thumbnail(source, portrait) {
  if (portrait) return { uri: 'data:image/jpeg;base64,' + source.toString('base64'), width: 322, height: 322, top: '#edf0ee', bottom: '#edf0ee' };
  const image = new Resvg(source, { fitTo: { mode: 'width', value: 1288 },
    font: { loadSystemFonts: false, fontFiles: [sansFile], defaultFontFamily: 'Noto Sans', sansSerifFamily: 'Noto Sans' } }).render();
  const pixels = image.pixels;
  const colour = at => '#' + Array.from(pixels.slice(at, at + 3)).map(n => n.toString(16).padStart(2, '0')).join('');
  return { uri: 'data:image/png;base64,' + image.asPng().toString('base64'), width: image.width, height: image.height,
    top: colour(0), bottom: colour((image.width * image.height - 1) * 4) };
}
function makeSVG(card, image) {
  const thumb = thumbnail(image, card.portrait);
  const bodySize = 29, bodyStep = 39, bylineSize = 21, width = 600;
  const body = wrap(card.description, sans, bodySize, width);
  if (body.length > 3 || body.some(line => measure(line, sans, bodySize) > width)) throw new Error(`${card.page}: share description needs to be shorter`);
  let title, size, step, total;
  for (size = card.portrait ? 84 : 78; size >= 40; size -= 2) {
    title = wrap(card.title, serif, size, width); step = size * 1.08;
    total = title.length * step + 20 + body.length * bodyStep + (card.byline ? 34 : 0);
    if (title.length <= 4 && total <= 350 && title.every(line => measure(line, serif, size) <= width)) break;
  }
  if (size < 40) throw new Error(`${card.page}: share-card title does not fit`);
  let top = (630 - total) / 2;
  const blocks = [];
  title.forEach(line => { blocks.push(textLine(line, serif, size, 534, top, '#1b2429')); top += step; });
  top += 20;
  body.forEach(line => { blocks.push(textLine(line, sans, bodySize, 534, top, '#6b7476')); top += bodyStep; });
  if (card.byline) blocks.push(textLine(card.byline, sans, bylineSize, 534, top + 12, '#667c88'));
  const fit = Math.min(322 / thumb.width, 322 / thumb.height);
  const iw = thumb.width * fit, ih = thumb.height * fit;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
<title>${escape(card.alt)}</title><defs>
<pattern id="share-grid" width="44" height="44" patternUnits="userSpaceOnUse"><path d="M44 0H0V44" fill="none" stroke="#e4e8e4" stroke-width="1"/></pattern>
<radialGradient id="share-shade" cx="1" cy="0" r=".75"><stop stop-color="#b0b9b5" stop-opacity=".35"/><stop offset="1" stop-color="#fdfdfb" stop-opacity="0"/></radialGradient>
<linearGradient id="share-matte" x2="0" y2="1"><stop stop-color="${thumb.top}"/><stop offset="1" stop-color="${thumb.bottom}"/></linearGradient>
<clipPath id="share-photo"><rect x="96" y="154" width="322" height="322" rx="12"/></clipPath>
</defs><rect width="1200" height="630" fill="#fdfdfb"/><rect width="1200" height="630" fill="url(#share-grid)"/><rect width="1200" height="630" fill="url(#share-shade)"/>
<g clip-path="url(#share-photo)"><rect x="96" y="154" width="322" height="322" fill="url(#share-matte)"/>
<image x="${round(96 + (322 - iw) / 2)}" y="${round(154 + (322 - ih) / 2)}" width="${round(iw)}" height="${round(ih)}" xlink:href="${thumb.uri}"/></g>
<rect x="96" y="154" width="322" height="322" rx="12" fill="none" stroke="#d8dfdb" stroke-width="1"/>
<path d="M488 178V452" stroke="#44677c" stroke-width="5"/>
${blocks.join('\n')}</svg>`;
}

module.exports = function shareCards(posts) {
  fs.mkdirSync(OUT, { recursive: true });
  const portrait = fs.readFileSync(path.join(ROOT, 'portrait.jpg'));
  const personal = [
    { page: 'index.html', slug: 'home', title: 'Julius\nStörk', description: 'PhD Researcher\nVARTA · TU Braunschweig' },
    { page: 'cv.html', slug: 'cv', title: 'Julius\nStörk', description: 'Curriculum vitae\nAI for battery manufacturing' },
    { page: 'blog.html', slug: 'blog', title: 'Julius\nStörk', description: 'Research notes\nAI · batteries · robotics · philosophy' },
  ].map(card => ({ ...card, portrait: true, image: portrait, alt: `Julius Störk · ${card.description.replace(/\n/g, ' · ')}` }));
  const articles = posts.map(post => ({ page: post.file, slug: post.file.replace(/\.html$/, ''), title: post.title,
    description: descriptions[post.file] || post.category, byline: `Julius Störk · ${post.display}`,
    alt: `${post.title} · ${descriptions[post.file] || post.category} · Julius Störk`, image: artwork(post) }));
  const chargewise = articles.find(card => card.page === 'post-chargewise.html');
  const project = { ...chargewise, page: 'chargewise/index.html', slug: 'chargewise', title: 'ChargeWise AI',
    description: 'Fleet charging within grid limits\nExplore the live demo', byline: 'Julius Störk', alt: 'ChargeWise AI · fleet charging within grid limits · Julius Störk' };
  const cards = {};
  for (const card of [...personal, ...articles, project]) {
    const digest = sha(Buffer.concat([Buffer.from(JSON.stringify({ ...card, image: undefined, fontHash, templateHash })), Buffer.from(card.image)])).slice(0, 16);
    const file = `images/share/${card.slug}-${digest}.jpg`;
    if (!fs.existsSync(path.join(ROOT, file))) {
      const svg = makeSVG(card, card.image);
      const rendered = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH }, font: { loadSystemFonts: false } }).render();
      // A small, baseline JPEG is quick to fetch and works in older messaging clients.
      const encoded = jpeg.encode({ data: rendered.pixels, width: WIDTH, height: HEIGHT }, 96).data;
      if (encoded.length > 550000) throw new Error(`${card.page}: share image exceeds the 550 kB build budget`);
      fs.writeFileSync(path.join(ROOT, file), encoded);
    }
    cards[card.page] = { file, type: 'image/jpeg', width: WIDTH, height: HEIGHT, alt: card.alt };
  }
  fs.writeFileSync(path.join(__dirname, 'manifest.json'), JSON.stringify(cards, null, 2) + '\n');
  return cards;
};
