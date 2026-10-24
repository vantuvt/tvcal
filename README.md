# tvcal: TV picture setup, by eye

A website about setting up a TV's picture, built around a phone-guided setup
tool. The site (home page, brand guides, troubleshooting
and explainers) is plain static HTML; the tool lives at `setup/`.

## The website
- `index.html`, `guides/`, `sources/`, `troubleshoot/`, `learn/`:
  generated pages. **Don't edit these by hand**; edit the sources and rebuild.
- `src/pages/*.html` — hand-written page bodies. Each starts with a JSON comment
  (`title`, `path`, `nav`, `description`); the build wraps it in the shared
  header and footer. Placeholders: `{{root}}` (relative path to the site root),
  `{{brandCards}}`, `{{blackNames}}`, `{{icon.*}}`.
- `guides/<brand>/` — generated from `BRANDS` and `STEPS` in `setup/index.html`,
  so the guides always use the same menu names as the tool. After changing the
  tool's wording, rebuild.
- `assets/site.css`, `assets/site.js` — the site pages' styles and small
  enhancements (device tabs, the brightness demo, "Your settings" fields). The
  site shares the tool's `tvcal2.values` storage, so written-down settings
  carry across.
- `assets/theme.js`, `assets/shared.css` — used by the site **and** the tool:
  the Appearance setting (Auto, Light, Dark, stored as `tvcal2.theme`), the
  header's Appearance button and pop-up, and the site header's styles. Load
  `theme.js` in `<head>` without `defer` so the saved choice applies before the
  page draws.
- `tools/build_site.mjs` — the build: `node tools/build_site.mjs` (Node 18+, no
  dependencies). Commit the output; GitHub Pages serves it without a build step.

The test patterns are only shown on the TV by the setup tool; the site has no
download page for them. (The files in `patterns/` are still publicly reachable,
since the TV has to fetch them.)

The brand guides link to `setup/?brand=<key>`, which opens the tool with that
brand already chosen.

# The setup tool


A phone-guided TV picture setup. The phone asks one yes/no question at a time
("Can you see box A?"), gives one remote action ("Press Brightness down by 1"),
then asks again until the step is right. It casts a matching test-pattern video to a Chromecast / Google TV using Google's built-in
Default Media Receiver (no Cast app registration needed).

## Layout
The phone shows one focused card at a time: a title, the "where to look" picture,
one question or one remote action, and one button to go on. Everything else
(what to look for, where the setting is on this brand, what to do if nothing
changes) is in a **Help** sheet that slides up from the bottom; after three
rounds of adjusting without success, a "Not changing? Get help" line opens it
on the right tab.

Steps are grouped into chapters, and the top row shows where you are
("Basics · 3 of 4"):
- **Setup**: TV brand, connect to the TV, get ready
- **Basics**: quick settings, fit to screen, brightness (black level), contrast
- **Fine-tune**: sharpness, colour temperature, final grey check
- **HDR** (optional): HDR checks and Dolby Vision
- **Devices and room** (optional): tips outside the picture menu

The home screen (hub) lists the chapters with their status (done, skipped, in
progress), continues where you left off, and holds the optional "write down your
settings" fields, with Copy. **Reset the tool** at the bottom of the hub
(after a confirmation) clears everything saved on the phone (progress, ticks,
brand, connection choice and written-down settings) but keeps Appearance;
the TV's own settings are never changed. The connection controls appear on
the connect screen and in a **Your TV** sheet; on a pattern step, a banner says
when the pattern isn't showing on the TV. The connection method is picked from
the browser (AirPlay in Safari, Cast elsewhere), with a link to switch.

The hub shows the site's header: navigation, plus the **Appearance** button at
the right (Auto, Light, Dark), as on every site page. Step screens leave the
header out to stay focused, but their top row keeps the same layout: the site's
logo on the left (linking to the site) and the same Appearance button on the
right. On narrow phones the progress label shows just the chapter name; the
segments show the count, which screen readers still hear. The header, the
Appearance button and its items are written into `setup/index.html` by
`tools/build_site.mjs` (between the `site-header`, `appearance-button` and
`appearance-items` markers), so edit them there, not in the tool.

There's a light and a dark theme, with the site's amber accent. All colours are
CSS tokens on `:root`, with the light values under `prefers-color-scheme: light`
and `[data-theme=light]`. `--accent` fills buttons; `--accent-text` is the
readable shade for text, icons and outlines (darker amber in light mode).

## Files
- `setup/index.html` — the phone wizard (Cast sender). Self-contained; loads patterns from `../patterns/`.
- `patterns/*.mp4` — 1920x1080 H.264 High@4.1, 30 fps, 5 min (a verified 60 s loop repeated without re-encoding), limited range, BT.709 tagged. Loop on the TV.
- `patterns/*.png` — "where to look" guides shown on the phone (faint boxes exaggerated), plus clean/halo sharpness examples.
- `patterns/h*.mp4` — optional HDR10 set: 1920x1080 HEVC Main10 (`hvc1`), PQ / BT.2020, HDR10 metadata
  (mastering display P3-D65, 1000 nits; MaxCLL 1000, MaxFALL 400). Greyscale only.
- `patterns/04-sharpness-4k.mp4` — native 3840x2160 sharpness pattern (HEVC Main, `hvc1`, BT.709 limited, 5 min). The phone tries it first and falls back to the 1080p file if the Cast device can't play it, remembering that device.
- `tools/make_4k_patterns.py` — regenerates the 4K sharpness pattern (ffmpeg with libx265).
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
comes after the SDR steps. Leaving it is always one tap: every HDR question has
"Skip the rest of HDR"; if the TV still doesn't switch to HDR after one retry,
the phone says so and offers to skip; and if the TV can't play an HDR pattern,
a banner offers Skip HDR. Skipped HDR shows as Skipped on the hub and can be
opened again from there.

