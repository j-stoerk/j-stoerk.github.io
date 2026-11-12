import sys
from pathlib import Path
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'audio'))
from narration import ArticleText, extract_posts

class NarrationTests(unittest.TestCase):
    def test_narrative_excludes_figures_widgets_citations_and_sources(self):
        parser=ArticleText()
        parser.feed('''<article><h1>Not duplicated</h1><div class="prose">
        <h2>Method</h2><p>The actual text <sup class="cite">[1]</sup> continues.</p>
        <figure><img alt="Not read"><figcaption>Not read</figcaption></figure>
        <div class="interactive"><p>Not read</p><input></div>
        <pre>Not read</pre><table><tr><td>Not read</td></tr></table>
        <p>Final paragraph.</p><section class="post-sources"><p>Not read</p></section>
        </div><p>Footer not read</p></article>''')
        parser.flush()
        self.assertEqual(parser.paragraphs,['Method','The actual text continues.','Final paragraph.'])
    def test_multiple_prose_sections_resume_after_figure(self):
        parser=ArticleText();parser.feed('<div class="prose"><p>Before.</p></div><figure><figcaption>Caption.</figcaption></figure><div class="prose"><p>After.</p></div>');parser.flush()
        self.assertEqual(parser.paragraphs,['Before.','After.'])
    def test_all_current_posts_have_title_and_substantive_text(self):
        for post in extract_posts():
            self.assertGreater(len(post['paragraphs']),3,post['page'])
            self.assertEqual(len(post['sha256']),64)
            self.assertNotIn('Read the notes ↗',post['text'])

if __name__=='__main__':unittest.main()
