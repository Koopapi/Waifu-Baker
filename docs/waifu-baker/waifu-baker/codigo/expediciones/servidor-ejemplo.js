/*
 * servidor-ejemplo.js · Waifu Baker · Expediciones
 * Servidor de referencia con Express. Usa el MISMO archivo de reglas que el prototipo.
 *
 *   npm install express
 *   node servidor-ejemplo.js        → http://localhost:3000
 *
 * Guarda todo en memoria para que sea fácil de leer. En el sitio real:
 *   - `usuario(req)` sale de su sesión de Patreon, no de un encabezado.
 *   - `jugadores` es su base de datos (ver tablas en LEEME.md).
 *   - reclamar debe correr en una transacción.
 */
const express = require('express');
const E = require('./expediciones-logica.js');
const D = require('./expediciones-datos.js');

const ZONA = Object.fromEntries(D.zonas.map(z => [z.id, z]));
const PERS = Object.fromEntries(D.personajes.map(p => [p.id, p]));
const CARTA = Object.fromEntries(D.cartas.map(c => [c.id, c]));
const DUR = Object.fromEntries(E.DURACIONES.map(d => [d.id, d]));
const ORDEN = D.zonas.slice().sort((a, b) => a.orden - b.orden);

/* ---------- "base de datos" en memoria ---------- */
const jugadores = new Map();
function jugador(id) {
  if (!jugadores.has(id)) {
    const i = D.inicial;
    jugadores.set(id, {
      galletas: i.galletas, fragmentos: i.fragmentos, sobres: i.sobres,
      zonas: [...i.zonas], coleccion: [...i.coleccion],
      vinculo: { ...i.vinculo }, expediciones: [], completadas: 0, n: 0
    });
  }
  return jugadores.get(id);
}
const usuario = req => String(req.get('x-usuario') || 'demo');   // ← cambiar por la sesión real

const espacios = j => 2 + (j.completadas >= 10 ? 1 : 0) + (j.zonas.includes('camara') ? 1 : 0);
const nivelV = (j, pid) => E.nivelVinculo(j.vinculo[pid] || 0);
const enCurso = j => j.expediciones.filter(x => x.estado === 'en_curso');
const ocupadas = j => new Set(enCurso(j).flatMap(x => x.equipo.map(m => m.carta)));

class Rechazo extends Error { constructor(codigo, mensaje) { super(mensaje); this.codigo = codigo; } }

// Valida un equipo y devuelve lo que necesita evaluar(); lanza Rechazo si algo no cuadra.
function armarEquipo(j, zonaId, cartaIds) {
  const zona = ZONA[zonaId];
  if (!zona) throw new Rechazo('zona_no_existe', 'Esa zona no existe.');
  if (!j.zonas.includes(zonaId)) throw new Rechazo('zona_cerrada', 'Esa zona sigue con niebla.');
  if (!Array.isArray(cartaIds) || cartaIds.length < 1 || cartaIds.length > 3) throw new Rechazo('equipo_invalido', 'El equipo lleva de 1 a 3 cartas.');
  if (new Set(cartaIds).size !== cartaIds.length) throw new Rechazo('equipo_invalido', 'Una carta está repetida.');
  const ocu = ocupadas(j), vistos = new Set();
  const equipo = cartaIds.map(id => {
    const carta = CARTA[id];
    if (!carta || !j.coleccion.includes(id)) throw new Rechazo('carta_ajena', 'No tienes esa carta.');
    if (ocu.has(id)) throw new Rechazo('carta_ocupada', 'Esa carta ya está en otra expedición.');
    const personaje = PERS[carta.personaje];
    if (vistos.has(personaje.id)) throw new Rechazo('personaje_repetido', personaje.nombre + ' ya va en el equipo.');
    vistos.add(personaje.id);
    return { carta, personaje, nivelVinculo: nivelV(j, personaje.id) };
  });
  return { zona, equipo };
}

const vista = x => ({ id: x.id, zona: x.zona, duracion: x.duracion, inicia: x.inicia, termina: x.termina,
  poder: x.poder, calificacion: x.calificacion, equipo: x.equipo, lista: Date.now() >= x.termina });

/* ---------- rutas ---------- */
const app = express();
app.use(express.json());
app.use(express.static(__dirname));   // sirve expediciones.html para probar

app.get('/api/expediciones/zonas', (req, res) => {
  const j = jugador(usuario(req));
  const siguiente = ORDEN.find(z => !j.zonas.includes(z.id));
  res.json(ORDEN.map(z => ({ ...z, abierta: j.zonas.includes(z.id), sePuedeAbrir: !!siguiente && siguiente.id === z.id && j.fragmentos >= z.fragmentos })));
});

app.get('/api/expediciones', (req, res) => {
  const j = jugador(usuario(req));
  res.json({ espacios: espacios(j), galletas: j.galletas, fragmentos: j.fragmentos, sobres: j.sobres, expediciones: enCurso(j).map(vista) });
});

