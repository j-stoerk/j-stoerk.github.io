/* Standalone SVG covers and share cards cannot resolve site-relative images.
   Embed the original local bytes for those exports; article HTML keeps its
   cacheable image URL and never contains a base64 copy of the photograph. */
'use strict';
const fs = require('fs');
const path = require('path');

module.exports = function inlineCoverImages(svg, root) {
  return svg.replace(/(<image\b[^>]*?\b(?:href|xlink:href)=)(["'])([^"']+)\2/g,
    (match, prefix, quote, href) => {
      if (href.startsWith('data:')) return match;
      if (/^(?:[a-z]+:|\/\/)/i.test(href)) throw new Error('Cover images must be local: ' + href);
      const file = path.resolve(root, href.replace(/^\//, ''));
      if (!file.startsWith(path.resolve(root) + path.sep)) throw new Error('Cover image leaves site root');
      const mime = {'.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png'}[path.extname(file).toLowerCase()];
      if (!mime) throw new Error('Unsupported cover image: ' + href);
      return prefix + quote + 'data:' + mime + ';base64,' + fs.readFileSync(file).toString('base64') + quote;
    });
};
