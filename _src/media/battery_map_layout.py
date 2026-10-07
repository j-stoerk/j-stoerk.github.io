"""Place map labels near their anchors while avoiding crossings and overlaps.

Positions are calculated once for the full roster, including future label widths,
so labels stay still when projects appear or change phase during the timeline.
"""
import math
import random


def intersects(a, b):
    """Proper segment crossings, excluding shared endpoints and collinear stems."""
    def turn(p, q, r):
        return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
    return turn(*a, b[0]) * turn(*a, b[1]) < -1e-6 and turn(*b, a[0]) * turn(*b, a[1]) < -1e-6


def overlaps(a, b, gap=7):
    return a[0] < b[2] + gap and a[2] + gap > b[0] and a[1] < b[3] + gap and a[3] + gap > b[1]


def through_label(segment, box):
    left, top, right, bottom = box
    if any(left < x < right and top < y < bottom for x, y in segment):
        return True
    corners = ((left, top), (right, top), (right, bottom), (left, bottom))
    return any(intersects(segment, (corners[i], corners[(i + 1) % 4])) for i in range(4))


def covers_marker(box, marker):
    x, y, radius = marker
    closest = (min(max(x, box[0]), box[2]), min(max(y, box[1]), box[3]))
    return math.dist((x, y), closest) < radius + 5


def pair_cost(a, b):
    return (10_000_000 * overlaps(a['box'], b['box'])
            + 1_000_000 * (through_label(a['line'], b['box']) + through_label(b['line'], a['box']))
            + 200_000 * intersects(a['line'], b['line']))


def place_labels(panel, entries):
    """Entries supply id, anchor, reserved width, and maximum marker radius."""
    x, y, width, height = panel['rect']
    markers = [(*entry['anchor'], entry['radius']) for entry in entries]
    candidates = {}
    for entry in entries:
        ax, ay = entry['anchor']
        label_width, label_height = entry['width'], 27
        options = []
        for distance in (9, 24, 45, 75, 115, 165, 220):
            for angle in range(0, 360, 20):
                radians = math.radians(angle)
                cx = ax + math.cos(radians) * (entry['radius'] + distance + label_width / 2)
                cy = ay + math.sin(radians) * (entry['radius'] + distance + label_height / 2)
                box = (cx - label_width / 2, cy - label_height / 2,
                       cx + label_width / 2, cy + label_height / 2)
                if box[0] < x + 12 or box[2] > x + width - 12 or box[1] < y + 12 or box[3] > y + height - 12:
                    continue
                endpoint = (min(max(ax, box[0]), box[2]), min(max(ay, box[1]), box[3]))
                line = (entry['anchor'], endpoint)
                marker_hits = sum(covers_marker(box, marker) for marker in markers)
                options.append({'box': box, 'line': line,
                                'cost': 10_000_000 * marker_hits + math.dist(*line)})
        if not options:
            raise ValueError(f"No in-panel label positions for {entry['id']}")
        candidates[entry['id']] = sorted(options, key=lambda option: option['cost'])

    def local_cost(candidate, placed, own_id):
        return candidate['cost'] + sum(pair_cost(candidate, other)
                                       for key, other in placed.items() if key != own_id)

    def total_cost(placed):
        values = list(placed.values())
        return sum(value['cost'] for value in values) + sum(
            pair_cost(a, b) for i, a in enumerate(values) for b in values[i + 1:])

    # Dense clusters get first choice. Alternative deterministic orders avoid
    # settling on a poor greedy arrangement around France or southern China.
    order = sorted(entries, key=lambda entry: (-sum(
        math.dist(entry['anchor'], other['anchor']) < 90 for other in entries), entry['id']))
    rng = random.Random(24)
    best, best_cost = None, math.inf
    for attempt in range(5):
        if attempt:
            rng.shuffle(order)
        placed = {}
        for entry in order:
            key = entry['id']
            placed[key] = min(candidates[key], key=lambda option: local_cost(option, placed, key))
        for _ in range(5):
            changed = False
            for entry in order:
                key = entry['id']
                selected = min(candidates[key], key=lambda option: local_cost(option, placed, key))
                if selected is not placed[key]:
                    placed[key] = selected
                    changed = True
            if not changed:
                break
        score = total_cost(placed)
        if score < best_cost:
            best, best_cost = placed.copy(), score
        if best_cost < 200_000:
            break
    return best


def crossing_count(layout):
    values = list(layout.values())
    return sum(intersects(a['line'], b['line'])
               for i, a in enumerate(values) for b in values[i + 1:])
