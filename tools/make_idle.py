#!/usr/bin/env python3
"""Make patterns/00-idle.mp4: the screen shown over AirPlay on steps without
a test pattern (Quick settings, the HDR question, ...).

Over AirPlay the video can't simply stop between patterns: unloading it can
end the connection. Pausing kept the last pattern frozen on the TV, which
looked like the step wasn't finished. This plain dark screen keeps the
connection alive and tells the viewer to carry on with the phone.

Output: 1920x1080 H.264 High (same settings as the other SDR patterns),
5 minutes, with a silent audio track (needed for AirPlay; see silent_audio.py).
Usage: python3 tools/make_idle.py
"""
import os
import subprocess

from PIL import Image, ImageDraw, ImageFont

from silent_audio import add_silent_audio

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "patterns")
W, H, FPS, SECONDS = 1920, 1080, 30, 300
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def frame(path):
    img = Image.new("RGB", (W, H), (17, 17, 19))   # same dark grey as the page
    d = ImageDraw.Draw(img)
    title = ImageFont.truetype(FONT_B, 72)
    body = ImageFont.truetype(FONT, 44)
    lines = [("TV Picture Setup", title, (236, 236, 241)),
             ("Connected. Follow the steps on your phone.", body, (154, 154, 166)),
             ("The next test pattern will appear here.", body, (154, 154, 166))]
    gaps = [0, 56, 18]
    heights = [d.textbbox((0, 0), t, font=f)[3] for t, f, _ in lines]
    y = (H - sum(heights) - sum(gaps)) // 2
    for (text, font, colour), h, gap in zip(lines, heights, gaps):
        y += gap
        w = d.textlength(text, font=font)
        d.text(((W - w) / 2, y), text, font=font, fill=colour)
        y += h
    img.save(path)


if __name__ == "__main__":
    png = os.path.join(OUT, "00-idle.png")
    out = os.path.join(OUT, "00-idle.mp4")
    frame(png)
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-loop", "1", "-framerate", str(FPS), "-i", png, "-t", str(SECONDS),
        "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
        "-c:v", "libx264", "-preset", "slow", "-tune", "stillimage",
        "-profile:v", "high", "-level:v", "4.1", "-pix_fmt", "yuv420p",
        "-x264-params", f"keyint={FPS*5}:min-keyint={FPS*5}:scenecut=0",
        "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
        "-movflags", "+faststart", "-an", out], check=True)
    add_silent_audio(out)
    print(out, os.path.getsize(out) // 1024, "KB")
