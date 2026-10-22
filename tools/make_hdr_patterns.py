#!/usr/bin/env python3
"""Generate HDR10 calibration pattern videos for the Cast wizard.

Greyscale-only patterns written directly as 10-bit limited-range PQ code
values (64 = 0 nits, 940 = 10,000 nits), BT.2020 non-constant luminance.
Output: 1920x1080 HEVC Main10 MP4 ('hvc1'), with HDR10 static metadata
(mastering display P3-D65 1000 nits, MaxCLL 1000 / MaxFALL 400), plus PNG
"where to look" guides for the phone.

Usage: make_hdr_patterns.py OUT_DIR WORK_DIR
"""
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 1920, 1080
FPS, SECONDS = 30, 60
OUT = sys.argv[1] if len(sys.argv) > 1 else "patterns"
WORK = sys.argv[2] if len(sys.argv) > 2 else "/tmp/hdrwork"
os.makedirs(OUT, exist_ok=True)
os.makedirs(WORK, exist_ok=True)
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

# SMPTE ST 2084 (PQ)
M1, M2 = 2610 / 16384, 2523 / 4096 * 128
C1, C2, C3 = 3424 / 4096, 2413 / 4096 * 32, 2392 / 4096 * 32


def pq(nits):
    y = np.clip(np.asarray(nits, float) / 10000.0, 0, 1)
    yp = y ** M1
    return ((C1 + C2 * yp) / (1 + C3 * yp)) ** M2


def code(nits):
    """10-bit limited-range code value for a luminance in nits."""
    return int(round(64 + 876 * float(pq(nits))))


def nits_of(cv):
    e = (cv - 64) / 876
    ep = max(e, 0) ** (1 / M2)
    return 10000 * (max(ep - C1, 0) / (C2 - C3 * ep)) ** (1 / M1)


LABEL = code(60)      # label text, comfortably visible but not glaring
FRAME = code(15)      # dim frame that keeps local-dimming zones lit


class Canvas:
    def __init__(self, bg):
        self.y = np.full((H, W), float(bg))
        self.checks = []

    def rect(self, x0, y0, x1, y1, v, check=None):
        self.y[y0:y1, x0:x1] = v
        if check:
            self.checks.append([x0, y0, x1, y1, float(v), check])

    def frame(self, x0, y0, x1, y1, v, gap=40, th=36):
        fx0, fy0, fx1, fy1 = x0 - gap - th, y0 - gap - th, x1 + gap + th, y1 + gap + th
        self.rect(fx0, fy0, fx1, fy0 + th, v); self.rect(fx0, fy1 - th, fx1, fy1, v)
        self.rect(fx0, fy0, fx0 + th, fy1, v); self.rect(fx1 - th, fy0, fx1, fy1, v)

    def text(self, xy, s, size, v):
        m = Image.new("L", (W, H), 0)
        ImageDraw.Draw(m).text(xy, s, font=ImageFont.truetype(FONT_B, size), fill=255, anchor="mm")
        a = np.asarray(m, float) / 255.0
        self.y = self.y * (1 - a) + v * a


# ------------------------------------------------------------- patterns
# guide=True renders the phone version (shown as SDR): faint targets are
# exaggerated so people know where to look.

BLACK_A_CV = 56                      # below black (code < 64): should vanish
BLACK_B_CV = 80                      # just above black: should be faintly visible


def h_black(guide=False):
    c = Canvas(64)
    for name, x0, cv in (("A", 300, BLACK_A_CV), ("B", 1140, BLACK_B_CV)):
        x1, y0, y1 = x0 + 480, 220, 700
        c.frame(x0, y0, x1, y1, FRAME)
        v = cv if not guide else (64 if name == "A" else code(3))
        c.rect(x0, y0, x1, y1, v, check=None if guide else f"hdr_black_{name}")
        c.text(((x0 + x1) / 2, 870), name, 110, LABEL)
    c.text((W / 2, 975), "HDR BRIGHTNESS", 44, code(20))
    if not guide:
        c.checks.append([40, 40, 200, 200, 64.0, "hdr_black_bg"])
    return c


HIGHLIGHTS = (("A", 400), ("B", 600), ("C", 800), ("D", 1000))


def h_highlights(guide=False):
    c = Canvas(code(100))
    bw, gap = 330, 90
    x = (W - (4 * bw + 3 * gap)) // 2
    x -= x % 2
    for i, (name, n) in enumerate(HIGHLIGHTS):
        x0 = x + i * (bw + gap)
        v = code(n) if not guide else code([150, 250, 400, 600][i])
        c.rect(x0, 200, x0 + bw, 720, v, check=None if guide else f"hdr_hi_{name}")
        c.text((x0 + bw / 2, 830), name, 110, code(15))
    c.text((W / 2, 975), "HDR HIGHLIGHTS", 44, code(15))
    if not guide:
        c.checks.append([40, 40, 200, 200, float(code(100)), "hdr_hi_bg"])
    return c


