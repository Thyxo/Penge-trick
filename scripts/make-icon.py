#!/usr/bin/env python3
"""App-ikonet: en telefon med en 100-kr-seddel der glider ud af skærmen.
Skriver ios/PengeTrick/Resources/Assets.xcassets/AppIcon.appiconset/icon-1024.png og icons/icon-512.png."""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = 1024

# Baggrund: mørk, let grøn gradient (som webappens farver)
ys, xs = np.mgrid[0:S, 0:S].astype(np.float32) / S
d = np.sqrt((xs - 0.3) ** 2 + (ys - 0.2) ** 2)
top = np.array([22, 62, 66], np.float32)
bottom = np.array([9, 14, 16], np.float32)
t = np.clip(d / 1.1, 0, 1)[..., None]
bg = Image.fromarray((top * (1 - t) + bottom * t).astype(np.uint8)).convert('RGBA')

# Telefonen
phone = Image.new('RGBA', (S, S), (0, 0, 0, 0))
pd = ImageDraw.Draw(phone)
box = (250, 150, 700, 900)
pd.rounded_rectangle(box, radius=92, fill=(16, 20, 23, 255), outline=(150, 170, 172, 255), width=14)
inner = (box[0] + 34, box[1] + 34, box[2] - 34, box[3] - 34)
pd.rounded_rectangle(inner, radius=62, fill=(34, 74, 80, 255))
# app-ikoner på skærmen
for r in range(4):
    for c in range(3):
        x = inner[0] + 40 + c * 118
        y = inner[1] + 60 + r * 128
        pd.rounded_rectangle((x, y, x + 84, y + 84), radius=22, fill=(255, 255, 255, 44))
shadow = phone.filter(ImageFilter.GaussianBlur(28))
bg.alpha_composite(Image.eval(shadow, lambda v: v // 2))
bg.alpha_composite(phone)

# Sedlen: vandret, drejet en smule, halvt ude over telefonens højre kant
note = Image.open(os.path.join(ROOT, 'assets/100kr.png')).convert('RGBA').rotate(90, expand=True)
w = 640
note = note.resize((w, int(note.height * w / note.width)), Image.LANCZOS).rotate(-8, expand=True, resample=Image.BICUBIC)
nx, ny = 330, 470
ns = Image.new('RGBA', (S, S), (0, 0, 0, 0))
ns.paste((0, 0, 0, 150), (nx + 10, ny + 26), note)
bg.alpha_composite(ns.filter(ImageFilter.GaussianBlur(22)))
bg.alpha_composite(note, (nx, ny))

img = bg.convert('RGB')
img.save(os.path.join(ROOT, 'ios/PengeTrick/Resources/Assets.xcassets/AppIcon.appiconset/icon-1024.png'))
img.resize((512, 512), Image.LANCZOS).save(os.path.join(ROOT, 'icons/icon-512.png'))
print('ok')
