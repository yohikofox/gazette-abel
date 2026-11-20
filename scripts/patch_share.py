"""Adapt the published Gazette share dialog for any hosting domain."""

from pathlib import Path
import re
import sys


html_path = Path(sys.argv[1])
html = html_path.read_text(encoding="utf-8")

if html.count('id="share-url"') != 1:
    raise SystemExit("Expected exactly one share URL field")
html, count = re.subn(
    r'(<input\b[^>]*\bid="share-url"[^>]*?)\svalue="[^"]*"',
    r"\1",
    html,
)
if count != 1 and 'id="share-url" type="url" readonly' not in html:
    raise SystemExit("Could not clear the fixed share URL")

html, count = re.subn(
    r'<img class="share-qr"[^>]*>',
    '<div class="share-qr" id="share-qr" role="img" aria-label="QR code vers la Gazette d’Abel"></div>',
    html,
)
if count != 1 and html.count('id="share-qr"') != 1:
    raise SystemExit("Could not replace the fixed QR image")

if html.count("</body>") != 1:
    raise SystemExit("Expected exactly one closing body tag")
stylesheet = '<link rel="stylesheet" href="./assets/embedded/share_dynamic.css">'
if stylesheet not in html:
    html = html.replace("</head>", f"{stylesheet}\n</head>")
for script in ("qrcode.min.js", "share_dynamic.js"):
    tag = f'<script src="./assets/embedded/{script}" defer></script>'
    if tag not in html:
        html = html.replace("</body>", f"{tag}\n</body>")

html_path.write_text("\n".join(line.rstrip() for line in html.split("\n")), encoding="utf-8")
