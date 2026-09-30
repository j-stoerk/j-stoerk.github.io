# TC-01: Forward conductivity + Knudsen + reorientation limits

## Steps
1. Import `electrode_thermal` constants and functions.
2. Compute `lambda_eff_coating` for anode and cathode wet cases.
3. Compute `lambda_gas_knudsen` for separator dry-air.
4. Assert anode wet in [2.5, 2.7], cathode wet in [0.9, 1.1], separator Knudsen < 0.15.
5. Assert `lambda_s_perp_orientation(1, 150, 6) == 6` and `lambda_s_perp_orientation(0, 150, 6) == 102`.
6. Assert `lambda_s_perp_orientation(any, 2.5, 2.5) == 2.5`.

## Expected results
- Anode wet ≈ 2.559 W/mK
- Cathode wet ≈ 0.970 W/mK
- Separator dry Knudsen ≈ 0.065 W/mK (air)
- Graphite orientation limits verified numerically
- NMC isotropic limit verified numerically
