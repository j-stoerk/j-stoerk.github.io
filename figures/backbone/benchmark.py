"""Reproduce the frozen-feature experiment in 'When Does the Backbone Have to Move?'.

Python 3.10+, NumPy. Run from this directory: python benchmark.py
Optional offline source checkout: python benchmark.py --repo /path/to/zehner-electrode-thermal
Outputs results.json and summary.json next to this script. No neural network is trained.
The feature maps are explicit functions from the pinned electrode closure, so their
approximation error can be measured independently of optimization and label noise.
"""
from pathlib import Path
import argparse
import csv
import hashlib
import importlib.util
import io
import json
import tempfile
from urllib.request import urlopen

import numpy as np

COMMIT = '8e046d2743a361a5e685b43bc413d95c18a466fd'
ROOT = 'https://raw.githubusercontent.com/j-stoerk/zehner-electrode-thermal/' + COMMIT + '/'
HASHES = {
    'src/zbs.py': '5201e397a5f8b2750163184d858bc105f4c2e079fd8141f551129a5deb6a2aee',
    'results/key_numbers.json': 'f9851ba8541444cb71ceeddf2d8f2f0980722fc6962863271783327b61a44cca',
    'data/raw/gandert2023_calendering.csv': '9d2f80d4aa162182f1108245097db76b0c7af786b68dc7c8c275dbdc197a4352',
}
SEED, REPEATS = 22112026, 100
SIZES = [6, 12, 24, 48, 96]


def source(name, repo):
    raw = (repo / name).read_bytes() if repo else urlopen(ROOT + name, timeout=30).read()
    # Git checkouts can change LF to CRLF; the hash covers normalized UTF-8 source.
    raw = raw.replace(b'\r\n', b'\n')
    if hashlib.sha256(raw).hexdigest() != HASHES[name]:
        raise ValueError('Source hash mismatch: ' + name)
    return raw


def fit(features, y, evaluation):
    # Column normalization avoids conditioning differences masquerading as a feature floor.
    scale = np.sqrt(np.mean(features ** 2, axis=0))
    weights = np.linalg.lstsq(features / scale, y, rcond=1e-12)[0]
    return evaluation / scale @ weights


