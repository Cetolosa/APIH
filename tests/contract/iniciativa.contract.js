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
    const d = fabrica(); const a = await d.crear(prop({ modificadoPor: 'falso' })); const b = await d.crear(prj());
    assert.match(a.id, /^PROP-\d+$/); assert.match(b.id, /^PRJ-\d+$/);
    const c = await d.crear(prop({ id: 'PROP-050' })); assert.strictEqual(c.id, 'PROP-050', 'id propuesto por el cliente');
    await falla(d.crear(prop({ id: 'PROP-050' })), 'CONFLICTO'); await falla(d.crear(prop({ id: 'PRJ-051' })), 'INVALIDA', 'id');
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
  await caso('cambiarFase aplica compuertas (COMPUERTA) y avanza de a una fase', async () => {
    const d = fabrica(); let a = await d.crear(prj({ presupuesto: 0 }));
    await falla(d.cambiarFase(a.id, 'Transición', a.version), 'INVALIDA', 'fase');
    const e = await falla(d.cambiarFase(a.id, 'Ejecución', a.version), 'COMPUERTA');
    assert.ok(e.detalles.some(x => /Presupuesto/.test(x.regla)) && e.detalles.some(x => /2 hitos/.test(x.regla)), JSON.stringify(e.detalles));
    const g = await d.compuerta(a.id); assert.strictEqual(g.fase, 'Ejecución'); assert.ok(g.condiciones.some(x => !x.ok));
  });
  await caso('Completado solo en Cierre; estado final no admite más cambios', async () => {
    const d = fabrica(); let a = await d.crear(prj({ presupuesto: 10 }));
    await falla(d.cambiarEstado(a.id, { estado: 'Completado' }, a.version), 'INVALIDA', 'estado');
    for (const n of ['H1', 'H2']) { const h = await d.crearHito(a.id, { nombre: n, fase: 'Planificación', fecha: '2026-10-10' }); await d.completarHito(h.id, null, h.version); }
    a = await d.cambiarFase(a.id, 'Ejecución', a.version);
    a = await d.actualizar(a.id, { avance: 100 }, a.version);
    a = await d.cambiarFase(a.id, 'Transición', a.version);
    a = await d.cambiarFase(a.id, 'Cierre', a.version);
    a = await d.cambiarEstado(a.id, { estado: 'Completado' }, a.version);
    assert.strictEqual(a.avance, 100); assert.ok(a.finReal);
    await falla(d.cambiarEstado(a.id, { estado: 'En curso' }, a.version), 'INVALIDA', 'estado');
  });
  await caso('reabrir proyecto Completado: solo Admin, limpia finReal (N-F-07)', async () => {
    const mk = async (d) => { let a = await d.crear(prj({ presupuesto: 10 }));
      for (const n of ['H1', 'H2']) { const h = await d.crearHito(a.id, { nombre: n, fase: 'Planificación', fecha: '2026-10-10' }); await d.completarHito(h.id, null, h.version); }
      a = await d.cambiarFase(a.id, 'Ejecución', a.version); a = await d.actualizar(a.id, { avance: 100 }, a.version);
      a = await d.cambiarFase(a.id, 'Transición', a.version); a = await d.cambiarFase(a.id, 'Cierre', a.version);
      return d.cambiarEstado(a.id, { estado: 'Completado' }, a.version); };
    const ad = fabrica({ rol: 'Admin' }); const a = await mk(ad);
    const r = await ad.cambiarEstado(a.id, { estado: 'En curso' }, a.version);
    assert.strictEqual(r.estado, 'En curso'); assert.ok(!r.finReal);
  });
  await caso('Completado exige compuertas de Cierre (avance 100 %)', async () => {
    const d = fabrica(); let a = await d.crear(prj({ presupuesto: 10 }));
    for (const n of ['H1', 'H2']) { const h = await d.crearHito(a.id, { nombre: n, fase: 'Planificación', fecha: '2026-10-10' }); await d.completarHito(h.id, null, h.version); }
    a = await d.cambiarFase(a.id, 'Ejecución', a.version); a = await d.actualizar(a.id, { avance: 100 }, a.version);
    a = await d.cambiarFase(a.id, 'Transición', a.version); a = await d.cambiarFase(a.id, 'Cierre', a.version);
    a = await d.actualizar(a.id, { avance: 80 }, a.version);
    await falla(d.cambiarEstado(a.id, { estado: 'Completado' }, a.version), 'COMPUERTA');
  });
  await caso('hitos: crear, completar (fechaReal), validar y semáforo', async () => {
    const d = fabrica(); const a = await d.crear(prj());
    await falla(d.crearHito(a.id, { nombre: '', fecha: '2026-10-20' }), 'INVALIDA', 'nombre');
    await falla(d.crearHito(a.id, { nombre: 'X', fecha: '2026-13-01' }), 'INVALIDA', 'fecha');
    await falla(d.crearHito('PRJ-404', { nombre: 'X', fecha: '2026-10-20' }), 'NO_ENCONTRADA');
    let h = await d.crearHito(a.id, { nombre: 'Kickoff', fase: 'Planificación', fecha: '2026-10-16' });
    assert.match(h.id, /^HIT-/); h = await d.completarHito(h.id, null, h.version); assert.ok(h.completado && h.fechaReal);
    await falla(d.actualizarHito(h.id, { nombre: 'Y' }, 'vieja'), 'CONFLICTO');
    const L = await d.listarHitos(a.id); assert.strictEqual(L.length, 1); assert.strictEqual(L[0].semaforo.k, 'done');
    const F = await d.fases(a.id); assert.strictEqual(F.length, 4); assert.strictEqual(F[0].done, 1);
  });
  await caso('riesgos: crítico exige mitigación; nivel y exposición', async () => {
    const d = fabrica(); const a = await d.crear(prj());
    await falla(d.crearRiesgo(a.id, { desc: 'R', prob: 5, imp: 4 }), 'INVALIDA', 'mit');
    await falla(d.crearRiesgo(a.id, { desc: 'R', prob: 6, imp: 1, mit: 'x' }), 'INVALIDA', 'prob');
    let r = await d.crearRiesgo(a.id, { desc: 'R', prob: 5, imp: 4, mit: 'Plan B' }); assert.match(r.id, /^RSK-/);
    await falla(d.actualizarRiesgo(r.id, { mit: '' }, r.version), 'INVALIDA', 'mit');
    r = await d.actualizarRiesgo(r.id, { estado: 'Cerrado', mit: '' }, r.version); assert.strictEqual(r.estado, 'Cerrado');
    const L = await d.listarRiesgos(a.id); assert.strictEqual(L[0].exposicion, 20);
  });
  await caso('cambiarFase valida la fase del tipo y actualiza faseDesde', async () => {
    const d = fabrica(); const a = await d.crear(prop({ sponsor: 'Luis', desc: 'd' }));
    await falla(d.cambiarFase(a.id, 'Ejecución', a.version), 'INVALIDA', 'fase');
    const b = await d.cambiarFase(a.id, 'Evaluación', a.version); assert.strictEqual(b.fase, 'Evaluación'); assert.ok(b.faseDesde);
  });
  await caso('aprobarPropuesta crea PRJ con propuestaOrigen y cierra la propuesta', async () => {
    const d = fabrica(); let p = await d.crear(prop({ finPlan: '2027-03-01' }));
    await falla(d.aprobarPropuesta(p.id, p.version), 'COMPUERTA');
    p = await d.actualizar(p.id, { sponsor: 'Luis', desc: 'd', score: { estrategia: 3, valor: 3, esfuerzo: 3, riesgo: 2 }, presupuesto: 10, beneficio: 5, bc: 'bc' }, p.version);
    for (const f of ['Evaluación', 'Caso de Negocio', 'Aprobación']) p = await d.cambiarFase(p.id, f, p.version);
    const h0 = await d.crearHito(p.id, { nombre: 'Tentativo', fecha: '2026-11-01' });
    const r = await d.aprobarPropuesta(p.id, p.version);
    assert.strictEqual(r.propuesta.estado, 'Aprobada'); assert.match(r.proyecto.id, /^PRJ-/);
    assert.strictEqual(r.proyecto.propuestaOrigen, p.id); assert.strictEqual(r.proyecto.fase, 'Planificación');
    assert.strictEqual((await d.listarHitos(r.proyecto.id)).length, 1, 'hitos pasan al proyecto');
    await falla(d.aprobarPropuesta(p.id, r.propuesta.version), 'COMPUERTA');
  });
  await caso('eliminar con version; limpia dependencias', async () => {
    const d = fabrica(); const a = await d.crear(prj()); const b = await d.crear(prj({ deps: [a.id] }));
    await falla(d.eliminar(a.id, 'vieja'), 'CONFLICTO');
    await d.eliminar(a.id, a.version);
    await falla(d.obtener(a.id), 'NO_ENCONTRADA'); assert.deepStrictEqual((await d.obtener(b.id)).deps, []);
  });
  await caso('rol Lectura: lee pero no escribe (SIN_PERMISO)', async () => {
    const d = fabrica({ puedeEscribir: false });
    await falla(d.crear(prop()), 'SIN_PERMISO'); assert.deepStrictEqual(await d.listar(), []);
  });
  await caso('registros genéricos: crear, actualizar con versión, conflicto, eliminar; sello cambia', async () => {
    const d = fabrica(); const s0 = (await d.sello()).sello;
    let r = await d.guardarRegistro('APIH_Decisiones', 'DEC-001', '{"a":1}'); assert.ok(r.version);
    await falla(d.guardarRegistro('APIH_Decisiones', 'DEC-001', '{"a":2}'), 'CONFLICTO');
    r = await d.guardarRegistro('APIH_Decisiones', 'DEC-001', '{"a":2}', r.version);
    await falla(d.guardarRegistro('APIH_Decisiones', 'DEC-001', '{"a":3}', 'vieja'), 'CONFLICTO');
    assert.deepStrictEqual((await d.listarRegistros('APIH_Decisiones')).map(x => x.datos), ['{"a":2}']);
    assert.notStrictEqual((await d.sello()).sello, s0);
    await falla(d.guardarRegistro('APIH_Roles', 'usuarios', '[]'), 'SIN_PERMISO');
    await falla(d.guardarRegistro('mala lista', 'x', '1'), 'INVALIDA', 'lista');
    await d.eliminarRegistro('APIH_Decisiones', 'DEC-001', r.version); assert.strictEqual((await d.listarRegistros('APIH_Decisiones')).length, 0);
  });
  await caso('aprobación al estilo de la SPA: PRJ con propuestaOrigen y luego propuesta «Aprobada»', async () => {
    const d = fabrica(); let p = await d.crear(prop({ sponsor: 'Luis', desc: 'd', score: { estrategia: 3, valor: 3, esfuerzo: 3, riesgo: 2 }, presupuesto: 10, beneficio: 5, bc: 'bc' }));
    await falla(d.crear(prj({ id: 'PRJ-077', propuestaOrigen: p.id, motivoAlta: '' })), 'COMPUERTA');
    for (const f of ['Evaluación', 'Caso de Negocio', 'Aprobación']) p = await d.cambiarFase(p.id, f, p.version);
    await falla(d.cambiarEstado(p.id, { estado: 'Aprobada' }, p.version), 'INVALIDA', 'estado');
    const n = await d.crear(prj({ id: 'PRJ-077', propuestaOrigen: p.id, motivoAlta: '' })); assert.strictEqual(n.id, 'PRJ-077');
    p = await d.cambiarEstado(p.id, { estado: 'Aprobada' }, p.version); assert.strictEqual(p.estado, 'Aprobada');
  });
  return ok;
};
