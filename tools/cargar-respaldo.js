#!/usr/bin/env node
// Convierte un respaldo JSON de APIH («Respaldo JSON», formato v3) en un SQL que deja la base con esos datos y nada más.
// Uso: node tools/cargar-respaldo.js <respaldo.json> [salida.sql] [--admin correo]
// El SQL se ejecuta UNA vez en el editor SQL de Supabase (rol postgres), después de aplicar_en_supabase.sql.
// El archivo generado contiene datos reales: no se sube al repositorio (está en .gitignore).
const fs = require('fs');
const args = process.argv.slice(2), opt = n => { const i = args.indexOf(n); return i < 0 ? null : args.splice(i, 2)[1]; };
const ADMIN = (opt('--admin') || '').toLowerCase();
const [ENTRADA, SALIDA = 'carga_respaldo.sql'] = args;
if (!ENTRADA) { console.error('Uso: node tools/cargar-respaldo.js <respaldo.json> [salida.sql] [--admin correo]'); process.exit(2); }
const R = JSON.parse(fs.readFileSync(ENTRADA, 'utf8'));
if (!R || !Array.isArray(R.ini) || !R.cfg) { console.error('No parece un respaldo de APIH (faltan ini o cfg)'); process.exit(2); }

const q = s => "'" + String(s).replace(/'/g, "''") + "'";
const filas = [], cuenta = {};
const fila = (lista, id, v) => { if (id == null || id === '') throw new Error(`Registro sin id en ${lista}`); filas.push(`(${q(lista)}, ${q(id)}, ${q('p1.' + JSON.stringify(v))})`); cuenta[lista] = (cuenta[lista] || 0) + 1; };

// Colecciones → listas (mismos nombres que js/01-nucleo.js)
for (const i of R.ini) fila(i.tipo === 'Propuesta' ? 'APIH_Propuestas' : 'APIH_Proyectos', i.id, i);
const COLS = { riesgos: 'APIH_Riesgos', hitos: 'APIH_Hitos', decisiones: 'APIH_Decisiones', compromisos: 'APIH_Compromisos', cambios: 'APIH_Cambios', notas: 'APIH_Notas', documentos: 'APIH_Documentos', bitacora: 'APIH_Bitacora', comites: 'APIH_Comites' };
for (const [c, l] of Object.entries(COLS)) for (const x of R[c] || []) fila(l, x.id, x);

// Configuración (SETTINGS_KEYS de js/02-datos.js). cfgU va por persona: «cfgU:<correo>» con { n, v }
for (const k of ['cfg', 'eventos', 'pres', 'ptpl', 'ptema', 'seq']) if (R[k] !== undefined) fila('APIH_Config', k, R[k]);
const usuarios = R.usuarios || [], nrm = s => String(s || '').trim().toLowerCase();
for (const [nombre, v] of Object.entries(R.cfgU || {})) {
  const u = usuarios.find(x => nrm(x.n) === nrm(nombre));
  fila('APIH_Config', 'cfgU:' + (nrm(u && u.correo) || '~' + nrm(nombre)), { n: (u && u.n) || nombre, v });
}

// Personas → perfiles (el acceso lo decide el servidor). «Administrador» → Administra; el resto, Colaborador de su área.
const perfiles = usuarios.filter(u => u.correo).map(u => {
  const email = nrm(u.correo), adm = u.rol === 'Administrador' || email === ADMIN;
  return `(${q(email)}, ${q(u.n || email)}, ${q(adm ? 'admin' : 'editor')}, ${q(adm ? 'Administra' : 'Colaborador')}, ${q('{' + (u.area ? '"' + String(u.area).replace(/"/g, '') + '"' : '') + '}')}, ${!!(adm || u.veTodo)}, true, ${adm})`;
});
const dominios = [...new Set(usuarios.map(u => nrm(u.correo).split('@')[1]).filter(Boolean))];

const sql = `-- Carga del respaldo de APIH (${new Date().toISOString().slice(0, 10)}). Generado por tools/cargar-respaldo.js. CONTIENE DATOS REALES: no subir al repositorio.
-- Ejecutar una vez en el editor SQL de Supabase, después de aplicar_en_supabase.sql. Borra TODOS los registros y deja solo los del respaldo.
begin;
-- Carga histórica: sin validaciones ni sellos de edición (los datos vienen de la app); luego se completa el área derivada.
alter table public.registros disable trigger user;
delete from public.registros;
insert into public.registros (lista, id, datos) values
${filas.join(',\n')};
update public.registros set area = public.apih_area_de(lista, substr(datos, 4)::jsonb) where left(substr(datos, 4), 1) = '{' and lista <> 'APIH_Config';
alter table public.registros enable trigger user;
${dominios.length ? `insert into public.dominios_permitidos values ${dominios.map(d => `(${q(d)})`).join(', ')} on conflict do nothing;\n` : ''}${perfiles.length ? `insert into public.perfiles (email, nombre, rol, app_rol, areas, ve_todo, ve_montos, gobierna) values
${perfiles.join(',\n')}
on conflict (email) do update set nombre = excluded.nombre, rol = excluded.rol, app_rol = excluded.app_rol, areas = excluded.areas, ve_todo = excluded.ve_todo, ve_montos = excluded.ve_montos, gobierna = excluded.gobierna;\n` : ''}commit;
select lista, count(*) from public.registros group by lista order by lista;
`;
fs.writeFileSync(SALIDA, sql);
console.log('OK', SALIDA, JSON.stringify(cuenta), `perfiles: ${perfiles.length}`, `dominios: ${dominios.join(',')}`);
