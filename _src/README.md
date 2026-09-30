# Site sources

The HTML files at the repo root are **generated**. Edit here, then rebuild:

```
node _src/build.js
```

- `pages/*.html` — page sources. Shared chrome is injected at the markers
  `<!--#HEAD_ASSETS-->`, `<!--#TOPBAR-->`, `<!--#FOOTER-->`, `<!--#SCRIPTS-->`;
  blog listings at `<!--#POST_LIST-->` (blog.html) and `<!--#POST_CARDS-->`
  (index.html). Everything else in a source file is copied verbatim.
- `posts.json` — one entry per blog post. Drives the blog listing, the
  home-page cards, `feed.xml`, and `sitemap.xml`. To publish a post: add its
  source page in `pages/`, add an entry here, run the build.
- **Math**: set `"math": true` on a post entry and write `$$...$$` (display)
  or `\( ... \)` (inline) TeX in its source. The build renders it to static
  HTML+MathML via `vendor/katex.min.js`; browsers load only
  `katex/katex.min.css` + fonts, no client-side JS.
- **publications.bib** is regenerated from the BibTeX blocks in the built
  index page — update a citation there and the .bib follows.
- Page-level config (nav highlight, extra scripts, footer links, sitemap
  lastmod) lives in the `PAGES` object in `build.js`. Bump `lastmod` when a
  page's content changes.

The build also extracts each post's `svg.cover-art` into
`images/blog-covers/` for the blog tile view. Edit the inline artwork in the
source page and rebuild; commit the generated SVGs with the HTML.
`blog-view.js` switches between the list and tiles and remembers the selection.

Runtime assets (styles.css, blog.js, blog-view.js, cite.js, theme.js, navigation.js,
background.js, fonts, PDFs, images) are plain files at the root and are not
generated.

GitHub Pages runs Jekyll, which skips underscore directories, so `_src` is
never published.