Dolby Vision (optional, after HDR) is a guidance step with no pattern: Dolby Vision
tone maps itself, and DV test videos need Dolby's licensed encoder. The phone has
the user pause a Dolby Vision title, pick the Dark (or Filmmaker/Cinema) mode, turn
off extras, and lower black level only if blacks look grey. Samsung TVs don't
support Dolby Vision, so for Samsung the step just says so.

Pattern levels are written directly as video code values (16 = black, 235 = white),
so the below-black box (12) survives instead of being clipped. Decoded test patches
were checked to match their intended values exactly.

## Brand-specific instructions
The first setup screen asks for the TV brand; the model is optional and entered on the hub with the saved settings. The connect screen picks **Google Cast** or **AirPlay** from the browser, with a link to switch, and warns if the browser can't use it (for example Chromecast on an iPhone). The quick-settings Help follows the choice (Chromecast or Apple TV). `BRANDS` in `setup/index.html` holds per-brand
overrides for any part of a step (wording, checklist items, flow nodes, summary
labels); anything not overridden falls back to the generic text in `STEPS`.
Currently, in the order the picker shows them (alphabetical, with the generic
option last): **Hisense**, **LG**, **Samsung**, **Sony**, **TCL** and **Another brand**
(generic wording). TCL is written out in full; the other four are built with
`brandFrom()` from a short description of each brand's menus. Key differences:
the black-level control is Shadow Detail (Samsung 2022+), Screen Brightness (LG),
Black level (Sony), Black Level (TCL) or Brightness (Hisense with a separate
Backlight). Where a name couldn't be confirmed, the wording stays general.
Only add a brand once its menu names are checked against the manufacturer's docs.

## Hosting (GitHub Pages, ~5 minutes)
1. Create a public GitHub repo and upload everything in this folder (live copy: github.com/vantuvt/tvcal).
2. Settings → Pages → Deploy from branch → `main` / root.
3. Open `https://<you>.github.io/<repo>/setup/` in **Chrome on Android** (or desktop Chrome)
   on the same Wi-Fi as the Chromecast.

Casting requires HTTPS — it won't work from a local file. GitHub Pages serves MP4s
with CORS enabled, which the Cast receiver needs.

## AirPlay (iPhone, iPad, Mac Safari)
Safari can't use Google Cast, so when the page runs in Safari it hides the Cast
controls and shows **AirPlay to TV** instead. A small preview `<video>` is sent
to the AirPlay receiver with `webkitShowPlaybackTargetPicker()`, and each step
swaps its source; the page stays usable on the phone. It works with Apple TV and
TVs with AirPlay 2 built in (including some Google TV models), but not with a
separate Chromecast. Every pattern video carries a **silent audio track** and the
AirPlay video plays **unmuted**: iOS only routes real, audible media to an AirPlay
TV, so a muted or audio-less video connects but never shows on the TV. Unmuted
playback has to start from a tap, so `play()` is always called from a button
handler (AirPlay to TV, Next, Back). The generators add the track via
`tools/silent_audio.py`; the picture streams are copied unchanged. Over AirPlay the
1080p files are always used (no 4K sharpness file). HDR patterns need an Apple TV
4K or a TV that plays HEVC HDR10; if playback fails, the phone says so.

## Local network permission (Chrome 142+)
Chrome now asks, per site, before a page can find devices on the home network.
Without it, Cast discovery finds nothing ("no devices"), even though YouTube and
Chrome's own Cast menu still work. On first visit the page shows
**Let this page find my TV**; tapping it makes a request to a private address with
`targetAddressSpace: 'local'`, which triggers Chrome's permission prompt. After
Allow, the page reloads and the TV appears. If the site was blocked earlier, the
page explains how to re-enable it in Site settings → Local network access.

## Testing checklist
- Tap Start, pick the brand, then on the connect screen tap "Let this page find my TV" (first visit) and Allow, then "Connect to TV" and pick the TV. Continue through the chapters; each pattern step should load on the TV and loop.
- The player shows a title/progress overlay for a few seconds after loading; judge the pattern after it fades.
- Chromecast with Google TV / Google TV Streamer: set Dynamic range to match content, or the SDR patterns may be shown in HDR.
- iPhone/iPad (Safari): tap "AirPlay to TV", pick an Apple TV or AirPlay 2 TV, then continue. Each pattern should switch on the TV without reconnecting. Screens without a pattern (Quick settings, the HDR question, the hub between chapters) show the idle screen `patterns/00-idle.mp4` ("Follow the steps on your phone", made by `tools/make_idle.py`), which keeps the AirPlay connection without leaving a pattern frozen on the TV. With no pattern left (Dolby Vision onward, or the hub once every pattern chapter is done or skipped) the video is unloaded so the TV is released. Leaving or closing the page releases it too. Going Back to a pattern step plays it again (or asks to tap AirPlay to TV if the connection ended).
- Apple TV: turn on Match Content → Match Dynamic Range, or the SDR patterns may be shown in HDR.

## Known limits / next ideas
- HDR10 only (no Dolby Vision). Needs a Cast device that plays HEVC HDR10; if it can't, the phone shows a playback error.
- HDR and most SDR patterns are 1080p. That's fine for flat-field patterns (scaling doesn't change a flat level); only sharpness has a native 4K version, since a TV's upscaler adds its own edge enhancement.
- By-eye only; no camera measurement.
- A custom Cast receiver would remove the player overlay and allow instant pattern switching.
