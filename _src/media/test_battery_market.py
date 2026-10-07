"""Data and encoding contracts for the published figure; no network requests."""
import json
import importlib.util
import math
import unittest
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
spec = importlib.util.spec_from_file_location('renderer', HERE / 'render-battery-market.py')
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)
data = renderer.DATA
companies = {c['id']: c for c in data['companies']}


class MapContracts(unittest.TestCase):
    def test_regional_maps_keep_circles_at_factory_or_headquarters_coordinates(self):
        # Northvolt's cell plant is in Skelleftea, not its former Stockholm HQ;
        # Verkor's gigafactory is in Dunkirk, not its Grenoble headquarters.
        self.assertAlmostEqual(companies['northvolt']['lat'], 64.75, places=1)
        self.assertAlmostEqual(companies['verkor']['lat'], 51.03, places=1)
        for company in data['companies']:
            self.assertNotIn('label', company)
        omitted = {c['id'] for c in data['companies'] if not renderer.displayed(c)}
        self.assertEqual(omitted, {'enerdel', 'abf', 'one', 'factorial', 'amprius',
                                  'powercocanada', 'agratasindia'})
        self.assertEqual(set(renderer.PANELS), {'europe', 'asia'})

    def test_leaders_do_not_cross_labels_or_each_other(self):
        from battery_map_layout import crossing_count, overlaps, through_label
        font_path = next((path for path in (
            Path('C:/Windows/Fonts/seguisb.ttf'),
            Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')) if path.is_file()), None)
        if font_path is None:
            self.skipTest('No test font installed')
        font = renderer.Font(font_path, 22, renderer.SCALE)
        for panel in renderer.PANELS.values():
            roster = [c for c in data['companies'] if renderer.contains(c, panel)]
            layout = renderer.label_positions(panel, roster, font)
            self.assertEqual(crossing_count(layout), 0)
            labels = list(layout.values())
            for i, a in enumerate(labels):
                for reserved in panel['reserved']:
                    self.assertFalse(overlaps(a['box'], reserved))
                    self.assertFalse(through_label(a['line'], reserved))
                for b in labels[i + 1:]:
                    self.assertFalse(overlaps(a['box'], b['box']))
                    self.assertFalse(through_label(a['line'], b['box']))
                    self.assertFalse(through_label(b['line'], a['box']))

    def test_label_colour_follows_the_marker_including_missing_data_and_pauses(self):
        self.assertEqual(renderer.marker_color({'phase': 'operating'}, 12), renderer.BLUE)
        self.assertEqual(renderer.marker_color({'phase': 'operating'}, None), renderer.MUTED)
        self.assertEqual(renderer.marker_color({'phase': 'ramp-up', 'capacity': 20}, None), renderer.GOLD)
        self.assertEqual(renderer.marker_color({'phase': 'paused', 'capacity': 5}, None), renderer.MUTED)
        self.assertEqual(renderer.marker_color({'phase': 'insolvent'}, None), '#171717')

    def test_expansion_includes_top_ten_without_inventing_startup_output(self):
        top_ten = {'catl', 'byd', 'lges', 'calb', 'gotion', 'skon', 'eve',
                   'svolt', 'rept', 'panasonic'}
        self.assertTrue(top_ten.issubset(companies))
        for name in ('agratasuk', 'agratasindia', 'prologium', 'elevenes'):
            self.assertTrue(all(v is None for v in companies[name]['volumes']))
        self.assertEqual(renderer.snapshot(companies['tiamat'], data['cutoff'])['phase'], 'paused')
        self.assertEqual(data['sources']['aescSunderland']['published'], '2025-06-02')

    def test_missing_is_not_zero_or_a_full_year_forecast(self):
        self.assertIsNone(renderer.pace(companies['samsung'], 2026))
        self.assertIsNone(renderer.pace(companies['byd'], 2020))
        self.assertIsNone(renderer.radius(None))
        self.assertAlmostEqual(renderer.pace(companies['catl'], 2026), 333 / 8)
        self.assertAlmostEqual(renderer.pace(companies['catl'], 2025), 464.7 / 12)
        self.assertEqual(renderer.radius(0), 0)

    def test_area_encodes_volume_and_capacity_on_the_same_normalised_scale(self):
        a, b = renderer.radius(10), renderer.radius(40)
        self.assertAlmostEqual(math.pi*b*b / (math.pi*a*a), 4)
        self.assertAlmostEqual(renderer.radius(60/12), renderer.radius(5))

    def test_failure_dates_do_not_turn_project_pauses_into_bankruptcies(self):
        nv = companies['northvolt']
        self.assertNotEqual(renderer.snapshot(nv, '2025-03-11')['phase'], 'insolvent')
        self.assertEqual(renderer.snapshot(nv, '2025-03-12')['phase'], 'insolvent')
        self.assertEqual(renderer.snapshot(companies['britishvolt'], '2023-01-17')['phase'], 'insolvent')
        self.assertIsNone(renderer.snapshot(companies['powerco'], '2022-07-06'))
        self.assertIsNotNone(renderer.snapshot(companies['powerco'], '2022-07-07'))
        self.assertNotEqual(renderer.snapshot(companies['acc'], data['cutoff'])['phase'], 'insolvent')
        self.assertEqual(renderer.snapshot(companies['freyr'], '2023-11-09')['phase'], 'paused')
        self.assertEqual(renderer.snapshot(companies['freyr'], data['cutoff'])['phase'], 'pivoted')
        self.assertNotEqual(renderer.snapshot(companies['morrow'], '2026-05-05')['phase'], 'insolvent')
        self.assertEqual(renderer.snapshot(companies['morrow'], '2026-05-06')['phase'], 'insolvent')
        self.assertEqual(renderer.snapshot(companies['amte'], '2023-12-19')['phase'], 'distressed')
        self.assertEqual(renderer.snapshot(companies['amte'], '2024-01-19')['phase'], 'insolvent')
        self.assertEqual(renderer.snapshot(nv, '2024-11-21')['phase'], 'distressed')
        self.assertEqual(renderer.snapshot(nv, data['cutoff'])['phase'], 'insolvent')
        self.assertIsNone(renderer.snapshot(companies['lytenett'], '2026-02-26'))
        self.assertEqual(renderer.snapshot(companies['lytenett'], '2026-02-27')['phase'], 'restart')
        self.assertNotEqual(renderer.snapshot(companies['varta'], '2026-09-30')['phase'], 'insolvent')
        self.assertEqual(renderer.snapshot(companies['varta'], '2026-10-01')['phase'], 'insolvent')
        self.assertTrue(all(v is None for v in companies['varta']['volumes']))

    def test_all_observations_and_events_have_sources_within_the_cutoff(self):
        self.assertEqual(data['cutoff'], '2026-10-04')
        self.assertEqual(renderer.date_at(0).isoformat(), '2020-01-01')
        self.assertEqual(renderer.date_at(1).isoformat(), data['cutoff'])
        for period in data['periods']:
            source = data['sources'][period['source']]
            self.assertLessEqual(source['published'], data['cutoff'])
        for company in data['companies']:
            self.assertEqual(len(company['volumes']), len(data['periods']))
            dates = [e['date'] for e in company['events']]
            self.assertEqual(dates, sorted(dates))
            for event in company['events']:
                self.assertLessEqual(event['date'], data['cutoff'])
                self.assertIn(event['source'], data['sources'])
                source = data['sources'][event['source']]
                if source.get('published'):
                    self.assertLessEqual(source['published'], data['cutoff'])
                if event.get('capacitySource'):
                    self.assertIn(event['capacitySource'], data['sources'])
            self.assertTrue(all(v is None or v >= 0 for v in company['volumes']))

    def test_video_is_a_real_faststart_mp4_with_a_poster(self):
        video = (renderer.ROOT / 'media/battery-market-timeline.mp4').read_bytes()
        self.assertGreater(len(video), 100_000)
        self.assertIn(b'ftyp', video[:64])
        self.assertGreater(video.find(b'mdat'), video.find(b'moov'))
        self.assertGreater((renderer.ROOT / 'media/battery-market-poster.jpg').stat().st_size, 10_000)


if __name__ == '__main__':
    unittest.main()
