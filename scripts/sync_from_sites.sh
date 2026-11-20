#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
source_dir="${1:-$repo_dir/../gazette-abel-public/dist}"

test -s "$source_dir/index.html"
rsync -a --delete "$source_dir/" "$repo_dir/dist/"
find "$repo_dir/dist" -type f -exec chmod 644 {} +
touch "$repo_dir/dist/.nojekyll"

python3 "$repo_dir/scripts/patch_share.py" "$repo_dir/dist/index.html"
python3 "$repo_dir/scripts/patch_valerie_visibility.py" "$repo_dir/dist/index.html"
python3 "$repo_dir/scripts/patch_mobile_reading.py" "$repo_dir/dist/index.html"
cp "$repo_dir/scripts/mobile_reading.css" "$repo_dir/dist/assets/embedded/mobile_reading_css.css"
cp "$repo_dir/scripts/mobile_reading.js" "$repo_dir/dist/assets/embedded/mobile_reading_js.js"
cp "$repo_dir/scripts/qrcode.min.js" "$repo_dir/dist/assets/embedded/qrcode.min.js"
cp "$repo_dir/scripts/qrcode.LICENSE" "$repo_dir/dist/assets/embedded/qrcode.LICENSE"
cp "$repo_dir/scripts/share_dynamic.js" "$repo_dir/dist/assets/embedded/share_dynamic.js"
cp "$repo_dir/scripts/share_dynamic.css" "$repo_dir/dist/assets/embedded/share_dynamic.css"
rm -f "$repo_dir/dist/assets/embedded/share_qr.png"
python3 - "$repo_dir/dist" <<'PY'
from hashlib import sha256
from pathlib import Path
import re
import sys

dist = Path(sys.argv[1])
files = (dist / 'index.html', dist / 'assets/embedded/mobile_reading_css.css', dist / 'assets/embedded/mobile_reading_js.js')
revision = sha256(b''.join(path.read_bytes() for path in files)).hexdigest()[:12]
worker = dist / 'sw.js'
worker.write_text(re.sub(r"const CACHE='gazette-abel-[^']+';", f"const CACHE='gazette-abel-{revision}';", worker.read_text(), count=1))
PY
echo "GitHub Pages output ready in $repo_dir/dist"
