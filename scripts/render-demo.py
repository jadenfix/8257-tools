"""Encode sampled browser frames while preserving their recorded timing."""
import json
from pathlib import Path
import subprocess

root = Path("docs/demo/frames")
record = json.loads((root / "frames.json").read_text())
manifest = json.loads(Path("docs/demo/source-manifest.json").read_text())
if record["sourceSHA"] != manifest["source_sha"]:
    raise SystemExit("Frame source differs from the reviewed manifest")
if record["errors"] or record["blockedRemoteRequests"]:
    raise SystemExit("Capture has page errors or attempted external requests")
frames = record["frames"]
lines = []
for i, frame in enumerate(frames):
    duration = frames[i + 1]["at"] - frame["at"] if i + 1 < len(frames) else 1
    lines.extend([f"file '{frame['name']}'", f"duration {duration:.4f}"])
lines.append(f"file '{frames[-1]['name']}'")
(root / "concat.txt").write_text("\n".join(lines) + "\n")
subprocess.run(["ffmpeg", "-y", "-threads", "1", "-filter_threads", "1", "-f", "concat", "-safe", "0", "-i", str(root / "concat.txt"), "-vf", "scale=1280:-2,fps=10", "-c:v", "libx264", "-threads", "1", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "docs/demo/gateway.mp4"], check=True)
subprocess.run(["ffmpeg", "-y", "-threads", "1", "-filter_complex_threads", "1", "-i", "docs/demo/gateway.mp4", "-filter_complex", "fps=6,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=64:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4", "-loop", "0", "docs/demo/gateway.gif"], check=True)
