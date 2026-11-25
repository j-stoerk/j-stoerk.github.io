# When Does the Backbone Have to Move?

Materials for [the article](https://j-stoerk.github.io/post-backbone-move.html),
dated 22 November 2026; computation performed 25 November 2026.

The experiment isolates approximation error from fitting error using explicit
physical features. It does not train a neural network. The source model is the
Zehner–Bauer–Schlünder electrode closure with compression-dependent contacts in
[`zehner-electrode-thermal`](https://github.com/j-stoerk/zehner-electrode-thermal/tree/8e046d2743a361a5e685b43bc413d95c18a466fd).

## Reproduce

Python 3.10+ and NumPy suffice for the experiment:

```sh
python -m pip install numpy
python benchmark.py
```

The script fetches three source files at a pinned commit and verifies their
normalized SHA-256 hashes. To use an offline checkout at that same commit:

```sh
python benchmark.py --repo /path/to/zehner-electrode-thermal
```

For the standalone figures:

```sh
python -m pip install matplotlib
python plot.py
```

The recorded run used Python 3.13, NumPy 2.4.6 and Matplotlib 3.10.9.
Results are generated with seed 22112026. Floating-point differences across
linear-algebra libraries can change final digits.

## Design

- **Trajectory:** compression from zero to the last public `graphite_thick` state;
  porosity is interpolated through its seven recorded states. The particle
  diameter is 18 μm, bridge conductivity 130 W/(m K), with helium pore gas and the
  same Knudsen correction as the upstream closure.
- **Parameters:** `[lambda_s, phi0, a, b] = [5.0, 0.0121, -0.0418, 0.0531]`
  from the pinned upstream `results/key_numbers.json`. No new calibration to
  experimental labels is performed here.
- **Target 1:** `1.08 * base + 0.03`, a deliberately in-span affine change.
- **Target 2:** `base + g * (phi0 + a*Pi + b*Pi**2)`, where `g` is the closure's
  contact contribution per unit bridge fraction. The polynomial stays positive
  throughout the interval, so clipping introduces no additional feature.
- **Narrow linear head:** `[1, base]`.
- **Polynomial head:** degree-4 Legendre-polynomial readout of the same scalar
  `base`, normalized to the fixed evaluation interval. No extra measured input.
- **Expanded fixed features:** `[1, base, g, Pi*g, Pi**2*g]`, with a linear head.
  These explicitly span the constructed contact target.
- **Training:** 6, 12, 24, 48 or 96 stratified states covering the entire interval,
  independent heteroscedastic Gaussian noise with standard deviation `0.02*y`,
  100 paired noise/sample realizations per size, normalized least squares.
- **Evaluation:** RMSE against 401 uniformly spaced noiseless states, in W/(m K).
  This is an interpolation/approximation experiment, not a test on unseen recipes
  or an estimate of actual plant noise.

`results.json` contains the targets, first-seed fitted curves, dense-grid
least-squares projections, and median/10th/90th-percentile errors. `summary.json`
collects the numerical statements used in the article. The plotted fit uses the
first seed, not the best-performing seed. The floor is defined for the specified
feature/head class on the specified grid, with uniform compression weighting.

The last calculation constructs two states at the same compression/porosity,
but with bridge fraction differing by 0.004. A predictor unable to distinguish
them has an equal-frequency RMSE lower bound of half their conductivity gap.
If the raw inputs contain a distinguishing signal that an encoder discards,
changing that encoder can help; if the signal was never measured, neither a
nonlinear head nor a larger encoder can recover it from these inputs.

## Files

- `benchmark.py`: complete computation and source-hash checks.
- `results.json`, `summary.json`: full and concise numeric outputs.
- `plot.py`: standalone Matplotlib figure generation.
- `contact-fit.svg`: default fit and learning-curve view.
- `learning-curves.svg`: both targets, median and 10th–90th percentile bands.

The browser reads the saved results only when the article figure approaches the
viewport. Its controls select an existing target/sample-count combination; they
do not train a model or fit curves in the visitor's browser.
