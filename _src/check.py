"""Site integrity checks for j-stoerk.github.io.

Run from the repo root (locally or in CI):  python _src/check.py
Exits non-zero on the first category of failure. Checks the BUILT output at
the repo root; the drift between _src sources and output is checked
separately in CI via `node _src/build.js && git diff`.
"""
import json
import os
import re
import sys
import xml.dom.minidom
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

PAGES = sorted(
    f for f in os.listdir(os.path.join(ROOT, '_src', 'pages')) if f.endswith('.html')
)

VOID = {
    'meta', 'link', 'img', 'br', 'hr', 'input', 'source', 'base',
    'circle', 'line', 'path', 'rect', 'ellipse', 'polygon',
}

failures = []


def fail(msg):
    failures.append(msg)
    print('FAIL:', msg)


class BalanceChecker(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        if tag not in VOID:
            self.stack.append((tag, self.getpos()[0]))

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack:
            self.errors.append(f'</{tag}> at line {self.getpos()[0]} with empty stack')
            return
        open_tag, line = self.stack.pop()
        if open_tag != tag:
            self.errors.append(
                f'</{tag}> at line {self.getpos()[0]} closes <{open_tag}> from line {line}'
            )


def check_page(name):
    html = open(name, encoding='utf-8').read()

    checker = BalanceChecker()
    checker.feed(html)
    leftovers = [t for t in checker.stack if t[0] not in ('html', 'body')]
    for e in checker.errors[:5]:
        fail(f'{name}: {e}')
    for t in leftovers[:5]:
        fail(f'{name}: unclosed <{t[0]}> from line {t[1]}')

    if '<!--#' in html:
        fail(f'{name}: unresolved build marker')

    # every local reference must exist in the repo
    for ref in sorted(set(re.findall(r'(?:href|src|srcset)="([^"#][^"]*)"', html))):
        if ref.startswith(('http://', 'https://', 'mailto:', 'data:')):
            continue
        for part in [p.strip().split(' ')[0] for p in ref.split(',')]:
            part = part.split('#')[0]
            if part and not os.path.isfile(os.path.join(ROOT, part)):
                fail(f'{name}: broken local reference "{part}"')

    # every JSON-LD block must parse
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
        try:
            json.loads(m.group(1))
        except Exception as exc:
            fail(f'{name}: invalid JSON-LD ({exc})')

    # pages that load KaTeX must contain rendered math and no raw TeX blocks
    if 'katex.min.css' in html:
        if 'class="katex"' not in html:
            fail(f'{name}: loads KaTeX CSS but contains no rendered math')
        if '$$' in html:
            fail(f'{name}: raw $$...$$ survived the math build step')


def main():
    for name in PAGES:
        check_page(name)

    for xml_file in ('feed.xml', 'sitemap.xml'):
        try:
            xml.dom.minidom.parse(xml_file)
        except Exception as exc:
            fail(f'{xml_file}: invalid XML ({exc})')

    try:
        json.load(open('_src/posts.json', encoding='utf-8'))
    except Exception as exc:
        fail(f'_src/posts.json: invalid JSON ({exc})')

    if not os.path.isfile('google0d8fecbb46855755.html'):
        fail('Google site-verification file is missing (Search Console breaks)')

    if not open('publications.bib', encoding='utf-8').read().count('@') >= 2:
        fail('publications.bib has fewer entries than expected')

    if failures:
        print(f'\n{len(failures)} check(s) failed across {len(PAGES)} pages')
        sys.exit(1)
    print(f'all checks passed ({len(PAGES)} pages, feeds, sitemap, bib)')


if __name__ == '__main__':
    main()
