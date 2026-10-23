#!/usr/bin/env python3
"""Native 4K (3840x2160) version of the sharpness pattern.

On a 4K TV a 1080p pattern is upscaled, and the TV's scaler adds its own edge
enhancement, which can look like sharpening halos. This pattern is drawn at the
panel's own resolution so the halos people see come from the Sharpness setting.

Greyscale only: written directly as limited-range BT.709 luma (16 = black,
235 = white) with neutral chroma. Encoded as HEVC Main ('hvc1'), the format 4K
Cast devices reliably play; the phone page falls back to the 1080p H.264
version if a device can't play it.

Usage: make_4k_patterns.py OUT_DIR WORK_DIR
"""
import os
import subprocess
from silent_audio import add_silent_audio
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 3840, 2160
FPS, SECONDS, LOOPS = 30, 60, 5          # 60 s encoded, repeated to 5 minutes
OUT = sys.argv[1] if len(sys.argv) > 1 else "patterns"
WORK = sys.argv[2] if len(sys.argv) > 2 else "/tmp/patwork4k"
os.makedirs(OUT, exist_ok=True)
os.makedirs(WORK, exist_ok=True)
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def level(pct):
    return 16 + 219 * pct / 100.0


def sharp4k():
    """Same layout as the 1080p sharpness pattern, at twice the size, with
    lines drawn at native-pixel thickness."""
    y = np.full((H, W), level(55))
    checks = [(80, 80, 400, 400, level(55), "bg")]
    x0, y0, x1, y1 = 720, 360, 3120, 1680
    lw = 4                                            # 4 px at 4K = 2 px at 1080p
    for k in range(5):
        x = x0 + 160 + k * 220
        y[y0:y1, x:x + lw] = 16
        yy = y0 + 160 + k * 220
        y[yy:yy + lw, 2000:x1] = 16
    m = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(m)
    d.ellipse([2080, 440, 3000, 1360], outline=255, width=6)
    d.text((2540, 1520), "Aa Bb Cc", font=ImageFont.truetype(FONT_B, 140), fill=255, anchor="mm")
    a = np.asarray(m, float) / 255.0
    y = y * (1 - a) + 16 * a
    m2 = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m2).text((W / 2, 1950), "SHARPNESS  4K", font=ImageFont.truetype(FONT_B, 88), fill=255, anchor="mm")
    a2 = np.asarray(m2, float) / 255.0
    y = y * (1 - a2) + level(85) * a2
    return np.clip(np.rint(y), 1, 254).astype(np.uint8), checks


X265 = ("colorprim=bt709:transfer=bt709:colormatrix=bt709:range=limited:repeat-headers=1:"
        "keyint=150:min-keyint=150:scenecut=0:qp=4:ipratio=1:pbratio=1:bframes=0:aq-mode=0:"
        "deblock=-3,-3:sao=0")


def encode(name, Y):
    raw = os.path.join(WORK, name + ".yuv")
    uv = np.full((H // 2, W // 2), 128, np.uint8)
    with open(raw, "wb") as f:
        f.write(Y.tobytes()); f.write(uv.tobytes()); f.write(uv.tobytes())
    out = os.path.join(OUT, name + ".mp4")
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "yuv420p", "-s", f"{W}x{H}", "-framerate", str(FPS),
        "-stream_loop", "-1", "-i", raw, "-frames:v", str(FPS * SECONDS),
        "-c:v", "libx265", "-preset", "medium", "-profile:v", "main", "-pix_fmt", "yuv420p",
        "-x265-params", X265, "-tag:v", "hvc1",
        "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
        "-movflags", "+faststart", "-an", out], check=True)
    tmp = out + ".long.mp4"   # repeat without re-encoding, like the other patterns
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-stream_loop", str(LOOPS - 1), "-i", out,
                    "-c", "copy", "-map", "0", "-movflags", "+faststart", tmp], check=True)
    os.replace(tmp, out)
    add_silent_audio(out)   # needed for AirPlay from iPhone/iPad
    return raw, out


if __name__ == "__main__":
    Y, checks = sharp4k()
    raw, out = encode("04-sharpness-4k", Y)
    with open(os.path.join(WORK, "checks.txt"), "w") as f:
        for c in checks:
            f.write(" ".join(map(str, c)) + "\n")
    print(out, os.path.getsize(out) // 1024, "KB")
