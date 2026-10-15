# Pruebas e2e (Playwright, modo demo)

Preparación (cada sesión nueva):
```
mkdir -p /tmp/t/demo && cp index.html /tmp/t/demo/index.html && cp apih-config.js /tmp/t/ 
python3 -m http.server 8765 -d /tmp/t &
```
Ejecutar desde cualquier carpeta: `node tests/e2e/t10.js` (usa chromium en /opt/pw-browsers/chromium y el módulo /opt/npm-tools/node_modules/playwright).
Copiar `index.html` a `/tmp/t/demo/` antes de cada corrida. La demo no trae iniciativas: los scripts agregan una plantilla (ver h1.js).

Regresión mínima antes de publicar: t10 (login, xlsx, CSP), t13 (a11y), t43 (historial), t44 (notificaciones), cap2 (capacidad), r1 (menú), c4 (panel), imp1/imp2 (importador), ia1 (Con IA).
Falsos positivos conocidos: ROI NaN en demo, overlay de celebración en capturas.
