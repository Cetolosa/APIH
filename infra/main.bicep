// =====================================================================================
// APIH Corporativo · infraestructura Azure (C2.3) — un ambiente por despliegue (dev | prod)
// Static Web App (Standard) + Function App enlazada (Node 20, identidad administrada)
// + Azure SQL (solo autenticación Entra ID, serverless) + Application Insights.
// Uso: az deployment group create -g rg-apih-dev -f infra/main.bicep -p infra/dev.parameters.json
// =====================================================================================
targetScope = 'resourceGroup'

@allowed(['dev', 'prod'])
param ambiente string = 'dev'
param ubicacion string = resourceGroup().location
@description('Región de la Static Web App (no disponible en todas las regiones).')
param ubicacionSwa string = 'eastus2'
@minLength(3)
@maxLength(6)
param prefijo string = 'apih'
@description('Grupo de Entra ID administrador de Azure SQL (nombre y objectId).')
param sqlAdminGrupoNombre string
param sqlAdminGrupoId string
param tenantId string = subscription().tenantId
@description('objectId de los grupos de Entra que dan los roles de APIH.')
param grupoAdminId string
param grupoEditorId string
param grupoLecturaId string
param dominioPermitido string = 'aramark.cl'
@description('Notificaciones (punto 9): canales habilitados, p. ej. \'correo\' o \'correo,teams\'. Vacío = solo avisos en la app.')
param notifCanales string = ''
@description('Buzón remitente para el canal correo (Graph sendMail con la identidad administrada).')
param correoRemitente string = ''
param etiquetas object = { sistema: 'APIH', ambiente: ambiente, area: 'BISE' }

var sufijo = '${prefijo}-${ambiente}-${uniqueString(resourceGroup().id)}'
var nombreSql = 'sql-${sufijo}'
var nombreBd = 'apih'
var nombreFunc = 'func-${sufijo}'
var nombreSt = toLower(replace('st${prefijo}${ambiente}${uniqueString(resourceGroup().id)}', '-', ''))

resource logs 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'log-${sufijo}'
  location: ubicacion
  tags: etiquetas
  properties: { sku: { name: 'PerGB2018' }, retentionInDays: ambiente == 'prod' ? 90 : 30 }
}

resource ai 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-${sufijo}'
  location: ubicacion
  kind: 'web'
  tags: etiquetas
  properties: { Application_Type: 'web', WorkspaceResourceId: logs.id }
}

resource st 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  #disable-next-line BCP334 // nombreSt siempre tiene ≥ 15 caracteres (st + prefijo + uniqueString)
  name: take(nombreSt, 24)
  location: ubicacion
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  tags: etiquetas
  properties: { minimumTlsVersion: 'TLS1_2', allowBlobPublicAccess: false, supportsHttpsTrafficOnly: true }
}

resource plan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: 'asp-${sufijo}'
  location: ubicacion
  kind: 'functionapp'
  sku: { name: 'Y1', tier: 'Dynamic' }
  tags: etiquetas
  properties: { reserved: true }
}

resource func 'Microsoft.Web/sites@2023-01-01' = {
  name: nombreFunc
  location: ubicacion
  kind: 'functionapp,linux'
  identity: { type: 'SystemAssigned' }
  tags: etiquetas
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'Node|20'
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      appSettings: [
        { name: 'AzureWebJobsStorage', value: 'DefaultEndpointsProtocol=https;AccountName=${st.name};AccountKey=${st.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}' }
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'node' }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: ai.properties.ConnectionString }
        { name: 'APIH_STORE', value: 'mssql' }
        { name: 'APIH_SQL_SERVER', value: '${nombreSql}${environment().suffixes.sqlServerHostname}' }
        { name: 'APIH_SQL_DB', value: nombreBd }
        { name: 'APIH_DOMINIO', value: dominioPermitido }
        { name: 'APIH_UMBRAL_CRITICO', value: '15' }
        { name: 'APIH_GRUPO_ADMIN', value: grupoAdminId }
        { name: 'APIH_GRUPO_EDITOR', value: grupoEditorId }
        { name: 'APIH_GRUPO_LECTURA', value: grupoLecturaId }
        { name: 'APIH_NOTIF_CANALES', value: notifCanales }
        { name: 'APIH_CORREO_REMITENTE', value: correoRemitente }
        { name: 'APIH_URL_APP', value: 'https://${swa.properties.defaultHostname}/' }
      ]
    }
  }
}

resource sql 'Microsoft.Sql/servers@2023-05-01-preview' = {
  name: nombreSql
  location: ubicacion
  tags: etiquetas
  properties: {
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    administrators: { administratorType: 'ActiveDirectory', azureADOnlyAuthentication: true, login: sqlAdminGrupoNombre, sid: sqlAdminGrupoId, tenantId: tenantId, principalType: 'Group' }
  }
}

// Acceso desde servicios de Azure (Functions de consumo). En prod se recomienda VNet + private endpoint (ver docs/seguridad.md).
resource sqlFw 'Microsoft.Sql/servers/firewallRules@2023-05-01-preview' = {
  parent: sql
  name: 'AllowAzureServices'
  properties: { startIpAddress: '0.0.0.0', endIpAddress: '0.0.0.0' }
}

resource bd 'Microsoft.Sql/servers/databases@2023-05-01-preview' = {
  parent: sql
  name: nombreBd
  location: ubicacion
  tags: etiquetas
  sku: { name: 'GP_S_Gen5_1', tier: 'GeneralPurpose' }
  properties: { autoPauseDelay: ambiente == 'prod' ? -1 : 60, minCapacity: json('0.5'), requestedBackupStorageRedundancy: 'Local', zoneRedundant: false }
}

resource sqlAudit 'Microsoft.Sql/servers/auditingSettings@2023-05-01-preview' = {
  parent: sql
  name: 'default'
  properties: { state: 'Enabled', isAzureMonitorTargetEnabled: true }
}

resource swa 'Microsoft.Web/staticSites@2023-01-01' = {
  name: 'stapp-${sufijo}'
  location: ubicacionSwa
  sku: { name: 'Standard', tier: 'Standard' }
  tags: etiquetas
  properties: { stagingEnvironmentPolicy: 'Enabled', allowConfigFileUpdates: true }
}

resource swaBackend 'Microsoft.Web/staticSites/linkedBackends@2023-01-01' = {
  parent: swa
  name: 'api'
  properties: { backendResourceId: func.id, region: ubicacion }
}

output swaHost string = swa.properties.defaultHostname
output funcNombre string = func.name
output funcIdentidad string = func.identity.principalId
output sqlServidor string = '${nombreSql}${environment().suffixes.sqlServerHostname}'
output sqlBase string = nombreBd
