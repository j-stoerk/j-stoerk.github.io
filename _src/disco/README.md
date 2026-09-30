# DisCo on the calendering model

This directory keeps the evidence behind the portfolio article's 30 September
2026 update.

## Executed run

- DisCo CLI: `@arex-skill/disco` 0.2.1.
- Provider/model: OpenRouter / `moonshotai/kimi-k2.6`.
- Source: https://github.com/j-stoerk/zehner-electrode-thermal
- Source HEAD: `425c77f178bb87cc58160af3f1d7d99288e0c5d3`.
- Scope: through-plane coating conductivity, contact/reorientation, inverse
  porosity, and the existing calibration routines.
- Execution: local CPU, existing Python environment; source code kept read-only.
  The checkout contains unrelated uncommitted documents; the source modules used
  by this run have no tracked modifications.
- `creator-run/`: DisCo-generated operating skill, references, cases, and reports.
- `researcher-run/`: a separate Researcher session's small parameter sweep using
  the generated skill and the repository APIs.

The first numerical Creator pass completed ten assertion groups. It reproduced
wet graphite/NMC conductivities of 2.559/0.970 W/(m K), an inverse round trip at
porosity 0.32, and the repository's baseline/calibrated average MAPEs of
31.1%/4.5%. A second pass checked contact and reorientation fits for thin graphite,
the c-axis limit, contact coefficients, and inverse-porosity uncertainty.

These are bounded API and calibration checks. They do not establish held-out
prediction accuracy, manufacturing-policy performance, or a measured improvement
from adding a skill. No full experiment-design or continual-learning run is
claimed.

The initial command runner selected an unavailable WSL shell. Resuming with the
existing Git Bash directory first on the process PATH enabled execution. This
was a process-local adjustment; credentials remain in DisCo's own local store.
Session transcripts are kept outside this repository.

The separate Researcher run completed a three-point dry-graphite sweep at
porosities 0.25, 0.35, and 0.45. Increasing contact fraction from 0 to 0.01 gave
conductivity ratios of 2.4833, 3.1674, and 4.0214. All three wet-graphite inverse
round trips met the 1e-8 tolerance. See `researcher-run/results.json` and the
portable `researcher-run/sweep.py`; rerun with
`python _src/disco/researcher-run/sweep.py --repo PATH_TO_SOURCE_CHECKOUT`.

The initial Researcher request was rejected by OpenRouter's credit reservation
check because DisCo requested over 230,000 output tokens. A temporary CLI
extension capped each request at 8,192 output tokens and the retry succeeded.
No account limits or global DisCo settings were changed.

The generated records were reviewed against the successful command output in
`creator-run/reports/console-output.txt`. The review corrected an incorrect date,
check-count labels, unsupported timing and installation claims, and absolute
machine paths. The package requires a source checkout and its dependencies.

## Earlier manually written notes

`skills/` contains the earlier hand-written candidate workflow notes from the
portfolio-only attempt. Those files are not DisCo-generated or execution-verified.
The actual run above supersedes the earlier environment-blocked status. The
continual-learning notes remain prospective.
