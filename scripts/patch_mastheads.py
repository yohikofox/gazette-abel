#!/usr/bin/env python3
"""Use compact WebP mastheads and load the visible heading promptly."""
from pathlib import Path
import sys

page = Path(sys.argv[1])
html = page.read_text()
for language in ('en', 'fr'):
    html = html.replace(f'assets/embedded/masthead_{language}.png', f'assets/embedded/masthead_{language}.webp')
html = html.replace('assets/embedded/ornate_eleven.png', 'assets/embedded/ornate_eleven.webp')
preload = '<link rel="preload" href="assets/embedded/masthead_en.webp" as="image" fetchpriority="high">'
if preload not in html:
    html = html.replace('</head><body>', preload + '</head><body>', 1)
html = html.replace('<header class="mast"><img data-masthead', '<header class="mast"><img fetchpriority="high" decoding="sync" data-masthead', 1)
html = html.replace('<img loading="lazy" decoding="async" data-masthead', '<img loading="eager" decoding="sync" data-masthead')
for photo in ('abel_portrait', 'family_water'):
    html = html.replace(f'<img data-photo="{photo}"', f'<img loading="lazy" decoding="async" data-photo="{photo}"', 1)
html = html.replace('<img class="front-portrait-ornament"', '<img loading="lazy" decoding="async" class="front-portrait-ornament"', 1)
page.write_text(html)
