'use strict';
/* Ubica packages/core: en el repositorio (desarrollo/pruebas) o copiado junto a la API en el paquete de despliegue (pipeline). */
let core; try { core = require('../../../packages/core/apih-core.js'); } catch (e) { core = require('../core/apih-core.js'); }
module.exports = core;
