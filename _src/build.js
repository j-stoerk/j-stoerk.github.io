/* Static site builder for j-stoerk.github.io.
   Install build-only share-card tools with npm ci. Run: node _src/build.js
   Sources live in _src/pages; shared chrome (head assets, topbar, footer,
   scripts) is injected here so a change lands on every page at once.
   posts.json drives the blog listing, the home-page cards, feed.xml, and
   sitemap.xml, so those can never drift apart again.
   GitHub Pages (Jekyll) ignores underscore directories, so _src is not
   published. */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const articleTypography = require('./typography');

const SRC = __dirname;
const ROOT = path.join(__dirname, '..');
const SITE = 'https://j-stoerk.github.io';
require('./generate-contact-hats')();
require('./generate-ambient-dither')();

/* Content-hash cache-buster: append ?v=<hash> to a runtime asset so a
   changed file is refetched instead of served stale from browser cache. */
function ver(file) {
  // Normalise line endings before hashing so the cache-buster is identical
  // on Windows (CRLF checkout) and Linux CI (LF), keeping the build
  // deterministic across platforms.
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');
  return file + '?v=' + crypto.createHash('md5').update(text).digest('hex').slice(0, 8);
}

const posts = JSON.parse(fs.readFileSync(path.join(SRC, 'posts.json'), 'utf8'))
  .sort((a, b) => (a.iso < b.iso ? 1 : -1));
const shareCards = require('./share/cards')(posts);
const narrations = JSON.parse(fs.readFileSync(path.join(SRC, 'audio/manifest.json'), 'utf8'));
const narrationText = new Map(JSON.parse(execFileSync(process.env.PYTHON || 'python', [path.join(SRC, 'audio/narration.py'), '--extract'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })).map(p => [p.page, p]));
function listenControl(file) {
  const entry = narrations[file];
  if (!entry || entry.sha256 !== narrationText.get(file)?.sha256) return '';
  if (!/^https:\/\/github\.com\/j-stoerk\/j-stoerk\.github\.io\/releases\/download\/blog-narration\/post-[a-z0-9-]+-[a-f0-9]{16}\.mp3$/.test(entry.url)) throw new Error('Invalid narration URL: ' + file);
  const duration = Math.floor(entry.seconds / 60) + ':' + String(Math.floor(entry.seconds % 60)).padStart(2, '0');
  return `<section class="post-listen" aria-label="Listen to this article">
    <div class="outline-action listen-bar" data-listen-bar role="group" aria-label="Article narration controls" hidden>
      <button class="listen-button" type="button" data-listen aria-controls="article-narration" aria-pressed="false"><svg class="listen-play-icon" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m6 3 11 7-11 7V3Z"/></svg><svg class="listen-pause-icon" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M5 3h3v14H5zm7 0h3v14h-3z"/></svg><span data-listen-label>Listen</span><small class="listen-duration" data-listen-duration>${Math.ceil(entry.seconds / 60)} min</small></button>
      <div class="listen-transport" data-listen-transport hidden><span class="listen-time" data-listen-time aria-hidden="true">0:00 / ${duration}</span><input type="range" class="listen-seek" min="0" max="${Math.ceil(entry.seconds)}" value="0" step="1" data-listen-seek aria-label="Seek through article narration" disabled></div>
      <button class="listen-mute" type="button" data-listen-mute aria-label="Mute narration" aria-pressed="false" hidden><svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h3l4-4v14l-4-4H3z"/><path class="listen-volume-on" d="M13 6q5 4 0 8"/><path class="listen-volume-off" d="m13 8 4 4m0-4-4 4"/></svg></button>
      <label class="listen-speed" data-listen-speed-control hidden><span class="sr-only">Playback speed</span><select data-listen-speed aria-label="Narration speed"><option value="1">1×</option><option value="1.1">1.1×</option><option value="1.2">1.2×</option><option value="1.3">1.3×</option><option value="1.5">1.5×</option></select></label>
      <span class="listen-ai-badge" title="AI-generated narration">AI</span>
    </div>
    <audio id="article-narration" preload="none" data-narration-src="${attribute(entry.url)}" data-narration-seconds="${entry.seconds}" aria-label="AI narration of ${attribute(narrationText.get(file).title)}" hidden></audio>
    <span class="listen-status sr-only" data-listen-status role="status"></span>
    <noscript><audio controls preload="none" src="${attribute(entry.url)}" aria-label="AI-generated article narration"></audio></noscript>
  </section>`;
}
const community = JSON.parse(fs.readFileSync(path.join(SRC, 'community.json'), 'utf8'));
if (community.comments.endpoint && !/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(community.comments.endpoint)) {
  throw new Error('community.json: comments.endpoint must be an HTTPS origin without a trailing slash');
}
fs.mkdirSync(path.join(ROOT, '_services', 'comments'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'comment-pages.json'), JSON.stringify({
  version: 1, pages: posts.map(post => post.file.replace(/\.html$/, '')),
}, null, 2) + '\n');
fs.writeFileSync(path.join(ROOT, '_services', 'comments', 'worker.js'),
  '// Generated by _src/build.js. Paste this entire file into the Cloudflare Worker editor.\n' +
  fs.readFileSync(path.join(ROOT, '_services', 'comments', 'worker.mjs'), 'utf8'));
