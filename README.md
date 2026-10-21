# TV Picture Setup (Cast prototype)

A phone-guided TV picture setup. The phone asks one yes/no question at a time
("Can you see box A?"), gives one remote action ("Press Brightness down by 1"),
then asks again until the step is right. It casts a matching test-pattern video to a Chromecast / Google TV using Google's built-in
Default Media Receiver (no Cast app registration needed).

## Files
- `index.html` — the phone wizard (Cast sender). Self-contained.
- `patterns/*.mp4` — 1920x1080 H.264 High@4.1, 30 fps, 60 s, limited range, BT.709 tagged. Loop on the TV.
- `patterns/*.png` — "where to look" guides shown on the phone (faint boxes exaggerated), plus clean/halo sharpness examples.
- `tools/make_patterns.py` — regenerates the videos (Python 3, numpy, Pillow, ffmpeg).

TV patterns use big labelled boxes with corner marks instead of numbered bars:
brightness box A = 12 (below black, should vanish), B = 20 (should be faintly visible);
contrast boxes A/B/C = 216/224/231 (all should be visible).

Pattern levels are written directly as video code values (16 = black, 235 = white),
so the below-black box (12) survives instead of being clipped. Decoded test patches
were checked to match their intended values exactly.

## Hosting (GitHub Pages, ~5 minutes)
1. Create a public GitHub repo and upload everything in this folder.
2. Settings → Pages → Deploy from branch → `main` / root.
3. Open `https://<you>.github.io/<repo>/` in **Chrome on Android** (or desktop Chrome)
   on the same Wi-Fi as the Chromecast.

Casting requires HTTPS — it won't work from a local file. GitHub Pages serves MP4s
with CORS enabled, which the Cast receiver needs.

## Testing checklist
- Tap the Cast icon, pick the TV, then Start → Next. Each pattern step should load on the TV and loop.
- The player shows a title/progress overlay for a few seconds after loading; judge the pattern after it fades.
- Chromecast with Google TV / Google TV Streamer: set Dynamic range to match content, or the SDR patterns may be shown in HDR.
- iPhone: casting isn't possible from a web page; the steps and "View on this screen" still work.

## Known limits / next ideas
- SDR only. HDR10 versions (HEVC 10-bit PQ) would be a separate set and only some Cast devices play them.
- By-eye only; no camera measurement.
- A custom Cast receiver would remove the player overlay and allow instant pattern switching.
