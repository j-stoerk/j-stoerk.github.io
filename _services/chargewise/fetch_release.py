"""Extract the exact public portable build, verifying its content hash."""
from hashlib import sha256
from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen
from zipfile import ZipFile
import sys

RELEASE = "https://github.com/j-stoerk/nebiusxnvidia_hackathon/releases/download/submission-review-2026-10-25/ChargeWise_Test_Build.zip"
SHA256 = "f77766ce756f11e0ae2e4f3edb35266003296f273a1288263e9ce08b5aa6f0aa"


def extract(target, payload):
    if sha256(payload).hexdigest() != SHA256:
        raise ValueError("The portable build differs from the verified 25 October release.")
    target = Path(target).resolve()
    target.mkdir(parents=True, exist_ok=True)
    with ZipFile(BytesIO(payload)) as archive:
        for entry in archive.infolist():
            if not (target / entry.filename).resolve().is_relative_to(target):
                raise ValueError("Archive path escapes the application directory.")
        archive.extractall(target)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python fetch_release.py TARGET")
    request = Request(RELEASE, headers={"User-Agent": "ChargeWise-original-app"})
    with urlopen(request, timeout=60) as response:
        payload = response.read(2 * 1024 * 1024 + 1)
    if len(payload) > 2 * 1024 * 1024:
        raise ValueError("Unexpectedly large portable release.")
    extract(sys.argv[1], payload)
    print("Verified and extracted the original ChargeWise portable application.")
