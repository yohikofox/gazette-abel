#!/usr/bin/env python3
"""Attach the shared register to generated static Gazette pages."""
from pathlib import Path
import sys

page = Path(sys.argv[1])
html = page.read_text()
meta = '<meta name="gazette-sync-api" content="https://gazette-api.yolo.yt">'
script = '<script src="assets/embedded/sorting_sync_js.js" defer></script>'
if meta not in html:
    html = html.replace('</head><body>', meta + '</head><body>', 1)
if script not in html:
    html = html.replace('</body></html>', script + '</body></html>', 1)
page.write_text(html)
