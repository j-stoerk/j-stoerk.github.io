---
name: zehner-electrode-thermal
description: "Repo-specific operating skill for the zbs-electrode package: forward through-plane thermal conductivity of Li-ion electrode coatings and separators via the Knudsen-extended Zehner-Bauer-Schlünder (ZBS) closure, plus the calendering contact/reorientation workflow and differentiable inverse QC."
license: MIT
metadata:
  disco-role: operating
disable-model-invocation: true
---

# Zehner-Electrode-Thermal

## When to use

Use this skill when a downstream task needs to:
- Compute effective through-plane thermal conductivity `lambda_eff` of a porous battery electrode coating or separator.
- Apply the Knudsen-corrected ZBS closure for gas-filled or liquid-filled pores.
- Model calendering-induced conductivity changes via contact-network evolution (cathode) or graphite-flake reorientation (anode).
- Invert a measured `lambda_eff` to coating porosity (manufacturing QC).
- Calibrate contact/reorientation models against Gandert 2023 calendering data.
- Retrieve canonical headline numbers (MAPE, reference values, orientation parameters) from `key_results.py`.

## Router entry points

| Prompt signal | Route to |
|---|---|
| "compute effective thermal conductivity", "lambda_eff coating", "through-plane conductivity electrode" | [Forward conductivity](sub-skills/calendering-contact-reorientation/SKILL.md#forward-conductivity) |
| "calendering", "contact closure", "reorientation", "graphite flake orientation", "phi(Pi)" | [Calendering contact/reorientation](sub-skills/calendering-contact-reorientation/SKILL.md) |
| "inverse porosity", "QC from thermal measurement", "porosity from lambda" | [Inverse QC](sub-skills/calendering-contact-reorientation/SKILL.md#inverse-porosity-qc) |
| "calibrate", "fit to Gandert", "MAPE", "headline numbers" | [Calibration & key results](sub-skills/calendering-contact-reorientation/SKILL.md#calibration-and-key-results) |

## Top-level API surface (JAX + NumPy/SciPy)

### `electrode_thermal` (JAX, float64)

```python
from electrode_thermal import (
    lambda_eff_coating,           # (psi, d_p, lambda_s, lambda_f, gas_filled, ...) -> W/mK
    lambda_eff_coating_contact,   # + VDI flattened-contact term phi, lambda_bridge
    dlambda_dpsi,                 # autodiff sensitivity d(lambda_eff)/d(psi)
    invert_porosity,              # Newton root-find: measured lambda -> psi
    porosity_uncertainty,         # first-order sigma_psi from meas + model noise
    lambda_s_perp_orientation,    # through-plane solid conductivity vs Hermans S
    orientation_factor,           # S(Pi) = clip(S0 + slope*Pi, 0, 1)
    lambda_gas_knudsen,           # Smoluchowski-reduced pore-gas conductivity
    knudsen_number, mean_free_path, pore_diameter,
    LAMBDA_AIR, LAMBDA_ELECTROLYTE, LAMBDA_HELIUM,
    LAMBDA_GRAPHITE, LAMBDA_NMC, LAMBDA_SEPARATOR_PE,
    D_AIR, D_HELIUM,
)
```

### `electrode_data` (pandas + scipy.optimize)

```python
from electrode_data import (
    FAMILIES,           # registry: graphite_thin, graphite_thick, NMC622, NMC811
    load_gandert,       # returns DataFrame with lam_co_meas, Pi columns
    calibrate,          # least-squares theta=(lam_s, phi0, a, b) -> (theta, mape)
    calibrate_orientation,  # theta_o=(S0, slope, phi0) -> (theta_o, mape)
    lam_eff_contact,    # calibrated contact-closure prediction
    lam_eff_orientation,# reorientation-coupled prediction
    zero_fit_mape,      # phi=0 baseline MAPE for a family
)
```

### `key_results` (single source of truth)

```python
import key_results
R = key_results.compute()   # dict with mape_zero_fit_avg, mape_calibrated_avg, etc.
```

## Validity envelope & honesty checklist

- **ZBS closure** validated for `kappa = lambda_s/lambda_f` in [14, 1005] and `psi` in [0.369, 0.429] on mm-scale packed beds. Electrode porosities (0.20–0.55) extrapolate `psi`; treat absolute values with a model-form uncertainty floor (~2 %).
- **Point-contact** (`phi=0`) tends to **under-predict** when binder bridges / calender-flattened contacts exist.
- **Graphite anisotropy**: default `LAMBDA_GRAPHITE=25` is a literature mid-value; actual through-plane value depends on flake orientation (c-axis floor ~6 W/mK).
- **Knudsen correction** applies only to **gas-filled** pores (dry electrodes). Liquid electrolyte has no Knudsen effect.
- **Calibrated phi(Pi)** parameters are **per-recipe** (do not transfer across additive recipes); ~6 calendering states needed per recipe.

## References

- [Repo provenance](references/repo-provenance.md)
- [API contract & constants](references/api-contract.md)
- [Troubleshooting](references/troubleshooting.md)
- [Calendering contact/reorientation sub-skill](sub-skills/calendering-contact-reorientation/SKILL.md)
