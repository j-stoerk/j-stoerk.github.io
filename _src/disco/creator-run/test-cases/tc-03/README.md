# TC-03: Calibration smoke + key_results headline numbers

## Steps
1. Import `calibrate` from `electrode_data` and run for `graphite_thin`.
2. Assert returned `theta` has length 4 and `mape` is in (0, 20).
3. Import `key_results` and run `compute()`.
4. Assert `mape_zero_fit_avg` in [28, 33], `mape_calibrated_avg` in [3, 6], `nmc811_uncal_err_pct` in [1.5, 3.5].

## Expected results
- graphite_thin mape ≈ 1.8%, theta ≈ (24.8, 0.0094, -0.024, 0.0)
- zero_fit_avg ≈ 31.1%, calibrated_avg ≈ 4.5%, nmc811_err ≈ +2.7%
