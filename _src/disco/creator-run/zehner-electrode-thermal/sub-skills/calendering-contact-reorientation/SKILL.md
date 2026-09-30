---
name: calendering-contact-reorientation
description: "Calendering-aware effective thermal conductivity of Li-ion electrodes: contact-network evolution (cathode) and graphite-flake reorientation (anode) via the Knudsen-extended ZBS closure, with calibration, inverse porosity QC, and key-results guardrails."
license: MIT
metadata:
  disco-role: operating
disable-model-invocation: true
---

# Calendering Contact & Reorientation

## Responsibilities

1. Forward through-plane conductivity with calendering-aware contact closure.
2. Graphite-flake reorientation physics (anisotropic anode) vs isotropic cathode contact-network evolution.
3. Calibration of `phi(Pi)` and `S(Pi)` against Gandert 2023 data.
4. Inverse porosity QC: measured `lambda_eff` -> `psi_hat` with uncertainty.
5. Headline number reproduction via `key_results.py`.

## Forward conductivity

### Point-contact baseline

```python
from electrode_thermal import lambda_eff_coating

lam = lambda_eff_coating(
    psi=0.30, d_p=17e-6, lambda_s=25.0,
    lambda_f=LAMBDA_ELECTROLYTE, gas_filled=False
)
# wet graphite anode ~2.56 W/mK
```

### Contact-augmented closure (VDI flattened-contact)

```python
from electrode_thermal import lambda_eff_coating_contact

lam = lambda_eff_coating_contact(
    psi=0.40, d_p=18e-6, lambda_s=24.8,
    lambda_f=LAMBDA_HELIUM, gas_filled=True,
    phi=0.0094, lambda_bridge=130.0, d_gas=D_HELIUM
)
```

`phi=0` reduces **exactly** to `lambda_eff_coating`. The validated ZBS shape factor is `C_SPHERE=1.25`.

### Physics: two separable mechanisms

| Mechanism | Active for | Formula | Observable |
|---|---|---|---|
| **Contact-network evolution** | Cathode (NMC), also anode bridge share | `phi(Pi) = max(0, phi0 + a*Pi + b*Pi^2)` | Conductivity u-shape |
| **Graphite-flake reorientation** | Anode (graphite platelets) | `S(Pi) = clip(S0 + slope*Pi, 0, 1)`<br>`lambda_s_perp(S) = (1-S)*(2a+c)/3 + S*c` | XRD texture S |

For **isotropic** actives (`lambda_a == lambda_c`), `lambda_s_perp_orientation` is S-independent and reorientation is inert — this is the discriminating signature. NMC reorientation-only MAPE collapses to the zero-fit baseline (~19–29 %), proving the cathode dip is contact damage, not reorientation.

## Calibration

### Contact model (4 parameters)

```python
from electrode_data import calibrate

theta, mape = calibrate("graphite_thin")   # theta = (lam_s, phi0, a, b)
# graphite_thin: theta ≈ (24.8, 0.0094, -0.024, 0.0), mape ≈ 1.8%
```

Bounds: `ls_lo..ls_hi` from `FAMILIES`, `phi0 in [0, 0.08]`, `a in [-0.2, 0.3]`, `b in [0, 0.8]`.

### Reorientation-coupled model (3 parameters)

```python
from electrode_data import calibrate_orientation

theta_o, mape_o = calibrate_orientation("graphite_thin")
# theta_o = (S0, slope, phi0); mape ≈ 1.9%
```

Bounds: `S0 in [0, 1]`, `slope in [0, 8]`, `phi0 in [0, 0.05]`.

For graphite this 3-parameter model matches the 4-parameter contact quadratic and pins `lambda_s_perp` to the c-axis floor at full calendering. For NMC the orientation term is inert so the model fails badly (>15 % MAPE), independently showing the two mechanisms are separable.

## Inverse porosity QC

```python
from electrode_thermal import invert_porosity, porosity_uncertainty

lam_meas = 2.37  # W/mK
psi_hat = invert_porosity(lam_meas, d_p=17e-6, lambda_s=25.0,
                          lambda_f=LAMBDA_ELECTROLYTE, gas_filled=False)
sigma_psi = porosity_uncertainty(psi_hat, d_p=17e-6, lambda_s=25.0,
                                lambda_f=LAMBDA_ELECTROLYTE, gas_filled=False,
                                sigma_lambda_rel=0.03, sigma_model_rel=0.02)
# sigma_psi ≈ 0.009 at 3% meas + 2% model noise
```

Newton iteration uses exact `jax.grad`; convergence is quadratic. `lambda_eff(psi)` is strictly monotonic decreasing, so the root is unique.

## Key results guardrails

```python
import key_results
R = key_results.compute()
```

Canonical headline numbers (v1 manuscript):
- `mape_zero_fit_avg` ≈ 31.1 %
- `mape_calibrated_avg` ≈ 4.5 %
- `nmc811_uncal_err_pct` ≈ +2.7 %
- Reference values: anode wet ≈ 2.56, cathode wet ≈ 0.97, separator dry Knudsen ≈ 0.065 W/mK
- Reorientation graphite_thin MAPE ≈ 1.9 %, NMC622 MAPE ≈ 19.1 %

## Troubleshooting

- [Root troubleshooting](../../../../references/troubleshooting.md)
- See API contract for parameter bounds, validity envelope, and common misuse patterns.
