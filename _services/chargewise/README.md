---
title: ChargeWise AI
emoji: "\U0001F50C"
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
license: mit
---

# Original ChargeWise application

This container runs the **unchanged 25 October portable application**, including
its built React dashboard, FastAPI, OR-Tools, guided demo, editable inputs,
capacity checks, uploads and replanning. It is the application launched by
`uv run --locked python scripts/run_demo.py`, served on port 7860.

The Docker build downloads that release and checks its SHA-256 before extracting
it. No application file is patched. Locked dependencies are installed without
development packages. The original local-summary assistant is used; model calls
and paid inference are disabled. No GPU, model downloads, API keys, custom
domain or separate database are needed.

## Publish on Render Free

The repository's root `render.yaml` selects a single free Docker web service,
with a health check and no database or model service. Open:

https://render.com/deploy?repo=https://github.com/j-stoerk/j-stoerk.github.io

Sign in with GitHub, review the `chargewise` service with **Free** selected, and
deploy. After it is running, use its `https://...onrender.com` URL in the
connection command below.

Free services sleep after 15 minutes without traffic. A later visit wakes the
service, which can take about a minute. Original in-memory simulation state is
reset on restart. No keep-alive polling is added.

Documentation: https://render.com/docs/free

## Optional Hugging Face deployment

As of 26 October 2026, creating Docker Spaces requires a PRO subscription on
personal accounts. CPU Basic has no hourly charge but is not available to a
free account. The deployment API rejects creation with HTTP 402 on that plan.
Use this option only with an existing eligible subscription.

1. Create a **public Docker Space**, choose the **Blank** template and **CPU Basic**.
2. Upload `Dockerfile`, `fetch_release.py` and this `README.md` to its root.
3. When the build is running, open the direct app URL, such as
   `https://YOUR-ACCOUNT-chargewise.hf.space/?demo=1`.

CPU Basic Spaces can sleep when unused. Open the Space page to wake it. State is
kept in memory, as in the downloadable app, and resets when the process restarts.
Each browser receives a separate simulation workspace.

Documentation: https://huggingface.co/docs/hub/spaces-sdks-docker

## Connect the portfolio

Once the app is running, execute from the portfolio root:

```
python _services/chargewise/connect.py --url https://YOUR-ACCOUNT-chargewise.hf.space
```

The script verifies the original application's health, then replaces the current
portfolio demo with a direct redirect to the original app's guided demo and
removes the replacement browser planner. Hosting the whole app together preserves
its relative `/api` URLs and first-party workspace cookie. An iframe would make
that cookie third-party and can prevent workspace persistence.

The script does not deploy, commit or push. Review its changes, rebuild the site,
run `python _src/check.py`, then commit and push.

The same command accepts the Render service's HTTPS root URL.

Source and MIT licence:
https://github.com/j-stoerk/nebiusxnvidia_hackathon
