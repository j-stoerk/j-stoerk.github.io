"""Render the sourced, single-timeline battery map. Not part of the static build.

Requires Pillow and an ffmpeg executable (or imageio-ffmpeg).
python _src/media/render-battery-market.py --font C:/Windows/Fonts/segoeui.ttf
Natural Earth 110m land is public domain. Dataset: data/battery-market.json.
The MP4, poster, and social image are committed, so normal builds need no media tools.
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
W, H, FPS, DURATION = 1440, 960, 24, 34
BG, INK, MUTED = '#f2f0e9', '#233a4b', '#65757e'
BLUE, GOLD, LAND = '#246ca5', '#aa773c', '#d9dedb'
DATA = json.loads((ROOT / 'data/battery-market.json').read_text(encoding='utf-8'))


def snapshot(company, date):
    events = [e for e in company['events'] if e['date'] <= date]
    if company['events'] and not events:
        return None
    event = events[-1] if events else {'phase': 'operating', 'capacity': None}
    return event


def pace(company, year):
    value = company['volumes'][year - 2020]
    return None if value is None else value / DATA['periods'][year - 2020]['months']


def radius(value):
    # Area, not diameter, represents GWh/month. Zero is zero; None has no volume.
    return 10 * math.sqrt(value) if value is not None else None


def date_at(progress):
    start, end = dt.date(2020, 1, 1), dt.date(2026, 10, 4)
    return start + dt.timedelta(days=round((end - start).days * progress))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--font', default='C:/Windows/Fonts/segoeui.ttf')
    parser.add_argument('--ffmpeg')
    parser.add_argument('--stills-only', action='store_true')
    args = parser.parse_args()
    font_path = Path(args.font)
    if not font_path.is_file():
        raise SystemExit('Pass --font with a TrueType font file.')
    fonts = {size: ImageFont.truetype(str(font_path), size) for size in (17, 19, 20, 22, 24, 26, 32, 42, 68)}
    land = json.loads((ROOT / '_src/media/battery-world-land.json').read_text())

    def project(lon, lat):
        return 42 + (lon + 180) / 360 * 1356, 170 + (80 - lat) / 140 * 550

    base = Image.new('RGB', (W, H), BG)
    draw = ImageDraw.Draw(base)
    for lat in (-40, 0, 40):
        _, y = project(0, lat)
        draw.line((42, y, 1398, y), '#e4e6df', width=1)
    for lon in range(-120, 181, 60):
        x, _ = project(lon, 0)
        draw.line((x, 170, x, 720), '#e4e6df', width=1)
    for feature in land['features']:
        geom = feature['geometry']
        polygons = [geom['coordinates']] if geom['type'] == 'Polygon' else geom['coordinates']
        for polygon in polygons:
            for ring in polygon[:1]:
                points = [project(lon, lat) for lon, lat in ring if lat > -62]
                if len(points) > 2:
                    draw.polygon(points, fill=LAND)
                    draw.line(points + [points[0]], '#c4cfca', width=1)
    draw.text((44, 30), 'BATTERY MANUFACTURING / 2020—2026', font=fonts[19], fill=GOLD)
    draw.text((44, 60), 'The race from ambition to output', font=fonts[42], fill=INK)
    draw.text((44, 119), 'One timeline. Reported deployment, startups, ramp-up plans, pivots, and failures.', font=fonts[22], fill=MUTED)

    def circle(d, x, y, r, fill=None, outline=None, width=2):
        d.ellipse((x-r, y-r, x+r, y+r), fill=fill, outline=outline, width=width)

    def dashed_circle(d, x, y, r, color):
        for angle in range(0, 360, 30):
            d.arc((x-r, y-r, x+r, y+r), angle, angle+18, fill=color, width=3)

    def wrap(text, max_width, font, max_lines=2):
        lines, current = [], ''
        for word in text.split():
            proposed = current + (' ' if current else '') + word
            if font.getlength(proposed) > max_width and current:
                lines.append(current)
                current = word
            else:
                current = proposed
        if current:
            lines.append(current)
        if len(lines) > max_lines:
            lines = lines[:max_lines]
            lines[-1] = lines[-1].rstrip(' .') + '…'
        return lines

    def render(progress):
        date = date_at(progress)
        date_text, year = date.isoformat(), date.year
        image = base.copy()
        d = ImageDraw.Draw(image)
        # Declutter dense clusters with leaders to the actual geographic anchors.
        for company in DATA['companies']:
            state = snapshot(company, date_text)
            if state is None:
                continue
            x, y = company['label']
            ax, ay = project(company['lon'], company['lat'])
            failed = state['phase'] == 'insolvent'
            pivot = state['phase'] in ('paused', 'pivoted', 'distressed')
            target = state.get('capacity')
            r = radius(pace(company, year))
            if r is not None and year > 2020:
                prev = radius(pace(company, year-1))
                if prev is not None:
                    days = (date - dt.date(year, 1, 1)).days
                    t = min(1, days / 75)
                    t = t*t*(3-2*t)
                    r = prev + (r-prev)*t
            d.line((ax, ay, x, y), '#aebbb7', width=1)
            circle(d, ax, ay, 3, INK)
            if failed:
                circle(d, x, y, 10, '#111111', BG, 3)
            elif pivot:
                if target is not None:
                    dashed_circle(d, x, y, radius(target/12), MUTED)
                d.polygon(((x, y-7), (x+7, y), (x, y+7), (x-7, y)), fill=GOLD)
            elif target is not None:
                dashed_circle(d, x, y, radius(target/12), GOLD)
                circle(d, x, y, min(5, radius(target/12)/3), GOLD if state['phase'] != 'ramp-up' else BLUE)
            elif r is not None:
                # A translucent outer halo is decoration; only the solid disk encodes area.
                circle(d, x, y, r+5, BG)
                circle(d, x, y, r, BLUE)
            else:
                circle(d, x, y, 7, BG, MUTED, 2)
            name = company.get('short', company['name'])
            label_y = y + max(r or 7, radius(target/12) if target and not failed else 0, 10) + 8
            box = d.textbbox((0, 0), name, font=fonts[24])
            label_x = x - (box[2]-box[0])/2
            d.rounded_rectangle((label_x-6, label_y-2, label_x+box[2]-box[0]+6, label_y+29), radius=4, fill=BG)
            d.text((label_x, label_y), name, font=fonts[24], fill=INK)
            if failed:
                caption = 'insolvency'
            elif pivot:
                caption = f'{target:g} GWh/y target · ' + ('paused' if state['phase'] == 'paused' else 'restructuring') if target is not None else 'solar pivot' if state['phase'] == 'pivoted' else 'funding distress'
            elif target is not None:
                caption = f'{target:g} GWh/y nameplate · restart' if state['phase'] == 'restart' else f'{target:g} GWh/y target · ' + ('ramping' if state['phase'] == 'ramp-up' else 'plan')
            elif r is not None:
                caption = f'{pace(company, year):.1f} GWh/mo'
            else:
                caption = 'volume unavailable' if not company['events'] else state['phase']
            width = fonts[17].getlength(caption)
            d.text((x-width/2, label_y+32), caption, font=fonts[17], fill=MUTED)

        # Legend is baked into the video too, so downloaded/shared copies keep context.
        for i, (kind, label) in enumerate((('volume', 'Measured EV deployment'), ('plan', 'Announced capacity target'), ('pivot', 'Project pause / pivot'), ('unknown', 'Volume unavailable'), ('failure', 'Company insolvency'))):
            ky = 610 + i*24
            if kind == 'plan':
                dashed_circle(d, 58, ky+10, 7, GOLD)
            elif kind == 'pivot':
                d.polygon(((58, ky+3), (65, ky+10), (58, ky+17), (51, ky+10)), fill=GOLD)
            else:
                circle(d, 58, ky+10, 6, BLUE if kind == 'volume' else '#111111' if kind == 'failure' else BG, MUTED if kind == 'unknown' else None)
            d.text((76, ky), label, font=fonts[19], fill=INK)

        # A quiet event ticker makes startups and ramp-up visible in the same timeline.
        events = sorted([(e['date'], c, e) for c in DATA['companies'] for e in c['events']
                         if '2020-01-01' < e['date'] <= date_text], key=lambda row: row[0])
        d.line((44, 735, 1396, 735), '#cad1ca', width=1)
        d.text((44, 754), f'{year:04}', font=fonts[68], fill=INK)
        d.text((46, 837), date.strftime('%d %b').upper(), font=fonts[20], fill=MUTED)
        d.text((245, 756), 'LATEST DOCUMENTED MILESTONE', font=fonts[17], fill=GOLD)
        if events:
            event_date, company, event = events[-1]
            d.text((245, 785), f"{company.get('short', company['name'])} · {event_date}", font=fonts[26], fill=INK)
            for i, line in enumerate(wrap(event['text'], 700, fonts[20])):
                d.text((245, 825+i*26), line, font=fonts[20], fill=MUTED)
        else:
            d.text((245, 794), 'Early plans. One comparable 2020 observation.', font=fonts[24], fill=INK)
            d.text((245, 831), 'Missing data never becomes a zero-sized production dot.', font=fonts[20], fill=MUTED)

        d.text((1040, 753), 'VOLUME WINDOW', font=fonts[17], fill=GOLD)
        d.text((1040, 782), DATA['periods'][year-2020]['label'], font=fonts[24], fill=INK)
        d.text((1040, 818), 'Area follows GWh/month', font=fonts[20], fill=MUTED)
        d.text((1040, 849), 'Capacity targets divided by 12', font=fonts[19], fill=MUTED)

        start_x, end_x, ty = 44, 1396, 907
        d.line((start_x, ty, end_x, ty), '#ced5ce', width=3)
        for y in range(2020, 2027):
            q = (dt.date(y, 1, 1) - dt.date(2020, 1, 1)).days / (dt.date(2026, 10, 4)-dt.date(2020, 1, 1)).days
            x = start_x+(end_x-start_x)*q
            d.line((x, ty-5, x, ty+5), MUTED, width=1)
            d.text((x-20, ty+14), str(y), font=fonts[17], fill=MUTED)
        d.line((start_x, ty, start_x+(end_x-start_x)*progress, ty), BLUE, width=4)
        circle(d, start_x+(end_x-start_x)*progress, ty, 6, BLUE)
        return image

    target_dir = ROOT / 'media'
    target_dir.mkdir(exist_ok=True)
    final = render(1)
    final.save(target_dir / 'battery-market-poster.jpg', quality=92)
    # Same map, readable social crop: original figure rendered, no third-party artwork.
    social = final.crop((0, 0, W, 756)).resize((1200, 630), Image.Resampling.LANCZOS)
    social.save(ROOT / 'social-battery-price-war.jpg', quality=92)
    if args.stills_only:
        return
    binary = args.ffmpeg or shutil.which('ffmpeg')
    if not binary:
        import imageio_ffmpeg
        binary = imageio_ffmpeg.get_ffmpeg_exe()
    command = [binary, '-y', '-hide_banner', '-loglevel', 'error', '-f', 'rawvideo',
               '-vcodec', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS),
               '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21',
               '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
               str(target_dir / 'battery-market-timeline.mp4')]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    try:
        for frame in range(FPS*DURATION):
            # Brief holds at both ends; all milestones share one chronological pass.
            progress = min(1, max(0, (frame/FPS - 1.2)/(DURATION-3.5)))
            process.stdin.write(render(progress).tobytes())
            if frame % (FPS*5) == 0:
                print(f'rendered {frame/FPS:.0f}/{DURATION}s', flush=True)
    finally:
        process.stdin.close()
    if process.wait() != 0:
        raise SystemExit('ffmpeg failed')
    print(f'created {target_dir / "battery-market-timeline.mp4"}', flush=True)


if __name__ == '__main__':
    main()
