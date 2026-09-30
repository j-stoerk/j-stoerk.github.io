# Troubleshooting

## Import / install

- `pip install -e .` from repo root is required for `import electrode_thermal` to work outside notebooks. The notebooks retain a `sys.path.insert(0, "src")` fallback.
- JAX needs `jaxlib`; on CPU-only machines the standard PyPI wheels work. GPU/TPU backends are optional and not required for the electrode closure.
- `jax_enable_x64` is set module-level in `electrode_thermal.py` and `experiment_design.py`. If you import JAX before these modules, the flag may already be locked. Ensure 64-bit is enabled before constructing differentiable pipelines.

## API misuse

- `phi=0` in `lambda_eff_coating_contact` must reproduce `lambda_eff_coating` exactly. If it does not, check that `lambda_bridge` defaults to `lambda_s` when `None`.
- `gas_filled=True` applies the Knudsen correction; `gas_filled=False` assumes liquid-filled pores with no Knudsen effect. Do not set `gas_filled=True` with `lambda_f=LAMBDA_ELECTROLYTE` — that would incorrectly Knudsen-reduce liquid conductivity.
- `invert_porosity` assumes monotonicity and uses a Newton iteration. For extreme `lambda_meas` values outside the physical range, it clips to `[psi_min, psi_max]` (default 0.05–0.75) rather than diverging.
- Graphite `lambda_s` is strongly anisotropic. Using the isotropic default `LAMBDA_GRAPHITE=25` for a calendered anode may over-predict conductivity if flake reorientation has lowered the through-plane component toward the c-axis floor (~6 W/mK). Use `lambda_s_perp_orientation(S, ...)` when orientation data is available.

## Calibration

- `calibrate()` runs `scipy.optimize.least_squares` with physical bounds. If the bounds are too tight for a new dataset, expand `ls_lo/ls_hi` in `FAMILIES` or pass custom `bounds`.
- Calibrated `phi(Pi)` parameters are **per-recipe** (binder, additive, active type). Transfer within the same composition ~21 % MAPE; across additive recipes ~40 % MAPE. Do not blindly reuse `theta` from one family for another.
- `zero_fit_mape` uses the representative `ls_mid` from the registry as the phi=0 baseline. For anisotropic graphite, `ls_mid=80` is a rough mid-range; the actual through-plane value varies with calendering.

## Data

- `load_gandert()` reads `data/raw/gandert2023_calendering.csv` relative to the repo root. If the working directory is not the repo root, the path resolution may fail. Ensure `_ROOT` (computed from `__file__`) matches your checkout layout.
- The CSV contains stack conductivities and foil-removed coating conductivities (`lam_co_meas`). Raw thermal-conductivity measurements are not in the repo; the values are derived from published quadratic fits.

## Validity warnings

- `psi < 0.369` extrapolates the validated ZBS porosity range. The closure is smooth but unverified there.
- Point-contact (`phi=0`) under-predicts when binder bridges or calender-flattened contacts exist.
- Wet separator `kappa=2.2` (soaked electrolyte) is below the validated `kappa` minimum of the packed-bed study. Treat predictions with extra caution.
