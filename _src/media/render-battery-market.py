"""Render one sourced timeline with circles at their geographic coordinates.

Requires Pillow and ffmpeg (or imageio-ffmpeg). Normal builds use committed media.
Natural Earth land outlines are public domain. Data: data/battery-market.json.
"""
import argparse
import datetime as dt
import json
import math
import shutil
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
W, H, FPS, DURATION = 1440, 960, 24, 44
BG, INK, MUTED = '#f2f0e9', '#233a4b', '#65757e'
BLUE, GOLD, LAND = '#246ca5', '#aa773c', '#d9dedb'
DATA = json.loads((ROOT / 'data/battery-market.json').read_text(encoding='utf-8'))
PANELS = {
 'world': {'rect': (44,60,650,225), 'bounds': (-180,180,-55,80), 'title': 'WORLD LOCATOR', 'note': 'Pins locate sites and headquarters; no size scale.'},
 'america': {'rect': (746,60,650,225), 'bounds': (-119,-64,27,51), 'title': 'NORTH AMERICA', 'note': 'Selected cell projects'},
 'europe': {'rect': (44,343,650,321), 'bounds': (-12,31,38,71), 'title': 'EUROPE', 'note': 'Factory targets, ramp-up, pauses and insolvencies'},
 'asia': {'rect': (746,343,650,321), 'bounds': (106,143,17,43), 'title': 'EAST ASIA', 'note': 'Global EV deployment, mapped at headquarters'},
}

def snapshot(company,date):
 events=[e for e in company['events'] if e['date']<=date]
 if company['events'] and not events:return None
 return events[-1] if events else {'phase':'operating','capacity':None}

def pace(company,year):
 value=company['volumes'][year-2020]
 return None if value is None else value/DATA['periods'][year-2020]['months']

def radius(value):
 # Identical area scale in all regional maps. None is missing, never zero.
 return 10*math.sqrt(value) if value is not None else None

def date_at(progress):
 start,end=dt.date(2020,1,1),dt.date.fromisoformat(DATA['cutoff'])
 return start+dt.timedelta(days=round((end-start).days*progress))

def project(lon,lat,panel):
 x,y,w,h=panel['rect'];west,east,south,north=panel['bounds']
 return x+(lon-west)/(east-west)*w,y+(north-lat)/(north-south)*h

def contains(company,panel):
 west,east,south,north=panel['bounds']
 return west<=company['lon']<=east and south<=company['lat']<=north

