#!/usr/bin/env python3
"""Attach available house portraits to the generated tapestry without a full rebuild."""
from pathlib import Path
import json
import re
import subprocess
import sys

page = Path(sys.argv[1])
config = Path(__file__).with_name('genealogy_houses.yaml')
configuration = json.loads(subprocess.run(
    ['ruby', '-r', 'yaml', '-r', 'json', '-e',
     'puts JSON.generate(YAML.safe_load(File.read(ARGV[0]), permitted_classes: [], aliases: false))', str(config)],
    check=True, capture_output=True, text=True,
).stdout)
variants = configuration.get('variants', {})
press_variants = configuration.get('press_variants', {})
html = page.read_text(encoding='utf-8')

def mark(match):
    tag, person_id = match.group(1), match.group(2)
    for available, attribute in ((variants, 'data-house-variants'), (press_variants, 'data-house-press-variants')):
        houses = available.get(person_id, {})
        if houses and attribute + '=' not in tag:
            tag = tag[:-1] + ' ' + attribute + '="' + ' '.join(houses) + '">'
    return tag

html = re.sub(r'(<div class="genealogy-card[^>]*?data-person="([a-z0-9_]+)"[^>]*>)', mark, html)
html = re.sub(r'(<div class="genealogy-tapestry-person" data-person="([a-z0-9_]+)"[^>]*>)', mark, html)
script = '<script src="assets/embedded/genealogy_house_sync_js.js" defer></script>'
if script not in html:
    html = html.replace('</body></html>', script + '</body></html>', 1)
page.write_text(html, encoding='utf-8')
