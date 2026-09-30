# TC-02: Inverse porosity QC round-trip + uncertainty

## Steps
1. Import `invert_porosity` and `porosity_uncertainty`.
2. Use `lambda_meas=2.37`, `d_p=17e-6`, `lambda_s=25.0`, `lambda_f=LAMBDA_ELECTROLYTE`, `gas_filled=False`.
3. Assert recovered `psi_hat` is in [0.25, 0.35].
4. Assert `sigma_psi` is in [0.005, 0.015].
5. Round-trip test: compute `lambda_eff_coating(psi_hat)` and assert it equals `lambda_meas` within 1e-6.

## Expected results
- `psi_hat` ≈ 0.32
- `sigma_psi` ≈ 0.009
