#!/bin/sh
# Ruční nasazení (dokud není v repu GitHub Actions workflow): sestaví web a pushne ho do gh-pages.
set -e
cd "$(dirname "$0")"
python3 build.py >/dev/null
cp -r admin site/
cd site && touch .nojekyll && rm -rf .git && git init -q -b gh-pages && git add -A && git commit -q -m "Build $(date +%F\ %T)"
git push -qf https://github.com/webhunter-navrhy/astudio.git gh-pages
echo "✓ nasazeno → https://webhunter-navrhy.github.io/astudio/"
