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
- **Post titles** use title case: capitalize major words and words of four or
  more letters; keep short articles, conjunctions, and prepositions lowercase
  unless they begin or end the title or begin a subtitle. Capitalize the main
  parts of hyphenated compounds. Preserve names and notation such as DisCo,
  arXiv, CausalPFN, and O(n). Keep page headings, metadata, and post links aligned
  with the title in `posts.json`.
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

## Research experiences

`experiences.js` contains independent initializers for the electrode hero,
particle-to-network transition, microscope, hold-to-compress demo, three lab
experiments, topic constellation, section artwork, project previews, and career
object. `experiences.css` styles these components. `portal-transitions.js` animates
publication illustrations around ordinary navigation to the two companion
articles and back. It preserves modified clicks and restores the saved reading position;
reduced motion or unavailable browser animation APIs use ordinary links.

The Lab markup is in `research-lab.html`, inserted at `<!--#RESEARCH_LAB-->`.
Other component markup lives in `pages/index.html`. Components carry
`data-feature` attributes to make later review and removal easy. Initializers
skip missing components, so removing a component's markup is sufficient; its
initializer and styles can then be cleaned up. Rebuild afterward. Removing the Lab also
requires removing its chapter link. Scientific demos explicitly state their
simplifying assumptions; they do not present generated values as measurements.

The shared animation loop pauses canvases offscreen and when the tab is hidden.
The hero's motion control pauses the experiences, and reduced motion starts
paused. The top line is the only page-progress indicator; chapter links indicate
location. Section-local SVGs preserve their proportions at every viewport width.
