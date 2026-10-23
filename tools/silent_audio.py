#!/usr/bin/env python3
"""Add a silent stereo AAC track to pattern videos.

Why: Safari on iPhone and iPad only hands a video to an AirPlay TV when it is
real, unmuted media. A muted video with no audio track is treated like a
silent background clip, so the TV connects but never shows the picture.
A silent track lets the page play the video unmuted (with no sound).

The video stream is copied, not re-encoded, so the pictures stay bit-for-bit
identical. The generators call add_silent_audio() on every file they write;
run this file directly to fix existing videos:

    python3 tools/silent_audio.py patterns/*.mp4
"""
import json
import os
import subprocess
import sys


def has_audio(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries",
                          "stream=index", "-of", "json", path], capture_output=True, text=True, check=True)
    return bool(json.loads(out.stdout).get("streams"))


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "default=nw=1:nk=1", path], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def add_silent_audio(path):
    if has_audio(path):
        return False
    tmp = path + ".audio.mp4"
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", path, "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
        "-map", "0:v", "-map", "1:a", "-c:v", "copy",
        "-c:a", "aac", "-b:a", "32k", "-t", f"{duration(path):.3f}",
        "-movflags", "+faststart", tmp], check=True)
    os.replace(tmp, path)
    return True


if __name__ == "__main__":
    for p in sys.argv[1:]:
        print(p, "added silent audio" if add_silent_audio(p) else "already has audio")
