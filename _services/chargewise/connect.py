"""Connect /chargewise/ to a verified, hosted copy of the original application."""
from html import escape
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
import argparse
import json
import re

ROOT = Path(__file__).resolve().parents[2]


def connect(url):
    parts = urlsplit(url)
    if parts.scheme != "https" or not parts.hostname or parts.username or parts.password or parts.query or parts.fragment or parts.path not in ("", "/"):
        raise ValueError("Use the HTTPS root URL of the original application, without credentials or a query.")
    base = url.rstrip("/")
    with urlopen(Request(base + "/api/health", headers={"Accept": "application/json"}), timeout=30) as response:
        health = json.load(response)
    if health.get("application") != "chargewise" or health.get("scheduler") != "OR-Tools SCIP":
        raise ValueError("This endpoint is not the original ChargeWise OR-Tools application.")
    if health.get("agent", {}).get("mode") != "local_summary":
        raise ValueError("Use the key-free local-summary demo configuration for public hosting.")
    target = base + "/?demo=1"
    script_url = json.dumps(target).replace("<", "\\u003c")
    html_url = escape(target, quote=True)
    index = f'''<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ChargeWise AI</title>
<meta name="description" content="The original ChargeWise application with its guided demo, editable fleet dashboard and OR-Tools optimizer.">
<link rel="canonical" href="https://j-stoerk.github.io/chargewise/">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<script>location.replace({script_url});</script>
<meta http-equiv="refresh" content="0;url={html_url}">
</head><body><p><a href="{html_url}">Open the original ChargeWise application</a></p></body></html>
'''
    (ROOT / "chargewise/index.html").write_text(index, encoding="utf-8")
    for name in ("chargewise/demo.css", "chargewise/demo.mjs", "chargewise/planner.mjs", "_src/tests/chargewise.test.mjs"):
        (ROOT / name).unlink(missing_ok=True)
    post = ROOT / "_src/pages/post-chargewise.html"
    source = post.read_text(encoding="utf-8")
    source = re.sub(
        r'<p>The <a href="chargewise/">browser demo</a>.*?</p>',
        '<p>The <a href="chargewise/">live demo</a> runs the same application as the downloadable build: the editable React dashboard, OR-Tools planner, capacity checks and guided outage workflow. Start with <strong>Load sample</strong> and <strong>Start guided demo</strong>. It uses synthetic data and controls no physical chargers.</p>',
        source,
    )
    source = re.sub(
        r'<h2>Try the planner</h2>.*?(?=<details><summary>Run the full application locally</summary>)',
        '<h2>Try the planner</h2>\n'
        '        <p><a href="chargewise/">Open ChargeWise</a>, load the sample and start the guided demo. The original dashboard lets you edit vehicles, chargers, prices and tariffs, compare schedules, check capacity and replan around simulated outages. Already delivered energy stays frozen when replanning.</p>\n'
        '        <p>The hosted and downloadable versions use the same Python optimizer and independent schedule checks, including the battery taper envelope. The public demo uses the application\'s labelled local-summary assistant; it makes no paid model calls. The forecasting study above reports the separate historical-price evaluation.</p>\n'
        '        ',
        source, flags=re.S,
    )
    source = source.replace("an editable browser demo, fleet schedules", "the original hosted application, fleet schedules")
    post.write_text(source, encoding="utf-8")
    metadata = ROOT / "_src/posts.json"
    source = metadata.read_text(encoding="utf-8")
    source = source.replace("an editable browser demo, Nemotron tools", "the original hosted application, Nemotron tools")
    source = source.replace("An editable browser charging demo, four-van", "The original hosted application, four-van")
    metadata.write_text(source, encoding="utf-8")
    guide = ROOT / "_src/README.md"
    source = guide.read_text(encoding="utf-8")
    start, end = source.index("- `chargewise/` is"), source.index("- **Post titles**")
    source = source[:start] + (
        "- `chargewise/` opens the unchanged portable ChargeWise application on a\n"
        "  Python host, preserving its original dashboard, OR-Tools optimizer and\n"
        "  first-party simulation workspace. `_services/chargewise/` contains the\n"
        "  Docker deployment and SHA-256-verified release loader. Its `connect.py`\n"
        "  verifies a running original app before updating this entry point and\n"
        "  article text. The architecture film and local ZIP remain on Pages.\n"
    ) + source[end:]
    guide.write_text(source, encoding="utf-8")
    print("Connected /chargewise/ to the original application:", target)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", required=True)
    args = parser.parse_args()
    connect(args.url)
