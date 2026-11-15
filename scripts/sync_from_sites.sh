#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
source_dir="${1:-$repo_dir/../gazette-abel-public/dist}"
pages_url='https://yohikofox.github.io/gazette-abel/'

test -s "$source_dir/index.html"
rsync -a --delete "$source_dir/" "$repo_dir/dist/"
find "$repo_dir/dist" -type f -exec chmod 644 {} +
touch "$repo_dir/dist/.nojekyll"

python3 - "$repo_dir/dist/index.html" "$pages_url" <<'PY'
from pathlib import Path
import sys

html_path = Path(sys.argv[1])
pages_url = sys.argv[2]
html = html_path.read_text(encoding='utf-8')
old = 'id="share-url" type="url" value="https://abel-gazette-anniversaire-2026.yoann-lorho.chatgpt.site/"'
new = f'id="share-url" type="url" value="{pages_url}"'
if html.count(old) != 1:
    raise SystemExit('Share URL was not found exactly once; check the source before publishing.')
html = html.replace(old, new)
html = '\n'.join(line.rstrip() for line in html.split('\n'))
html_path.write_text(html, encoding='utf-8')
PY

export CLANG_MODULE_CACHE_PATH="${TMPDIR:-/tmp}/gazette-clang-cache"
export SWIFT_MODULE_CACHE_PATH="$CLANG_MODULE_CACHE_PATH"
mkdir -p "$CLANG_MODULE_CACHE_PATH"
swift "$repo_dir/scripts/make_share_qr.swift" "$pages_url" "$repo_dir/dist/assets/embedded/share_qr.png"
echo "GitHub Pages output ready in $repo_dir/dist"
