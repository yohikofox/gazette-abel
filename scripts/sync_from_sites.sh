#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
source_dir="${1:-$repo_dir/../gazette-abel-public/dist}"

test -s "$source_dir/index.html"
rsync -a --delete "$source_dir/" "$repo_dir/dist/"
find "$repo_dir/dist" -type f -exec chmod 644 {} +
touch "$repo_dir/dist/.nojekyll"

python3 "$repo_dir/scripts/patch_share.py" "$repo_dir/dist/index.html"
cp "$repo_dir/scripts/qrcode.min.js" "$repo_dir/dist/assets/embedded/qrcode.min.js"
cp "$repo_dir/scripts/qrcode.LICENSE" "$repo_dir/dist/assets/embedded/qrcode.LICENSE"
cp "$repo_dir/scripts/share_dynamic.js" "$repo_dir/dist/assets/embedded/share_dynamic.js"
rm -f "$repo_dir/dist/assets/embedded/share_qr.png"
echo "GitHub Pages output ready in $repo_dir/dist"
