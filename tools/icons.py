# makes the Android launcher icons from icons/icon-512.png (run by the build, after "cap add android")
import os, sys
from PIL import Image
src = Image.open("www/icons/icon-512.png").convert("RGBA")
mask = Image.open("www/icons/icon-maskable-512.png").convert("RGBA")
sizes = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
fg = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
res = "android/app/src/main/res"
for d, n in sizes.items():
    p = f"{res}/mipmap-{d}"
    if not os.path.isdir(p): continue
    for name in ("ic_launcher.png", "ic_launcher_round.png"):
        src.resize((n, n), Image.NEAREST).save(f"{p}/{name}")
    mask.resize((fg[d], fg[d]), Image.NEAREST).save(f"{p}/ic_launcher_foreground.png")
print("icons done")
