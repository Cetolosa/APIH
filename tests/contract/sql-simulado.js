/* C2.1 — Ejecutor SQL simulado: interpreta SOLO las sentencias que emite store-mssql.js, sobre memoria,
 * imitando rowversion (BINARY(8) que cambia en cada escritura), SEQUENCE y OUTPUT. Permite correr el
 * contrato completo contra la lógica de store-mssql sin una base real. NO reemplaza la prueba en Azure SQL. */
'use strict';
module.exports = function crearEjecutorSimulado() {
  const T = {}, seq = {}; let rv = 0n; const log = [];
  const tab = n => (T[n] = T[n] || new Map());
  const ver = () => { rv += 1n; const b = Buffer.alloc(8); b.writeBigUInt64BE(rv); return b; };
  const out = r => ({ id: r.id, doc: r.doc, ver: r.ver });
  async function ej(q, p) {
    log.push(q); let m;
    if (/^SELECT id, datos, ver FROM apih\.registros WHERE lista = @lista$/.test(q)) return [...tab('reg').values()].filter(r => r.lista === p.lista).map(r => ({ id: r.id, datos: r.datos, ver: r.ver }));
    if (/^SELECT 1 AS x FROM apih\.registros WHERE lista = @lista AND id = @id$/.test(q)) return tab('reg').has(p.lista + '|' + p.id) ? [{ x: 1 }] : [];
    if (/^INSERT INTO apih\.registros/.test(q)) { const k = p.lista + '|' + p.id; if (tab('reg').has(k)) { const e = new Error('PK duplicada'); e.number = 2627; throw e; } const r = { lista: p.lista, id: p.id, datos: p.datos, ver: ver() }; tab('reg').set(k, r); return [{ id: r.id, datos: r.datos, ver: r.ver }]; }
    if (/^UPDATE apih\.registros/.test(q)) { const r = tab('reg').get(p.lista + '|' + p.id); if (!r || r.ver.toString('hex') !== p.ver) return []; Object.assign(r, { datos: p.datos, ver: ver() }); return [{ id: r.id, datos: r.datos, ver: r.ver }]; }
    if (/^DELETE FROM apih\.registros/.test(q)) { const k = p.lista + '|' + p.id, r = tab('reg').get(k); if (!r || (/AND ver/.test(q) && r.ver.toString('hex') !== p.ver)) return []; tab('reg').delete(k); return [{ id: p.id }]; }
    if (/^SELECT CONVERT\(VARCHAR\(16\), CAST\(@@DBTS/.test(q)) return [{ v: rv.toString(16).padStart(16, '0'), n: Object.values(T).reduce((a, t) => a + t.size, 0) }];
    if ((m = q.match(/^INSERT INTO (\S+) \(id, doc, modificado_por\) OUTPUT inserted\.id, inserted\.doc, inserted\.ver VALUES \(@id, @doc, @mp\);$/))) {
      if (tab(m[1]).has(p.id)) { const e = new Error('PK duplicada'); e.number = 2627; throw e; } JSON.parse(p.doc); const r = { id: p.id, doc: p.doc, ver: ver() }; tab(m[1]).set(p.id, r); return [out(r)];
    }
    if ((m = q.match(/^SELECT id, doc, ver FROM (\S+)( WHERE id = @id)?$/))) return [...tab(m[1]).values()].filter(r => !m[2] || r.id === p.id).map(out);
    if ((m = q.match(/^SELECT 1 AS x FROM (\S+) WHERE id = @id$/))) return tab(m[1]).has(p.id) ? [{ x: 1 }] : [];
    if ((m = q.match(/NEXT VALUE FOR (\S+);[\s\S]*?INSERT INTO (\S+) \(id, doc, modificado_por\) OUTPUT inserted\.id, inserted\.doc, inserted\.ver VALUES \(@id, @doc, @mp\);$/))) {
      const fmt = n => p.prefijo + '-' + (n < 1000 ? String(n).padStart(3, '0') : String(n));
      let n = seq[m[1]] = (seq[m[1]] || 0) + 1, id = fmt(n); if (!/WHILE EXISTS/.test(q)) throw new Error('falta el salto de ids usados');
      while (tab(m[2]).has(id)) { n = seq[m[1]] = seq[m[1]] + 1; id = fmt(n); } JSON.parse(p.doc); if (!p.mp) throw new Error('modificado_por NOT NULL');
      const r = { id, doc: p.doc, ver: ver() }; tab(m[2]).set(id, r); return [out(r)];
    }
    if ((m = q.match(/^UPDATE (\S+) SET doc = @doc, modificado_por = @mp OUTPUT inserted\.id, inserted\.doc, inserted\.ver WHERE id = @id AND ver = CONVERT\(BINARY\(8\), @ver, 2\);$/))) {
      const r = tab(m[1]).get(p.id); if (!r || r.ver.toString('hex') !== p.ver) return []; JSON.parse(p.doc);
      Object.assign(r, { doc: p.doc, ver: ver() }); return [out(r)];
    }
    if ((m = q.match(/^DELETE FROM (\S+) OUTPUT deleted\.id WHERE id = @id( AND ver = CONVERT\(BINARY\(8\), @ver, 2\))?;$/))) {
      const r = tab(m[1]).get(p.id); if (!r || (m[2] && r.ver.toString('hex') !== p.ver)) return []; tab(m[1]).delete(p.id); return [{ id: p.id }];
    }
    throw new Error('Sentencia no reconocida por el simulador:\n' + q);
  }
  ej.tx = async fn => { const snap = Object.fromEntries(Object.entries(T).map(([k, v]) => [k, new Map([...v].map(([i, r]) => [i, Object.assign({}, r)]))])), s0 = Object.assign({}, seq);
    const et = (q, p) => ej(q, p); et.tx = f => f(et);
    try { return await fn(et); } catch (e) { Object.keys(T).forEach(k => delete T[k]); Object.assign(T, snap); Object.keys(seq).forEach(k => delete seq[k]); Object.assign(seq, s0); throw e; } };
  ej.log = log; ej.T = T;
  return ej;
};
