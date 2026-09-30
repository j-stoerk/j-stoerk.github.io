# API Contract & Constants

## `electrode_thermal` (JAX, float64 enabled)

### Gas / Knudsen

```python
mean_free_path(T=300.0, p=101325.0, d_gas=D_AIR) -> m
pore_diameter(psi, d_p) -> m           # hydraulic: (2/3)*psi/(1-psi)*d_p
knudsen_number(psi, d_p, T, p, d_gas) -> float
lambda_gas_knudsen(psi, d_p, lambda_gas, T, p, beta, d_gas) -> W/mK
```

Default `beta=1.64` (air on technical surfaces). Helium values: `LAMBDA_HELIUM=0.1518`, `D_HELIUM=2.18e-10`.

### Forward conductivity

```python
lambda_eff_coating(psi, d_p, lambda_s, lambda_f=LAMBDA_AIR,
                   gas_filled=True, T=300.0, p=101325.0,
                   beta=BETA_AIR, d_gas=D_AIR) -> W/mK

lambda_eff_coating_contact(psi, d_p, lambda_s, lambda_f=LAMBDA_AIR,
                           gas_filled=True, phi=0.0, lambda_bridge=None,
                           T, p, beta, d_gas) -> W/mK
```

`phi=0` recovers `lambda_eff_coating` exactly (validated point-contact ZBS).

### Anisotropic reorientation (graphite anode)

```python
lambda_s_perp_orientation(S, lambda_a=150.0, lambda_c=6.0) -> W/mK
  # S = Hermans orientation factor in [0,1]
  # S=0 -> isotropic average (2a+c)/3; S=1 -> c-axis floor

orientation_factor(Pi, S0, slope) -> S
  # S(Pi) = clip(S0 + slope*Pi, 0, 1)

lambda_s_parallel_orientation(S, lambda_a, lambda_c) -> W/mK
  # In-plane component from trace invariance
```

### Inverse QC

```python
invert_porosity(lambda_meas, d_p, lambda_s, lambda_f=LAMBDA_AIR,
                gas_filled=True, psi_init=0.35, n_newton=25,
                psi_min=0.05, psi_max=0.75) -> psi_hat

porosity_uncertainty(psi_hat, d_p, lambda_s, lambda_f=LAMBDA_AIR,
                     gas_filled=True, sigma_lambda_rel=0.03,
                     sigma_model_rel=0.02) -> sigma_psi
```

Newton uses exact `jax.grad` derivative; `lambda_eff(psi)` is strictly monotonic decreasing in the electrode range, so the root is unique.

### Autodiff sensitivity

```python
dlambda_dpsi = jax.grad(lambda_eff_coating, argnums=0)
```

## `electrode_data`

### Family registry (`FAMILIES`)

| family | d_p (µm) | lam_b (W/mK) | ls_lo | ls_hi | ls_mid | lam_a | lam_c | collector |
|---|---|---|---|---|---|---|---|---|
| graphite_thin | 18 | 130 | 5 | 139 | 80 | 150 | 6 | Cu |
| graphite_thick | 18 | 130 | 5 | 139 | 80 | 150 | 6 | Cu |
| NMC622 | 10 | 24 | 1.5 | 5.0 | 2.5 | 2.5 | 2.5 | Al |
| NMC811 | 10 | 24 | 1.5 | 5.0 | 2.5 | 2.5 | 2.5 | Al |

### Calibrated contact parameters (Gandert 2023)

| family | lambda_s | phi0 | a | b | lambda_bridge |
|---|---|---|---|---|---|
| graphite_thin | 24.8 | 0.0094 | −0.024 | 0 | 130 |
| graphite_thick | 5.0 | 0.0121 | −0.042 | 0.053 | 130 |
| NMC622 | 1.6 | 0.0171 | −0.089 | 0.039 | 24 |
| NMC811 | 1.5 | 0.0048 | −0.049 | 0 | 24 |

### Functions

```python
load_gandert() -> pd.DataFrame   # adds lam_co_meas, Pi columns
calibrate(family, gd=None) -> (theta, mape_percent)
lam_eff_contact(family, psi, Pi, theta) -> float
calibrate_orientation(family, gd=None) -> (theta_o, mape_percent)
lam_eff_orientation(family, psi, Pi, theta_o) -> float
zero_fit_mape(family, gd=None) -> float
```

## `key_results`

```python
compute() -> dict
# Keys include:
#   mape_zero_fit_avg, mape_calibrated_avg,
#   calibrated: {family: {theta, mape}},
#   zero_fit_mape: {family: value},
#   reorientation: {family: {theta, mape, S_range, lam_s_perp_range}},
#   nmc811_uncal_err_pct,
#   reference_values: {anode_wet, cathode_wet, separator_dry_knudsen, separator_dry_continuum},
#   S_of_Pi_graphite_thin, graphite_thin_min_Pi, graphite_caxis_W_mK
```

## `zbs_jax`

```python
lambda_so_over_lambda(psi, kappa, C=C_SPHERE) -> float   # Eq. 37a/38
b_factor(psi, C=C_SPHERE) -> float                        # Eq. 42a
C_SPHERE = 1.25
```
