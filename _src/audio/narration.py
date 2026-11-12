"""Narration text and incremental Kokoro synthesis; no model runs on the website.

Standard-library extraction: python _src/audio/narration.py --extract
Generation: add --generate --model ... --voices ... --output ... .
"""
from html.parser import HTMLParser
from pathlib import Path
import argparse
import hashlib
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
VOICE = 'af_heart'
VERSION = 'kokoro-1.0-heart-1.0-mp3-v1'
VOID = {'img', 'input', 'br', 'hr', 'source', 'meta', 'link', 'wbr'}
SKIP_TAGS = {'script','style','svg','figure','figcaption','iframe','table','pre',
             'button','select','template','nav','audio','video','canvas','dialog'}
SKIP_CLASSES = {'interactive','post-sources','post-references','article-meta',
                'post-context','post-update','post-resources','metric-display',
                'post-data-table','table-wrap','equation','cite'}
BLOCKS = {'p','h2','h3','h4','li','dt','dd'}

class ArticleText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.paragraphs = []
        self.current = []
    def flush(self):
        value = re.sub(r'\s+', ' ', ''.join(self.current)).strip()
        if value:
            self.paragraphs.append(value)
        self.current = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = set(attrs.get('class','').split())
        active = bool(self.stack and self.stack[-1][1]) or 'prose' in classes
        blocked = bool(self.stack and self.stack[-1][2]) or tag in SKIP_TAGS or bool(classes & SKIP_CLASSES) or any('caption' in c for c in classes)
        if tag in BLOCKS and active and not blocked:
            self.flush()
        if tag == 'br' and active and not blocked:
            self.current.append(' ')
        if tag not in VOID:
            self.stack.append((tag, active, blocked))
    def handle_endtag(self, tag):
        if tag in VOID: return
        if not self.stack: return
        if tag in BLOCKS and self.stack[-1][1] and not self.stack[-1][2]:
            self.flush()
        for i in range(len(self.stack)-1,-1,-1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break
    def handle_data(self, value):
        if self.stack and self.stack[-1][1] and not self.stack[-1][2]:
            self.current.append(value)

def spoken_math(value):
    # Inline notation is spoken, rather than reading TeX command names.
    greek = {'Delta':'delta','Sigma':'sigma','sigma':'sigma','theta':'theta',
             'tau':'tau','nu':'nu','beta':'beta','alpha':'alpha','epsilon':'epsilon',
             'lambda':'lambda','phi':'phi','Pi':'pi','pi':'pi','rho':'rho'}
    value = re.sub(r'\\(?:text|mathrm|mathcal|operatorname|mathbf|hat|widehat)\s*\{([^{}]*)\}',r' \1 ',value)
    for _ in range(5):
        value = re.sub(r'\\(?:tfrac|frac)\s*\{([^{}]*)\}\s*\{([^{}]*)\}',r' \1 divided by \2 ',value)
    value = re.sub(r'\\sqrt\s*\{([^{}]*)\}',r' square root of \1 ',value)
    value = re.sub(r'\\([A-Za-z]+)',lambda m:' '+greek.get(m[1],{'top':'transpose','approx':'approximately','leq':'less than or equal to','geq':'greater than or equal to','times':'times','cdot':'times','in':'in','max':'maximum','min':'minimum','log':'log','Pr':'probability'}.get(m[1],m[1]))+' ',value)
    value = re.sub(r'\^\{([^{}]*)\}',r' to the power \1 ',value)
    value = value.replace('^2',' squared ').replace('^3',' cubed ').replace('_',' ')
    value = value.translate(str.maketrans({'{':' ','}':' ','=':' equals ','>':' greater than ','<':' less than ','|':' given ','+':' plus ','*':' times ','\\':' '}))
    return re.sub(r'\s+',' ',value).strip()

def clean(value):
    value = re.sub(r'\$\$[\s\S]*?\$\$', '', value)
    value = re.sub(r'\\\((.*?)\\\)',lambda m:spoken_math(m[1]),value)
    value = re.sub(r'https?://\S+','',value)
    value = re.sub(r'\[(?:\d+[,\s–-]*)+\]','',value)
    value = re.sub(r'€\s*([\d,.]+)', r'\1 euros', value)
    replacements = {'λ':'lambda','Σ':'sigma','Δ':'delta','τ':'tau','ν':'nu','β':'beta',
                    'θ':'theta','ε':'epsilon','φ':'phi','Π':'pi','ρ':'rho',
                    '→':' leads to ','↗':'','±':' plus or minus ','≈':' approximately ',
                    '≤':' less than or equal to ','≥':' greater than or equal to ',
                    '×':' times ','−':' minus ','²':' squared ','³':' cubed ',
                    '·':' ', 'µm':' micrometres ', 'μm':' micrometres ',
                    'kWh':' kilowatt hours ', 'kW':' kilowatts ',
                    'GWh':' gigawatt hours ', 'MWh':' megawatt hours ',
                    '°C':' degrees Celsius ', '€':' euros ', 'LLMs':'large language models',
                    'LLM':'large language model','CoT':'chain of thought','MAPE':'mean absolute percentage error'}
    for old,new in replacements.items(): value=value.replace(old,new)
    return re.sub(r'\s+',' ',value).strip()

def extract_posts():
    posts=json.loads((ROOT/'_src/posts.json').read_text(encoding='utf-8'))
    results=[]
    for post in posts:
        parser=ArticleText();parser.feed((ROOT/'_src/pages'/post['file']).read_text(encoding='utf-8'));parser.flush()
        paragraphs=[clean(p) for p in parser.paragraphs]
        paragraphs=[p for p in paragraphs if p and not re.fullmatch(r'[\W\d_]+',p)]
        text=clean(post['title'])+'.\n\n'+'\n\n'.join(paragraphs)
        if len(text)<400:raise ValueError(post['file']+': narration has too little text')
        digest=hashlib.sha256((VERSION+'\n'+text).encode()).hexdigest()
        results.append({'page':post['file'],'title':post['title'],'text':text,'paragraphs':[clean(post['title'])+'.']+paragraphs,'sha256':digest})
    return results

def generate(posts,args):
    import time,subprocess,os
    import numpy as np
    import onnxruntime as ort
    import soundfile as sf
    import imageio_ffmpeg
    from kokoro_onnx import Kokoro
    output=Path(args.output);output.mkdir(parents=True,exist_ok=True)
    options=ort.SessionOptions();options.intra_op_num_threads=args.threads;options.inter_op_num_threads=1
    session=ort.InferenceSession(args.model,sess_options=options,providers=['CPUExecutionProvider'])
    model=Kokoro.from_session(session,args.voices)
    manifest={}
    for post in posts:
        if args.page and post['page']!=args.page:continue
        slug=post['page'].removesuffix('.html')
        target=output/(slug+'-'+post['sha256'][:16]+'.mp3')
        metadata=target.with_suffix('.json')
        if target.exists() and metadata.exists():
            entry=json.loads(metadata.read_text(encoding='utf-8'));manifest[post['page']]=entry
            print('cached',slug,flush=True);continue
        started=time.perf_counter();wav=target.with_suffix('.wav')
        # Keep sentence order and paragraph pauses; never accumulate hours of PCM in RAM.
        with sf.SoundFile(wav,'w',samplerate=24000,channels=1,subtype='PCM_16') as audio:
            for paragraph in post['paragraphs']:
                audio.write(np.zeros(5000,dtype=np.float32))
                samples,rate=model.create(paragraph,voice=VOICE,speed=1.0,lang='en-us')
                if rate!=24000:raise ValueError('Unexpected sample rate')
                audio.write(samples)
        duration=sf.info(wav).duration
        subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-nostdin','-y','-loglevel','error','-i',str(wav),'-ac','1','-ar','24000','-codec:a','libmp3lame','-b:a','64k','-metadata','title='+post['title'],'-metadata','artist=AI narration · Kokoro',str(target)],check=True)
        wav.unlink()
        entry={'file':target.name,'sha256':post['sha256'],'seconds':round(duration,2),'bytes':target.stat().st_size,'voice':VOICE,'engine':'Kokoro-82M v1.0','url':'https://github.com/j-stoerk/j-stoerk.github.io/releases/download/blog-narration/'+target.name}
        metadata.write_text(json.dumps(entry,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        manifest[post['page']]=entry
        print('generated',slug,'audio',round(duration),'s in',round(time.perf_counter()-started,1),'s',flush=True)
    (output/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    cli=argparse.ArgumentParser();cli.add_argument('--extract',action='store_true');cli.add_argument('--generate',action='store_true')
    cli.add_argument('--model');cli.add_argument('--voices');cli.add_argument('--output');cli.add_argument('--threads',type=int,default=4);cli.add_argument('--page')
    args=cli.parse_args();posts=extract_posts()
    if args.extract:print(json.dumps(posts,ensure_ascii=False))
    elif args.generate:generate(posts,args)
    else:cli.error('Choose --extract or --generate')

if __name__=='__main__':main()