if (!/^https:\/\/formspree\.io\/f\/[a-z0-9]+$/i.test(community.contact.endpoint)) {
  throw new Error('community.json: contact.endpoint must be a Formspree form URL');
}
function publicConfig(id, value) {
  return `<script type="application/json" id="${id}">${JSON.stringify(value).replace(/</g, '\\u003c')}</script>`;
}
function contactSection(dedicated) {
  let html = fs.readFileSync(path.join(SRC, 'contact.html'), 'utf8');
  let copy = fs.readFileSync(path.join(SRC, 'contact-copy.html'), 'utf8');
  if (dedicated) {
    html = html.replace(/^[ \t]*<h2>Contact<\/h2>[ \t]*\r?\n?/m, '');
    copy = copy.replace(/^[ \t]*<p class="contact-route">[\s\S]*?<\/p>\s*/m, '');
    const start = html.indexOf('      <div class="contact-context">');
    const end = html.indexOf('      <div class="contact-compose">');
    if (start < 0 || end < start) throw new Error('Contact section structure changed');
    html = html.slice(0, start) + html.slice(end);
    return '<div class="contact-page-intro">' + copy + '</div>\n' + html.replace(/^[ \t]*<!--#CONTACT_COPY-->[ \t]*\r?\n?/m, '');
  }
  return html.replace('<!--#CONTACT_COPY-->', copy);
}
function attribute(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function shareMetadata(html, file) {
  const card = shareCards[file];
  if (!card) return html;
  const oldImage = html.match(/<meta\b[^>]*property="og:image"[^>]*content="([^"]+)"/)?.[1];
  const url = SITE + '/' + card.file;
  const twitterText = Object.fromEntries(['title', 'description'].map(key => [key,
    html.match(new RegExp(`<meta\\b[^>]*name="twitter:${key}"[^>]*content="([^"]+)"`))?.[1] ||
    html.match(new RegExp(`<meta\\b[^>]*property="og:${key}"[^>]*content="([^"]+)"`))?.[1]]));
  // Keep JSON-LD article images aligned; a Person's portrait remains its portrait.
  if (oldImage) html = html.split(oldImage).join(url);
  html = html.replace(/\s*<meta\b(?=[^>]*(?:property|name)="(?:og:image(?::[a-z_]+)?|twitter:image(?::alt)?|twitter:card|twitter:title|twitter:description)")[^>]*>/g, '');
  const extra = [
    ['property', 'og:image', url], ['property', 'og:image:secure_url', url],
    ['property', 'og:image:type', card.type], ['property', 'og:image:width', card.width],
    ['property', 'og:image:height', card.height], ['property', 'og:image:alt', card.alt],
    ['name', 'twitter:card', 'summary_large_image'], ['name', 'twitter:image', url],
    ['name', 'twitter:image:alt', card.alt],
  ];
  for (const key of ['title', 'description']) {
    const content = twitterText[key];
    if (content) extra.push(['name', `twitter:${key}`, content.replace(/&amp;/g, '&').replace(/&quot;/g, '"')]);
  }
  // Keep the whole preview together, ahead of scripts, styles and JSON-LD.
  const social = [];
  html = html.replace(/\s*<meta\b(?=[^>]*(?:property|name)="(?:og:|twitter:)[^"]*")[^>]*>/g,
    tag => { social.push(tag.trim()); return ''; });
  social.push(...extra.map(([kind, name, value]) => `<meta ${kind}="${name}" content="${attribute(value)}" />`));
  return html.replace(/(<meta\b[^>]*charset[^>]*>)/i, '$1\n  ' + social.join('\n  '));
}

/* Keep reference previews compact, retaining IDs and native list numbering.
   Native details works without JavaScript; references.js opens cited targets. */
function foldReferences(html) {
  return html.replace(/(<section\b[^>]*class="post-(?:sources|references)"[^>]*>)([\s\S]*?)(<\/section>)/g,
    (_, section, content, end) => section + content.replace(/<ol([^>]*)>([\s\S]*?)<\/ol>/,
      (list, attributes, body) => {
        const items = [...body.matchAll(/<li\b[\s\S]*?<\/li>/g)];
        if (items.length <= 3) return list;
        const split = items[3].index;
        const continued = attributes.replace(/\sstart="[^"]*"/g, '');
        return `<ol${attributes}>${body.slice(0, split).trimEnd()}\n        </ol>
        <details class="references-more">
          <summary class="references-toggle"><span class="references-show">show all ${items.length} references</span><span class="references-hide">show fewer references</span><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></summary>
          <ol${continued} start="4">${body.slice(split)}<\/ol>
        </details>`;
      }) + end);
}

/* The video, readable tables, and downloads share one audited dataset. */
function batteryMarketData() {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/battery-market.json'), 'utf8'));
  const esc = attribute;
  const sourceLink = key => {
    const s = data.sources[key];
    if (!s) throw new Error(`unknown battery-map source ${key}`);
    return `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>`;
  };
  const csv = [['company', 'year', 'reporting_window', 'months', 'EV_deployment_GWh', 'observed_GWh_per_month', 'source_url']];
  for (const c of data.companies) {
    data.periods.forEach((p, i) => {
      const v = c.volumes[i];
      csv.push([c.name, p.year, p.label, p.months, v ?? '', v === null ? '' : (v / p.months).toFixed(4), v === null ? '' : data.sources[p.source].url]);
    });
  }
  fs.writeFileSync(path.join(ROOT, 'data/battery-market-volumes.csv'), csv.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n') + '\n');
  const rows = data.companies.filter(c => c.volumes.some(v => v !== null)).map(c =>
    `<tr><th scope="row">${esc(c.name)}</th>${c.volumes.map(v => `<td>${v === null ? '<span aria-label="Unavailable">n/a</span>' : v.toFixed(1)}</td>`).join('')}</tr>`).join('\n');
  const events = data.companies.flatMap(c => c.events.filter(e => e.date > '2020-01-01').map(e => ({c, e})))
    .sort((a, b) => a.e.date.localeCompare(b.e.date));
  return `<div class="battery-data-table" role="region" tabindex="0" aria-label="Scrollable deployment data">
  <table><caption>Reported EV battery deployment (GWh). 2020–2025 are complete years; 2026 is January–August only. n/a means unavailable.</caption>
    <thead><tr><th scope="col">Company</th>${data.periods.map(p => `<th scope="col">${p.year}${p.months < 12 ? '<br>Jan–Aug' : ''}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
  <div class="prose"><p>Deployment sources by reporting year:</p><ul>${data.periods.map(p => `<li>${p.year} (${p.months} months): ${sourceLink(p.source)}</li>`).join('')}</ul></div>
  <ol class="timeline-milestones">${events.map(({c, e}) => `<li><time datetime="${e.date}">${e.date}</time> · <strong>${esc(c.name)}</strong>: ${esc(e.text)} ${sourceLink(e.source)}${e.capacitySource ? '; capacity: ' + sourceLink(e.capacitySource) : ''}.</li>`).join('\n')}</ol>`;
}

/* ---------- page configuration ---------- */
const PAGES = {
  'index.html': {
    nav: null, home: true, extraScripts: ['cite.js', 'experiences.js', 'bio-popovers.js', 'comment-identity.js', 'contact.js', 'contact-landscape.js', 'code-sessions.js'],
    extraStyles: ['contact-landscape.css', 'code-sessions.css'],
    footerExtra: null, lastmod: '2026-11-12', priority: '1.0',
  },
  'cv.html': {
    nav: 'cv', extraScripts: [],
    footerExtra: null,
    lastmod: '2026-11-12', priority: '0.8',
  },
  'blog.html': {
    nav: 'blog', extraScripts: ['blog-view.js'],
    footerExtra: null,
    lastmod: '2026-11-12', priority: '0.8',
  },
  /* Served by GitHub Pages for any missing URL; noindex, not in sitemap. */
  'publications.html': {
    nav: 'publications', extraScripts: ['cite.js'], footerExtra: null,
    lastmod: '2026-11-12', priority: '0.9',
  },
  'code.html': {
    nav: 'software', extraScripts: ['earth-orbit.js', 'word-room.js'], footerExtra: null,
    lastmod: '2026-11-14', priority: '0.9',
  },
  'experience.html': {
    nav: 'experience', extraScripts: ['experiences.js', 'career.js', 'metrics.js'], footerExtra: null,
    lastmod: '2026-11-12', priority: '0.8',
  },
  'contact.html': {
    nav: 'contact', extraScripts: ['comment-identity.js', 'contact.js', 'contact-landscape.js'],
    extraStyles: ['contact-landscape.css'], footerExtra: null,
    lastmod: '2026-11-12', priority: '0.8',
  },
  'search.html': {
    nav: null, extraScripts: [], footerExtra: null,
    lastmod: '2026-11-12', priority: '0.4',
  },
  '404.html': {
    nav: null, extraScripts: [],
    footerExtra: '<a href="index.html">Home</a>',
    lastmod: null, priority: null,
  },
};
const ARCHIVE_SIZE = 6;
const archiveCount = Math.ceil(posts.length / ARCHIVE_SIZE);
const archiveFile = page => page === 1 ? 'blog-archive.html' : `blog-archive-${page}.html`;
for (let page = 1; page <= archiveCount; page++) {
  PAGES[archiveFile(page)] = { nav: 'blog', source: 'blog.html', archivePage: page,
    extraScripts: ['blog-view.js'], footerExtra: null, lastmod: '2026-11-12', priority: '0.6' };
}
for (const file of ['publications.html', 'code.html', 'search.html', 'experience.html', 'contact.html']) shareCards[file] = { ...shareCards['index.html'] };
for (let page = 1; page <= archiveCount; page++) shareCards[archiveFile(page)] = { ...shareCards['blog.html'] };
fs.writeFileSync(path.join(SRC, 'share/manifest.json'), JSON.stringify(shareCards, null, 2) + '\n');
for (const p of posts) {
  PAGES[p.file] = {
    nav: 'blog', extraScripts: ['blog.js', 'references.js', 'listen.js', 'comment-identity.js', 'comments.js', ...(p.scripts || [])],
    extraStyles: p.styles || [],
    footerExtra: '<a href="blog.html">All posts</a>',
    lastmod: p.lastmod, priority: '0.7', math: !!p.math,
  };
}

/* ---------- build-time math (KaTeX) ----------
   $$...$$ (display) and \( ... \) (inline) in a math-flagged page source
   are rendered to static HTML+MathML here; the browser only needs
   katex/katex.min.css and its fonts, no client-side JS. */
let katex = null;
function renderMath(html, file) {
  if (!katex) katex = require('./vendor/katex.min.js');
  const opts = { output: 'htmlAndMathml', throwOnError: true };
  html = html.replace(/\$\$([\s\S]+?)\$\$/g, (m, tex) =>
    katex.renderToString(tex.trim(), { ...opts, displayMode: true }));
  html = html.replace(/\\\((.+?)\\\)((?:&#8288;)?[.,;:!?…\)\]”’»])?/g, (m, tex, punctuation) => {
    const equation = katex.renderToString(tex.trim(), { ...opts, displayMode: false });
    // KaTeX contains atomic inline boxes: some browsers can still break before
    // punctuation despite a word joiner. Keep the formula and its stop together.
    return punctuation ? `<span class="inline-math-tail">${equation}${punctuation}</span>` : equation;
  });
  return html;
}

/* ---------- shared chrome ---------- */
const HEAD_ASSETS = `  <meta name="theme-color" content="#fdfdfc">
  <link rel="apple-touch-icon" href="apple-touch-icon.png">

  <!-- Applied before first paint so the theme never flashes. -->
  <script>
    (function () {
      var t;
      try { t = localStorage.getItem('theme'); } catch (e) { }
      if (!t) t = 'light';   // light is the standard; dark only on explicit toggle
      document.documentElement.setAttribute('data-theme', t);
      var m = document.querySelector('meta[name="theme-color"]');
      if (m) m.setAttribute('content', t === 'dark' ? '#101214' : '#fdfdfc');
    })();
  </script>

  <link rel="preload" href="fonts/noto-sans-latin-wght.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${ver('styles.css')}">
  <link rel="stylesheet" href="${ver('experiences.css')}">`;

const NAV_ITEMS = [
  ['publications', 'Publications', 'publications.html'],
  ['software', 'Code', 'code.html'],
  ['blog', 'Blog', 'blog.html'],
  ['experience', 'Experience', 'experience.html'],
  ['cv', 'CV', 'cv.html'],
  ['contact', 'Contact', 'contact.html'],
];
// Refresh cached documents whenever the shared navigation changes.
const NAV_VERSION = crypto.createHash('md5').update(JSON.stringify(NAV_ITEMS)).digest('hex').slice(0, 8);

function topbar(cfg) {
  const links = NAV_ITEMS.map(([key, label, href]) => {
    const url = href.startsWith('#') && !cfg.home ? 'index.html' + href : href;
    const cur = key === cfg.nav ? ' class="current"' : '';
    const aria = key === cfg.nav ? ' aria-current="page"' : '';
    return `        <a${cur} href="${url}" data-nav-label="${label}"${aria}>${label}</a>`;
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
      </nav>
      <div class="header-actions">
        <a class="header-search theme-toggle" href="search.html" data-search-open aria-label="Search website" title="Search (/ or Ctrl+K)"><svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg></a>
        <button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch theme">◐</button>
      </div>
    </div>
  </header>
  <dialog class="search-dialog" data-search-dialog aria-labelledby="search-dialog-title">
    <div class="search-dialog-head"><h2 id="search-dialog-title">Search the website</h2><button class="search-close" type="button" data-search-close aria-label="Close search"><svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></button></div>
    <form class="search-form" action="search.html" method="get" data-site-search><label class="sr-only" for="dialog-search">Search papers, projects and posts</label><input id="dialog-search" name="q" type="search" autocomplete="off" placeholder="Papers, projects, ideas…" data-search-input><p class="search-status" data-search-status role="status">Type to search papers, projects and posts.</p><div class="search-results" data-search-results></div></form>
    <p class="search-help">Esc to close <span> / or Ctrl+K to search</span></p>
  </dialog>`;
}

function footer(cfg) {
  const contact = cfg.nav === 'contact' ? '#contact' : 'contact.html';
  const extra = `\n    <span class="footer-links">${cfg.footerExtra ? cfg.footerExtra + ' · ' : ''}<a href="${contact}">Contact</a></span>`;
  return `  <footer class="content">
    <span>© 2026 Julius Störk</span>${extra}
  </footer>`;
}

function scripts(cfg) {
  const extras = cfg.extraScripts.filter(s => !(cfg.home && s === 'experiences.js'))
    .map((s) => `  <script defer src="${ver(s)}"></script>`).join('\n');
  /* GoatCounter is injected after window load so a slow or filtered
     analytics host can never hold the page in its loading state
     (busy cursor / tab spinner). */
  return `  <script defer src="${ver('theme.js')}"></script>
  <script defer src="${ver('navigation.js')}"></script>
  <script defer src="${ver('media.js')}"></script>
  <script defer src="${ver('interactions.js')}"></script>
  <script defer src="${ver('cursor.js')}"></script>
  <script defer src="${ver('portal-transitions.js')}"></script>
  <script defer src="${ver('search.js')}" data-search-index="${ver('search-index.json')}"></script>
${extras ? extras + '\n' : ''}  <script>
    window.addEventListener('load', function () {
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://gc.zgo.at/count.js';
      s.setAttribute('data-goatcounter', 'https://jstoerk.goatcounter.com/count');
      document.body.appendChild(s);
    });
  </script>`;
}

/* ---------- post listings ---------- */
/* Reuse the actual post artwork for tiles. External SVGs isolate each cover's
   gradient IDs and keep the index small; generated assets are committed too. */
function postCover(p) {
  const source = fs.readFileSync(path.join(SRC, 'pages', p.file), 'utf8');
  const cover = source.match(/<svg\b[^>]*class="cover-art"[\s\S]*?<\/svg>/);
  if (!cover) throw new Error(`${p.file}: missing cover artwork for blog tiles`);
  const target = `images/blog-covers/${p.file.replace(/\.html$/, '.svg')}`;
  fs.mkdirSync(path.dirname(path.join(ROOT, target)), { recursive: true });
  let svg = cover[0];
  if (!/^<svg\b[^>]*\sxmlns\s*=/.test(svg)) {
    svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  fs.writeFileSync(path.join(ROOT, target), svg + '\n');
  return ver(target);
}

/* CSS repeats each article's bespoke line art without stretching it. Export
   both themes from the shared ink rules so no runtime SVG cloning is needed. */
const siteStyles = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8').replace(/\r\n/g, '\n');
const inkStart = siteStyles.indexOf('.art-ink,\n');
const inkEnd = siteStyles.indexOf('\nbody::before', inkStart);
if (inkStart < 0 || inkEnd < 0) throw new Error('missing shared line-art styles');
const inkStyles = siteStyles.slice(inkStart, inkEnd).trim();
const artThemes = {
  light: siteStyles.match(/:root,\s*\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/)[1],
  dark: siteStyles.match(/\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/)[1],
};
function postBackground(html, file) {
  const marker = '<!--#POST_BACKGROUND-->';
  if (!html.includes(marker)) throw new Error(`${file}: missing article background marker`);
  const artwork = fs.readFileSync(path.join(SRC, 'blog-art', file.replace(/\.html$/, '.svg')), 'utf8').trimEnd();
  if (!/<svg\b[^>]*width="\d+"[^>]*height="\d+"/.test(artwork)) {
    throw new Error(`${file}: background needs explicit tile dimensions`);
  }
  const assets = Object.entries(artThemes).map(([theme, tokens]) => {
    const styles = inkStyles.replace(/var\((--art-ink(?:-soft)?)\)/g,
      (_, token) => tokens.match(new RegExp(`${token}:\\s*([^;]+);`))[1]);
    const svg = artwork.replace(/(<svg\b[^>]*>)/, (_, tag) => `${tag}<style>${styles}</style>`);
    const target = `images/blog-backgrounds/${file.replace(/\.html$/, '')}-${theme}.svg`;
    fs.mkdirSync(path.dirname(path.join(ROOT, target)), { recursive: true });
    fs.writeFileSync(path.join(ROOT, target), svg + '\n');
    return `--post-art-${theme}:url('${ver(target)}')`;
  });
  return html.replace(marker, () => `<div class="page-art page-art-post" aria-hidden="true" style="${assets.join(';')}"></div>`);
}

function postEntry(p, withMinutes, indent) {
  const meta = withMinutes ? `${p.category} · ${p.minutes} min` : p.category;
  const pad = ' '.repeat(indent);
  return `${pad}<article class="journal-entry">
${withMinutes ? `${pad}  <div class="journal-thumbnail"><img src="${postCover(p)}" alt="" width="1200" height="675" loading="lazy" decoding="async"><time class="journal-image-date" datetime="${p.iso}">${p.display}</time></div>\n` : ''}${pad}  <div class="journal-meta"><time datetime="${p.iso}">${p.display}</time><span>${meta}</span></div>
${pad}  <div class="journal-copy"><h3><a class="card-link" href="${p.file}">${p.title}</a></h3><p>${p.summary}</p></div>
${pad}  <span class="journal-arrow" aria-hidden="true">↗</span>
${pad}</article>`;
}

function postList(items) {
  return `<div id="blog-posts" class="journal-index journal-index-page" data-blog-view="tiles">
${items.map(p => postEntry(p, true, 6)).join('\n')}
    </div>`;
}
function blogPagination(cfg) {
  if (!cfg.archivePage) return '';
  const page = cfg.archivePage;
  return `<nav class="archive-pagination" aria-label="Blog archive pages">
    ${page > 1 ? `<a rel="prev" href="${archiveFile(page - 1)}">← Newer</a>` : '<span></span>'}
    <div>${Array.from({ length: archiveCount }, (_, i) => `<a href="${archiveFile(i + 1)}"${page === i + 1 ? ' aria-current="page"' : ''} aria-label="Page ${i + 1}">${i + 1}</a>`).join('')}</div>
    ${page < archiveCount ? `<a rel="next" href="${archiveFile(page + 1)}">Older →</a>` : '<span></span>'}
  </nav>`;
}

function trailStory(p, preview = true) {
  return `<a class="atlas-story" data-post="${p.file}" data-preview="${preview}"${preview ? '' : ' hidden'} href="${p.file}"><img src="${postCover(p)}" alt="" width="1200" height="675" loading="lazy"><span class="atlas-story-copy"><small>${p.display} &middot; ${p.category}</small><strong>${p.title}</strong><span class="atlas-intro">${p.summary}</span><em>Read the notes &#8599;</em></span></a>`;
}
const BLOG_LATEST = posts.slice(0, 2).map(p => trailStory(p)).join('\n              ');
const TRAILS = { materials: 'Materials', learning: 'Learning', modelling: 'Modelling', automation: 'Automation' };
for (const p of posts) {
  if (!TRAILS[p.trail]) throw new Error(`${p.file}: missing or invalid blog trail`);
}
const BLOG_TRAILS = Object.entries(TRAILS).map(([trail, label]) =>
  `<div class="atlas-panel" id="atlas-${trail}" role="region" aria-label="${label} blog posts">\n              ${posts.filter(p => p.trail === trail).slice(0, 2).map(p => trailStory(p)).join('\n              ')}\n            </div>`
).join('\n            ');

/* ---------- build pages ---------- */
function plainText(value) {
  return value.replace(/<(?:script|style|svg|pre)\b[\s\S]*?<\/(?:script|style|svg|pre)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&(?:amp|lt|gt|quot|nbsp);/g, entity => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&nbsp;':' '})[entity])
    .replace(/\s+/g, ' ').trim();
}
const searchDocs = posts.map(p => {
  const source = fs.readFileSync(path.join(SRC, 'pages', p.file), 'utf8');
  const body = source.slice(source.indexOf('<article')).split('<section class="post-sources">')[0];
  return { url: p.file, title: p.title, kind: 'Blog', summary: p.summary, text: plainText(body) };
});
const publicationsSource = fs.readFileSync(path.join(SRC, 'publications.html'), 'utf8');
for (const match of publicationsSource.matchAll(/<article\b[^>]*id="([^"]+)"[\s\S]*?<\/article>/g)) {
  const source = match[0], title = source.match(/<strong>([\s\S]*?)<\/strong>/)?.[1];
  searchDocs.push({ url: 'publications.html#' + match[1], title: plainText(title || 'Publication'), kind: 'Publication', summary: plainText(source.match(/<p\b[^>]*>[\s\S]*?<\/p>/)?.[0] || ''), text: plainText(source) });
}
const softwareSource = fs.readFileSync(path.join(SRC, 'software.html'), 'utf8');
const experienceSource = fs.readFileSync(path.join(SRC, 'experience.html'), 'utf8');
searchDocs.push({ url: 'experience.html', title: 'Research and industry experience', kind: 'Profile', summary: 'Electrode engineering at VARTA and TU Braunschweig, catalysis at TUM, process scale-up at Bosch and cathode materials at MPI and BASF.', text: plainText(experienceSource) });
const projectMatches = [...softwareSource.matchAll(/<div class="item software-project" id="([^"]+)"/g)];
projectMatches.forEach((match, i) => {
  const source = softwareSource.slice(match.index, projectMatches[i + 1]?.index || softwareSource.length);
  const title = source.match(/<h3>([\s\S]*?)<\/h3>|<strong>([\s\S]*?)<\/strong>/);
  searchDocs.push({ url: 'code.html#' + match[1], title: plainText(title?.[1] || title?.[2] || 'Project'), kind: 'Code', summary: plainText(source.match(/<p\b[^>]*>[\s\S]*?<\/p>/)?.[0] || ''), text: plainText(source) });
});
searchDocs.push({ url: 'contact.html', title: 'Contact', kind: 'Profile', summary: 'Collaborations, shared data and experimental setups.', text: plainText(contactSection(true)) });
for (const [url, title, summary] of [['index.html#home', 'Julius Störk', 'PhD researcher at VARTA and TU Braunschweig, working on AI for battery manufacturing.'], ['cv.html', 'Curriculum vitae', 'Research experience, education, manufacturing and laboratory work.']]) {
  const source = fs.readFileSync(path.join(SRC, 'pages', url.split('#')[0]), 'utf8');
  searchDocs.push({ url, title, kind: 'Profile', summary, text: plainText(source.slice(source.indexOf('<main'))) });
}
fs.writeFileSync(path.join(ROOT, 'search-index.json'), JSON.stringify(searchDocs) + '\n');
fs.writeFileSync(path.join(ROOT, 'blog-library.json'), JSON.stringify(posts.map(p => ({ file: p.file, title: p.title, summary: p.summary, trail: p.trail, display: p.display, category: p.category, cover: postCover(p) }))) + '\n');
const pagesDir = path.join(SRC, 'pages');
for (const source of fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'))) {
  if (!PAGES[source]) throw new Error(`no page config for ${source}`);
}
for (const [file, cfg] of Object.entries(PAGES)) {
  let html = fs.readFileSync(path.join(pagesDir, cfg.source || file), 'utf8');
  if (file !== '404.html') {
    html = html.replace(/<body([^>]*)>/, (_, attrs) => '<body' +
      (/\bclass="/.test(attrs) ? attrs.replace('class="', 'class="ambient-page ') : attrs + ' class="ambient-page"') + '>');
  }
  if (html.includes('<!--#BATTERY_MARKET_DATA-->')) {
    html = html.replace('<!--#BATTERY_MARKET_DATA-->', batteryMarketData)
      .replace('poster="media/battery-market-poster.jpg"', `poster="${ver('media/battery-market-poster.jpg')}"`)
      .replace('src="media/battery-market-timeline.mp4"', `src="${ver('media/battery-market-timeline.mp4')}"`);
  }
  let headAssets = cfg.math
    ? HEAD_ASSETS + '\n  <link rel="stylesheet" href="katex/katex.min.css">'
    : HEAD_ASSETS;
  headAssets += (cfg.extraStyles || []).map(s => `\n  <link rel="stylesheet" href="${ver(s)}">`).join('');
  if (cfg.home) headAssets += `\n  <script defer fetchpriority="high" src="${ver('experiences.js')}"></script>`;
  html = html
    .replace('  <!--#HEAD_ASSETS-->', headAssets)
    .replace('  <!--#TOPBAR-->', topbar(cfg))
    .replace('  <!--#FOOTER-->', footer(cfg))
    .replace('  <!--#SCRIPTS-->', scripts(cfg))
    .replace('<!--#POST_LIST-->', () => postList(cfg.archivePage ? posts.slice((cfg.archivePage - 1) * ARCHIVE_SIZE, cfg.archivePage * ARCHIVE_SIZE) : posts.slice(0, 4)))
    .replace(/^[ \t]*<!--#BLOG_PAGINATION-->[ \t]*$/m, () => blogPagination(cfg))
    .replace('<!--#BLOG_TOOLBAR_LINK-->', () => cfg.archivePage
      ? '<a class="archive-top-link" href="blog.html">← Recent posts</a>'
      : `<div class="blog-archive-link"><a class="outline-action" href="blog-archive.html">all posts <span aria-hidden="true">↗</span></a><span class="muted">${posts.length} posts in the archive</span></div>`)
    .replace('<!--#PUBLICATION_RECORDS-->', () => fs.readFileSync(path.join(SRC, 'publications.html'), 'utf8'))
    .replace('<!--#SOFTWARE_RECORDS-->', () => fs.readFileSync(path.join(SRC, 'software.html'), 'utf8'))
    .replace('<!--#EXPERIENCE_RECORDS-->', () => experienceSource);
  if (cfg.archivePage) {
    html = html.replace('<h1>Blog</h1>', `<h1>Blog archive</h1>`)
      .replace('Working notes on continual learning and electrode manufacturing.</p>', `All ${posts.length} posts · page ${cfg.archivePage} of ${archiveCount}.</p>`)
      .replaceAll('https://j-stoerk.github.io/blog.html', SITE + '/' + file)
      .replace('<title>Blog · Julius Störk</title>', `<title>Blog archive · Page ${cfg.archivePage} · Julius Störk</title>`);
  }
  html = html.replace('<!--#BIO_POPOVERS-->', () => fs.readFileSync(path.join(SRC, 'bio-popovers.html'), 'utf8'));
  html = html.replace('<!--#CONTACT_SECTION-->', () => contactSection(file === 'contact.html'));
  html = html.replace('<!--#CODE_SESSIONS-->', () => fs.readFileSync(path.join(SRC, 'code-sessions.html'), 'utf8'));
  html = html.replace('<!--#RESEARCH_ATLAS-->', () => fs.readFileSync(path.join(SRC, 'research-atlas.html'), 'utf8'));
  html = html.replace('data-feature="research-atlas"', `data-feature="research-atlas" data-post-library="${ver('blog-library.json')}"`);
  html = html.replace('<!--#BLOG_LATEST-->', () => BLOG_LATEST);
  html = html.replace('<!--#BLOG_TRAILS-->', () => BLOG_TRAILS);
  html = html.replace('<!--#CONTACT_FORM-->', () => {
    const form = fs.readFileSync(path.join(SRC, 'contact-form.html'), 'utf8')
    .replace('<!--#CONTACT_ENDPOINT-->', () => community.contact.endpoint)
    .replace('<!--#COMMENT_SERVICE-->', () => attribute(community.comments.endpoint));
    return file === 'contact.html' ? form.replace(' hidden>', '>')
      .replace(/\s*<button\b[^>]*data-message-close[^>]*>[\s\S]*?<\/button>/, '') : form;
  });
  if (file.startsWith('post-')) {
    html = html.replace(/^[ \t]*<!--#POST_CONTEXT-->[ \t]*\r?\n?/m, () => listenControl(file));
    html = postBackground(html, file);
    html = foldReferences(html);
    const comments = community.comments.endpoint && community.comments.turnstileSiteKey ? fs.readFileSync(path.join(SRC, 'comments.html'), 'utf8')
      .replace('<!--#COMMENTS_CONFIG-->', () => publicConfig('comments-config', {
        endpoint: community.comments.endpoint,
        turnstileSiteKey: community.comments.turnstileSiteKey,
        sectionId: file.replace(/\.html$/, ''),
      })) : '';
    if (!html.includes('    <nav class="post-pager"')) throw new Error(`${file}: missing post pager`);
    if (comments) html = html.replace('    <nav class="post-pager"', () => comments + '\n\n    <nav class="post-pager"');
  }
  if (file.startsWith('post-')) html = articleTypography(html);
  if (cfg.math) html = renderMath(html, file);
  // Disable native media/control dragging, even before scripts load.
  // Actual interactive drags use pointer events rather than native drag-and-drop.
  html = html.replace(/<(?:img|a|button|summary)\b[^>]*>/gi, tag => tag
    .replace(/\s+draggable\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/^<(img|a|button|summary)\b/i, '<$1 draggable="false"'));
  html = html.replace(/href="([^":?#]+\.html)(#[^"]*)?"/g,
    (_, page, hash = '') => `href="${page}?nav=${NAV_VERSION}${hash}"`);
  if (/<!--#/.test(html)) throw new Error(`${file}: unresolved marker`);
  html = shareMetadata(html, file);
  fs.writeFileSync(path.join(ROOT, file), html);
  console.log('built', file);
}

// The project entry point is a plain redirect, but link unfurlers can still read
// its server-delivered metadata before any JavaScript navigation takes place.
const projectFile = 'chargewise/index.html';
let project = fs.readFileSync(path.join(ROOT, projectFile), 'utf8');
if (!project.includes('property="og:title"')) project = project.replace('</head>', `
<meta property="og:type" content="website">
<meta property="og:site_name" content="Julius Störk">
<meta property="og:title" content="ChargeWise AI">
<meta property="og:description" content="Fleet charging within grid limits. Explore the original hosted demo.">
<meta property="og:url" content="${SITE}/chargewise/">
</head>`);
fs.writeFileSync(path.join(ROOT, projectFile), shareMetadata(project, projectFile));

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
    <title>Research notes · Julius Störk</title>
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
const order = Object.keys(PAGES).filter(file => PAGES[file].priority);
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

/* ---------- publications.bib ----------
   Extracted from the BibTeX blocks in the built Publications page, so the
   download can never drift from what the site shows. */
const indexHtml = fs.readFileSync(path.join(ROOT, 'publications.html'), 'utf8');
const bibEntries = [...indexHtml.matchAll(/<pre><code>(@[\s\S]*?)<\/code><\/pre>/g)]
  .map((m) => m[1].trim());
if (bibEntries.length === 0) throw new Error('no BibTeX entries found in publications.html');
fs.writeFileSync(path.join(ROOT, 'publications.bib'),
  `% Publications · Julius Störk · https://j-stoerk.github.io/
% Generated by _src/build.js; do not edit by hand.

${bibEntries.join('\n\n')}
`);
console.log(`built publications.bib (${bibEntries.length} entries)`);
