# APIH en Microsoft Teams — C2.7

Pestaña personal que abre la SPA corporativa dentro de Teams. Se publica **después** de validar la versión web (punto 6 de la propuesta).

## Empaquetar
```
node tools/empaquetar-teams.js --host <app>.azurestaticapps.net --app-id <GUID nuevo> --client-id <GUID del registro Entra> --version 1.0.0
```
Genera `dist/apih-teams.zip` (manifiesto 1.17 + íconos 192×192 y 32×32), que TI carga en el centro de administración de Teams (catálogo de la organización). El empaquetador valida campos obligatorios, GUID, largos, dominios e íconos. Prueba: `node tests/unit/teams-paquete.js`.

## Pendiente de validar en dev (con TI)
- **Inicio de sesión dentro de Teams:** la página de login de Entra ID no se puede mostrar dentro de un iframe, así que el login de Static Web Apps (`/.auth/login/aad`) debe abrirse en una ventana aparte (Teams JS SDK `authentication.authenticate`) o usar SSO de Teams. Se valida en dev antes de publicar la app.
- `frame-ancestors` ya permite `teams.microsoft.com`, `*.teams.microsoft.com`, `*.office.com` y `*.cloud.microsoft` (cliente nuevo de Teams).
