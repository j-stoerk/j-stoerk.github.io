"""Validate and merge narration metadata against the current article text."""
from pathlib import Path
import argparse
import json
import re
from narration import ROOT, extract_posts

def main():
    cli=argparse.ArgumentParser();cli.add_argument('folder');args=cli.parse_args()
    file=ROOT/'_src/audio/manifest.json';manifest=json.loads(file.read_text(encoding='utf-8'))
    expected={p['page']:p for p in extract_posts()}
    for source in Path(args.folder).rglob('manifest.json'):
        for page,entry in json.loads(source.read_text(encoding='utf-8')).items():
            if page not in expected or entry['sha256']!=expected[page]['sha256']:
                raise ValueError('Narration no longer matches '+page)
            if not re.fullmatch(r'post-[a-z0-9-]+-[a-f0-9]{16}\.mp3',entry['file']):
                raise ValueError('Unexpected audio filename')
            if entry['seconds']<=0 or entry['bytes']<1000:raise ValueError('Invalid audio metadata')
            manifest[page]=entry
    for page,post in expected.items():
        if manifest.get(page,{}).get('sha256')!=post['sha256']:
            raise ValueError('Missing current narration: '+page)
    file.write_text(json.dumps(manifest,ensure_ascii=False,indent=2,sort_keys=True)+'\n',encoding='utf-8')
    print('Published metadata for',len(manifest),'articles')

if __name__=='__main__':main()
