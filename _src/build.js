/* Static site builder for j-stoerk.github.io.
   Zero dependencies. Run: node _src/build.js
   Sources live in _src/pages; shared chrome (head assets, topbar, footer,
   scripts) is injected here so a change lands on every page at once.
   posts.json drives the blog listing, the home-page cards, feed.xml, and
   sitemap.xml, so those can never drift apart again.
   GitHub Pages (Jekyll) ignores underscore directories, so _src is not
   published. */
'use strict';

const fs = require('fs');
const path = require('path');

const SRC = __dirname;
const ROOT = path.join(__dirname, '..');
const SITE = 'https://j-stoerk.github.io';

const posts = JSON.parse(fs.readFileSync(path.join(SRC, 'posts.json'), 'utf8'))
  .sort((a, b) => (a.iso < b.iso ? 1 : -1));

/* ---------- page configuration ---------- */
const PAGES = {
  'index.html': {
    nav: null, home: true, extraScripts: ['cite.js'],
    footerExtra: null, lastmod: '2026-07-13', priority: '1.0',
  },
  'cv.html': {
    nav: 'cv', extraScripts: [],
    footerExtra: '<a href="index.html">Home</a> · <a href="cv.pdf" download>CV (PDF)</a>',
    lastmod: '2026-07-13', priority: '0.8',
  },
  'blog.html': {
    nav: 'blog', extraScripts: [],
    footerExtra: '<a href="index.html">Home</a> · <a href="index.html#contact">Contact</a>',
    lastmod: '2026-07-13', priority: '0.8',
  },
};
for (const p of posts) {
  PAGES[p.file] = {
    nav: 'blog', extraScripts: ['blog.js'],
    footerExtra: '<a href="blog.html">All posts</a>',
    lastmod: p.lastmod, priority: '0.7',
  };
}

/* ---------- shared chrome ---------- */
const HEAD_ASSETS = `  <!-- Applied before first paint so the theme never flashes. -->
  <script>
    (function () {
      var t;
      try { t = localStorage.getItem('theme'); } catch (e) { }
      if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', t);
    })();
  </script>

  <link rel="preload" href="fonts/noto-sans-latin-wght.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="styles.css">`;

const NAV_ITEMS = [
  ['research', 'Research', '#research'],
  ['publications', 'Publications', '#publications'],
  ['experience', 'Experience', '#experience'],
  ['cv', 'CV', 'cv.html'],
  ['blog', 'Blog', 'blog.html'],
  ['contact', 'Contact', '#contact'],
];

function topbar(cfg) {
  const links = NAV_ITEMS.map(([key, label, href]) => {
    const url = href.startsWith('#') && !cfg.home ? 'index.html' + href : href;
    const cur = key === cfg.nav ? ' class="current"' : '';
    const aria = key === cfg.nav ? ' aria-current="page"' : '';
    return `        <a${cur} href="${url}"${aria}>${label}</a>`;
  }).join('\n');
  const title = cfg.home
    ? '<a class="site-title" href="#home" aria-current="page">Home</a>'
    : '<a class="site-title" href="index.html">Home</a>';
  return `  <header class="topbar">
    <div class="topbar-inner">
      ${title}
      <button class="nav-toggle" type="button" data-nav-toggle aria-controls="primary-nav" aria-expanded="false">
        <span class="nav-toggle-lines" aria-hidden="true"></span>
        <span class="sr-only">Open navigation</span>
      </button>
      <nav class="nav" id="primary-nav" data-nav aria-label="Primary">
${links}
        <button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch theme">◐</button>
      </nav>
    </div>
  </header>`;
}

function footer(cfg) {
  const extra = cfg.footerExtra ? `\n    <span>${cfg.footerExtra}</span>` : '';
  return `  <footer class="content">
    <span>© 2026 Julius Störk</span>${extra}
  </footer>`;
}

function scripts(cfg) {
  const extras = cfg.extraScripts.map((s) => `  <script src="${s}"></script>`).join('\n');
  return `  <script src="theme.js"></script>
  <script src="navigation.js"></script>
  <script src="background.js"></script>
${extras ? extras + '\n' : ''}  <script data-goatcounter="https://jstoerk.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>`;
}

/* ---------- post listings ---------- */
function postEntry(p, withMinutes, indent) {
  const meta = withMinutes ? `${p.category} · ${p.minutes} min` : p.category;
  const pad = ' '.repeat(indent);
  return `${pad}<article class="journal-entry">
${pad}  <div class="journal-meta"><time datetime="${p.iso}">${p.display}</time><span>${meta}</span></div>
${pad}  <div class="journal-copy"><h3><a class="card-link" href="${p.file}">${p.title}</a></h3><p>${p.summary}</p></div>
${pad}  <span class="journal-arrow" aria-hidden="true">↗</span>
${pad}</article>`;
}

const POST_LIST = `<div class="journal-index journal-index-page">
${posts.map((p) => postEntry(p, true, 6)).join('\n')}
    </div>`;

const POST_CARDS = `<div class="journal-index">
${posts.slice(0, 2).map((p) => postEntry(p, false, 8)).join('\n')}
      </div>`;

/* ---------- build pages ---------- */
const pagesDir = path.join(SRC, 'pages');
for (const file of fs.readdirSync(pagesDir)) {
  if (!file.endsWith('.html')) continue;
  const cfg = PAGES[file];
  if (!cfg) throw new Error(`no page config for ${file}`);
  let html = fs.readFileSync(path.join(pagesDir, file), 'utf8');
  html = html
    .replace('  <!--#HEAD_ASSETS-->', HEAD_ASSETS)
    .replace('  <!--#TOPBAR-->', topbar(cfg))
    .replace('  <!--#FOOTER-->', footer(cfg))
    .replace('  <!--#SCRIPTS-->', scripts(cfg))
    .replace('<!--#POST_LIST-->', POST_LIST)
    .replace('<!--#POST_CARDS-->', POST_CARDS);
  if (/<!--#/.test(html)) throw new Error(`${file}: unresolved marker`);
  fs.writeFileSync(path.join(ROOT, file), html);
  console.log('built', file);
}

/* ---------- feed.xml ---------- */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const feedItems = posts.map((p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${SITE}/${p.file}</link>
      <guid isPermaLink="true">${SITE}/${p.file}</guid>
      <pubDate>${p.rfc822}</pubDate>
      <description>${esc(p.feedDescription)}</description>
    </item>`).join('\n');
fs.writeFileSync(path.join(ROOT, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Research notes — Julius Störk</title>
    <link>${SITE}/blog.html</link>
    <description>Interactive notes on continual learning and electrode manufacturing.</description>
    <language>en</language>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml" />
${feedItems}
  </channel>
</rss>
`);
console.log('built feed.xml');

/* ---------- sitemap.xml ---------- */
const order = ['index.html', 'cv.html', 'blog.html', ...posts.map((p) => p.file)];
const urls = order.map((f) => {
  const cfg = PAGES[f];
  const loc = f === 'index.html' ? `${SITE}/` : `${SITE}/${f}`;
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${cfg.lastmod}</lastmod>
    <priority>${cfg.priority}</priority>
  </url>`;
}).join('\n');
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`);
console.log('built sitemap.xml');
