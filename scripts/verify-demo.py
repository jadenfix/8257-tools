"""Reject demo artifacts that differ from their reviewed recording manifest."""
import hashlib
import json
from pathlib import Path
import sys

directory = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("docs/demo")
manifest = json.loads((directory / "capture.json").read_text())
expected_files = {"gateway.gif", "gateway.mp4", "poster.png"}
if set(manifest["sha256"]) != expected_files:
    raise SystemExit("Demo manifest must identify GIF, MP4 and poster")
for name, expected in manifest["sha256"].items():
    actual = hashlib.sha256((directory / name).read_bytes()).hexdigest()
    if actual != expected:
        raise SystemExit(f"Demo checksum mismatch: {name}: {actual} != {expected}")
print("Verified GIF, MP4 and poster SHA256 against recording manifest")
