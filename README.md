# APIH Prototipo Despliegue

Tercer ambiente de APIH: la misma SPA y el mismo servidor que [`apih-prototipo-arquitectura`](https://github.com/Cetolosa/apih-prototipo-arquitectura), en un **proyecto Supabase propio con los datos reales del portafolio**. Arquitectura sigue con datos anonimizados para la revisión de TI; los documentos de `docs/ti/` describen ese ambiente.

**Los datos reales nunca van a este repositorio** (es público por GitHub Pages): viven solo en Supabase, detrás del login y de RLS. `.gitignore` bloquea respaldos y SQL de carga.

## Puesta en marcha (una vez)
1. Supabase → proyecto nuevo → SQL Editor: pegar `supabase/aplicar_en_supabase.sql` y ejecutar.
2. Cargar el respaldo: `node tools/cargar-respaldo.js APIH_respaldo.json carga.sql --admin <tu correo>` y ejecutar `carga.sql` en el SQL Editor. Borra todos los registros y deja solo los del respaldo; crea los perfiles de las personas del respaldo.
3. Supabase → Authentication → URL Configuration: agregar la URL de GitHub Pages de este repositorio.
4. GitHub → Settings → Secrets and variables → Actions → **Variables**: `SUPABASE_URL` (`https://<proyecto>.supabase.co`) y `SUPABASE_PUBLISHABLE_KEY`. Settings → Pages → Source: GitHub Actions.

## Cambios de la SPA
Los cambios parten en Arquitectura. Para traerlos aquí basta copiar `js/`, `css/` e `index.html` (salvo la línea `connect-src` de la CSP) y las migraciones; después, volver a pegar `aplicar_en_supabase.sql` en Supabase.

## Estructura
- `index.html`, `js/`, `css/`: la SPA (módulos ES, sin paso de compilación).
- `supabase/migrations/`: reglas del servidor (autorización, validación, comandos de negocio). `supabase/tests/`: pruebas SQL.
- `tests/e2e/`: pruebas de navegador (Playwright). `tests/contract/`: contratos compartidos entre la SPA y el servidor.
- `pruebas-ti/`: repite la revisión técnica de Arquitectura y deja un informe por hallazgo (ver su README).
- `docs/ti/`: guía de UAT, anexo de arquitectura y mapa de portabilidad.

## Cómo probar
```
npm ci
npm run test:e2e          # navegador, modo demo
sudo -E bash tools/test-sql.sh   # migraciones y políticas en un Postgres temporal
sudo -E env "PATH=$PATH" npm run pruebas-ti   # informe de revisión técnica
```
Node 22 (`.nvmrc`). Las pruebas SQL necesitan Postgres local.

## Aplicar las reglas en Supabase
Pegar `supabase/aplicar_en_supabase.sql` completo en Supabase → SQL Editor → Run (repetible; no borra datos). Se regenera con `node tools/empaquetar-migraciones.js` y la CI exige que esté al día. Sin esto, la SPA nueva muestra «Sin conexión a Supabase: … puede_editar does not exist».

## Publicación
`main` se publica en GitHub Pages (`.github/workflows/pages.yml`) con solo `index.html`, `apih-config.js`, `js/` y `css/`.
