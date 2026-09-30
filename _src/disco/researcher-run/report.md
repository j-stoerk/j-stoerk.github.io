# ZBS-Electrode Parameter Sweep — Researcher Report

**Task**: Small illustrative parameter sweep using the local `zehner-electrode-thermal` skill.
**Date**: 2026-09-30
**Outputs**:
- Reproduction script: `sweep.py`
- Numerical results: `results.json`

## 1. Dry Graphite Coating — Contact Closure (`lambda_eff_coating_contact`)

Parameters:
- Particle diameter `d_p = 18e-6 m`
- Solid conductivity `lambda_s = 25 W/mK`
- Fluid = `LAMBDA_AIR`, `gas_filled=True`
- Bridge conductivity `lambda_bridge = 130 W/mK`

| Porosity | φ = 0 (W/mK) | φ = 0.01 (W/mK) | Ratio (φ0.01/φ0) |
|----------|--------------|-----------------|------------------|
| 0.25     | 0.7540       | 1.8723          | 2.48×            |
| 0.35     | 0.4814       | 1.5247          | 3.17×            |
| 0.45     | 0.3181       | 1.2791          | 4.02×            |

**Assertions passed**: All λ values finite and positive; bridge-augmented conductivity strictly greater than point-contact at every porosity. The boost ratio grows with porosity because the contact/bridge term becomes a larger share of the remaining solid matrix as porosity increases.

## 2. Wet Graphite — Forward/Inverse Round Trip

Parameters:
- Particle diameter `d_p = 17e-6 m`
- Solid conductivity `lambda_s = LAMBDA_GRAPHITE = 25 W/mK`
- Fluid = `LAMBDA_ELECTROLYTE = 0.18 W/mK`, `gas_filled=False`

| Target ψ | λ_forward (W/mK) | ψ_inverted | Absolute error |
|----------|------------------|------------|-------------|
| 0.25     | 3.1308           | 0.2500     | 2.78e‑17    |
| 0.35     | 2.1153           | 0.3500     | 0.00e+00    |
| 0.45     | 1.4694           | 0.4500     | 5.55e‑17    |

**Assertions passed**: Absolute porosity error < `1e-8` in all cases; the round trip demonstrates numerical consistency for these three generated cases.

## 3. Unresolved Gaps / Honesty Notes

1. **Model-form uncertainty**: All three porosities are outside the cited packed-bed validation interval [0.369, 0.429]. This illustrative API sweep does not measure the extrapolation error for electrodes.
2. **Point-contact under-prediction**: The φ = 0 baseline tends to under-predict when binder bridges or flattened calender contacts exist; the φ = 0.01 run is illustrative but the real bridge fraction is recipe-dependent.
3. **Graphite anisotropy ignored**: We used the isotropic default `LAMBDA_GRAPHITE = 25 W/mK`; actual through-plane anode conductivity depends on flake orientation (`S`). The reorientation model (`lambda_s_perp_orientation`) was not exercised here.
4. **No Knudsen effect in wet case**: Correctly disabled (`gas_filled=False`), so the comparison dry vs wet is not a strict 1:1 material switch—it also toggles the gas-correction physics.
5. **Bridge area fraction fixed**: We used a constant `phi = 0.01`; the calendering sub-skill notes `phi(Pi)` is recipe-specific and needs ~6 calendering states for calibration.

## 4. How to Reproduce

```bash
python sweep.py --repo "PATH_TO_SOURCE_CHECKOUT"
```

The script dynamically prepends `{repo}/src` to `sys.path` and requires the source checkout and its Python dependencies. No network retrieval, no training, no package installation.

## Review note

The portfolio review corrected the date and local paths, repaired the table header, and clarified extrapolation and numerical-consistency claims. Numerical results are unchanged. The script summary block was dedented after execution; the arithmetic is unchanged.
