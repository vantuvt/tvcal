# TV Picture Setup (Cast prototype)

A phone-guided TV picture setup. The phone asks one yes/no question at a time
("Can you see box A?"), gives one remote action ("Press Brightness down by 1"),
then asks again until the step is right. It casts a matching test-pattern video to a Chromecast / Google TV using Google's built-in
Default Media Receiver (no Cast app registration needed).

## Files
- `index.html` — the phone wizard (Cast sender). Self-contained.
- `patterns/*.mp4` — 1920x1080 H.264 High@4.1, 30 fps, 5 min (a verified 60 s loop repeated without re-encoding), limited range, BT.709 tagged. Loop on the TV.
- `patterns/*.png` — "where to look" guides shown on the phone (faint boxes exaggerated), plus clean/halo sharpness examples.
- `patterns/h*.mp4` — optional HDR10 set: 1920x1080 HEVC Main10 (`hvc1`), PQ / BT.2020, HDR10 metadata
  (mastering display P3-D65, 1000 nits; MaxCLL 1000, MaxFALL 400). Greyscale only.
- `tools/make_patterns.py` — regenerates the SDR videos (Python 3, numpy, Pillow, ffmpeg). `ONLY=<name>` re-encodes one pattern.
- `tools/make_hdr_patterns.py` — regenerates the HDR videos (needs ffmpeg with libx265). `ONLY=<name>` re-encodes one pattern.

TV patterns use big labelled boxes with corner marks instead of numbered bars:
brightness box A = 12 (below black, should vanish), B = 20 (should be faintly visible);
contrast boxes A/B/C = 216/224/231 (all should be visible).
Colour temperature pattern (06-temp): large white and 30/60/80% grey areas plus
ColorChecker skin, foliage and sky colours, shown while switching Warm options.
Brightness boxes sit inside 40% grey frames so local-dimming LCDs keep the backlight
on behind them, as in a real dark scene; the phone explains what to do if local
dimming still hides box B.

HDR set (10-bit PQ code values): black A = 56 (below black), B = 80 (≈0.007 nits);
highlights A–D = 400/600/800/1000 nits on a 100-nit background (tests tone mapping);
final check = 12 grey steps from 0.05 to 1000 nits. The HDR pass is optional and
comes after the SDR steps.

Pattern levels are written directly as video code values (16 = black, 235 = white),
so the below-black box (12) survives instead of being clipped. Decoded test patches
were checked to match their intended values exactly.

## Brand-specific instructions
The start screen asks for the TV brand. `BRANDS` in `index.html` holds per-brand
overrides for any part of a step (wording, checklist items, flow nodes, summary
labels); anything not overridden falls back to the generic text in `STEPS`.
Currently: **Samsung**, **LG**, **Sony**, **TCL**, **Hisense** and **Another brand**
(generic wording). TCL is written out in full; the other four are built with
`brandFrom()` from a short description of each brand's menus. Key differences:
the black-level control is Shadow Detail (Samsung 2022+), Screen Brightness (LG),
Black level (Sony), Black Level (TCL) or Brightness (Hisense with a separate
Backlight). Where a name couldn't be confirmed, the wording stays general.
Only add a brand once its menu names are checked against the manufacturer's docs.

## Hosting (GitHub Pages, ~5 minutes)
1. Create a public GitHub repo and upload everything in this folder (live copy: github.com/vantuvt/tvcal).
2. Settings → Pages → Deploy from branch → `main` / root.
3. Open `https://<you>.github.io/<repo>/` in **Chrome on Android** (or desktop Chrome)
   on the same Wi-Fi as the Chromecast.

Casting requires HTTPS — it won't work from a local file. GitHub Pages serves MP4s
with CORS enabled, which the Cast receiver needs.

## Local network permission (Chrome 142+)
Chrome now asks, per site, before a page can find devices on the home network.
Without it, Cast discovery finds nothing ("no devices"), even though YouTube and
Chrome's own Cast menu still work. On first visit the page shows
**Let this page find my TV**; tapping it makes a request to a private address with
`targetAddressSpace: 'local'`, which triggers Chrome's permission prompt. After
Allow, the page reloads and the TV appears. If the site was blocked earlier, the
page explains how to re-enable it in Site settings → Local network access.

## Testing checklist
- Tap "Let this page find my TV" (first visit) and Allow, then "Connect to TV", pick the TV, then Start → Next. Each pattern step should load on the TV and loop.
- The player shows a title/progress overlay for a few seconds after loading; judge the pattern after it fades.
- Chromecast with Google TV / Google TV Streamer: set Dynamic range to match content, or the SDR patterns may be shown in HDR.
- iPhone: casting isn't possible from a web page; the steps and "View on this screen" still work.

## Known limits / next ideas
- HDR10 only (no Dolby Vision). Needs a Cast device that plays HEVC HDR10; if it can't, the phone shows a playback error.
- HDR patterns are 1080p; some devices only switch into HDR for 4K output.
- By-eye only; no camera measurement.
- A custom Cast receiver would remove the player overlay and allow instant pattern switching.
