from pathlib import Path

import pymupdf
from PIL import Image

PDF = Path(r"c:\Users\Admin\Downloads\dandy logo new.pdf")
PUBLIC = Path(r"e:\Dandy Bags\public")
SCALE = 6
PAPER = (243, 239, 231, 255)

doc = pymupdf.open(PDF)
page = doc[0]
pix = page.get_pixmap(matrix=pymupdf.Matrix(SCALE, SCALE), alpha=True)
full = Image.frombytes("RGBA", (pix.width, pix.height), pix.samples)


def crop_pdf(box, pad=(16, 16, 16, 16)):
    x0, y0, x1, y1 = box
    pl, pt, pr, pb = pad
    x0 -= pl
    y0 -= pt
    x1 += pr
    y1 += pb
    px0, py0, px1, py1 = [int(round(v * SCALE)) for v in (x0, y0, x1, y1)]
    px0 = max(0, px0)
    py0 = max(0, py0)
    px1 = min(full.width, px1)
    py1 = min(full.height, py1)
    return full.crop((px0, py0, px1, py1))


def flatten(im: Image.Image) -> Image.Image:
    bg = Image.new("RGBA", im.size, PAPER)
    return Image.alpha_composite(bg, im.convert("RGBA")).convert("RGB")


# Horizontal header lockup — tight crop, full emblem ring visible
lockup = flatten(crop_pdf((187.6, 587.3, 416.2, 655.8), pad=(10, 10, 14, 12)))
lockup.save(PUBLIC / "logo.png", "PNG")
print("logo.png", lockup.size)

# Circular emblem only — keep the full ring, stop before the wordmark below
mark = flatten(crop_pdf((215.4, 233.7, 377.6, 398.7), pad=(16, 16, 16, 2)))
mark.save(PUBLIC / "logo-mark.png", "PNG")
print("logo-mark.png", mark.size)

# Wordmark only
word = flatten(crop_pdf((255, 588, 430, 655), pad=(12, 12, 16, 14)))
word.save(PUBLIC / "logo-wordmark.png", "PNG")
print("logo-wordmark.png", word.size)

fav = mark.resize((64, 64), Image.Resampling.LANCZOS)
fav.save(PUBLIC / "favicon.png", "PNG")
print("favicon.png", fav.size)
print("done")
