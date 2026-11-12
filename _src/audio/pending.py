"""Emit only articles whose published narration is absent or out of date."""
import json
from narration import ROOT, extract_posts
published=json.loads((ROOT/'_src/audio/manifest.json').read_text(encoding='utf-8'))
print(json.dumps([p['page'] for p in extract_posts() if published.get(p['page'],{}).get('sha256')!=p['sha256']]))
