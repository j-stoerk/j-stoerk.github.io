"""Render a continuous geographic battery timeline from the sourced dataset.

Pillow draws the figure; ffmpeg encodes the committed MP4. Ordinary site builds
do not require either tool. Natural Earth land outlines are public domain.
"""
import argparse
import datetime as dt
import json
import math
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

from battery_map_drawing import Draw, Font
from battery_map_layout import crossing_count, place_labels

ROOT = Path(__file__).resolve().parents[2]
W, H, FPS, DURATION = 1440, 960, 24, 44
SCALE = 2
OUTPUT_SIZE = (W * SCALE, H * SCALE)
BG, INK, MUTED = '#f4f2ec', '#243d4e', '#74838b'
BLUE, GOLD, LAND = '#277bb0', '#aa7e48', '#dce2e2'
DATA = json.loads((ROOT / 'data/battery-market.json').read_text(encoding='utf-8'))
PANELS = {
    'europe': {'rect': (44, 104, 650, 546), 'bounds': (-12, 31, 38, 71), 'title': 'Europe'},
    'asia': {'rect': (746, 104, 650, 546), 'bounds': (106, 143, 17, 43), 'title': 'East Asia'},
}


def snapshot(company, date):
    events = [event for event in company['events'] if event['date'] <= date]
    if company['events'] and not events:
        return None
    return events[-1] if events else {'phase': 'operating', 'capacity': None}


def pace(company, year):
    value = company['volumes'][year - 2020]
    return None if value is None else value / DATA['periods'][year - 2020]['months']


def radius(value):
    # Circle area has the same GWh/month scale in every regional map.
    return 10 * math.sqrt(value) if value is not None else None


def date_at(progress):
    start, end = dt.date(2020, 1, 1), dt.date.fromisoformat(DATA['cutoff'])
    return start + dt.timedelta(days=round((end - start).days * progress))


def project(lon, lat, panel):
    x, y, width, height = panel['rect']
    west, east, south, north = panel['bounds']
    return (x + (lon - west) / (east - west) * width,
            y + (north - lat) / (north - south) * height)


def contains(company, panel):
    west, east, south, north = panel['bounds']
    return west <= company['lon'] <= east and south <= company['lat'] <= north


def circle(draw, x, y, r, fill=None, outline=None, width=2):
    draw.ellipse((x - r, y - r, x + r, y + r), fill=fill, outline=outline, width=width)


def dashed_circle(draw, x, y, r, color):
    for angle in range(0, 360, 30):
        draw.arc((x - r, y - r, x + r, y + r), angle, angle + 18, fill=color, width=2)


def wrap(text, max_width, font, max_lines=2):
    lines, current = [], ''
    for word in text.replace('\u2014', ', ').split():
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
        lines[-1] = lines[-1].rstrip(' .') + '...'
    return lines


def label_text(company, state):
    name = company.get('short', company['name'])
    start = state.get('targetStart', '')
    if start > '2026' and state['phase'] not in ('paused', 'pivoted', 'insolvent'):
        name += f' {start}'
    return name


def displayed(company):
    return any(contains(company, panel) for panel in PANELS.values())


def marker_color(state, measured):
    if state['phase'] == 'insolvent':
        return '#171717'
    if state['phase'] in ('paused', 'pivoted', 'distressed'):
        return MUTED if state.get('capacity') is not None else GOLD
    if state.get('capacity') is not None:
        return GOLD
    return BLUE if measured is not None else MUTED


