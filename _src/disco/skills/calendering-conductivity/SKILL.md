---
name: calendering-conductivity
description: Interpret and plan analysis of calendering-dependent through-plane thermal conductivity using the portfolio's ZBS closure work.
---

# Calendering-dependent conductivity

## Use this when

The task concerns predicting or interpreting how calendering changes the apparent through-plane thermal conductivity of a porous battery electrode, including the observed U-shaped response, calibration, identifiability, or validation scope.

## Evidence and inputs

Primary local source: `zehner-closure.pdf` (draft manuscript). Portfolio summary: `_src/pages/post-calendering-u-shape.html`.

The manuscript's calibrated target is apparent through-plane coating conductivity derived from laser-flash analysis after current-collector subtraction. It reports four electrode families over 27 calendering states. The proposed closure adds a compression-indexed contact fraction to a Knudsen-corrected Zehner–Bauer–Schlünder base; the graphite-anode interpretation also considers bounded particle reorientation.

For a real fit or reproduction, obtain the original measurement table, exact preprocessing and current-collector correction, model implementation, parameter definitions, and pinned environment. Those are not present in this portfolio checkout.

## Procedure

1. Fix the target and its measurement protocol before fitting. Keep the LFA-derived apparent conductivity distinct from method-independent material properties.
2. Plot each electrode family against the recorded calendering state and porosity. Preserve the state identifiers and measurement uncertainty.
3. Compare the manuscript's staged closures: zero-fit ZBS reference, constant contact fraction, then compression-dependent contact fraction. For graphite, compare the bounded reorientation explanation with the contact-only account.
4. Report in-sample and held-out results separately. Keep leave-one-state-out validation distinct from cross-chemistry transfer and from external consistency checks.
5. Inspect parameter identifiability and uncertainty. Do not interpret partially confounded parameters as independently measured material properties.
6. State which physical mechanism the available measurements can identify. Conductivity alone leaves the graphite reorientation and contact-only accounts degenerate in the draft; same-sheet XRD texture is proposed as a discriminating measurement.

## Checks before reporting

- Verify the conductivity axis, units, target definition, and current-collector subtraction.
- Preserve per-family results as well as pooled summaries.
- Label the reported 4.5% MAPE as in-sample over the calibrated states. The draft separately reports 7.8% leave-one-state-out error.
- Do not present cell-level, fuel-cell, or dry-electrode comparisons as validation of the calibrated model; the manuscript describes them as external consistency checks or feasibility studies.
- Record the exact data, code revision, environment, and split before claiming a reproduction.

## Known failure modes and limits

- Porosity-only and static-contact closures are monotone and cannot represent the reported U-shape.
- Contact-network evolution is needed for the quasi-isotropic NMC cathode account; the graphite-anode account includes anisotropic platelet orientation.
- Four fitted parameters against six to eight states per family create identifiability limits; the draft reports partial confounding of the solid conductivity and initial contact fraction.
- The source checkout here has no raw measurements, fitting code, or locked environment. This note cannot itself execute or verify a fit.

## Available tools

No runnable scripts were present in the inspected portfolio. Do not substitute the illustrative curves in `blog.js` for fitted predictions or measured data.