def main():
 parser=argparse.ArgumentParser()
 parser.add_argument('--font',default='C:/Windows/Fonts/segoeui.ttf')
 parser.add_argument('--ffmpeg');parser.add_argument('--stills-only',action='store_true')
 args=parser.parse_args()
 if not Path(args.font).is_file():raise SystemExit('Pass --font with a TrueType font file.')
 fonts={s:ImageFont.truetype(args.font,s) for s in (17,18,19,20,22,24,42,48)}
 land=json.loads((ROOT/'_src/media/battery-world-land.json').read_text())
 base=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(base)
 for panel in PANELS.values():
  x,y,w,h=panel['rect'];tile=Image.new('RGB',(w,h),'#e9eeeb');td=ImageDraw.Draw(tile)
  for feature in land['features']:
   geom=feature['geometry'];polygons=[geom['coordinates']] if geom['type']=='Polygon' else geom['coordinates']
   for polygon in polygons:
    for ring in polygon[:1]:
     points=[(px-x,py-y) for px,py in (project(lon,lat,panel) for lon,lat in ring)]
     if len(points)>2:td.polygon(points,fill=LAND);td.line(points+[points[0]],'#c2ccc6',width=1)
  base.paste(tile,(x,y));d.rectangle((x,y,x+w,y+h),outline='#c9d1cb',width=1)
  d.text((x,y-29),panel['title'].title(),font=fonts[19],fill=GOLD)
 def circle(draw,x,y,r,fill=None,outline=None,width=2):
  draw.ellipse((x-r,y-r,x+r,y+r),fill=fill,outline=outline,width=width)
 def dashed_circle(draw,x,y,r,color):
  for angle in range(0,360,30):draw.arc((x-r,y-r,x+r,y+r),angle,angle+18,fill=color,width=2)
 def wrap(text,max_width,font,max_lines=2):
  lines,current=[],''
  for word in text.replace('\u2014',', ').split():
   proposed=current+(' ' if current else '')+word
   if font.getlength(proposed)>max_width and current:lines.append(current);current=word
   else:current=proposed
  if current:lines.append(current)
  if len(lines)>max_lines:lines=lines[:max_lines];lines[-1]=lines[-1].rstrip(' .')+'...'
  return lines
 def label_positions(panel,companies):
  x,y,w,h=panel['rect'];result={};ordered=sorted(companies,key=lambda c:c['lon'])
  for side,group in enumerate((ordered[:len(ordered)//2],ordered[len(ordered)//2:])):
   for i,c in enumerate(sorted(group,key=lambda c:-c['lat'])):
    ly=y+10+i*(h-30)/max(1,len(group)-1);name=c.get('short',c['name'])
    lx=x+8 if side==0 else x+w-8-fonts[20].getlength(name)
    result[c['id']]=(lx,ly,side)
  return result
 labels={key:label_positions(panel,[c for c in DATA['companies'] if contains(c,panel)]) for key,panel in PANELS.items() if key!='world'}
 all_events=sorted([(e['date'],c,e) for c in DATA['companies'] for e in c['events'] if e['date']>'2020-01-01'],key=lambda row:row[0])
 def render(progress):
  date=date_at(progress);stamp,year=date.isoformat(),date.year;image=base.copy()
  overlay=Image.new('RGBA',(W,H));od=ImageDraw.Draw(overlay);active=[]
  for c in DATA['companies']:
   state=snapshot(c,stamp)
   if state is None:continue
   r=radius(pace(c,year))
   if r is not None and year>2020:
    previous=radius(pace(c,year-1))
    if previous is not None:
     t=min(1,(date-dt.date(year,1,1)).days/75);t=t*t*(3-2*t);r=previous+(r-previous)*t
   active.append((c,state,r))
  for key,panel in PANELS.items():
   # Larger circles first: small neighbouring makers retain visible outlines.
   for c,state,r in sorted(active,key=lambda row:-(row[2] or 0)):
    if not contains(c,panel):continue
    x,y=project(c['lon'],c['lat'],panel);failed=state['phase']=='insolvent'
    pivot=state['phase'] in ('paused','pivoted','distressed');target=state.get('capacity')
    if key=='world':circle(od,x,y,3,'#111111' if failed else GOLD if pivot else BLUE);continue
    if failed:circle(od,x,y,7,'#111111',BG,2)
    elif pivot:
     if target is not None:dashed_circle(od,x,y,radius(target/12),MUTED)
     od.polygon(((x,y-6),(x+6,y),(x,y+6),(x-6,y)),fill=GOLD)
    elif target is not None:
     dashed_circle(od,x,y,radius(target/12),GOLD)
     circle(od,x,y,2,BLUE if state['phase']=='ramp-up' else GOLD)
    elif r is not None:
     circle(od,x,y,r,(36,108,165,95),BLUE,2);circle(od,x,y,2,BLUE)
    else:circle(od,x,y,4,None,MUTED,2)
  image=Image.alpha_composite(image.convert('RGBA'),overlay).convert('RGB');draw=ImageDraw.Draw(image)
  for key,panel in PANELS.items():
   if key=='world':continue
   for c,state,r in active:
    if not contains(c,panel):continue
    ax,ay=project(c['lon'],c['lat'],panel);lx,ly,side=labels[key][c['id']]
    name=c.get('short',c['name']);width=fonts[20].getlength(name);tx=lx+width+4 if side==0 else lx-4
    draw.line((ax,ay,tx,ly+13),'#899b97',width=1)
    draw.rounded_rectangle((lx-3,ly-1,lx+width+3,ly+26),radius=3,fill=BG)
    draw.text((lx,ly),name,font=fonts[20],fill=INK)
  india=next((row for row in active if row[0]['id']=='agratasindia'),None)
  if india:
   x,y=project(india[0]['lon'],india[0]['lat'],PANELS['world'])
   draw.text((x+7,y-5),'Agratas / Sanand',font=fonts[18],fill=INK)
  for i,(kind,text) in enumerate((('volume','EV deployment'),('plan','Nameplate target'),('pivot','Pause / pivot / distress'),('unknown','Unavailable'),('failure','Insolvency'))):
   y=719+i*24
   if kind=='plan':dashed_circle(draw,53,y+9,7,GOLD)
   elif kind=='pivot':draw.polygon(((53,y+3),(59,y+9),(53,y+15),(47,y+9)),fill=GOLD)
   else:circle(draw,53,y+9,6,BLUE if kind=='volume' else '#111111' if kind=='failure' else None,MUTED if kind=='unknown' else None)
   draw.text((72,y-1),text,font=fonts[19],fill=INK)
  draw.text((460,686),'Circle area: GWh/mo',font=fonts[17],fill=GOLD)
  # True size legend replaces numerical captions at each company.
  for x,value in ((486,1),(565,5),(680,20),(830,40)):
   r=radius(value);circle(draw,x,831-r,r,None,BLUE,2)
   draw.text((x-fonts[20].getlength(str(value))/2,836),str(value),font=fonts[20],fill=INK)
  draw.text((460,713),'Targets: annual GWh / 12',font=fonts[18],fill=MUTED)
  draw.text((1030,712),DATA['periods'][year-2020]['label'],font=fonts[22],fill=INK)
  plans=sorted([(s['targetStart'],c.get('short',c['name'])) for c,s,_ in active if s.get('targetStart','')>'2026' and s['phase'] not in ('paused','pivoted','insolvent')])
  if plans:
   draw.text((1030,747),'Planned starts',font=fonts[17],fill=GOLD);grouped={}
   for target,name in plans:grouped.setdefault(target,[]).append(name)
   lines=wrap(' / '.join(f"{target}: {', '.join(names)}" for target,names in grouped.items()),360,fonts[18],3)
   for i,line in enumerate(lines):draw.text((1030,773+i*23),line,font=fonts[18],fill=MUTED)
  events=[row for row in all_events if row[0]<=stamp]
  draw.line((44,871,1396,871),'#cad1ca',width=1)
  draw.text((44,875),str(year),font=fonts[48],fill=INK)
  draw.text((48,932),date.strftime('%d %b').upper(),font=fonts[17],fill=MUTED)
  if events:
   event_date,c,e=events[-1];draw.text((230,878),f"{c.get('short',c['name'])} / {event_date}",font=fonts[22],fill=INK)
   for i,line in enumerate(wrap(e['text'],1120,fonts[18])):draw.text((230,908+i*23),line,font=fonts[18],fill=MUTED)
  else:draw.text((230,891),'Historical observations and documented milestones share one timeline.',font=fonts[22],fill=INK)
  draw.line((44,954,1396,954),'#cad1ca',width=3);draw.line((44,954,44+1352*progress,954),BLUE,width=4)
  circle(draw,44+1352*progress,954,5,BLUE)
  return image
 target=ROOT/'media';target.mkdir(exist_ok=True);final=render(1)
 final.save(target/'battery-market-poster.jpg',quality=91)
 social=final.crop((0,0,W,756)).resize((1200,630),Image.Resampling.LANCZOS)
 social.save(ROOT/'social-battery-price-war.jpg',quality=91)
 if args.stills_only:return
 binary=args.ffmpeg or shutil.which('ffmpeg')
 if not binary:
  import imageio_ffmpeg
  binary=imageio_ffmpeg.get_ffmpeg_exe()
 command=[binary,'-y','-hide_banner','-loglevel','error','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','medium','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',str(target/'battery-market-timeline.mp4')]
 process=subprocess.Popen(command,stdin=subprocess.PIPE)
 try:
  for frame in range(FPS*DURATION):
   progress=min(1,max(0,(frame/FPS-1.2)/(DURATION-4.7)));process.stdin.write(render(progress).tobytes())
   if frame%(FPS*5)==0:print(f'rendered {frame/FPS:.0f}/{DURATION}s',flush=True)
 finally:process.stdin.close()
 if process.wait()!=0:raise SystemExit('ffmpeg failed')
 print('created battery-market-timeline.mp4',flush=True)

if __name__=='__main__':main()