def label_positions(panel, companies, font):
    entries = []
    for company in companies:
        names = [label_text(company, event) for event in company['events']]
        names.append(company.get('short', company['name']))
        radii = [7]
        radii.extend(radius(value / period['months'])
                     for value, period in zip(company['volumes'], DATA['periods'])
                     if value is not None)
        radii.extend(radius(event['capacity'] / 12) for event in company['events']
                     if event.get('capacity') is not None)
        entries.append({'id': company['id'], 'anchor': project(company['lon'], company['lat'], panel),
                        'width': max(font.getlength(name) for name in names), 'radius': max(radii)})
    return place_labels(panel, entries)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--font', default='C:/Windows/Fonts/segoeui.ttf')
    parser.add_argument('--bold-font')
    parser.add_argument('--ffmpeg')
    parser.add_argument('--stills-only', action='store_true')
    parser.add_argument('--preview-dir', type=Path)
    args = parser.parse_args()
    font_path = Path(args.font)
    if not font_path.is_file():
        raise SystemExit('Pass --font with a TrueType font file.')
    bold_path = Path(args.bold_font) if args.bold_font else font_path.with_name('seguisb.ttf')
    if not bold_path.is_file():
        bold_path = font_path
    sizes = (13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 48)
    fonts = {size: Font(font_path, size, SCALE) for size in sizes}
    bold = {size: Font(bold_path, size, SCALE) for size in (17, 18, 22, 24, 48)}
    land = json.loads((ROOT / '_src/media/battery-world-land.json').read_text(encoding='utf-8'))

    borders = json.loads((ROOT / '_src/media/battery-country-borders.json').read_text(encoding='utf-8'))

    base = Image.new('RGB', OUTPUT_SIZE, BG)
    draw = Draw(base, SCALE)
    for row in range(H):
        t = row / H
        shade = tuple(round(a + (b - a) * t) for a, b in zip((249, 247, 242), (241, 238, 230)))
        draw.line((0, row, W, row), fill=shade)
    for panel in PANELS.values():
        x, y, width, height = panel['rect']
        # Supersample the static map so coastlines and grid lines remain quiet
        # and smooth. Frames reuse this cache rather than drawing geography again.
        scale = SCALE
        tile = Image.new('RGB', (width * scale, height * scale), '#eaf0f1')
        td = ImageDraw.Draw(tile)
        west, east, south, north = panel['bounds']
        step = 10
        for lon in range(math.ceil(west / step) * step, math.ceil(east), step):
            px, _ = project(lon, north, panel)
            td.line(((px - x) * scale, 0, (px - x) * scale, height * scale), '#e0e8eb', width=1)
        for lat in range(math.ceil(south / step) * step, math.ceil(north), step):
            _, py = project(west, lat, panel)
            td.line((0, (py - y) * scale, width * scale, (py - y) * scale), '#e0e8eb', width=1)
        for feature in land['features']:
            geometry = feature['geometry']
            polygons = [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']
            for polygon in polygons:
                for ring in polygon[:1]:
                    points = [((px - x) * scale, (py - y) * scale)
                              for px, py in (project(lon, lat, panel) for lon, lat in ring)]
                    if len(points) > 2:
                        td.polygon(points, fill=LAND)
                        td.line(points + [points[0]], '#f4f7f6', width=2)
        for feature in borders['features']:
            geometry = feature['geometry']
            lines = geometry['coordinates'] if geometry['type'] == 'MultiLineString' else [geometry['coordinates']]
            for line in lines:
                points = [((px - x) * scale, (py - y) * scale)
                          for px, py in (project(lon, lat, panel) for lon, lat in line)]
                if len(points) > 1:
                    td.line(points, '#c2cdd1', width=2)
        mask = Image.new('L', (width * scale, height * scale))
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, width * scale - 1, height * scale - 1),
                                               radius=10 * scale, fill=255)
        base.paste(tile, (x * scale, y * scale), mask)
        draw.rounded_rectangle((x, y, x + width - 1, y + height - 1), radius=10,
                               outline='#d5dee0', width=1)
        draw.text((x, y - 31), panel['title'], font=fonts[18], fill=INK)

    labels = {
        key: label_positions(panel, [c for c in DATA['companies'] if contains(c, panel)], bold[22])
        for key, panel in PANELS.items()
    }
    for key, layout in labels.items():
        print(f'{key}: {crossing_count(layout)} leader crossings', flush=True)
    all_events = sorted([(event['date'], company, event)
                         for company in DATA['companies'] if displayed(company) for event in company['events']
                         if event['date'] > '2020-01-01'], key=lambda row: row[0])
    start_date = dt.date(2020, 1, 1)
    total_days = (dt.date.fromisoformat(DATA['cutoff']) - start_date).days

    def render(progress):
        date = date_at(progress)
        stamp, year = date.isoformat(), date.year
        image = base.copy()
        overlay = Image.new('RGBA', OUTPUT_SIZE)
        od = Draw(overlay, SCALE)
        active = []
        events = [row for row in all_events if row[0] <= stamp]
        latest = events[-1] if events else None
        for company in DATA['companies']:
            state = snapshot(company, stamp)
            if state is None:
                continue
            r = radius(pace(company, year))
            if r is not None and year > 2020:
                previous = radius(pace(company, year - 1))
                if previous is not None:
                    t = min(1, (date - dt.date(year, 1, 1)).days / 75)
                    t = t * t * (3 - 2 * t)
                    r = previous + (r - previous) * t
            active.append((company, state, r))

        # Leaders sit behind circles, stop at their perimeter, and never erase
        # geography. Labels use the same marker colour without a background box.
        for key, panel in PANELS.items():
            for company, state, r in active:
                if not contains(company, panel):
                    continue
                start, end = labels[key][company['id']]['line']
                length = math.dist(start, end)
                target = state.get('capacity')
                marker_r = (7 if state['phase'] == 'insolvent' else
                            radius(target / 12) if target is not None else r or 4)
                trim = min(marker_r + 3, length)
                sx = start[0] + (end[0] - start[0]) * trim / length
                sy = start[1] + (end[1] - start[1]) * trim / length
                color = marker_color(state, r).lstrip('#')
                rgba = tuple(int(color[i:i + 2], 16) for i in (0, 2, 4)) + (95,)
                od.line((sx, sy, *end), fill=rgba, width=.75)

        for key, panel in PANELS.items():
            for company, state, r in sorted(active, key=lambda row: -(row[2] or 0)):
                if not contains(company, panel):
                    continue
                x, y = project(company['lon'], company['lat'], panel)
                failed = state['phase'] == 'insolvent'
                pivot = state['phase'] in ('paused', 'pivoted', 'distressed')
                target = state.get('capacity')
                event_age = ((date - dt.date.fromisoformat(state['date'])).days
                             if state.get('date') else 999)
                emphasis = latest is not None and latest[1]['id'] == company['id']
                if emphasis and event_age < 40 and progress < 1:
                    t = event_age / 40
                    halo_r = (7 if failed else radius(target / 12) if target is not None else r or 4)
                    circle(od, x, y, halo_r + 5 + 15 * t,
                           outline=(170, 126, 72, round(160 * (1 - t))), width=2)
                if failed:
                    circle(od, x, y, 7, '#171717', BG, 2)
                elif pivot:
                    if target is not None:
                        dashed_circle(od, x, y, radius(target / 12), MUTED)
                    od.polygon(((x, y - 5), (x + 5, y), (x, y + 5), (x - 5, y)), fill=GOLD)
                elif target is not None:
                    growth = 1 - (1 - min(1, event_age / 30)) ** 3
                    dashed_circle(od, x, y, radius(target / 12) * growth, GOLD)
                    circle(od, x, y, 1.8, BLUE if state['phase'] == 'ramp-up' else GOLD)
                elif r is not None:
                    circle(od, x, y, r, (39, 123, 176, 70), BLUE, 2)
                    circle(od, x, y, 2, BLUE)
                else:
                    circle(od, x, y, 4, None, MUTED, 2)

        image = Image.alpha_composite(image.convert('RGBA'), overlay).convert('RGB')
        draw = Draw(image, SCALE)
        for key, panel in PANELS.items():
            for company, state, r in active:
                if not contains(company, panel):
                    continue
                ax, _ = project(company['lon'], company['lat'], panel)
                left, top, right, _ = labels[key][company['id']]['box']
                name = label_text(company, state)
                font = bold[22]
                width = font.getlength(name)
                if right <= ax:
                    lx = right - width
                elif left >= ax:
                    lx = left
                else:
                    lx = (left + right - width) / 2
                draw.text((lx, top), name, font=font, fill=marker_color(state, r), anchor='lt')

        # One compact legend in the video; the page does not repeat it.
        draw.text((884, 672), 'GWh/mo · circle area', font=fonts[18], fill=INK)
        draw.text((884, 706), 'Targets: annual GWh / 12', font=fonts[16], fill=MUTED)
        for x, value in ((918, 1), (1000, 5), (1150, 20), (1320, 40)):
            r = radius(value)
            circle(draw, x, 786 - r, r, '#e7eff4', BLUE, 1.25)
            draw.text((x - fonts[18].getlength(str(value)) / 2, 791), str(value), font=fonts[18], fill=INK)
        keys = (('volume', 'EV deployment'), ('plan', 'Capacity target'),
                ('pivot', 'Pause / pivot'), ('unknown', 'Unavailable'), ('failure', 'Insolvency'))
        for i, (kind, text) in enumerate(keys):
            x, y = 44 + (i % 3) * 235, 688 + (i // 3) * 39
            if kind == 'plan':
                dashed_circle(draw, x + 6, y + 10, 6, GOLD)
            elif kind == 'pivot':
                draw.polygon(((x + 6, y + 4), (x + 12, y + 10), (x + 6, y + 16), (x, y + 10)), fill=GOLD)
            else:
                circle(draw, x + 6, y + 10, 5,
                       BLUE if kind == 'volume' else '#171717' if kind == 'failure' else None,
                       MUTED if kind == 'unknown' else None)
            draw.text((x + 24, y - 1), text, font=fonts[20], fill=MUTED)

        draw.text((44, 13), str(year), font=bold[48], fill=INK)
        draw.text((178, 35), date.strftime('%d %b').upper(), font=fonts[17], fill=MUTED)
        window = DATA['periods'][year - 2020]['label']
        draw.text((1396 - fonts[16].getlength(window), 35), window, font=fonts[16], fill=MUTED)

        draw.line((44, 856, 1396, 856), '#ccd7dc', width=2)
        # Historical event ticks give the timeline structure without extra prose.
        for event_date, _, _ in all_events:
            t = (dt.date.fromisoformat(event_date) - start_date).days / total_days
            ex = 44 + 1352 * t
            draw.line((ex, 852, ex, 860), '#b6c4cb', width=1)
        for tick_year in range(2020, 2027):
            t = (dt.date(tick_year, 1, 1) - start_date).days / total_days
            tx = 44 + 1352 * t
            draw.text((tx, 833), str(tick_year), font=fonts[13], fill=MUTED)
        cursor = 44 + 1352 * progress
        draw.line((44, 856, cursor, 856), BLUE, width=3)
        circle(draw, cursor, 856, 5, BLUE, BG, 1)
        if latest:
            event_date, company, event = latest
            draw.text((44, 875), company.get('short', company['name']), font=bold[24], fill=marker_color(event, pace(company, year)))
            draw.text((1396 - fonts[16].getlength(event_date), 882), event_date, font=fonts[16], fill=MUTED)
            for i, line in enumerate(wrap(event['text'], 1352, fonts[17])):
                draw.text((44, 910 + i * 23), line, font=fonts[17], fill=MUTED)
        else:
            draw.text((44, 880), 'Measured deployment and documented factory plans', font=fonts[19], fill=INK)
        return image

    target = ROOT / 'media'
    target.mkdir(exist_ok=True)
    final = render(1)
    final.save(target / 'battery-market-poster.jpg', quality=96, subsampling=0)
    social = Image.new('RGB', (1200, 630), BG)
    overview = final.crop((0, 0, W * SCALE, 660 * SCALE)).resize((1200, 550), Image.Resampling.LANCZOS)
    social.paste(overview, (0, 40))
    social.save(ROOT / 'social-battery-price-war.jpg', quality=95, subsampling=0)
    if args.preview_dir:
        args.preview_dir.mkdir(parents=True, exist_ok=True)
        for progress in (0, .35, .65, 1):
            render(progress).save(args.preview_dir / f'timeline-{progress:.2f}.png')
    if args.stills_only:
        return
    binary = args.ffmpeg or shutil.which('ffmpeg')
    if not binary:
        import imageio_ffmpeg
        binary = imageio_ffmpeg.get_ffmpeg_exe()
    command = [binary, '-y', '-hide_banner', '-loglevel', 'error', '-f', 'rawvideo',
               '-vcodec', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{OUTPUT_SIZE[0]}x{OUTPUT_SIZE[1]}', '-r',
               str(FPS), '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'medium',
               '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
               str(target / 'battery-market-timeline.mp4')]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    try:
        for frame in range(FPS * DURATION):
            progress = min(1, max(0, (frame / FPS - 1.2) / (DURATION - 4.7)))
            process.stdin.write(render(progress).tobytes())
            if frame % (FPS * 5) == 0:
                print(f'rendered {frame / FPS:.0f}/{DURATION}s', flush=True)
    finally:
        process.stdin.close()
    if process.wait() != 0:
        raise SystemExit('ffmpeg failed')
    print('created battery-market-timeline.mp4', flush=True)


if __name__ == '__main__':
    main()
