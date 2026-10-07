# Site sources

The HTML files at the repo root are **generated**. Edit here, then rebuild:

```
node _src/build.js
```

- `pages/*.html` — page sources. Shared chrome is injected at the markers
  `<!--#HEAD_ASSETS-->`, `<!--#TOPBAR-->`, `<!--#FOOTER-->`, `<!--#SCRIPTS-->`;
  blog listings at `<!--#POST_LIST-->` (blog.html) and `<!--#POST_CARDS-->`
  (index.html). Article background SVGs are exported as repeating assets;
  other source content is copied verbatim.
- `posts.json` — one entry per blog post. Drives the blog listing, the
  home-page cards, `feed.xml`, and `sitemap.xml`. To publish a post: add its
  source page in `pages/`, add an entry here, run the build.
- Each post needs a `whyItMatters` sentence in plain language. Place
  `<!--#POST_CONTEXT-->` just below its title cover and above the article body;
  the builder inserts the sentence without repeating the technical summary used
  in blog listings.
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
- Optional `"scripts"` and `"styles"` arrays on a post entry load that article's
  root-level assets with the normal content hashes.
- **publications.bib** is regenerated from the BibTeX blocks in the built
  index page — update a citation there and the .bib follows.
- Page-level config (nav highlight, extra scripts, footer links, sitemap
  lastmod) lives in the `PAGES` object in `build.js`. Bump `lastmod` when a
  page's content changes.

The build also extracts each post's `svg.cover-art` into
`images/blog-covers/` for the blog tile view. Edit the inline artwork in the
source page and rebuild; commit the generated SVGs with the HTML.
Each post has a dedicated schematic in `blog-art/<post-name>.svg`, inserted at
`<!--#POST_BACKGROUND-->`. These are exported into `images/blog-backgrounds/`
in light and dark variants, using the shared ink styles and theme tokens.
Each 1000×1800 tile has three subject-specific sketches spaced roughly 600 units
apart, with a quiet continuous line connecting them. Connecting paths meet at the
top and bottom so repeats stay seamless. CSS repeats the
artwork at its original proportions for the full article height, including when
content expands or JavaScript is unavailable. A horizontal mask softens artwork
under the reading column. Edit the dedicated SVGs rather than the generated assets.
`blog-view.js` switches between the list and tiles and remembers the selection.

Once the comments Worker and Turnstile are configured, posts get the compact comment section from `comments.html`;
the home page gets the inline message form from `contact-form.html`. Public integration settings
live in `community.json`. See [service activation instructions](../_services/README.md)
for deploying the Cloudflare Worker/D1 service and managing the Formspree destination. Comments remain
hidden until a public Turnstile site key is configured. The contact form posts directly
to the configured Formspree endpoint using standard HTML. `contact.js` expands
the form beside Contact (below it on mobile) and prefills an editable name from
the confirmed local comment identity without contacting the comments service.
Closing the form preserves edits. Email remains available without JavaScript.

`comment-identity.js` shares the local identity between `comments.js` and
`contact.js`. Comment reads are anonymous; the first Post asks for a display name,
then verifies Turnstile. Later posts remember the identity. Optional encrypted
identity files can be restored on another device. The build publishes
`comment-pages.json` and a standalone dashboard Worker in `_services/comments/`.
Deploy the manifest-aware Worker once; future posts are recognised on demand
after publishing. Known posts use the cached list; unfamiliar slugs trigger a
refresh, with a thirty-second cooldown and no polling timer. Keep server secrets
in Cloudflare, never in `community.json`.

The shared header order lives in `NAV_ITEMS`. Local HTML links carry a `nav`
version derived from that list so switching pages refreshes documents cached
with an older menu. Canonical URLs and in-page anchors remain unchanged.

Runtime assets (styles.css, blog.js, blog-view.js, cite.js, theme.js, navigation.js,
fonts, PDFs, images) are plain files at the root, except for the generated
`images/blog-covers/` and `images/blog-backgrounds/` folders.

GitHub Pages runs Jekyll, which skips underscore directories, so `_src` is
never published.

## Battery-market article and video

`data/battery-market.json` is the sourced dataset for the single 2020–4 October
2026 timeline. Missing observations stay null. Filled areas represent reported
global EV deployment per month; outlined areas represent annual capacity targets
divided by twelve. Those targets are not achieved output. Insolvency, funding
distress, project pauses, and pivots remain distinct. The article's
`<!--#BATTERY_MARKET_DATA-->` marker exports the same observations and sourced
milestones to readable HTML and `data/battery-market-volumes.csv` during a build.
The regional maps share one circle-area scale and keep circles at the mapped
headquarters or project coordinates. Company-wide deployment is not output at the marked
headquarters. Future planned starts remain targets and do not become historical
production events. The video runs for 44 seconds in one continuous timeline.
The video contains only Europe and East Asia. North American and Indian entries
remain in the downloadable data and are identified as omitted in the article.
Labels have no background boxes and match their marker colours. A deterministic
layout searches nearby positions, avoiding label overlaps and leader crossings,
with space reserved for future planned-start years. New milestones briefly pulse at
their geographic anchor. Both maps tile the entire video edge to edge, separated
by a thin divider. Titles, dates, announcements and legends overlay the geography,
with their space reserved during label placement. Subtle translucent edge fades
preserve the country lines underneath; there are no opaque headers or footers.
The date appears only at the top; there is no bottom timeline. One compact legend uses tangent nested
circles on the same area scale, without a duplicate HTML legend. Poster and MP4 URLs carry content
hashes after building, so updated media does not reuse a cached earlier version.
The renderer uses logical coordinates at twice the resolution for a 2880×1560
MP4, with larger labels and H.264 CRF 16 encoding. Poster JPEGs use full colour
resolution. Geography uses Natural Earth's public-domain 1:50m land polygons and
country boundaries, cached in `battery-world-land.json` and
`battery-country-borders.json`. Their source URLs are embedded in those files.

