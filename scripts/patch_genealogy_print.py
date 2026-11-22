#!/usr/bin/env python3
"""Add a separate A3 print mode for the interactive family tapestry."""
from pathlib import Path
import sys

page = Path(sys.argv[1])
html = page.read_text()
css = '<link rel="stylesheet" href="assets/embedded/genealogy_print_css.css">'
script = '<script src="assets/embedded/genealogy_print_js.js" defer></script>'
button = ('  <button type="button" id="genealogy-print" '
          'aria-label="Imprimer la tapisserie complète"><span>Imprimer</span></button>\n')
if css not in html:
    html = html.replace('</head><body>', css + '</head><body>', 1)
if script not in html:
    html = html.replace('</body></html>', script + '</body></html>', 1)
if 'id="genealogy-print"' not in html:
    anchor = '  <button type="button" class="genealogy-zoom-reset" id="genealogy-zoom-reset"'
    html = html.replace(anchor, button + anchor, 1)
page.write_text(html)
