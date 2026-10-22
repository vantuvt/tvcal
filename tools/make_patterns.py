#!/usr/bin/env python3
"""Generate TV calibration pattern videos for the Cast wizard.

Patterns are built directly in limited-range BT.709 YCbCr code values
(16 = black, 235 = white) so that below-black and above-white levels
survive exactly. Output: 1920x1080 H.264 High profile MP4s that the
Chromecast Default Media Receiver can play, plus PNG previews and a
manifest of the regions used for verification.
"""
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 1920, 1080
FPS = 30
SECONDS = 60
OUT = sys.argv[1] if len(sys.argv) > 1 else "site/patterns"
WORK = sys.argv[2] if len(sys.argv) > 2 else "/tmp/patwork"
os.makedirs(OUT, exist_ok=True)
os.makedirs(WORK, exist_ok=True)

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def level(pct):
    """Video level for a percentage of white (0% = 16, 100% = 235)."""
    return 16 + 219 * pct / 100.0


class Canvas:
    """RGB canvas in limited-range code values (floats, may go outside 16-235)."""

    def __init__(self, bg):
        self.px = np.empty((H, W, 3), np.float64)
        self.px[:] = bg if np.ndim(bg) else (bg, bg, bg)
        self.checks = []  # (name, x0, y0, x1, y1, expected Y)

    def rect(self, x0, y0, x1, y1, val, check=None):
        v = val if np.ndim(val) else (val, val, val)
        self.px[y0:y1, x0:x1] = v
        if check:
            self.checks.append((check, x0, y0, x1, y1, ycbcr(np.array(v, float))[0]))

    def text(self, xy, s, size, val, anchor="mm", bold=False):
        mask = Image.new("L", (W, H), 0)
        d = ImageDraw.Draw(mask)
        d.text(xy, s, font=ImageFont.truetype(FONT_B if bold else FONT, size),
               fill=255, anchor=anchor)
        a = np.asarray(mask, np.float64)[..., None] / 255.0
        v = np.array(val if np.ndim(val) else (val, val, val), float)
        self.px = self.px * (1 - a) + v * a

    def line_mask(self, draw_fn, val):
        mask = Image.new("L", (W, H), 0)
        draw_fn(ImageDraw.Draw(mask))
        a = np.asarray(mask, np.float64)[..., None] / 255.0
        v = np.array(val if np.ndim(val) else (val, val, val), float)
        self.px = self.px * (1 - a) + v * a


def ycbcr(rgb):
    """Limited-range RGB code values -> limited-range BT.709 Y, Cb, Cr codes."""
    n = (rgb - 16.0) / 219.0
    r, g, b = n[..., 0], n[..., 1], n[..., 2]
    y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    cb = (b - y) / 1.8556
    cr = (r - y) / 1.5748
    return np.stack([16 + 219 * y, 128 + 224 * cb, 128 + 224 * cr], axis=-1)


