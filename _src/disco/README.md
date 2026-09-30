# DisCo-style dry run: Julius Störk portfolio

**Status:** Offline Creator-style dry run, not a DisCo CLI output. The installed CLI was unavailable and `npm exec --package=@arex-skill/disco` could not reach the npm registry (`ENOTCACHED`). No model-provider key was configured in this shell.

**Scope:** Two task-agnostic anchors from the portfolio: the calendering U-shape work and the interference/retention work. The GLEE post was inspected but left out of this first pass because it is a separate domain and would require its own reproducibility evidence.

**Evidence inspected:**

- `../pages/post-calendering-u-shape.html`
- `../../zehner-closure.pdf`
- `../pages/post-geometry-of-forgetting.html`
- `../../forgetting-geometry.pdf`
- `../../blog.js` (illustrative interactive widgets only)

**Candidate graph:** `research-router` points to the two domain skills in `skills/`. These are evidence-grounded workflow notes, not verified executable skills. The portfolio contains no experiment repository, raw data, environment lockfile, or runnable fit/training scripts for these two projects. Accordingly, there are no scripts to wrap and no native experiment checks to claim. A genuine DisCo Creator run should regenerate and verify these candidates once the CLI, provider, and source repositories are available.

**Unresolved gaps:**

1. The calendering PDF reports the analysis and results, but the portfolio checkout does not contain the source dataset or implementation needed to rerun the fit.
2. The continual-learning draft and post report benchmark results, but the portfolio checkout does not contain the benchmark implementation or per-seed outputs needed to reproduce them.
3. No generated scripts have been executed; no independent reproduction is implied.
