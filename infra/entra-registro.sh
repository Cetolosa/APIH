#!/usr/bin/env bash
# APIH Corporativo · registro de la aplicación en Entra ID (C2.3). Lo ejecuta TI (requiere permisos de administración de aplicaciones).
# Uso: SWA_NOMBRE=<static web app> SWA_RG=<grupo de recursos> ./infra/entra-registro.sh
set -euo pipefail
: "${SWA_NOMBRE:?Define SWA_NOMBRE}"; : "${SWA_RG:?Define SWA_RG}"
SWA_HOST=$(az staticwebapp show -n "$SWA_NOMBRE" -g "$SWA_RG" --query defaultHostname -o tsv)
NOMBRE="${NOMBRE:-APIH Corporativo}"
APP_ID=$(az ad app create --display-name "$NOMBRE" --sign-in-audience AzureADMyOrg \
  --web-redirect-uris "https://$SWA_HOST/.auth/login/aad/callback" \
  --enable-id-token-issuance true --query appId -o tsv)
# Grupos de seguridad en el token (para rolesSource) y solo los asignados a la app
az ad app update --id "$APP_ID" --set groupMembershipClaims=ApplicationGroup
SP_ID=$(az ad sp create --id "$APP_ID" --query id -o tsv)
az ad sp update --id "$SP_ID" --set appRoleAssignmentRequired=true
for G in APIH-Admin APIH-Editor APIH-Lectura; do
  GID=$(az ad group show --group "$G" --query id -o tsv 2>/dev/null || az ad group create --display-name "$G" --mail-nickname "$G" --query id -o tsv)
  az rest --method POST --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$SP_ID/appRoleAssignedTo" \
    --body "{\"principalId\":\"$GID\",\"resourceId\":\"$SP_ID\",\"appRoleId\":\"00000000-0000-0000-0000-000000000000\"}" >/dev/null
  echo "$G = $GID"
done
# El secreto va directo a la configuración de la Static Web App: nunca se muestra ni se guarda en el repositorio.
SECRETO=$(az ad app credential reset --id "$APP_ID" --display-name swa --years 1 --query password -o tsv)
az staticwebapp appsettings set -n "$SWA_NOMBRE" -g "$SWA_RG" --setting-names "AAD_CLIENT_ID=$APP_ID" "AAD_CLIENT_SECRET=$SECRETO" >/dev/null
unset SECRETO
echo "Listo: AAD_CLIENT_ID=$APP_ID configurado en $SWA_NOMBRE (secreto guardado solo en Azure; vence en 1 año)."
