/* C1.1 — Pruebas de contrato de Iniciativa. Reutilizable: cada adaptador (memoria, Supabase, Azure)
 * se prueba con: await require('./iniciativa.contract.js')(fabrica)   donde fabrica(opts) => DataPort nuevo y vacío. */
'use strict';
const assert = require('assert');

module.exports = async function contratoIniciativa(fabrica, log = console.log) {
  let ok = 0; const caso = async (nombre, fn) => { await fn(); ok++; log('  ✓ ' + nombre); };
  const falla = async (p, codigo, campo) => { try { await p; } catch (e) { assert.strictEqual(e.codigo, codigo, 'código ' + e.codigo + ' ≠ ' + codigo + ' ' + JSON.stringify(e.detalles || '')); if (campo) assert.ok((e.detalles || []).some(d => d.campo === campo), 'falta detalle ' + campo + ': ' + JSON.stringify(e.detalles)); return e; } assert.fail('debía fallar con ' + codigo); };
  const prop = (x = {}) => Object.assign({ tipo: 'Propuesta', titulo: 'Prop A', fase: 'Recepción', estado: 'Vigente', lider: 'ana@aramark.cl', area: ['BISE'] }, x);
  const prj = (x = {}) => Object.assign({ tipo: 'Proyecto', titulo: 'Prj A', fase: 'Planificación', estado: 'En curso', lider: 'ana@aramark.cl', motivoAlta: 'Urgente', area: ['BISE'], inicioPlan: '2026-11-01', finPlan: '2027-02-01' }, x);

  await caso('crear asigna id, version y campos del servidor', async () => {
    const d = fabrica(); const a = await d.crear(prop({ id: 'PROP-999', modificadoPor: 'falso' })); const b = await d.crear(prj());
    assert.match(a.id, /^PROP-\d+$/); assert.match(b.id, /^PRJ-\d+$/); assert.notStrictEqual(a.id, 'PROP-999');
    assert.ok(a.version && a.creada && a.actualizada && a.faseDesde); assert.notStrictEqual(a.modificadoPor, 'falso');
  });
  await caso('obtener y listar con filtros', async () => {
    const d = fabrica(); const a = await d.crear(prop()); await d.crear(prj({ area: ['Operaciones'] }));
    assert.deepStrictEqual((await d.obtener(a.id)).titulo, 'Prop A');
    assert.strictEqual((await d.listar({ tipo: 'Proyecto' })).length, 1); assert.strictEqual((await d.listar({ area: 'BISE' })).length, 1);
    assert.strictEqual((await d.listar({ texto: 'prop' })).length, 1); assert.strictEqual((await d.listar()).length, 2);
    await falla(d.obtener('PRJ-404'), 'NO_ENCONTRADA');
  });
  await caso('crear rechaza datos inválidos (obligatorios, fase/estado del tipo, fechas)', async () => {
    const d = fabrica();
    await falla(d.crear(prop({ titulo: '' })), 'INVALIDA', 'titulo');
    await falla(d.crear(prop({ fase: 'Ejecución' })), 'INVALIDA', 'fase');
    await falla(d.crear(prj({ estado: 'Vigente' })), 'INVALIDA', 'estado');
    await falla(d.crear(prj({ finPlan: '2026-10-01' })), 'INVALIDA', 'finPlan');
    await falla(d.crear(prj({ inicioPlan: '2026-02-30' })), 'INVALIDA', 'inicioPlan');
    await falla(d.crear(prj({ motivoAlta: '' })), 'INVALIDA', 'motivoAlta');
    assert.ok((await d.crear(prj({ motivoAlta: '', origen: 'importación' }))).id, 'importación exenta de motivoAlta');
    await falla(d.crear(prop({ estado: 'Aprobada' })), 'INVALIDA', 'estado');
  });
  await caso('actualizar con version correcta; CONFLICTO con version vieja', async () => {
    const d = fabrica(); const a = await d.crear(prj());
    const b = await d.actualizar(a.id, { titulo: 'Nuevo', avance: 30 }, a.version);
    assert.strictEqual(b.titulo, 'Nuevo'); assert.notStrictEqual(b.version, a.version); assert.ok(b.hist.some(h => h[1] === 30));
    await falla(d.actualizar(a.id, { titulo: 'Pisa' }, a.version), 'CONFLICTO');
  });
  await caso('actualizar no cambia tipo, estado ni fase (tienen operación propia)', async () => {
    const d = fabrica(); const a = await d.crear(prj());
    await falla(d.actualizar(a.id, { tipo: 'Propuesta' }, a.version), 'INVALIDA', 'tipo');
    await falla(d.actualizar(a.id, { estado: 'Pausado' }, a.version), 'INVALIDA', 'estado');
    await falla(d.actualizar(a.id, { fase: 'Ejecución' }, a.version), 'INVALIDA', 'fase');
  });
  await caso('dependencias: sin auto-referencia ni ciclos', async () => {
    const d = fabrica(); const a = await d.crear(prj()); const b = await d.crear(prj({ deps: [a.id] }));
    await falla(d.actualizar(a.id, { deps: [a.id] }, a.version), 'INVALIDA', 'deps');
    await falla(d.actualizar(a.id, { deps: [b.id] }, a.version), 'INVALIDA', 'deps');
  });
  await caso('cambiarEstado exige motivo y fecha de revisión', async () => {
    const d = fabrica(); const a = await d.crear(prj());
    await falla(d.cambiarEstado(a.id, { estado: 'Pausado' }, a.version), 'INVALIDA', 'estadoMotivo');
    await falla(d.cambiarEstado(a.id, { estado: 'Pausado', motivo: 'Sin fondos' }, a.version), 'INVALIDA', 'estadoRev');
    const b = await d.cambiarEstado(a.id, { estado: 'Pausado', motivo: 'Sin fondos', rev: '2026-12-01' }, a.version);
    assert.strictEqual(b.estado, 'Pausado'); assert.strictEqual(b.estadoRev, '2026-12-01');
  });
  await caso('Completado solo en Cierre; estado final no admite más cambios', async () => {
    const d = fabrica(); let a = await d.crear(prj());
    await falla(d.cambiarEstado(a.id, { estado: 'Completado' }, a.version), 'INVALIDA', 'estado');
    a = await d.cambiarFase(a.id, 'Cierre', a.version);
    a = await d.cambiarEstado(a.id, { estado: 'Completado' }, a.version);
    assert.strictEqual(a.avance, 100); assert.ok(a.finReal);
    await falla(d.cambiarEstado(a.id, { estado: 'En curso' }, a.version), 'INVALIDA', 'estado');
  });
  await caso('cambiarFase valida la fase del tipo y actualiza faseDesde', async () => {
    const d = fabrica(); const a = await d.crear(prop());
    await falla(d.cambiarFase(a.id, 'Ejecución', a.version), 'INVALIDA', 'fase');
    const b = await d.cambiarFase(a.id, 'Evaluación', a.version); assert.strictEqual(b.fase, 'Evaluación'); assert.ok(b.faseDesde);
  });
  await caso('aprobarPropuesta crea PRJ con propuestaOrigen y cierra la propuesta', async () => {
    const d = fabrica(); let p = await d.crear(prop({ finPlan: '2027-03-01' }));
    await falla(d.aprobarPropuesta(p.id, p.version), 'COMPUERTA');
    p = await d.cambiarFase(p.id, 'Aprobación', p.version);
    const r = await d.aprobarPropuesta(p.id, p.version);
    assert.strictEqual(r.propuesta.estado, 'Aprobada'); assert.match(r.proyecto.id, /^PRJ-/);
    assert.strictEqual(r.proyecto.propuestaOrigen, p.id); assert.strictEqual(r.proyecto.fase, 'Planificación');
    await falla(d.aprobarPropuesta(p.id, r.propuesta.version), 'COMPUERTA');
  });
  await caso('eliminar con version; limpia dependencias', async () => {
    const d = fabrica(); const a = await d.crear(prj()); const b = await d.crear(prj({ deps: [a.id] }));
    await falla(d.eliminar(a.id, 'vieja'), 'CONFLICTO');
    await d.eliminar(a.id, a.version);
    await falla(d.obtener(a.id), 'NO_ENCONTRADA'); assert.deepStrictEqual((await d.obtener(b.id)).deps, []);
  });
  await caso('rol sin escritura → SIN_PERMISO', async () => {
    const d = fabrica({ puedeEscribir: false });
    await falla(d.crear(prop()), 'SIN_PERMISO');
  });
  return ok;
};
