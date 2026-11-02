"""Build display-sized, lossless WebP files from the retained original PNGs.

Run with Python 3 and Pillow installed. Generated files are committed, so normal
development and GitHub Pages builds do not need Python or Pillow.
"""
from pathlib import Path
from PIL import Image

directory = Path(__file__).resolve().parents[1] / 'public' / 'characters-2d'
before = after = 0
for source in sorted(directory.glob('*.png')):
    with Image.open(source) as original:
        image = original.convert('RGBA')
        size = 384 if source.stem.endswith('-full') else 256
        image.thumbnail((size, size), Image.Resampling.LANCZOS)
        destination = source.with_suffix('.webp')
        image.save(destination, 'WEBP', lossless=True, method=6)
    before += source.stat().st_size
    after += destination.stat().st_size
print(f'{before:,} PNG bytes -> {after:,} WebP bytes ({100*(1-after/before):.1f}% smaller)')
