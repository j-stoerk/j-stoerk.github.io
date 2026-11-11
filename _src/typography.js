'use strict';

/* Apply reading typography at build time, without changing code, equations or
   attributes. The visible spacing is an ordinary nonbreaking space (U+00A0). */
const number = String.raw`[+\-−]?(?:\d+(?:[.,]\d+)*|[.,]\d+)(?:[eE][+\-−]?\d+)?`;
const unit = String.raw`(?:[kMGTmunpµμ]?(?:Wh|Ah|Hz|Pa|mol|W|J|V|A|F|N|C|Ω|S)|(?:[kcmnµμ]?m)|(?:[kmµμ]?g)|(?:[kKMGT]?B)|(?:[KMGT]iB)|(?:[kMGT]?bit)|(?:[mµμnpf]?s)|°[CF]|K|bar|mbar|L|mL|min|h|rpm|fps|px|dpi|%|€|EUR|USD|GBP|hours?|minutes?|seconds?|milliseconds?|days?|weeks?|months?|years?)`;
const quantity = new RegExp(String.raw`(?<![\p{L}\p{N}_/])(${number}(?:[–−-]${number})?)(?:[\t\r\n \u00a0\u202f]|&nbsp;|&#160;|&#x[aA]0;)+(${unit}(?:[²³]|[−-]\d+)?(?:[/·⋅][\p{L}µμ°Ω%]+(?:[²³]|[−-]\d+)?)?)(?![\p{L}\p{N}_])`, 'gu');

module.exports = function articleTypography(html) {
  const documentBlocks = [];
  html = html.replace(/<(script|style|pre|svg)\b[^>]*>[\s\S]*?<\/\1>/g, block => {
    documentBlocks.push(block); return `\uE100${documentBlocks.length - 1}\uE101`;
  });
  html = html.replace(/<(p|li|figcaption)\b([^>]*)>([\s\S]*?)<\/\1>/g, (_, tag, attrs, body) => {
    const protectedParts = [];
    body = body.replace(/<(code|pre|svg|script|style)\b[^>]*>[\s\S]*?<\/\1>|\\\([\s\S]*?\\\)|\$\$[\s\S]*?\$\$/g, part => {
      protectedParts.push(part); return `\uE000${protectedParts.length - 1}\uE001`;
    });
    body = body.split(/(<[^>]*>)/g).map((part, i) => i % 2 ? part :
      part.replace(quantity, '<span class="quantity">$1&#160;$2</span>')).join('');
    body = body.replace(/\uE000(\d+)\uE001/g, (_, index) => protectedParts[Number(index)]);
    // Word joiners prevent closing punctuation after an inline box or equation
    // from being stranded on the next line, without introducing visible space.
    body = body.replace(/(<\/(?:a|em|strong|sup|span|code|i|b|small)>|\\\))(?:[\t\r\n ]|&nbsp;|&#160;)*([.,;:!?…\)\]”’»])/g,
      '$1&#8288;$2');
    body = body.replace(/[\t\r\n ]+(<sup\b[^>]*\bclass=["'][^"']*\bcite\b[^"']*["'][^>]*>)/g, '&#160;$1');
    return `<${tag}${attrs}>${body}</${tag}>`;
  });
  return html.replace(/\uE100(\d+)\uE101/g, (_, index) => documentBlocks[Number(index)]);
};
