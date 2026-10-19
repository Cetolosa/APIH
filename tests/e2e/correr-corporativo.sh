#!/usr/bin/env bash
# C2.14 · Corre las pruebas de la SPA corporativa contra la API local, cada una con una base nueva.
# Incluye las pruebas de pantalla del Prototipo (fin1, sf1, fz1, ps1) apuntadas a la SPA corporativa.
# Requiere el Prototipo servido en :8765 para corp2 (ver README).
set -u; cd "$(dirname "$0")/../.."; mkdir -p /tmp/t/cx
for t in fin1 sf1 fz1 ps1; do sed "s#http://localhost:8765/demo/index.html#http://localhost:7072/#; s#require('../../docs#require('$PWD/docs#" tests/e2e/$t.js > /tmp/t/cx/$t.js; done
run() { APIH_DEV_USER=christian.tolosa@aramark.cl APIH_DEV_ROL=Admin PORT=7072 node services/api/server.js > /tmp/t/api.log 2>&1 & SP=$!; sleep 2.5; printf "%s: " "$1"; timeout 300 node "$2" 2>&1 | grep -E "^(OK|FALLA)" || echo "FALLA (sin resultado)"; kill $SP 2>/dev/null; wait $SP 2>/dev/null; sleep 1; }
run corp2 tests/e2e/corp2.js; run corp1 tests/e2e/corp1.js; run corp3 tests/e2e/corp3.js
for t in fin1 sf1 fz1 ps1; do run "corp-$t" /tmp/t/cx/$t.js; done
export APIH_URL=http://localhost:7072/; run corp-imp3 tests/e2e/imp3.js; run corp-xss1 tests/e2e/xss1.js; run corp-guia1 tests/e2e/guia1.js
