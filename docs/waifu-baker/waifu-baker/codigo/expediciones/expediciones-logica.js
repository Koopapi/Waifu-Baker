/*!
 * expediciones-logica.js · Waifu Baker
 * Reglas de las Expediciones como funciones puras: poder, calificación, botín y eventos.
 * Funciona igual en el navegador y en Node, así que el servidor puede usar este mismo archivo:
 *   const E = require('./expediciones-logica.js');
 *
 * En producción el SERVIDOR decide: calcula el poder al enviar, guarda una semilla
 * y al reclamar llama a resolver(). El navegador solo muestra el resultado.
 */
(function (g) {
  'use strict';

  var PODER = { N: 10, R: 14, SR: 20, SSR: 28, UR: 34 };

  var DURACIONES = [
    { id: '30m', minutos: 30,  etiqueta: '30 min', tiradas: 1, eventos: 1, xp: 4 },
    { id: '2h',  minutos: 120, etiqueta: '2 h',    tiradas: 3, eventos: 2, xp: 12 },
    { id: '8h',  minutos: 480, etiqueta: '8 h',    tiradas: 9, eventos: 3, xp: 30 }
  ];

  var CALIFICACIONES = [
    { id: 'excelente', nombre: 'Excelente', min: 1.4, botin: 1.25 },
    { id: 'bien',      nombre: 'Bien',      min: 1.0, botin: 1.0 },
    { id: 'normal',    nombre: 'Normal',    min: 0.6, botin: 0.8 },
    { id: 'dificil',   nombre: 'Difícil',   min: 0,   botin: 0.5 }
  ];

  // Experiencia acumulada para llegar a cada nivel (índice 0 = nivel 1).
  var NIVELES_VINCULO = [0, 50, 150, 300, 500, 750, 1000, 1500, 2000, 2500];
  var RECOMPENSAS_VINCULO = {
    2: 'Frase de presentación en su ficha',
    3: 'Escenas propias en los reportes',
    5: 'Diálogo especial al abrir su ficha',
    7: 'Marco de vínculo para todas sus cartas',
    10: 'Fondo alterno para su carta por capas'
  };

  var EVENTOS_BASE = { escena: 0.45, bueno: 0.30, malo: 0.20, encuentro: 0.05 };

  /* ---------- azar con semilla (mismo envío = mismo resultado) ---------- */
  function azar(semilla) {
    var a = semilla >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function entero(r, min, max) { return min + Math.floor(r() * (max - min + 1)); }
  function ponderado(r, items, peso) {
    var total = 0, i;
    for (i = 0; i < items.length; i++) total += peso(items[i]);
    var x = r() * total;
    for (i = 0; i < items.length; i++) { x -= peso(items[i]); if (x < 0) return items[i]; }
    return items[items.length - 1];
  }
  function barajar(r, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function nuevaSemilla() { return (Math.random() * 4294967296) >>> 0; }

  /* ---------- vínculo ---------- */
  function nivelVinculo(xp) {
    var n = 1;
    for (var i = 1; i < NIVELES_VINCULO.length; i++) if (xp >= NIVELES_VINCULO[i]) n = i + 1;
    return n;
  }
  function progresoVinculo(xp) {
    var n = nivelVinculo(xp), desde = NIVELES_VINCULO[n - 1], hasta = NIVELES_VINCULO[n];
    if (hasta == null) return { nivel: n, maximo: true, desde: desde, hasta: desde, fraccion: 1 };
    return { nivel: n, maximo: false, desde: desde, hasta: hasta, fraccion: (xp - desde) / (hasta - desde) };
  }
  function siguienteRecompensa(nivel) {
    for (var n = nivel + 1; n <= NIVELES_VINCULO.length; n++) if (RECOMPENSAS_VINCULO[n]) return { nivel: n, texto: RECOMPENSAS_VINCULO[n] };
    return null;
  }

  /* ---------- poder y calificación ---------- */
  function terrenos(carta, personaje) {
    var t = [personaje.terreno];
    if (carta.terrenoExtra && t.indexOf(carta.terrenoExtra) < 0) t.push(carta.terrenoExtra);
    return t;
  }

  // P = base × terreno(1.5) × holo(1.15) × (1 + 0.05·nivel de carta) × (1 + 0.02·(nivel de vínculo − 1))
  function poderCarta(carta, personaje, zona, nivelVinc) {
    var base = PODER[carta.rareza] || 10;
    var enTerreno = terrenos(carta, personaje).indexOf(zona.terreno) >= 0;
    var nv = Math.max(1, nivelVinc || 1);
    var poder = base * (enTerreno ? 1.5 : 1) * (carta.holo ? 1.15 : 1) * (1 + 0.05 * (carta.nivel || 0)) * (1 + 0.02 * (nv - 1));
    return { poder: poder, base: base, enTerreno: enTerreno, holo: !!carta.holo, nivelVinculo: nv };
  }

  function calificacion(r) {
    for (var i = 0; i < CALIFICACIONES.length; i++) if (r >= CALIFICACIONES[i].min) return CALIFICACIONES[i];
    return CALIFICACIONES[CALIFICACIONES.length - 1];
  }

  // equipo: [{ carta, personaje, nivelVinculo }]
  function evaluar(equipo, zona) {
    var detalle = equipo.map(function (m) { return Object.assign({ id: m.carta.id }, poderCarta(m.carta, m.personaje, zona, m.nivelVinculo)); });
    var suma = detalle.reduce(function (a, d) { return a + d.poder; }, 0);
    var sinergias = [];
    if (equipo.length === 3) {
      var roles = {};
      equipo.forEach(function (m) { roles[m.personaje.rol] = 1; });
      if (Object.keys(roles).length === 3) sinergias.push({ id: 'roles', nombre: 'Tres roles distintos', bono: 0.10 });
    }
    var duo = buscarDuo(equipo.map(function (m) { return m.personaje; }));
    if (duo) sinergias.push({ id: 'duo', nombre: 'Dúo: ' + duo[0].nombre + ' y ' + duo[1].nombre, bono: 0.10 });
    var bono = sinergias.reduce(function (a, s) { return a + s.bono; }, 0);
    var poder = suma * (1 + bono);
    var r = zona.dificultad ? poder / zona.dificultad : 0;
    return { detalle: detalle, suma: suma, sinergias: sinergias, bono: bono, poder: poder, r: r, calificacion: calificacion(r) };
  }

  function buscarDuo(personajes) {
    for (var i = 0; i < personajes.length; i++)
      for (var j = i + 1; j < personajes.length; j++)
        if (personajes[i].duo === personajes[j].id || personajes[j].duo === personajes[i].id) return [personajes[i], personajes[j]];
    return null;
  }

  /* ---------- botín ---------- */
  function rolesDe(equipo) { var r = {}; equipo.forEach(function (m) { r[m.rol] = 1; }); return r; }

  // La Buscatesoros multiplica ×1.5 sobre y carta, y lo descuenta de galletas (siguen sumando 100%).
  function tablaBotin(zona, roles, base) {
    var t = base.map(function (e) { return { tipo: e.tipo, peso: e.peso }; });
    if (roles['Buscatesoros']) {
      var extra = 0;
      t.forEach(function (e) { if (e.tipo === 'sobre' || e.tipo === 'carta') { extra += e.peso * 0.5; e.peso *= 1.5; } });
      t.forEach(function (e) { if (e.tipo === 'galletas') e.peso -= extra; });
    }
    var total = t.reduce(function (a, e) { return a + e.peso; }, 0);
    return t.map(function (e) {
      var out = { tipo: e.tipo, prob: e.peso / total };
      if (e.tipo === 'galletas') { out.min = zona.galletas[0]; out.max = zona.galletas[1]; if (roles['Recolectora']) { out.min = Math.round(out.min * 1.3); out.max = Math.round(out.max * 1.3); } }
      if (e.tipo === 'fragmento') out.cantidad = roles['Cartógrafa'] ? 2 : 1;
      if (e.tipo === 'carta') out.carta = zona.carta;
      return out;
    });
  }

  function probEventos(roles) {
    var p = { bueno: EVENTOS_BASE.bueno, malo: EVENTOS_BASE.malo, encuentro: EVENTOS_BASE.encuentro };
    if (roles['Guardiana']) p.malo /= 2;
    if (roles['Carismática']) p.encuentro *= 2;
    p.escena = 1 - p.bueno - p.malo - p.encuentro;
    return p;
  }

  // Valor esperado, para mostrarlo antes de enviar (sin contar eventos).
  function esperado(zona, roles, duracion, calif, base) {
    var t = tablaBotin(zona, roles, base), tir = duracion.tiradas * calif.botin, out = { tiradas: tir, galletas: 0, fragmentos: 0, sobre: 0, carta: 0 };
    t.forEach(function (e) {
      if (e.tipo === 'galletas') out.galletas = tir * e.prob * (e.min + e.max) / 2;
      if (e.tipo === 'fragmento') out.fragmentos = tir * e.prob * e.cantidad;
      if (e.tipo === 'sobre') out.sobre = 1 - Math.pow(1 - e.prob, tir);
      if (e.tipo === 'carta') out.carta = 1 - Math.pow(1 - e.prob, tir);
    });
    return out;
  }

  /* ---------- eventos ---------- */
  function elegirPlantilla(r, tipo, equipo, zona, roles, plantillas, usadas) {
    var duo = buscarDuo(equipo.map(function (m) { return { id: m.personaje, nombre: m.nombre, duo: m.duo }; }));
    var cand = plantillas.filter(function (p) {
      if (p.tipo !== tipo || usadas[p.id]) return false;
      if (p.zona && p.zona !== zona.id) return false;
      if ((p.n || 0) > equipo.length) return false;
      if (p.rol && !roles[p.rol]) return false;
      if (p.duo && !duo) return false;
      return true;
    });
    if (!cand.length) return null;
    var p = ponderado(r, cand, function (x) { return x.zona || x.rol || x.duo ? 2 : 1; });
    usadas[p.id] = 1;
    var orden = barajar(r, equipo);
    var conRol = p.rol ? equipo.filter(function (m) { return m.rol === p.rol; }) : [];
    var texto = p.texto
      .replace(/\{A\}/g, orden[0] ? orden[0].nombre : '')
      .replace(/\{B\}/g, orden[1] ? orden[1].nombre : '')
      .replace(/\{C\}/g, orden[2] ? orden[2].nombre : '')
      .replace(/\{R\}/g, conRol.length ? conRol[Math.floor(r() * conRol.length)].nombre : '')
      .replace(/\{D1\}/g, duo ? duo[0].nombre : '')
      .replace(/\{D2\}/g, duo ? duo[1].nombre : '')
      .replace(/\{zona\}/g, zona.nombre);
    return { id: p.id, texto: texto };
  }

  /*
   * exp: { semilla, zona (id), duracion (id), calificacion (id),
   *        equipo: [{ carta, personaje, nombre, rol, duo }] }  ← copia guardada al enviar
   * datos: { zonas, botinBase, plantillas }
   */
  function resolver(exp, datos) {
    var r = azar(exp.semilla);
    var zona = datos.zonas.filter(function (z) { return z.id === exp.zona; })[0];
    var dur = DURACIONES.filter(function (d) { return d.id === exp.duracion; })[0];
    var calif = CALIFICACIONES.filter(function (c) { return c.id === exp.calificacion; })[0];
    var roles = rolesDe(exp.equipo);
    var pe = probEventos(roles), usadas = {}, eventos = [], extra = 0, galletasEventos = 0;

    for (var i = 0; i < dur.eventos; i++) {
      var tipo = ponderado(r, ['escena', 'bueno', 'malo', 'encuentro'], function (k) { return pe[k]; });
      var ev = elegirPlantilla(r, tipo, exp.equipo, zona, roles, datos.plantillas, usadas);
      if (!ev) { tipo = 'escena'; ev = elegirPlantilla(r, tipo, exp.equipo, zona, roles, datos.plantillas, usadas); }
      if (!ev) continue;
      var efecto = null;
      if (tipo === 'bueno') { extra += 1; efecto = '+1 tirada'; }
      if (tipo === 'malo') { extra -= 1; efecto = '−1 tirada'; }
      if (tipo === 'encuentro') { var gx = entero(r, 10, 30); galletasEventos += gx; efecto = '+' + gx + ' galletas'; }
      eventos.push({ tipo: tipo, texto: ev.texto, efecto: efecto });
    }

    var base = dur.tiradas * calif.botin;
    var tiradas = Math.floor(base) + (r() < base - Math.floor(base) ? 1 : 0);
    tiradas = Math.max(1, tiradas + extra);

    var tabla = tablaBotin(zona, roles, datos.botinBase);
    var botin = { galletas: galletasEventos, fragmentos: 0, sobres: 0, cartas: [], vacias: 0 };
    for (var k = 0; k < tiradas; k++) {
      var e = ponderado(r, tabla, function (x) { return x.prob; });
      if (e.tipo === 'galletas') botin.galletas += entero(r, e.min, e.max);
      else if (e.tipo === 'fragmento') botin.fragmentos += e.cantidad;
      else if (e.tipo === 'sobre') botin.sobres += 1;
      else if (e.tipo === 'carta') botin.cartas.push(e.carta);
      else botin.vacias += 1;
    }

    return { eventos: eventos, tiradas: tiradas, botin: botin, xp: dur.xp, calificacion: calif };
  }

  var api = {
    PODER: PODER, DURACIONES: DURACIONES, CALIFICACIONES: CALIFICACIONES,
    NIVELES_VINCULO: NIVELES_VINCULO, RECOMPENSAS_VINCULO: RECOMPENSAS_VINCULO, EVENTOS_BASE: EVENTOS_BASE,
    azar: azar, nuevaSemilla: nuevaSemilla,
    nivelVinculo: nivelVinculo, progresoVinculo: progresoVinculo, siguienteRecompensa: siguienteRecompensa,
    terrenos: terrenos, poderCarta: poderCarta, evaluar: evaluar, calificacion: calificacion, buscarDuo: buscarDuo,
    tablaBotin: tablaBotin, probEventos: probEventos, esperado: esperado, rolesDe: rolesDe, resolver: resolver
  };
  g.Expediciones = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
