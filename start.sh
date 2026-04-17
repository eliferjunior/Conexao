#!/usr/bin/env bash
# Konektra — atalho para subir o app localmente.
# Uso: ./start.sh [porta]  (padrão: 8080)
set -e
cd "$(dirname "$0")"
PORT="${1:-8080}"

open_url() {
  URL="http://localhost:$PORT/"
  echo ""
  echo "  Konektra está rodando em $URL"
  echo "  Pressione Ctrl+C para parar."
  echo ""
  (sleep 1 && {
    if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL" >/dev/null 2>&1
    elif command -v open >/dev/null 2>&1; then open "$URL" >/dev/null 2>&1
    elif command -v start >/dev/null 2>&1; then start "$URL" >/dev/null 2>&1
    fi
  }) &
}

if command -v node >/dev/null 2>&1; then
  open_url
  exec node scripts/serve.mjs "$PORT"
elif command -v python3 >/dev/null 2>&1; then
  open_url
  exec python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
  open_url
  exec python -m SimpleHTTPServer "$PORT"
elif command -v php >/dev/null 2>&1; then
  open_url
  exec php -S "localhost:$PORT"
else
  echo "Instale Node.js (>=20), Python 3 ou PHP para rodar a Konektra." >&2
  exit 1
fi
