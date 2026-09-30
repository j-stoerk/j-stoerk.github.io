# Integration notes

## Extraction scope (agent-confirmed)

**Included directories / capabilities:**
- `src/electrode_thermal.py` — forward conductivity, Knudsen correction, contact closure, inverse QC, reorientation physics
- `src/electrode_data.py` — family registry, data loader, contact/reorientation calibration
- `src/zbs_jax.py` — differentiable ZBS closure (dependency, not standalone skill)
- `src/key_results.py` — headline-number single source of truth
- `data/raw/gandert2023_calendering.csv` — canonical calibration dataset
- `tests/test_electrode_thermal.py` — unit/regression test evidence
- `tests/test_key_results.py` — canonical-number guard evidence

**Excluded capabilities (outside scope):**
- Multiphysics convection (Nu_S), ML GP+conformal UQ, PINN inverse, symbolic regression
- Bayesian model averaging, experiment-design phase 3C, digital-twin co-design
- Pore-scale simulation, in-plane validation, temperature forward, cell design
- Heavy notebook analysis workflows (Electrode.ipynb executes these but is not bundled)

## Backend verification plan

| Capability | Backend | CPU substitute | Status |
|---|---|---|---|
| Forward conductivity | CPU (JAX) | full | verified |
| Inverse porosity QC | CPU (JAX grad) | full | verified |
| Calibration (scipy LSQ) | CPU | full | verified |
| Key results compute | CPU | full | verified |

No GPU/CUDA/ROCm/MPS required. All selected capabilities have full CPU substitution.

## Native test/example candidate map

| Candidate | Source | Backend | Safety | Selected for verification | Result |
|---|---|---|---|---|---|
| `tests/test_electrode_thermal.py` | repo | CPU | safe | no full pytest run (budget) | not run |
| `tests/test_key_results.py` | repo | CPU | safe | no full pytest run (budget) | not run |
| Inline API assertions (10 checks) | this run | CPU | safe | **yes** | **PASS** |
| Integrated workflow script (7 checks) | this run | CPU | safe | **yes** | **PASS** |

## Source script import map

| Script | Decision | Reason |
|---|---|---|
| `src/electrode_thermal.py` | **distill into API contract + sub-skill** | Core runtime API; imported from the existing source checkout |
| `src/electrode_data.py` | **distill into API contract + sub-skill** | Core calibration/data layer |
| `src/zbs_jax.py` | **reference only** | Low-level closure; surfaced via `lambda_so_over_lambda` signature in API contract |
| `src/key_results.py` | **distill into guardrail instructions** | Headline-number source of truth |
| `data/raw/gandert2023_calendering.csv` | **reference only** | Data provenance documented; not copied into skill |

## Coverage / depth matrix

| Capability | Depth | Owner | Evidence |
|---|---|---|---|
| Forward conductivity (point-contact) | deep | sub-skill | `electrode_thermal.py`, `zbs_jax.py`, tests |
| Forward conductivity (contact-augmented) | deep | sub-skill | `electrode_thermal.py`, TECHNICAL_GUIDE |
| Knudsen gas correction | deep | sub-skill | `electrode_thermal.py`, tests |
| Graphite reorientation physics | deep | sub-skill | `electrode_thermal.py`, README, tests |
| Inverse porosity QC | deep | sub-skill | `electrode_thermal.py`, TECHNICAL_GUIDE |
| Calibration (contact) | deep | sub-skill | `electrode_data.py`, tests |
| Calibration (reorientation) | deep | sub-skill | `electrode_data.py`, tests |
| Key results reproduction | deep | root + sub-skill | `key_results.py`, `test_key_results.py` |
| Validity envelope / honesty checklist | medium | root | README, TECHNICAL_GUIDE |
| Troubleshooting (install, API misuse, calibration, data) | medium | root references | repo docs + test failures |

## Long-tail gap register

1. **No bundled notebook reproduction**: `Electrode.ipynb` contains full validation + figure generation but is ~10 MB with output cells. Not copied into skill; user can run from repo.
2. **No full pytest suite execution in verification**: budget-limited to inline assertions. Full suite duration was not measured.
3. **No JAX GPU backend verification**: CPU-only checks suffice for the scoped closure.
4. **No experiment-design phase 3C coverage**: `experiment_design.py` is excluded from scope; only calibration layer is included.
5. **No Bayesian / NumPyro coverage**: `bayes_mechanism.py` and related modules excluded.
6. **Routing placement pending**: repository classification not finalized; no `repo-routing-metadata.json` written (import not requested).
