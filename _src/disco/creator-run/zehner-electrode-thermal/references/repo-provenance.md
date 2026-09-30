# Repo Provenance

| Field | Value |
|---|---|
| Repository | https://github.com/j-stoerk/zehner-electrode-thermal |
| Package | zbs-electrode 1.0.0 |
| License | MIT |
| Python | >=3.11 |
| Core dependencies | numpy, scipy, pandas, jax, jaxlib |
| Source commit | `425c77f178bb87cc58160af3f1d7d99288e0c5d3` (recorded during portfolio review) |
| Dirty state | Unrelated documents modified/untracked; tracked source modules used here unchanged |

## Evidence paths used for skill extraction

- `README.md` — overview, key results, quick start, file structure
- `TECHNICAL_GUIDE.md` — per-method reference, API examples, validity envelope, failure modes
- `src/electrode_thermal.py` — Knudsen-extended ZBS + contact closure + inverse QC + reorientation (JAX)
- `src/electrode_data.py` — family registry, data loader, calibration wrappers
- `src/zbs_jax.py` — differentiable ZBS stagnant-bed closure
- `src/key_results.py` — single source of truth for headline numbers
- `data/raw/gandert2023_calendering.csv` — canonical calendering dataset (4 families, 27 states)
- `tests/test_electrode_thermal.py` — unit/regression tests for physics, consistency, inverse, published values
- `tests/test_key_results.py` — canonical-number guards + manuscript drift detection

## Scope decision

Included: forward through-plane thermal conductivity, calendering contact/reorientation workflow, inverse porosity QC, calibration against Gandert 2023 data.

Excluded from this skill: multiphysics convection (Nu_S), ML GP+conformal UQ, PINN inverse, symbolic regression, Bayesian model averaging, experiment-design phase 3C, digital-twin co-design, pore-scale simulation, and in-plane validation. These exist in the repo but are outside the scoped extraction.
