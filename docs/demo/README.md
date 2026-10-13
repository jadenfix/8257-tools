# 8257Kit browser walkthrough

[Watch the MP4](gateway.mp4) · [Looping GIF](gateway.gif)

Recorded from source `bf87991627645ed7ad6dbc35869ba0238777343d` (tree `910ea1965dc2cf2d83da87b86c3dd159e92197a3`). All 24 repository blobs were hash-verified before building. This additive media change does not change application source.

The 39-second walkthrough shows the actual rendered React frontend: explorer search, denied wallet explanation, passing fixture wallet, simulated gateway response, invalid HTTP endpoint validation, valid manifest staging, SDK examples and sample analytics.

**Scope:** local fixture playground. No provider requests, blockchain writes, signing, subscriptions or payments happen. Metrics, wallet balances and responses are samples. SDK examples are documentation, not tested live SDK calls. The registration payload is staged locally, not deployed. The capture blocked non-local requests and completed with zero page errors or blocked remote requests.

Verification: `npm ci`, `npm run lint`, `npm run test` (15 passed), `npm run build`, and the repository browser suite (16 passed across desktop Chrome and Pixel 5 emulation). Browser: npm-distributed headless Chromium 153.0.8010.0 with a local Playwright executable-path override. The normal Chromium download endpoint returned invalid ZIPs in this environment; the override changed browser infrastructure only. This verifies the frontend fixture workflow, not a production gateway.

Presentation: sampled browser screenshots retain their measured timestamps, then encode to silent 1280-pixel MP4 and 960-pixel GIF. A recording-only footer supplies chapter labels and fixture/source context; it is not part of the application. Screenshots from the explorer, debugger and dashboard were visually reviewed for legibility. No synthetic UI states were inserted.

To repeat after `npm run build`, start `npm run preview -- --host 127.0.0.1`, install Playwright Chromium and run `node scripts/capture-demo.mjs` in a second shell. For an existing browser use `CHROMIUM_PATH=/path/to/chromium node scripts/capture-demo.mjs`. The script writes screenshots and timestamps to `docs/demo/frames` (override with `DEMO_OUTPUT`). Keep frames outside commits; only publish the reviewed encodes and provenance. Regenerate for any application change rather than treating this recording as proof for a newer revision.

The capture script verifies 21 runtime/build input Git blob hashes from `source-manifest.json` before launching. `DEMO_VERIFY_ONLY=1 node scripts/capture-demo.mjs` checks provenance alone. A temporary change to `src/main.tsx` was correctly rejected and the canonical bytes restored. With FFmpeg installed, `python scripts/render-demo.py` encodes the sampled frames, rejecting mismatched provenance or browser errors.
