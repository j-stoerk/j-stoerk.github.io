'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const typography = require('../typography');

test('measurements stay together without changing ordinary words, dates or model names', () => {
  const result = typography('<p>50 kWh, −25 °C, 1.2 MB, 10–20 ms and 5 mA/cm². 8 November 2026; Qwen3; 8B; 10 million; 3 models.</p>');
  for (const text of ['50&#160;kWh', '−25&#160;°C', '1.2&#160;MB', '10–20&#160;ms', '5&#160;mA/cm²']) assert.ok(result.includes(text), text);
  assert.ok(result.includes('8 November 2026; Qwen3; 8B; 10 million; 3 models.'));
});
test('code, TeX, SVG labels and link destinations remain intact', () => {
  const protectedText = '<code>sleep(10 ms)</code> \\(10 ms\\) <svg><text>10 ms</text></svg>';
  const result = typography('<p>' + protectedText + ' <a href="data/10 ms.csv">Data</a>.</p>');
  assert.ok(result.includes(protectedText));
  assert.ok(result.includes('href="data/10 ms.csv"'));
  assert.ok(result.includes('</a>&#8288;.'));
});
test('punctuation and superscript citations keep their preceding context', () => {
  const result = typography('<p>Read <em>this</em> . A result. <sup class="cite">[1]</sup>. Then \\(x\\).</p>');
  assert.ok(result.includes('</em>&#8288;.'));
  assert.ok(result.includes('result.&#160;<sup'));
  assert.ok(result.includes('</sup>&#8288;.'));
  assert.ok(result.includes('\\(x\\)&#8288;.'));
});
test('HTML examples inside scripts and preformatted blocks are not rewritten', () => {
  const source = '<script>const example = "<p>10 ms</p>";</script><pre>&lt;p&gt;10 ms&lt;/p&gt;</pre>';
  assert.equal(typography(source), source);
});
