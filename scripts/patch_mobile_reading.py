#!/usr/bin/env python3
"""Add the responsive reader controls to a generated Gazette page."""
from pathlib import Path
import sys

page = Path(sys.argv[1])
html = page.read_text()
css = '<link rel="stylesheet" href="assets/embedded/mobile_reading_css.css">'
script = '<script src="assets/embedded/mobile_reading_js.js" defer></script>'
controls = ('<div class="reader-layout-choice" role="group" aria-label="Mode de lecture" data-reader-layout-choice>'
            '<button type="button" data-reader-choice="auto" aria-pressed="true">Automatique</button>'
            '<button type="button" data-reader-choice="mobile" aria-pressed="false">Lecture mobile</button>'
            '<button type="button" data-reader-choice="journal" aria-pressed="false">Page de journal</button></div>')
if css not in html:
    html = html.replace('</head><body>', css + '</head><body>', 1)
if script not in html:
    html = html.replace('</body></html>', script + '</body></html>', 1)
if controls not in html:
    html = html.replace('<h2>Affichage</h2>', '<h2>Affichage</h2>' + controls, 1)
# Keep swipes for the classic page reader and use section anchors in the
# continuous mobile layout, including when that layout is forced on desktop.
html = html.replace("if(window.innerWidth>900||readerZoom!==null", "if(document.body.dataset.mobileReader!=='true'||readerZoom!==null")
html = html.replace("if(document.body.dataset.mobileReader!=='true'||readerZoom!==null", "if(document.body.dataset.readerLayout==='mobile'||document.body.dataset.mobileReader!=='true'||readerZoom!==null")
html = html.replace("[role=\"button\"],[contenteditable=\"true\"]'))return;", "[role=\"button\"],[contenteditable=\"true\"],.sorting-layout,.map-ad-mapframe,.genealogy-fullscreen-tapestry'))return;")
html = html.replace("if(scrollTop&&mobile){readerViews[index].scrollLeft=0;readerViews[index].scrollTop=0;window.scrollTo(0,0)}", "if(scrollTop&&document.body.dataset.readerLayout==='mobile'){readerPages[index].scrollIntoView({block:'start'})}\n else if(scrollTop&&mobile){readerViews[index].scrollLeft=0;readerViews[index].scrollTop=0;window.scrollTo(0,0)}")
page.write_text(html)