The committed MP4, poster and social image need no media tools during ordinary
builds. After changing the dataset, regenerate them with:

```powershell
python -m pip install Pillow imageio-ffmpeg
python _src/media/render-battery-market.py --font C:/Windows/Fonts/segoeui.ttf
python -m unittest discover -s _src/media -p 'test_*.py'
node _src/build.js
python _src/check.py
```

The renderer uses the included public-domain Natural Earth land outlines and a
local TrueType font. `--ffmpeg` and `--font` support other installations;
`--stills-only` previews the final figure without rendering the video.
`--preview-dir <directory>` also exports representative frames for visual review.
`battery-market.js` manages native playback, visibility, manual pause, and reduced
motion. Native controls and the expandable dataset remain available.

## Research experiences

`bio-popovers.js` handles the underlined bio phrases: hovering or keyboard focus
previews a card, and clicking or tapping keeps it open. Escape, the close button,
or clicking outside dismisses it. The explanation replaces the portrait in a
reserved right-hand column on desktop and expands below the bio on mobile.
Artwork and text sit directly on the page without a duplicate heading or card border;
the region keeps the topic as its accessible label.
Scrolling keeps the selected explanation open. The content lives in
`bio-popovers.html`, inserted at `<!--#BIO_POPOVERS-->`. With JavaScript disabled,
the bio remains plain text and its inline buttons are disabled.

`experiences.js` contains independent initializers for the intro/background, Blog topic
explorer, and career object. The homepage uses one fixed mesh and gold curve;
the older page-wide SVG and section-sketch layers have been removed.
The intro projects a layered
electrode surface onto a canvas, assembling its points on arrival and responding
to pointer movement and taps. It uses the site's theme colours and the
shared visibility-aware animation loop, with a separate clock for each scene.
The first homepage visit in a tab session without a fragment, or an explicit
homepage reload, starts the surface at full screen with rolling digits counting from
000 to 100 and a compact progress bar. The count accelerates with an exponential curve
and follows elapsed real time so slower rendering cannot extend the opening.
The surface assembles and moves with the displayed integer, and digit transitions
shorten as the counter accelerates. The renderer is deferred in the head so it
downloads early without blocking HTML parsing. All other runtime scripts defer too.
On the same frame that reaches 100, that same canvas unfolds into a larger, quieter mesh
and flowing gold line behind the page. Its viewport dimensions stay fixed through
the reveal; a horizontal opacity mask protects the reading column. The portrait
uses its original size and occupies its own place in the hero. Ambient frames
stop outside the hero. Intersection observers track visibility and resize observers
cache canvas dimensions. Mobile devices use fewer mesh points, a lower pixel ratio
and a 30 fps intro; the settled background rests until interaction. Slow drawing
also enables this lighter rendering. Desktop ambient motion runs at 20 fps, with
a shared pixel budget. Resizing and theme changes redraw the current scene.
The head bootstrap selects a renderer (`pending`, `canvas`, or `fallback`).
The canvas becomes visible only after its first complete frame. The static SVG is
reserved for unavailable JavaScript/canvas or a renderer timeout, and a selected
fallback stays selected for that page visit. There is no SVG-to-canvas cross-fade.
Clicking, scrolling, touching the screen, or using the keyboard dismisses the opening immediately.
Content becomes interactive after the reveal, so dismissing the intro cannot
accidentally activate a hidden link. Pointer-driven motion starts after the opening.
A 1.8-second fallback restores the page if the renderer never draws its first
frame; deep links and data-saving connections skip the opening. The head bootstrap records
the first visit in sessionStorage before paint, so ordinary returns from CV or
Blog open directly, even after skipping or dismissing the intro. Navigation timing
identifies explicit reloads, which replay the opening even at a section fragment.
If sessionStorage is unavailable, ordinary visits open directly. Reduced motion renders
a still surface;
`images/intro-surface.svg` provides the fallback without JavaScript or canvas.
`experiences.css` styles these components,
compact publication details, section links, and
static software illustrations. `portal-transitions.js` animates
publication illustrations around ordinary navigation to the two companion
articles and back. It preserves modified clicks and restores the saved reading position;
reduced motion or unavailable browser animation APIs use ordinary links.

The Blog explorer lives in `research-atlas.html`, inserted at `<!--#RESEARCH_ATLAS-->`.
The builder generates its article links from `posts.json`; every post needs a
`trail` of `materials`, `learning`, `modelling`, or `automation`. JavaScript selects
the visible topic panel. Each topic previews its two newest posts in a fixed-height
row, with long introductions shortened to fit and marked with `[...]`. Surprise me
features one random post from the full collection under its matching topic,
avoiding an immediate repeat. Its introduction uses the remaining card height and
is shortened only when it overflows. The full archive remains linked through all posts.
Other component markup lives in `pages/index.html`. Components carry
`data-feature` attributes to make later review and removal easy. Initializers
skip missing components, so removing a component's markup is sufficient; its
initializer and styles can then be cleaned up. Rebuild afterward.

The shared animation loop pauses canvases offscreen and when the tab is hidden.
Reduced motion starts paused. The top line is the only page-progress indicator; chapter links indicate
location. Section-local SVGs preserve their proportions at every viewport width.
