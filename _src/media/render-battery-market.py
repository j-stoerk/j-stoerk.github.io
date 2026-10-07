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

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
W, H, FPS, DURATION = 1440, 960, 24, 44
BG, INK, MUTED = '#f4f2ec', '#243d4e', '#74838b'
BLUE, GOLD, LAND = '#277bb0', '#aa7e48', '#dce2e2'
DATA = json.loads((ROOT / 'data/battery-market.json').read_text(encoding='utf-8'))
PANELS = {
    'europe': {'rect': (44, 104, 650, 424), 'bounds': (-12, 31, 38, 71), 'title': 'Europe'},
    'asia': {'rect': (746, 104, 650, 424), 'bounds': (106, 143, 17, 43), 'title': 'East Asia'},
    'world': {'rect': (44, 586, 410, 190), 'bounds': (-180, 180, -55, 80), 'title': 'World locator'},
    'america': {'rect': (486, 586, 422, 190), 'bounds': (-119, -64, 27, 51), 'title': 'North America'},
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


def label_positions(panel, companies, font):
    """Stable rails, ordered geographically, close to each anchor's latitude.

    Only the text moves; the circle always uses the same map projection as land.
    Reserve enough space for every documented label so new entries do not move
    existing names around or cause labels to collide during the animation.
    """
    x, y, width, height = panel['rect']
    positions = {}
    ordered = sorted(companies, key=lambda company: company['lon'])
    groups = (ordered[:len(ordered) // 2], ordered[len(ordered) // 2:])
    for side, group in enumerate(groups):
        group = sorted(group, key=lambda company: -company['lat'])
        rows = []
        for company in group:
            _, anchor_y = project(company['lon'], company['lat'], panel)
            row = max(y + 10, min(y + height - 30, anchor_y - 12))
            rows.append(max(row, rows[-1] + 30) if rows else row)
        if rows and rows[-1] > y + height - 30:
            rows[-1] = y + height - 30
            for i in range(len(rows) - 2, -1, -1):
                rows[i] = min(rows[i], rows[i + 1] - 30)
        for company, row in zip(group, rows):
            names = [label_text(company, event) for event in company['events']]
            names.append(company.get('short', company['name']))
            label_width = max(font.getlength(name) for name in names)
            left = x + 10 if side == 0 else x + width - 10 - label_width
            positions[company['id']] = (left, row, side, label_width)
    return positions


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
    bold_path = Path(args.bold_font) if args.bold_font else font_path.with_name('segoeuisb.ttf')
    if not bold_path.is_file():
        bold_path = font_path
    sizes = (13, 14, 15, 16, 17, 18, 19, 20, 24, 26, 48)
    fonts = {size: ImageFont.truetype(str(font_path), size) for size in sizes}
    bold = {size: ImageFont.truetype(str(bold_path), size) for size in (17, 18, 24, 48)}
    land = json.loads((ROOT / '_src/media/battery-world-land.json').read_text(encoding='utf-8'))

    base = Image.new('RGB', (W, H), BG)
    draw = ImageDraw.Draw(base)
    for row in range(H):
        t = row / H
        shade = tuple(round(a + (b - a) * t) for a, b in zip((249, 247, 242), (241, 238, 230)))
        draw.line((0, row, W, row), fill=shade)
    for panel in PANELS.values():
        x, y, width, height = panel['rect']
        # Supersample the static map so coastlines and grid lines remain quiet
        # and smooth. Frames reuse this cache rather than drawing geography again.
        scale = 2
        tile = Image.new('RGB', (width * scale, height * scale), '#eaf0f1')
        td = ImageDraw.Draw(tile)
        west, east, south, north = panel['bounds']
        step = 30 if panel is PANELS['world'] else 10
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
        tile = tile.resize((width, height), Image.Resampling.LANCZOS)
        mask = Image.new('L', (width, height))
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, width - 1, height - 1), radius=10, fill=255)
        base.paste(tile, (x, y), mask)
        draw.rounded_rectangle((x, y, x + width - 1, y + height - 1), radius=10,
                               outline='#d5dee0', width=1)
        draw.text((x, y - 31), panel['title'], font=fonts[18], fill=INK)

    labels = {
        key: label_positions(panel, [c for c in DATA['companies'] if contains(c, panel)], bold[17])
        for key, panel in PANELS.items() if key != 'world'
    }
    all_events = sorted([(event['date'], company, event)
                         for company in DATA['companies'] for event in company['events']
                         if event['date'] > '2020-01-01'], key=lambda row: row[0])
    start_date = dt.date(2020, 1, 1)
    total_days = (dt.date.fromisoformat(DATA['cutoff']) - start_date).days

    def render(progress):
        date = date_at(progress)
        stamp, year = date.isoformat(), date.year
        image = base.copy()
        overlay = Image.new('RGBA', (W, H))
        od = ImageDraw.Draw(overlay)
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
                    halo_r = (7 if failed or key == 'world' else radius(target / 12) if target is not None else r or 4)
                    circle(od, x, y, halo_r + 5 + 15 * t,
                           outline=(170, 126, 72, round(160 * (1 - t))), width=2)
                if key == 'world':
                    circle(od, x, y, 3, '#171717' if failed else GOLD if pivot else BLUE)
                elif failed:
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
        draw = ImageDraw.Draw(image)
        for key, panel in PANELS.items():
            if key == 'world':
                continue
            for company, state, r in active:
                if not contains(company, panel):
                    continue
                ax, ay = project(company['lon'], company['lat'], panel)
                lx, ly, side, reserved = labels[key][company['id']]
                name = label_text(company, state)
                emphasis = latest is not None and latest[1]['id'] == company['id']
                font = bold[17] if emphasis else fonts[17]
                width = font.getlength(name)
                tx = lx + width + 5 if side == 0 else lx - 5
                elbow = tx + 10 if side == 0 else tx - 10
                draw.line((ax, ay, elbow, ly + 12, tx, ly + 12),
                          GOLD if emphasis else '#a4b1b6', width=1)
                draw.rounded_rectangle((lx - 4, ly - 1, lx + width + 4, ly + 25),
                                       radius=4, fill=BG)
                draw.text((lx, ly), name, font=font, fill=GOLD if emphasis else INK)

        india = next((row for row in active if row[0]['id'] == 'agratasindia'), None)
        if india:
            x, y = project(india[0]['lon'], india[0]['lat'], PANELS['world'])
            name = label_text(india[0], india[1])
            lx = min(x + 8, 446 - fonts[13].getlength(name))
            draw.rounded_rectangle((lx - 2, y + 7, lx + fonts[13].getlength(name) + 2, y + 25),
                                   radius=3, fill=BG)
            draw.text((lx, y + 7), name, font=fonts[13], fill=INK)

        # One compact legend in the video; the page does not repeat it.
        draw.text((966, 554), 'GWh/mo · circle area', font=fonts[17], fill=INK)
        draw.text((966, 581), 'Targets: annual GWh / 12', font=fonts[15], fill=MUTED)
        for x, value in ((978, 1), (1055, 5), (1173, 20), (1318, 40)):
            r = radius(value)
            circle(draw, x, 762 - r, r, '#e7eff4', BLUE, 2)
            draw.text((x - fonts[17].getlength(str(value)) / 2, 767), str(value),
                      font=fonts[17], fill=INK)
        keys = (('volume', 'EV deployment'), ('plan', 'Capacity target'),
                ('pivot', 'Pause / pivot'), ('unknown', 'Unavailable'), ('failure', 'Insolvency'))
        x = 44
        for kind, text in keys:
            y = 804
            if kind == 'plan':
                dashed_circle(draw, x + 6, y + 9, 6, GOLD)
            elif kind == 'pivot':
                draw.polygon(((x + 6, y + 3), (x + 12, y + 9), (x + 6, y + 15), (x, y + 9)), fill=GOLD)
            else:
                circle(draw, x + 6, y + 9, 5,
                       BLUE if kind == 'volume' else '#171717' if kind == 'failure' else None,
                       MUTED if kind == 'unknown' else None)
            draw.text((x + 22, y - 1), text, font=fonts[16], fill=MUTED)
            x += 22 + fonts[16].getlength(text) + 34

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
            draw.text((44, 875), company.get('short', company['name']), font=bold[24], fill=INK)
            draw.text((1396 - fonts[16].getlength(event_date), 882), event_date, font=fonts[16], fill=MUTED)
            for i, line in enumerate(wrap(event['text'], 1352, fonts[17])):
                draw.text((44, 910 + i * 23), line, font=fonts[17], fill=MUTED)
        else:
            draw.text((44, 880), 'Measured deployment and documented factory plans', font=fonts[19], fill=INK)
        return image

    target = ROOT / 'media'
    target.mkdir(exist_ok=True)
    final = render(1)
    final.save(target / 'battery-market-poster.jpg', quality=93)
    final.resize((1200, 800), Image.Resampling.LANCZOS).crop((0, 0, 1200, 630)).save(
        ROOT / 'social-battery-price-war.jpg', quality=93)
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
               '-vcodec', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r',
               str(FPS), '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'medium',
               '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
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