def to_yuv420(c):
    ycc = ycbcr(c.px)
    Y = np.clip(np.rint(ycc[..., 0]), 1, 254).astype(np.uint8)
    # 2x2 average for chroma (left/top co-sited differences don't matter
    # for flat patches aligned to even pixels).
    cb = ycc[..., 1].reshape(H // 2, 2, W // 2, 2).mean(axis=(1, 3))
    cr = ycc[..., 2].reshape(H // 2, 2, W // 2, 2).mean(axis=(1, 3))
    U = np.clip(np.rint(cb), 1, 254).astype(np.uint8)
    V = np.clip(np.rint(cr), 1, 254).astype(np.uint8)
    return Y, U, V


def preview_png(c, path, scale=4):
    rgb = np.clip((c.px - 16) / 219 * 255, 0, 255)
    img = Image.fromarray(np.rint(rgb).astype(np.uint8), "RGB")
    img = img.resize((W // scale, H // scale), Image.LANCZOS)
    img.save(path, optimize=True)



# ---------------------------------------------------------------- patterns
# Every pattern function takes guide=False. guide=True renders the version
# shown on the phone: faint targets are exaggerated so people know where
# to look and what "right" looks like.

def brackets(c, x0, y0, x1, y1, val, off=24, ln=56, th=5):
    """Corner marks just outside a box, so the box location is always findable."""
    for (cx, cy, dx, dy) in ((x0 - off, y0 - off, 1, 1), (x1 + off, y0 - off, -1, 1),
                             (x0 - off, y1 + off, 1, -1), (x1 + off, y1 + off, -1, -1)):
        xa, xb = sorted((cx, cx + dx * ln)); ya, yb = sorted((cy, cy + dy * ln))
        c.rect(xa, cy - th // 2 if dy > 0 else cy - th // 2, xb, cy + th - th // 2, val)
        c.rect(cx - th // 2, ya, cx + th - th // 2, yb, val)


def p_fit(guide=False):
    c = Canvas(level(12))
    for x0, y0, x1, y1 in ((0, 0, W, 4), (0, H - 4, W, H), (0, 0, 4, H), (W - 4, 0, W, H)):
        c.rect(x0, y0, x1, y1, 235)
    def arrows(d):
        for (cx, cy, dx, dy) in ((6, 6, 1, 1), (W - 7, 6, -1, 1), (6, H - 7, 1, -1), (W - 7, H - 7, -1, -1)):
            d.line([(cx, cy), (cx + dx * 110, cy + dy * 110)], fill=255, width=8)
            d.polygon([(cx, cy), (cx + dx * 50, cy + dy * 10), (cx + dx * 10, cy + dy * 50)], fill=255)
    c.line_mask(arrows, 235)
    def circ(d):
        r = 330
        d.ellipse([W / 2 - r, H / 2 - r, W / 2 + r, H / 2 + r], outline=255, width=6)
    c.line_mask(circ, level(70))
    c.text((W / 2, H / 2), "FIT", 110, level(55), bold=True)
    return c


def p_black(guide=False):
    c = Canvas(16)
    A = (12 if not guide else 16)          # below black: should be invisible
    B = (20 if not guide else level(22))   # just above black: should be faintly visible
    # Each box sits inside a grey frame (with a black gap). On TVs with local
    # dimming, the frame keeps the backlight zones behind the box switched on,
    # like in a real dark scene, so box B isn't hidden by the backlight turning off.
    ring, gap, th = level(40), 40, 36
    for name, x0, val in (("A", 300, A), ("B", 1140, B)):
        x1, y0, y1 = x0 + 480, 220, 700
        fx0, fy0, fx1, fy1 = x0 - gap - th, y0 - gap - th, x1 + gap + th, y1 + gap + th
        c.rect(fx0, fy0, fx1, fy0 + th, ring); c.rect(fx0, fy1 - th, fx1, fy1, ring)
        c.rect(fx0, fy0, fx0 + th, fy1, ring); c.rect(fx1 - th, fy0, fx1, fy1, ring)
        c.rect(x0, y0, x1, y1, val, check=None if guide else f"black_{name}")
        c.text(((x0 + x1) / 2, 870), name, 110, level(45), bold=True)
    if not guide:
        c.checks.append(("black_gap", x0 - gap + 4, y0 + 40, x0 - 4, y1 - 40, 16.0))
    c.text((W / 2, 975), "BRIGHTNESS", 44, level(30), bold=True)
    if not guide:
        c.checks.append(("black_bg", 40, 40, 200, 200, 16.0))
    return c


CONTRAST = (("A", 216, level(70)), ("B", 224, level(80)), ("C", 231, level(89)))


def p_white(guide=False):
    c = Canvas(235)
    for i, (name, val, gval) in enumerate(CONTRAST):
        x0 = 210 + i * 540; x1 = x0 + 420; y0, y1 = 220, 700
        c.rect(x0, y0, x1, y1, gval if guide else val, check=None if guide else f"white_{name}")
        brackets(c, x0, y0, x1, y1, level(60))
        c.text(((x0 + x1) / 2, 820), name, 110, level(55), bold=True)
    c.text((W / 2, 975), "CONTRAST", 44, level(65), bold=True)
    if not guide:
        c.checks.append(("white_bg", 40, 40, 200, 200, 235.0))
    return c


def p_sharp(guide=False):
    c = Canvas(level(55))
    x0, y0, x1, y1 = 360, 180, 1560, 840
    for k in range(5):  # thick-ish black vertical and horizontal lines
        x = x0 + 80 + k * 110
        c.rect(x, y0, x + 4, y1, 16)
        y = y0 + 80 + k * 110
        c.rect(1000, y, x1, y + 4, 16)
    def shapes(d):
        d.ellipse([1040, 220, 1500, 680], outline=255, width=5)
    c.line_mask(shapes, 16)
    c.text((1270, 760), "Aa Bb Cc", 70, 16, bold=True)
    c.text((W / 2, 975), "SHARPNESS", 44, level(85), bold=True)
    return c


COLORS = [  # 75% bars, limited-range codes
    ("yellow", (level(75), level(75), 16)),
    ("cyan", (16, level(75), level(75))),
    ("green", (16, level(75), 16)),
    ("magenta", (level(75), 16, level(75))),
    ("red", (level(75), 16, 16)),
    ("blue", (16, 16, level(75))),
]


def p_final(guide=False):
    c = Canvas(16)
    n, sw = 10, 170
    x0 = (W - n * sw) // 2; x0 -= x0 % 2
    for i in range(n):
        v = round(level(10 + i * 10))
        c.rect(x0 + i * sw, 120, x0 + (i + 1) * sw, 520, v, check=None if guide else f"gray_{(i+1)*10}")
    ramp = np.linspace(16, 235, n * sw)
    c.px[580:700, x0:x0 + n * sw] = ramp[None, :, None]
    bw = n * sw // len(COLORS)
    for i, (name, rgb) in enumerate(COLORS):
        c.rect(x0 + i * bw, 760, x0 + (i + 1) * bw, 960, rgb, check=None if guide else f"color_{name}")
    c.text((W / 2, 1020), "FINAL CHECK", 36, level(45), bold=True)
    return c


def srgb8(r, g, b):
    """8-bit full-range RGB value -> limited-range code values."""
    return tuple(16 + 219 * v / 255.0 for v in (r, g, b))


# Natural reference colours (X-Rite ColorChecker published sRGB values).
NATURAL = [
    ("light skin", srgb8(194, 150, 130)),
    ("dark skin", srgb8(115, 82, 68)),
    ("foliage", srgb8(87, 108, 67)),
    ("blue sky", srgb8(98, 122, 157)),
]


def p_temp(guide=False):
    """Colour temperature: large white and grey areas (where a colour cast is
    easiest to see) plus skin tones and other natural colours."""
    c = Canvas(level(45))
    c.rect(120, 120, 900, 760, level(90), check=None if guide else "temp_white")
    for i, pct in enumerate((30, 60, 80)):
        c.rect(120 + i * 260, 800, 120 + (i + 1) * 260, 960, level(pct), check=None if guide else f"temp_grey_{pct}")
    for i, (name, rgb) in enumerate(NATURAL):
        x0, y0 = 1000 + (i % 2) * 400, 120 + (i // 2) * 420
        c.rect(x0, y0, x0 + 380, y0 + 400, rgb, check=None if guide else f"temp_{name.replace(' ', '_')}")
    c.text((W / 2 + 460, 1010), "COLOUR TEMPERATURE", 40, level(80), bold=True)
    return c


PATTERNS = [
    ("01-fit", "Fit to screen", p_fit),
    ("02-brightness", "Brightness", p_black),
    ("03-contrast", "Contrast", p_white),
    ("04-sharpness", "Sharpness", p_sharp),
    ("05-final", "Final check", p_final),
    ("06-temp", "Colour temperature", p_temp),
]



LOOPS = 5  # final video = 5 x 60 s = 5 minutes, so the Cast player doesn't go idle


def extend(path):
    """Repeat the encoded stream LOOPS times without re-encoding, so the
    longer file is bit-for-bit the same content as the verified 60 s one."""
    tmp = path + ".long.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-stream_loop", str(LOOPS - 1), "-i", path,
                    "-c", "copy", "-map", "0", "-movflags", "+faststart", tmp], check=True)
    os.replace(tmp, path)

def encode(name, Y, U, V):
    raw = os.path.join(WORK, f"{name}.yuv")
    with open(raw, "wb") as f:
        f.write(Y.tobytes()); f.write(U.tobytes()); f.write(V.tobytes())
    out = os.path.join(OUT, f"{name}.mp4")
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "yuv420p", "-s", f"{W}x{H}", "-framerate", str(FPS),
        "-stream_loop", "-1", "-i", raw,
        "-frames:v", str(FPS * SECONDS),
        "-c:v", "libx264", "-preset", "slow", "-tune", "stillimage",
        "-profile:v", "high", "-level:v", "4.1", "-pix_fmt", "yuv420p",
        "-crf", "4", "-x264-params", f"keyint={FPS*5}:min-keyint={FPS*5}:scenecut=0:deblock=-3,-3",
        "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
        "-movflags", "+faststart", "-an", out,
    ]
    subprocess.run(cmd, check=True)
    extend(out)
    return raw, out


ONLY = os.environ.get("ONLY")  # re-encode a single pattern, e.g. ONLY=06-temp
manifest = []
for name, title, fn in PATTERNS:
    if ONLY and ONLY != name:
        continue
    c = fn()
    Y, U, V = to_yuv420(c)
    raw, out = encode(name, Y, U, V)
    preview_png(fn(guide=True), os.path.join(OUT, f"{name}.png"), scale=3)
    manifest.append({"file": f"{name}.mp4", "title": title, "raw": raw,
                     "checks": [list(map(float, ch[1:])) + [ch[0]] for ch in c.checks]})
    print(name, os.path.getsize(out) // 1024, "KB")

# Sharpness example for the phone: the same crop, clean vs. over-sharpened.
from PIL import ImageFilter
sc = p_sharp()
rgb = np.rint(np.clip((sc.px - 16) / 219 * 255, 0, 255)).astype(np.uint8)
crop = Image.fromarray(rgb, "RGB").crop((420, 300, 700, 480))
halo = crop.filter(ImageFilter.UnsharpMask(radius=3, percent=300, threshold=0))
for nm, im in (("sharpness-clean", crop), ("sharpness-halo", halo)):
    im.resize((im.width * 2, im.height * 2), Image.NEAREST).save(os.path.join(OUT, nm + ".png"), optimize=True)

with open(os.path.join(WORK, "manifest.json"), "w") as f:
    json.dump(manifest, f, indent=1)
