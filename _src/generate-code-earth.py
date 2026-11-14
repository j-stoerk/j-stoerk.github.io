"""Regenerate the tiny pixel-Earth texture from our public-domain Natural Earth data.

Run manually with Pillow installed. The normal site build uses the committed PNG.
"""
from pathlib import Path
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
W, H = 256, 128
mask = Image.new('L', (W, H)); draw = ImageDraw.Draw(mask)
def points(coords):
    return [((lon + 180) / 360 * W, (90 - lat) / 180 * H) for lon, lat in coords]
land = json.loads((ROOT / '_src/media/battery-world-land.json').read_text())
for feature in land['features']:
    geometry = feature['geometry']
    polygons = [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']
    for rings in polygons:
        draw.polygon(points(rings[0]), fill=255)
        for hole in rings[1:]: draw.polygon(points(hole), fill=0)

image = Image.new('RGB', (W, H)); pixels = image.load()
for y in range(H):
    lat = 90 - (y + .5) / H * 180
    for x in range(W):
        lon = (x + .5) / W * 360 - 180
        grain = ((x * 17 + y * 29) % 11) - 5
        if mask.getpixel((x,y)):
            arid = 9 < lat < 34 and -19 < lon < 82
            base = (181,165,120) if arid else (143,163,132)
            if abs(lat) > 68: base = (209,219,213)
        else:
            base = (37,84,135) if abs(lat) < 45 else (42,77,114)
        if abs(lat) > 81: base = (217,226,226)
        pixels[x,y] = tuple(max(0,min(255,c+grain)) for c in base)

# Quiet national boundaries retain geographic detail at the deliberately low resolution.
borders = json.loads((ROOT / '_src/media/battery-country-borders.json').read_text())
border_mask = Image.new('L', (W,H)); border_draw = ImageDraw.Draw(border_mask)
for feature in borders['features']:
    geometry=feature['geometry']
    lines=[geometry['coordinates']] if geometry['type']=='LineString' else geometry['coordinates']
    for line in lines:
        coords=points(line)
        for a,b in zip(coords,coords[1:]):
            if abs(a[0]-b[0]) < W/2: border_draw.line([a,b],fill=255,width=1)
for y in range(H):
    for x in range(W):
        if border_mask.getpixel((x,y)) and mask.getpixel((x,y)):
            r,g,b=pixels[x,y]; pixels[x,y]=(int(r*.87),int(g*.9),int(b*.94))

target=ROOT/'images/code-earth-map.png'
image.save(target,optimize=True)
print(f'{target.name}: {target.stat().st_size} bytes')