// Calcula sin enviar: para la barra de poder y la calificación en vivo.
app.post('/api/expediciones/previa', (req, res) => {
  const j = jugador(usuario(req));
  const { zona, equipo } = armarEquipo(j, req.body.zona, req.body.cartas);
  const ev = E.evaluar(equipo, zona);
  const roles = E.rolesDe(equipo.map(m => ({ rol: m.personaje.rol })));
  const dur = DUR[req.body.duracion] || DUR['2h'];
  res.json({ poder: ev.poder, calificacion: ev.calificacion, sinergias: ev.sinergias, detalle: ev.detalle,
    esperado: E.esperado(zona, roles, dur, ev.calificacion, D.botinBase) });
});

app.post('/api/expediciones', (req, res) => {
  const j = jugador(usuario(req));
  const dur = DUR[req.body.duracion];
  if (!dur) throw new Rechazo('duracion_invalida', 'Duración no válida.');
  if (enCurso(j).length >= espacios(j)) throw new Rechazo('sin_espacio', 'No hay espacios libres.');
  const { zona, equipo } = armarEquipo(j, req.body.zona, req.body.cartas);
  const ev = E.evaluar(equipo, zona), ahora = Date.now();
  const x = {
    id: 'x' + (++j.n), zona: zona.id, duracion: dur.id,
    inicia: ahora, termina: ahora + dur.minutos * 60000,          // hora del SERVIDOR
    semilla: E.nuevaSemilla(),                                     // se guarda; el cliente nunca la ve
    poder: Math.round(ev.poder * 10) / 10, calificacion: ev.calificacion.id,   // poder congelado
    equipo: equipo.map(m => ({ carta: m.carta.id, personaje: m.personaje.id, nombre: m.personaje.nombre, rol: m.personaje.rol, duo: m.personaje.duo })),
    estado: 'en_curso', resultado: null
  };
  j.expediciones.push(x);
  res.status(201).json(vista(x));
});

app.post('/api/expediciones/:id/reclamar', (req, res) => {
  const j = jugador(usuario(req));
  const x = j.expediciones.find(e => e.id === req.params.id);
  if (!x) throw new Rechazo('no_existe', 'Esa expedición no existe.');
  if (x.estado === 'reclamada') return res.json(x.resultado);            // reclamar dos veces no da doble botín
  if (x.estado !== 'en_curso') throw new Rechazo('cancelada', 'Esa expedición se canceló.');
  if (Date.now() < x.termina) throw new Rechazo('aun_no', 'El equipo todavía no vuelve.');

  // ---- en producción, desde aquí hasta el final va en UNA transacción ----
  const r = E.resolver(x, D), b = r.botin;
  const vinculoAntes = Object.fromEntries(x.equipo.map(m => [m.personaje, j.vinculo[m.personaje] || 0]));
  j.galletas += b.galletas; j.fragmentos += b.fragmentos; j.sobres += b.sobres;
  const cartas = b.cartas.map(id => {
    const nueva = !j.coleccion.includes(id);
    if (nueva) j.coleccion.push(id); else j.galletas += 50;
    return { id, nueva };
  });
  x.equipo.forEach(m => { j.vinculo[m.personaje] = (j.vinculo[m.personaje] || 0) + r.xp; });
  j.completadas += 1;
  x.estado = 'reclamada';
  x.resultado = { ...r, cartas, vinculoAntes };
  // ---- fin de la transacción ----
  res.json(x.resultado);
});

app.post('/api/expediciones/:id/cancelar', (req, res) => {
  const j = jugador(usuario(req));
  const x = j.expediciones.find(e => e.id === req.params.id && e.estado === 'en_curso');
  if (!x) throw new Rechazo('no_existe', 'No hay una expedición en curso con ese id.');
  x.estado = 'cancelada';
  res.json({ ok: true });
});

app.post('/api/zonas/:id/abrir', (req, res) => {
  const j = jugador(usuario(req));
  const siguiente = ORDEN.find(z => !j.zonas.includes(z.id));
  if (!siguiente || siguiente.id !== req.params.id) throw new Rechazo('fuera_de_orden', 'Las zonas se abren en orden.');
  if (j.fragmentos < siguiente.fragmentos) throw new Rechazo('faltan_fragmentos', 'Faltan fragmentos de mapa.');
  j.fragmentos -= siguiente.fragmentos;
  j.zonas.push(siguiente.id);
  res.json({ zona: siguiente.id, fragmentos: j.fragmentos, espacios: espacios(j) });
});

// Probabilidades públicas (para la página de Probabilidades).
app.get('/api/probabilidades/expediciones', (req, res) => {
  res.json({
    duraciones: E.DURACIONES, calificaciones: E.CALIFICACIONES, eventos: E.EVENTOS_BASE,
    zonas: D.zonas.map(z => ({ id: z.id, nombre: z.nombre, porTirada: E.tablaBotin(z, {}, D.botinBase) }))
  });
});

app.use((err, req, res, next) => {
  if (err instanceof Rechazo) return res.status(400).json({ error: err.codigo, mensaje: err.message });
  console.error(err);
  res.status(500).json({ error: 'interno', mensaje: 'Algo salió mal.' });
});

if (require.main === module) app.listen(process.env.PORT || 3000, () => console.log('Expediciones en http://localhost:' + (process.env.PORT || 3000)));
module.exports = app;
