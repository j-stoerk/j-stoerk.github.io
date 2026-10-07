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
W, H, FPS = 1440, 780, 24
NOMINAL_DURATION = 44
INTRO_FRAMES, OUTRO_FRAMES = round(1.2 * FPS), round(3.5 * FPS)
REVEAL_FRAMES, MESSAGE_HOLD_FRAMES = math.ceil(.2 * FPS), FPS
SCALE = 2
OUTPUT_SIZE = (W * SCALE, H * SCALE)
BG, INK, MUTED = '#f4f2ec', '#243d4e', '#74838b'
BLUE, GOLD, LAND = '#277bb0', '#aa7e48', '#dce2e2'
DATA = json.loads((ROOT / 'data/battery-market.json').read_text(encoding='utf-8'))
PANELS = {
    'europe': {'rect': (0, 0, W // 2, H), 'bounds': (-12, 31, 31, 71), 'title': 'Europe',
               'title_at': (32, 105), 'caption': (32, H - 157, 656),
               'reserved': ((28, 18, 285, 88), (28, 99, 210, 141),
                            (28, H - 163, 692, H - 80), (28, H - 65, 692, H - 8))},
    'asia': {'rect': (W // 2, 0, W // 2, H), 'bounds': (106, 143, 17, 43), 'title': 'East Asia',
             'title_at': (752, 32), 'caption': (752, H - 157, 448),
             'reserved': ((748, 26, 950, 68), (1150, 26, 1412, 68),
                          (748, H - 163, 1204, H - 55), (1230, H - 163, 1412, H - 8))},
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


def timeline_events():
    return sorted([(event['date'], company, event)
                   for company in DATA['companies'] if displayed(company)
                   for event in company['events']
                   if '2020-01-01' < event['date'] <= DATA['cutoff']],
                  key=lambda row: row[0])


def message_schedule():
    """Stretch dense dates; queue same-day messages instead of replacing them."""
    start, end = date_at(0), date_at(1)
    events = timeline_events()
    frames_per_day = (NOMINAL_DURATION * FPS - INTRO_FRAMES - OUTRO_FRAMES) / (end - start).days
    cursor = INTRO_FRAMES + round((dt.date.fromisoformat(events[0][0]) - start).days * frames_per_day)
    schedule = []
    for i, event in enumerate(events):
        date = dt.date.fromisoformat(event[0])
        next_date = dt.date.fromisoformat(events[i + 1][0]) if i + 1 < len(events) else end
        span = max(REVEAL_FRAMES + MESSAGE_HOLD_FRAMES,
                   round((next_date - date).days * frames_per_day))
        schedule.append({'event': event, 'date': date, 'next_date': next_date,
                         'start': cursor, 'end': cursor + span})
        cursor += span
    return schedule


def timeline_at(frame, schedule):
    """Use video frames for caption timing, and dates only for the map's history."""
    captions, current = {}, None
    for slot in schedule:
        if frame < slot['start']:
            break
        current = slot
        company = slot['event'][1]
        for key, panel in PANELS.items():
            if contains(company, panel):
                captions[key] = (slot['event'], frame - slot['start'])
    if current is None:
        start, end = date_at(0), schedule[0]['date']
        t = max(0, (frame - INTRO_FRAMES) / (schedule[0]['start'] - INTRO_FRAMES))
    else:
        start, end = current['date'], current['next_date']
        t = min(1, (frame - current['start']) / (current['end'] - current['start']))
    date = start + dt.timedelta(days=round((end - start).days * t))
    progress = (date - date_at(0)).days / (date_at(1) - date_at(0)).days
    return progress, captions


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

    base = Image.new('RGB', OUTPUT_SIZE, '#eaf0f1')
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
        base.paste(tile, (x * scale, y * scale))

    # Geography fills every pixel. A translucent edge veil keeps overlaid text
    # readable while retaining the country lines underneath, without cards,
    # gutters, header bands, or an opaque footer.
    veil = Image.new('RGBA', OUTPUT_SIZE)
    vd = ImageDraw.Draw(veil)
    for row in range(H * SCALE):
        y = row / SCALE
        top = max(0, 1 - y / 150)
        bottom = max(0, (y - (H - 210)) / 210)
        alpha = round(140 * max(top, bottom) ** 1.3)
        vd.line((0, row, OUTPUT_SIZE[0], row), fill=(244, 247, 245, alpha))
    base = Image.alpha_composite(base.convert('RGBA'), veil).convert('RGB')
    draw = Draw(base, SCALE)
    draw.line((W // 2, 0, W // 2, H), '#c9d5da', width=1)
    for panel in PANELS.values():
        draw.text(panel['title_at'], panel['title'], font=bold[24], fill=INK)

    labels = {
        key: label_positions(panel, [c for c in DATA['companies'] if contains(c, panel)], bold[22])
        for key, panel in PANELS.items()
    }
    for key, layout in labels.items():
        print(f'{key}: {crossing_count(layout)} leader crossings', flush=True)
    all_events = timeline_events()
    schedule = message_schedule()
    frame_count = schedule[-1]['end'] + OUTRO_FRAMES

    def render(progress, captions=None):
        date = date_at(progress)
        stamp, year = date.isoformat(), date.year
        image = base.copy()
        overlay = Image.new('RGBA', OUTPUT_SIZE)
        od = Draw(overlay, SCALE)
        active = []
        events = [row for row in all_events if row[0] <= stamp]
        latest = (min(captions.values(), key=lambda item: item[1])[0] if captions
                  else events[-1] if events else None)
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
        # Tangent nested circles retain the exact map scale in a single swatch.
        draw.text((1250, H - 157), 'GWh/mo', font=bold[18], fill=INK)
        draw.text((1250, H - 27), 'Targets ÷ 12', font=fonts[15], fill=MUTED)
        for value in (20, 5, 1):
            r = radius(value)
            circle(draw, 1293, H - 38 - r, r, None, BLUE, 1.25)
            top = H - 38 - 2 * r
            draw.line((1293, top, 1360, top), '#94b8cd', width=.75)
            draw.text((1365, top - 10), str(value), font=fonts[17], fill=INK)
        keys = (('volume', 'EV deployment'), ('plan', 'Capacity target'),
                ('pivot', 'Pause / pivot'), ('unknown', 'Unavailable'), ('failure', 'Insolvency'))
        for i, (kind, text) in enumerate(keys):
            x, y = 32 + (i % 3) * 225, H - 61 + (i // 3) * 29
            if kind == 'plan':
                dashed_circle(draw, x + 6, y + 10, 6, GOLD)
            elif kind == 'pivot':
                draw.polygon(((x + 6, y + 4), (x + 12, y + 10), (x + 6, y + 16), (x, y + 10)), fill=GOLD)
            else:
                circle(draw, x + 6, y + 10, 5,
                       BLUE if kind == 'volume' else '#171717' if kind == 'failure' else None,
                       MUTED if kind == 'unknown' else None)
            draw.text((x + 24, y - 1), text, font=fonts[17], fill=INK)

        draw.text((32, 20), str(year), font=bold[48], fill=INK)
        draw.text((166, 42), date.strftime('%d %b').upper(), font=fonts[17], fill=MUTED)
        if year == 2026:
            note = 'Deployment data: Jan–Aug'
            draw.text((1408 - fonts[16].getlength(note), 39), note, font=fonts[16], fill=MUTED)
        for key, panel in PANELS.items():
            x, y, width = panel['caption']
            if captions is None:
                regional = [row for row in events if contains(row[1], panel)]
                caption = (regional[-1], REVEAL_FRAMES) if regional else None
            else:
                caption = captions.get(key)
            if caption:
                (event_date, company, event), age = caption
                # The reveal is measured in playback frames. Every scheduled
                # announcement then has at least one full second at rest.
                reveal = min(1, age / REVEAL_FRAMES)
                offset = 5 * (1 - reveal) ** 2
                cy = y + offset
                color = marker_color(event, pace(company, year))
                draw.text((x, cy), company.get('short', company['name']), font=bold[18], fill=color)
                draw.text((x + width - fonts[14].getlength(event_date), cy + 2), event_date, font=fonts[14], fill=MUTED)
                max_lines = 3 if panel['title'] == 'East Asia' else 2
                for i, line in enumerate(wrap(event['text'], width, fonts[17], max_lines)):
                    draw.text((x, cy + 29 + i * 22), line, font=fonts[17], fill=INK)
            elif panel['title'] == 'East Asia':
                leader = max((row for row in active if contains(row[0], panel) and row[2] is not None),
                             key=lambda row: row[2], default=None)
                if leader:
                    company = leader[0]
                    draw.text((x, y), company.get('short', company['name']), font=bold[18], fill=BLUE)
                    draw.text((x, y + 29),
                              f"{pace(company, year):.1f} GWh/mo installed in EVs worldwide",
                              font=fonts[17], fill=INK)
        return image

    target = ROOT / 'media'
    target.mkdir(exist_ok=True)
    final = render(1)
    final.save(target / 'battery-market-poster.jpg', quality=96, subsampling=0)
    social = Image.new('RGB', (1200, 630), '#eaf0f1')
    preview_width = round(W / H * 630)
    overview = final.resize((preview_width, 630), Image.Resampling.LANCZOS)
    social.paste(overview, ((1200 - preview_width) // 2, 0))
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
        for frame in range(frame_count):
            progress, captions = timeline_at(frame, schedule)
            process.stdin.write(render(progress, captions).tobytes())
            if frame % (FPS * 5) == 0:
                print(f'rendered {frame / FPS:.0f}/{frame_count / FPS:.2f}s', flush=True)
    finally:
        process.stdin.close()
    if process.wait() != 0:
        raise SystemExit('ffmpeg failed')
    print('created battery-market-timeline.mp4', flush=True)


if __name__ == '__main__':
    main()