def run(repo=None):
    with tempfile.TemporaryDirectory() as directory:
        module_path = Path(directory) / 'zbs.py'
        module_path.write_bytes(source('src/zbs.py', repo))
        spec = importlib.util.spec_from_file_location('pinned_zbs', module_path)
        zbs = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(zbs)

    parameters = json.loads(source('results/key_numbers.json', repo))['calibrated']['graphite_thick']['theta']
    rows = [r for r in csv.DictReader(io.StringIO(source('data/raw/gandert2023_calendering.csv', repo).decode()))
            if r['system'] == 'graphite_thick']
    compression = np.array([1 - float(r['s_co_um']) / float(rows[0]['s_co_um']) for r in rows])
    porosity = np.array([float(r['porosity']) for r in rows])
    solid, phi0, a, b = parameters

    def primitives(pi):
        psi = np.interp(pi, compression, porosity)
        pore = (2 / 3) * psi / (1 - psi) * 18e-6
        mean_free_path = 1.380649e-23 * 300 / (np.sqrt(2) * np.pi * (2.18e-10) ** 2 * 101325)
        gas = 0.1518 / (1 + 2 * 1.64 * mean_free_path / pore)
        base = zbs.lambda_so_over_lambda(psi, solid / gas) * gas
        # Subtract the particle-path contribution replaced by a bridge in the VDI closure.
        particle_path = (base - gas * (1 - np.sqrt(1 - psi))) / np.sqrt(1 - psi)
        contact = np.sqrt(1 - psi) * (130 - particle_path)
        return base, contact

    grid = np.linspace(0, float(compression[-1]), 401)
    base_grid, contact_grid = primitives(grid)
    # A fixed normalization, defined without target labels, for the nonlinear-head control.
    center, span = (base_grid[0] + base_grid[-1]) / 2, (base_grid[-1] - base_grid[0]) / 2

    def features(pi, kind):
        base, contact = primitives(pi)
        if kind == 'narrow':
            return np.column_stack([np.ones_like(pi), base])
        if kind == 'nonlinear':
            return np.polynomial.legendre.legvander((base - center) / span, 4)
        return np.column_stack([np.ones_like(pi), base, contact, pi * contact, pi ** 2 * contact])

    def target(pi, scenario):
        base, contact = primitives(pi)
        if scenario == 'rescale':
            return 1.08 * base + 0.03
        return base + contact * (phi0 + a * pi + b * pi ** 2)

    # The chosen interval never clips the contact polynomial, keeping the expanded
    # basis exactly specified. A kink from clipping would be a different experiment.
    assert np.min(phi0 + a * grid + b * grid ** 2) > 0
    result = {'version': 1, 'seed': SEED, 'repeats': REPEATS, 'sizes': SIZES,
              'sourceCommit': COMMIT, 'sourceHashes': HASHES, 'parameters': parameters,
              'noise': 'independent Gaussian, sigma = 0.02 times noiseless conductivity',
              'test': '401 uniformly spaced compression states, noiseless target',
              'x': grid.tolist(), 'scenarios': {}}
    summary = {}
    for scenario in ['rescale', 'contact']:
        truth = target(grid, scenario)
        result['scenarios'][scenario] = {'truth': truth.tolist(), 'models': {}}
        summary[scenario] = {}
        for kind in ['narrow', 'nonlinear', 'expanded']:
            design = features(grid, kind)
            oracle = fit(design, truth, design)
            floor = float(np.sqrt(np.mean((oracle - truth) ** 2)))
            curves, learning = [], []
            for n in SIZES:
                errors, forecasts = [], []
                for repeat in range(REPEATS):
                    # Paired samples/noise for all feature maps and both scenarios.
                    rng = np.random.default_rng(np.random.SeedSequence([SEED, n, repeat]))
                    x = np.linspace(grid[0], grid[-1], n)
                    x[1:-1] += rng.uniform(-0.3, 0.3, n - 2) * (grid[-1] / (n - 1))
                    clean = target(x, scenario)
                    observed = clean + rng.normal(0, 0.02 * clean)
                    forecast = fit(features(x, kind), observed, design)
                    errors.append(float(np.sqrt(np.mean((forecast - truth) ** 2))))
                    forecasts.append(forecast)
                learning.append({'n': n, 'median': float(np.median(errors)),
                                 'q10': float(np.quantile(errors, .1)), 'q90': float(np.quantile(errors, .9))})
                # The displayed curve is the first repeat, not a selected best run.
                curves.append({'n': n, 'prediction': forecasts[0].tolist()})
            result['scenarios'][scenario]['models'][kind] = {
                'oracleRmse': floor, 'oracle': oracle.tolist(), 'learning': learning, 'curves': curves}
            summary[scenario][kind] = {'oracleRmse': floor, 'medianRmseAt96': learning[-1]['median']}
    # Two engineered states with identical observed porosity/compression but
    # different hidden contact quality. No head on those inputs can distinguish them.
    midpoint = np.array([grid[len(grid) // 2]])
    base, contact = primitives(midpoint)
    normal = float(target(midpoint, 'contact')[0])
    damaged = float(normal - contact[0] * 0.004)
    gap = abs(normal - damaged)
    result['hiddenState'] = {'normal': normal, 'damaged': damaged,
                             'bestSharedPrediction': (normal + damaged) / 2,
                             'rmseLowerBoundEqualFrequency': gap / 2}
    summary['hiddenState'] = result['hiddenState']
    # Verify the two intended exact-span controls before publishing their numbers.
    assert summary['rescale']['narrow']['oracleRmse'] < 1e-10
    assert summary['contact']['expanded']['oracleRmse'] < 1e-10
    assert summary['contact']['narrow']['oracleRmse'] > .05
    assert summary['contact']['nonlinear']['oracleRmse'] < summary['contact']['narrow']['oracleRmse']
    for filename, data in [('results.json', result), ('summary.json', summary)]:
        (Path(__file__).parent / filename).write_text(json.dumps(data, indent=2) + '\n', encoding='utf8')
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path)
    args = parser.parse_args()
    local_cache = Path(__file__).resolve().parents[2] / '.local' / 'backbone-post' / 'zehner-electrode-thermal'
    run(args.repo or (local_cache if local_cache.is_dir() else None))
