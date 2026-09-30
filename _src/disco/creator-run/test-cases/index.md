# Test-case index

| ID | Capability | Files | Target |
|---|---|---|---|
| tc-01 | Forward conductivity + Knudsen + reorientation limits | `test-cases/tc-01/` | `lambda_eff_coating`, `lambda_gas_knudsen`, `lambda_s_perp_orientation` |
| tc-02 | Inverse porosity QC round-trip + uncertainty | `test-cases/tc-02/` | `invert_porosity`, `porosity_uncertainty` |
| tc-03 | Calibration smoke + key_results headline numbers | `test-cases/tc-03/` | `calibrate`, `key_results.compute` |
| tc-int-01 | Integrated calendering workflow: load data -> calibrate contact -> predict vs reorientation -> compare MAPE | `test-cases/integration/tc-int-01/` | `load_gandert`, `calibrate`, `calibrate_orientation`, `lam_eff_contact`, `lam_eff_orientation` |
