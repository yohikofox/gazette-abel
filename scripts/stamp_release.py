#!/usr/bin/env python3
"""Version the service worker and video URLs for each Gazette publication."""
from hashlib import sha256
from html import escape, unescape
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
import argparse
import re

parser = argparse.ArgumentParser()
parser.add_argument('dist', type=Path)
parser.add_argument('--version', help='Unique deployment identifier; content hash when omitted')
args = parser.parse_args()
dist = args.dist
template = Path(__file__).with_name('sw-template.js')

if args.version:
    version = args.version
else:
    digest = sha256(template.read_bytes())
    for path in sorted(dist.rglob('*')):
        if not path.is_file() or path.name == 'sw.js':
            continue
        digest.update(path.relative_to(dist).as_posix().encode())
        with path.open('rb') as source:
            for chunk in iter(lambda: source.read(1024 * 1024), b''):
                digest.update(chunk)
    version = digest.hexdigest()[:12]
if not re.fullmatch(r'[A-Za-z0-9_-]{8,100}', version):
    raise ValueError('Identifiant de publication invalide')

page = dist / 'index.html'
html = page.read_text(encoding='utf-8')
video_attribute = re.compile(r'(?P<prefix>\b(?:data-src|src)=")(?P<url>[^"<>]+\.(?:mp4|webm)(?:\?[^"<>]*)?)(?P<suffix>")', re.I)

def stamp_video(match: re.Match[str]) -> str:
    url = unescape(match.group('url'))
    if url.startswith(('http:', 'https:', '//', 'data:')):
        return match.group(0)
    parts = urlsplit(url)
    parameters = [(key, value) for key, value in parse_qsl(parts.query, keep_blank_values=True)
                  if key != 'gazette_release']
    parameters.append(('gazette_release', version))
    updated = urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(parameters), parts.fragment))
    return match.group('prefix') + escape(updated, quote=True) + match.group('suffix')

html = video_attribute.sub(stamp_video, html)
page.write_text(html, encoding='utf-8')

worker = dist / 'sw.js'
source = worker.read_text(encoding='utf-8')
source, count = re.subn(r"const CACHE='gazette-abel-[^']+';", f"const CACHE='gazette-abel-{version}';", source, count=1)
if count != 1:
    raise RuntimeError('Nom du cache introuvable dans sw.js')
worker.write_text(source, encoding='utf-8')
print(f'Gazette release: {version}; {len(video_attribute.findall(html))} video URLs versioned')
