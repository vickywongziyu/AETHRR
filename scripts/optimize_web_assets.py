#!/usr/bin/env python3
"""Create lighter web copies of large textures and minimap images.

Originals stay untouched (Blender exports, cartography captures and legacy
pages keep using them). Runtime atlas/home code requests the "-web" JPEGs.
Re-run after regenerating any source image:

    python3 scripts/optimize_web_assets.py

Requires Pillow only.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / 'public'

# source, output, quality. Normal maps keep higher quality to limit block artefacts.
JOBS = [
    ('aether/textures/rock-color.jpg', 'aether/textures/rock-color-web.jpg', 90),
    ('aether/textures/rock-normal.jpg', 'aether/textures/rock-normal-web.jpg', 94),
    ('aether/textures/rock-rough.jpg', 'aether/textures/rock-rough-web.jpg', 90),
    ('atlas/textures/painted-meadow-v1.png', 'atlas/textures/painted-meadow-v1-web.jpg', 92),
    ('atlas/textures/timber-color.jpg', 'atlas/textures/timber-color-web.jpg', 90),
    ('atlas/textures/timber-normal.jpg', 'atlas/textures/timber-normal-web.jpg', 94),
    ('atlas/maps/world.png', 'atlas/maps/world.jpg', 88),
    # City maps have transparent borders: WebP keeps alpha (Safari 14+).
] + [(f'atlas/maps/{n}.png', f'atlas/maps/{n}.webp', 90)
     for n in ('aether', 'highland', 'forest', 'watercourt', 'valley')]


def main():
    total_before = total_after = 0
    for src, dst, quality in JOBS:
        s, d = ROOT / src, ROOT / dst
        image = Image.open(s)
        if d.suffix == '.webp':
            image.save(d, 'WEBP', quality=quality, method=6)
        else:
            if image.mode == 'RGBA' and image.getextrema()[3][0] != 255:
                raise SystemExit(f'{src} has real transparency; use .webp output')
            image.convert('RGB').save(d, 'JPEG', quality=quality, optimize=True, progressive=True)
        before, after = s.stat().st_size, d.stat().st_size
        total_before += before
        total_after += after
        print(f'{src} -> {dst}: {before // 1024} KB -> {after // 1024} KB')
    print(f'total {total_before / 1e6:.1f} MB -> {total_after / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
