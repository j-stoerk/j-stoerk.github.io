# TC-INT-01: Integrated calendering workflow

## Steps
1. `gd = load_gandert()`.
2. `theta_c, mape_c = calibrate('graphite_thin', gd)`.
3. `theta_o, mape_o = calibrate_orientation('graphite_thin', gd)`.
4. Assert `mape_c` < 5 and `mape_o` < 5.
5. Compute `lam_s_perp` at max Pi using `theta_o[0], theta_o[1]` -> assert near 6.
6. Assert `theta_c[1]` (phi0) > 0 and `theta_c[2]` (a) != 0.

## Expected results
- Both models fit within ~2–5% MAPE for graphite_thin.
- Reorientation model pins c-axis floor at full calendering.
- Contact model has non-trivial phi(Pi) coefficients.