STEPS_NITS = (0.05, 0.5, 2, 5, 10, 25, 50, 100, 200, 400, 600, 1000)


def h_steps(guide=False):
    c = Canvas(64)
    n, sw = len(STEPS_NITS), 150
    x0 = (W - n * sw) // 2
    x0 -= x0 % 2
    for i, nt in enumerate(STEPS_NITS):
        c.rect(x0 + i * sw, 200, x0 + (i + 1) * sw, 760, code(nt), check=None if guide else f"hdr_step_{nt}")
    c.text((W / 2, 900), "HDR FINAL CHECK", 44, code(30))
    return c


PATTERNS = [
    ("h1-black", "HDR brightness", h_black),
    ("h2-highlights", "HDR highlights", h_highlights),
    ("h3-steps", "HDR final check", h_steps),
]


def to_planes(c):
    Y = np.clip(np.rint(c.y), 4, 1019).astype("<u2")
    U = np.full((H // 2, W // 2), 512, "<u2")
    return Y, U, U.copy()


def guide_png(c, path, scale=3):
    # Rough SDR rendering for the phone: show PQ code values as-is (darker
    # but readable), then exaggerate nothing further.
    g = np.clip((c.y - 64) / (code(1000) - 64), 0, 1) ** 0.8 * 255
    img = Image.fromarray(np.rint(g).astype(np.uint8), "L").convert("RGB")
    img.resize((W // scale, H // scale), Image.LANCZOS).save(path, optimize=True)


X265 = ("hdr10=1:hdr10-opt=1:repeat-headers=1:colorprim=bt2020:transfer=smpte2084:"
        "colormatrix=bt2020nc:range=limited:"
        "master-display=G(13250,34500)B(7500,3000)R(34000,16000)WP(15635,16450)L(10000000,1):"
        "max-cll=1000,400:keyint=150:min-keyint=150:scenecut=0:qp=4:ipratio=1:pbratio=1:bframes=0:aq-mode=0:"
        "deblock=-3,-3:sao=0")



LOOPS = 5  # final video = 5 x 60 s = 5 minutes, so the Cast player doesn't go idle


def extend(path):
    """Repeat the encoded stream LOOPS times without re-encoding, so the
    longer file is bit-for-bit the same content as the verified 60 s one."""
    tmp = path + ".long.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-stream_loop", str(LOOPS - 1), "-i", path,
                    "-c", "copy", "-map", "0", "-movflags", "+faststart", tmp], check=True)
    os.replace(tmp, path)

def encode(name, Y, U, V):
    raw = os.path.join(WORK, name + ".yuv")
    with open(raw, "wb") as f:
        f.write(Y.tobytes()); f.write(U.tobytes()); f.write(V.tobytes())
    out = os.path.join(OUT, name + ".mp4")
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "yuv420p10le", "-s", f"{W}x{H}", "-framerate", str(FPS),
        "-stream_loop", "-1", "-i", raw, "-frames:v", str(FPS * SECONDS),
        "-c:v", "libx265", "-preset", "medium", "-profile:v", "main10", "-pix_fmt", "yuv420p10le",
        "-x265-params", X265, "-tag:v", "hvc1",
        "-color_range", "tv", "-colorspace", "bt2020nc", "-color_primaries", "bt2020",
        "-color_trc", "smpte2084", "-movflags", "+faststart", "-an", out], check=True)
    extend(out)
    return raw, out


if __name__ == "__main__":
    only = os.environ.get("ONLY")
    manifest = []
    for name, title, fn in PATTERNS:
        if only and only != name:
            continue
        c = fn()
        raw, out = encode(name, *to_planes(c))
        guide_png(fn(guide=True), os.path.join(OUT, name + ".png"))
        manifest.append({"file": name + ".mp4", "raw": raw, "checks": c.checks})
        print(name, os.path.getsize(out) // 1024, "KB")
    json.dump(manifest, open(os.path.join(WORK, "manifest-" + (only or "all") + ".json"), "w"), indent=1)
    print("black B =", BLACK_B_CV, f"({nits_of(BLACK_B_CV):.4f} nits)",
          "| highlight codes:", [code(n) for _, n in HIGHLIGHTS], "| bg", code(100))
