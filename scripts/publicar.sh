#!/bin/sh
# Constrói o site e publica dist/ no ramo gh-pages (GitHub Pages, portugalpodefuncionar.pt).
set -e
cd "$(dirname "$0")/.."
npm run build
URL=$(git remote get-url origin)
TMP=$(mktemp -d)
cp -R dist/. "$TMP"
cd "$TMP"
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C "$OLDPWD" config user.name)" -c user.email="$(git -C "$OLDPWD" config user.email)" commit -q -m "Publicar $(date -u +%Y-%m-%dT%H:%MZ)"
git push -q -f "$URL" gh-pages
cd - >/dev/null
rm -rf "$TMP"
echo "publicado no ramo gh-pages"
