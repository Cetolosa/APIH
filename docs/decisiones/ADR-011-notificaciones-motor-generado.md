# ADR-011 · Notificaciones: motor generado desde la SPA y canales intercambiables (C2.8)

**Contexto.** La campana de la SPA calcula 15 tipos de aviso con ~60 funciones (áreas visibles, pronóstico, preferencias de la organización y de cada persona). El punto 9 de la propuesta pide enviarlos por correo o Teams, con el mecanismo que defina TI.

**Decisión.**
1. `tools/generar-motor-notif.js` extrae esas funciones **sin modificarlas** desde `apps/corporativo/index.html` y genera `packages/core/notif-motor.js`. El servidor «ve como» cada destinatario, igual que la opción «Ver como» de la SPA.
2. La prueba `tests/e2e/notif1.js` verifica que el código extraído es idéntico en el Prototipo y en la SPA corporativa, y que el motor produce exactamente los mismos avisos que la campana (5 usuarios × 3 fechas, los 15 tipos). El pipeline falla si el archivo generado no está al día (`--check`).
3. El envío usa adaptadores: correo por Microsoft Graph con la identidad administrada (sin secretos) y Teams por webhook de un flujo de TI. Se habilitan con `APIH_NOTIF_CANALES`; sin ese valor solo existen los avisos en la app.
4. Cada aviso se envía una vez por persona y canal (`APIH_NotifEnviadas`); cada corrida agrupa un resumen por persona.

**Consecuencias.** Una sola fuente de reglas (la SPA); cambiar una regla obliga a regenerar el motor. Si TI elige otro mecanismo (SMTP, Azure Communication Services, bot de Teams), solo se agrega un adaptador.
