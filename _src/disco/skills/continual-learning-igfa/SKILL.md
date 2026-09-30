---
name: continual-learning-igfa
description: Plan and interpret continual-learning experiments on task interference, retention, and the IGFA controller described in the portfolio.
---

# Continual learning and IGFA

## Use this when

The task concerns sequential-task forgetting, interference geometry, replay-free retention, Interference-Gated Functional Allocation (IGFA), or task-aware model merging.

## Evidence and assumptions

Primary local source: `forgetting-geometry.pdf` (draft manuscript). Portfolio summary: `_src/pages/post-geometry-of-forgetting.html`.

In the frozen-feature or linear-on-features regime, the draft defines the loss increase on an earlier task as the interference energy `F(Δ) = 1/2 ΔᵀΣ_AΔ`. This identity is exact under that regime. For end-to-end training with feature drift it is an approximation, not a general theorem. IGFA shares updates when they align with useful prior task directions and projects conflicting components away from a protected subspace. Projection can reduce plasticity; accumulated protected rank creates a capacity limit.

The local PDF and post provide method descriptions and aggregate benchmark reports. This checkout does not contain the experiment implementation, exact benchmark fixtures, or per-seed output files required to rerun them.

## Procedure for a reproduction

1. State the feature regime and task stream. Record the feature extractor, task order, class/rotation mapping, and whether the backbone is frozen.
2. Reproduce the draft's benchmark and baselines from the manuscript. Keep replay-based methods distinct from replay-free methods and disclose any stored data or task-boundary information.
3. Run the specified seeds and retain each seed's metrics and configuration. Aggregate only after checking the per-task values and task order.
4. Report average accuracy and forgetting together. Include uncertainty and the baseline resource costs, such as replay-buffer storage.
5. If testing the gate, record the alignment statistic, threshold, projected component, retained update norm, and whether the example is a schematic or a measured experiment.
6. Test separable and overlapping task supports separately. Report capacity saturation and any accuracy lost to projection; low forgetting alone is not a success criterion.
7. Interpret the quadratic identity as exact only for frozen features. Describe deep-network extensions as approximations and quantify feature drift if the experiment supports it.

## Checks before reporting

- The interactive widget in `blog.js` uses a two-dimensional illustrative covariance (`diag(1.00, 0.05)`) and threshold `τ = 0.40`; its curves are not fitted benchmark outputs.
- Keep the widget's schematic values separate from benchmark measurements.
- The post reports Rotated-Digits results as mean over five seeds and gives IGFA accuracy `0.771 ± 0.030` and forgetting `0.002 ± 0.027`; replay is reported at `0.795 ± 0.012` with a stored buffer. Attribute these to the draft until independently rerun.
- Do not infer that a hard gate is harmless beyond the tested sequence. Its threshold creates a discontinuity and protected subspaces consume capacity.
- Preserve source revision, config, task sequence, random seeds, and raw metrics for an auditable reproduction.

## Known failure modes and limits

- Forgetting is not generally equal to a fixed quadratic form when the feature representation moves substantially.
- Unconditional projection may discard transfer that would have been useful.
- Repeated protection can shrink the available update subspace toward zero.
- A hard alignment threshold can make behavior discontinuous near the boundary.
- No code, fixtures, or per-seed metrics were present in this portfolio checkout; these instructions are a reproduction plan, not evidence that the results were independently reproduced.

## Available tools

No runnable experiment scripts were present in the inspected portfolio. The portfolio JavaScript only renders a schematic widget and must not be used as a benchmark implementation.
