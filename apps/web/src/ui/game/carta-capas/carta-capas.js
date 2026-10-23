/*!
 * carta-capas.js v3 · Waifu Baker
 * Carta por capas con parallax, partículas, modos de mezcla, marco de rareza,
 * sello flotante (imagen o texto) y holo opcional. Sin dependencias.
 *
 * Uso:
 *   const carta = CartaCapas.montar(document.querySelector('#carta'), {
 *     etiqueta: 'Yuki, SSR',
 *     marco: 'ssr',                       // 'ur' | 'ssr' | 'sr' | 'r' | 'n' | 'ninguno' | un gradiente CSS
 *     borde: 2.2,                         // grosor del marco en % del ancho
 *     capas: [                            // de atrás hacia adelante
 *       { src: 'yuki_1_fondo.webp',       profundidad: 0.2,  margen: 5 },
 *       { particulas: 'destellos-dorados', profundidad: 0.55, margen: 4 },
 *       { src: 'yuki_3_personaje.webp',   profundidad: 1 },
 *       { src: 'yuki_4_particulas1.webp', profundidad: 1.3,  margen: 6, mezcla: 'overlay' },
 *       { src: 'yuki_5_insignia.webp',    profundidad: 1.6 }
 *     ],
 *     sello: { src: 'yuki_ssr.webp', esquina: 'sup-izq', tamano: 36 }
 *     // si el sello es un lienzo completo con el logo en una esquina, `recorte: [x, y, ancho, alto]`
 *     // (fracciones de 0 a 1) y `relacion` (ancho/alto en píxeles del recorte) muestran solo esa parte
 *     // o un sello de texto: { texto: 'SSR', estilo: 'oro', esquina: 'sup-izq', tamano: 14 }
 *   });
 *
 *   carta.set({ holo: true });     // cambia cualquier opción en vivo (también capas, marco y sello)
 *   carta.ocultarSello();          // antes de revelar la carta
 *   carta.entrar();                // el sello aparece con rebote y pasa un destello
 *   carta.habilitarGiroscopio();   // llamar desde un toque del jugador (iOS pide permiso)
 *   carta.listo.then(...);         // promesa: todas las capas cargaron
 *   carta.destruir();
 *
 * Capas de imagen:     { src, profundidad, margen, mezcla, opacidad }
 * Capas de partículas: { particulas: '<tipo>', cantidad, tamano, velocidad, color, semilla,
 *                        profundidad, margen, mezcla, opacidad }
 *   Tipos: ver CartaCapas.particulas (destellos-dorados, destellos-arcoiris, confeti, burbujas,
 *          bokeh, corazones, nieve, chispas, petalos).
 * `margen` = % extra que sobra de la capa en cada lado para que no se vean bordes al moverse.
 *
 * Presets por rareza (v3): para que TODA carta se vea como las cartas por capas aunque solo tenga una imagen.
 *   CartaCapas.montarRareza(el, 'ssr', 'cartas/mika.webp', { etiqueta: 'Mika, SSR' });
 *   CartaCapas.montarRareza(el, 'sr', [ {src:'fondo.webp', profundidad:.2, margen:5}, {src:'personaje.webp'} ]);
 *   const config = CartaCapas.desdeRareza('r', 'cartas/sora.webp');   // solo arma la configuración
 *   Rarezas: 'n' | 'r' | 'sr' | 'ssr' | 'ur'. Con varias capas, las partículas van entre el fondo y la personaje;
 *   con una sola imagen van al frente en modo screen. Lo que pases en el tercer argumento gana.
 *
 * Modo estático (rejillas de colección): { estatica: true } no inclina ni escucha el ratón,
 * deja el marco, el brillo y las partículas, y usa menos partículas. Ideal para muchas cartas a la vez.
 */
(function (global) {
  'use strict';

  var MARCOS = {
    ur:  ['linear-gradient(135deg,#ff7aa8 0%,#ffd36e 17%,#8af0c4 33%,#ffffff 48%,#6ec8ff 62%,#c79bff 80%,#ff7aa8 100%)', 'rgba(200,160,255,.28)'],
    ssr: ['linear-gradient(135deg,#6e4a12 0%,#f7dc8a 18%,#b9862d 34%,#fff3c4 48%,#a0701f 62%,#f2cf6e 80%,#6e4a12 100%)', 'rgba(240,190,90,.24)'],
    sr:  ['linear-gradient(135deg,#4b2a7a 0%,#d4b8ff 20%,#8a5cd6 38%,#f1e6ff 50%,#7344c2 64%,#c9a6ff 82%,#4b2a7a 100%)', 'rgba(170,120,255,.22)'],
    r:   ['linear-gradient(135deg,#1f3f7a 0%,#a9ccff 20%,#4a7fd6 38%,#e6f0ff 50%,#3c6cc2 64%,#9cc2ff 82%,#1f3f7a 100%)', 'rgba(110,160,255,.2)'],
    n:   ['linear-gradient(135deg,#5a6070 0%,#e4e8ef 22%,#9aa1b0 40%,#ffffff 50%,#8a91a0 64%,#d6dbe4 82%,#5a6070 100%)', 'rgba(220,225,235,.12)']
  };
  MARCOS.epica = MARCOS.sr; MARCOS.rara = MARCOS.r; MARCOS.comun = MARCOS.n;

  var SELLOS = {
    oro:      ['linear-gradient(180deg,#fffbe0 0%,#f7d774 38%,#c3861c 58%,#fbe39a 100%)', '#2c1a04'],
    plata:    ['linear-gradient(180deg,#ffffff 0%,#dfe5ee 40%,#8d96a8 60%,#eef2f7 100%)', '#1b2030'],
    arcoiris: ['linear-gradient(180deg,#ffb3d1 0%,#ffe08a 30%,#9ff2cf 55%,#8fd2ff 75%,#d3b0ff 100%)', '#26113d'],
    rosa:     ['linear-gradient(180deg,#fff0f6 0%,#ff9ec2 40%,#d6336c 62%,#ffc2d8 100%)', '#3a0a1e'],
    azul:     ['linear-gradient(180deg,#eef6ff 0%,#9cc8ff 40%,#2f6fd6 62%,#bcdcff 100%)', '#0b1b3a'],
    morado:   ['linear-gradient(180deg,#f6eeff 0%,#c9a6ff 40%,#7344c2 62%,#e2d0ff 100%)', '#1e0b3a']
  };

  // Formas: estrella, punto, rect, aro, bokeh, corazon, petalo · Animaciones: tw, fall, rise, pulse
  var PARTICULAS = {
    'destellos-dorados':  { nombre: 'Destellos dorados', formas: ['estrella', 'punto'], anim: 'tw', cantidad: 60, colores: ['#fff8dc', '#ffe08a', '#ffd36b', '#fffbe9'], brillo: 'rgba(255,214,120,.95)' },
    'destellos-arcoiris': { nombre: 'Destellos de colores', formas: ['estrella', 'punto'], anim: 'tw', cantidad: 60, colores: ['#ff9ec7', '#ffd36e', '#8af0c4', '#7cc8ff', '#c79bff'], brillo: 'rgba(255,255,255,.8)' },
    'confeti':            { nombre: 'Confeti de colores', formas: ['rect'], anim: 'fall', cantidad: 45, colores: ['#ff5c93', '#ffd36e', '#5ce1a5', '#5cb8ff', '#b07cff', '#ff9a5c'] },
    'burbujas':           { nombre: 'Burbujas', formas: ['aro'], anim: 'rise', cantidad: 26, colores: ['#cdeeff', '#ffffff', '#e2d4ff'] },
    'bokeh':              { nombre: 'Luces bokeh', formas: ['bokeh'], anim: 'pulse', cantidad: 18, colores: ['#ff8ab0', '#ffd36e', '#7cc8ff', '#c79bff'] },
    'corazones':          { nombre: 'Corazones', formas: ['corazon'], anim: 'rise', cantidad: 22, colores: ['#ff5c93', '#ff8ab0', '#ffc2d6'] },
    'nieve':              { nombre: 'Nieve', formas: ['punto'], anim: 'fall', cantidad: 60, colores: ['#ffffff', '#eaf4ff'], brillo: 'rgba(255,255,255,.8)' },
    'chispas':            { nombre: 'Chispas de fuego', formas: ['punto'], anim: 'rise', cantidad: 40, colores: ['#ffb35c', '#ffd36e', '#ff7a3d'], brillo: 'rgba(255,140,60,.95)' },
    'petalos':            { nombre: 'Pétalos de sakura', formas: ['petalo'], anim: 'fall', cantidad: 28, colores: ['#ffc2d6', '#ffd9e6', '#ff9ec0'] }
  };

  var TAM = { estrella: [2.2, 6.2], punto: [0.5, 1.4], rect: [1.2, 2.3], aro: [1.6, 5], bokeh: [6, 16], corazon: [2, 4.6], petalo: [1.8, 3.6] };
  var DUR = { tw: [1.8, 4], fall: [6, 12], rise: [6, 11], pulse: [3, 6] };
  var SVG = {
    estrella: '<svg viewBox="-10 -10 20 20"><path d="M0 -10 L1.8 -1.8 L10 0 L1.8 1.8 L0 10 L-1.8 1.8 L-10 0 L-1.8 -1.8Z" fill="var(--c)"/></svg>',
    corazon: '<svg viewBox="0 0 20 18"><path d="M10 17 C2 11 0 7.5 0 5 C0 2 2.4 0 5.2 0 C7.2 0 8.8 1.1 10 2.8 C11.2 1.1 12.8 0 14.8 0 C17.6 0 20 2 20 5 C20 7.5 18 11 10 17Z" fill="var(--c)"/></svg>',
    petalo: '<svg viewBox="0 0 20 20"><path d="M10 1 C15 4 17 10 10 19 C3 10 5 4 10 1Z M10 1 L11.5 4.5 L10 3.6 L8.5 4.5Z" fill="var(--c)"/></svg>'
  };

  var CSS = [
    '.cc{position:relative;container-type:inline-size;perspective:1100px;aspect-ratio:var(--cc-ratio,.7064)}',
    '.cc-card{--px:.5;--py:.5;--hyp:0;--cc-borde:2.2cqw;position:absolute;inset:0;border-radius:5.4cqw;transform-style:preserve-3d;will-change:transform;touch-action:none;outline:none;cursor:grab;transition:opacity .45s ease}',
    '.cc-card:active{cursor:grabbing}',
    '.cc-card.cc-cargando{opacity:0}',
    '.cc-card:focus-visible .cc-in{outline:2px solid #ff8ab0;outline-offset:4px}',
    '.cc-in{position:absolute;inset:0;border-radius:inherit;background:#1a120e;box-shadow:0 0 9cqw var(--cc-aura),0 10cqw 18cqw -7cqw rgba(0,0,0,.8)}',
    '.cc-frame{position:absolute;inset:0;border-radius:inherit;padding:var(--cc-borde);pointer-events:none;z-index:4;background:var(--cc-marco);background-size:240% 240%;background-position:calc(var(--px)*100%) calc(var(--py)*100%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0)}',
    '.cc-art{position:absolute;inset:var(--cc-borde);border-radius:max(1.5cqw,calc(5.4cqw - var(--cc-borde)));overflow:hidden;background:#0c0f18}',
    '.cc-sin-marco .cc-frame{display:none}',
    '.cc-sin-marco .cc-art{inset:0;border-radius:inherit}',
    '.cc-art::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:8;box-shadow:inset 0 0 0 1px rgba(0,0,0,.6),inset 0 0 6cqw rgba(0,0,0,.3)}',
    '.cc-capa{position:absolute;inset:0;will-change:transform}',
    '.cc-capa img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;user-select:none;-webkit-user-drag:none;pointer-events:none}',
    '.cc-part{overflow:visible}',
    '.ccp{position:absolute;width:var(--s);height:var(--s);margin:calc(var(--s) / -2) 0 0 calc(var(--s) / -2);opacity:0;pointer-events:none;will-change:transform,opacity}',
    '.ccp svg{display:block;width:100%;height:100%}',
    '.ccp-estrella{filter:drop-shadow(0 0 .9cqw var(--g,rgba(255,214,120,.95)))}',
    '.ccp-punto{border-radius:50%;background:var(--c);box-shadow:0 0 calc(var(--s) * 1.4) var(--g,var(--c))}',
    '.ccp-rect{height:calc(var(--s) * .45);margin-top:calc(var(--s) * -.225);background:var(--c);border-radius:.15cqw}',
    '.ccp-aro{border-radius:50%;border:.3cqw solid var(--c);background:radial-gradient(circle at 32% 30%,rgba(255,255,255,.75) 0 12%,transparent 13%)}',
    '.ccp-bokeh{border-radius:50%;background:radial-gradient(circle,var(--c) 0%,transparent 68%)}',
    '.ccp-tw{animation:cc-tw var(--d) ease-in-out var(--dl) infinite}',
    '.ccp-fall{animation:cc-fall var(--d) linear var(--dl) infinite}',
    '.ccp-rise{animation:cc-rise var(--d) linear var(--dl) infinite}',
    '.ccp-pulse{animation:cc-pulse var(--d) ease-in-out var(--dl) infinite}',
    '@keyframes cc-tw{0%,100%{opacity:0;transform:scale(.25) rotate(0deg)}45%{opacity:1;transform:scale(1) rotate(30deg)}60%{opacity:.85}}',
    '@keyframes cc-fall{0%{opacity:0;transform:translate(0,0) rotate(0deg)}10%{opacity:1}85%{opacity:1}100%{opacity:0;transform:translate(var(--sw),165cqw) rotate(var(--rot))}}',
    '@keyframes cc-rise{0%{opacity:0;transform:translate(0,0) rotate(0deg)}12%{opacity:1}80%{opacity:.9}100%{opacity:0;transform:translate(var(--sw),-165cqw) rotate(var(--rot))}}',
    '@keyframes cc-pulse{0%,100%{opacity:.12;transform:scale(.85)}50%{opacity:.7;transform:scale(1.1)}}',
    '.cc-holo{position:absolute;inset:0;pointer-events:none;z-index:6;opacity:0;transition:opacity .35s;mix-blend-mode:color-dodge;filter:brightness(.72) saturate(1.15);background:repeating-linear-gradient(115deg,#ff7aa8 0%,#ffd36e 7%,#8af0c4 14%,#6ec8ff 21%,#c79bff 28%,#ff7aa8 35%);background-size:280% 280%;background-position:calc(var(--px)*100%) calc(var(--py)*100%)}',
    '.cc-card.cc-con-holo .cc-holo{opacity:calc(.2 + var(--hyp)*.42)}',
    '.cc-glare{position:absolute;inset:0;pointer-events:none;z-index:7;mix-blend-mode:overlay;background:radial-gradient(farthest-corner circle at calc(var(--px)*100%) calc(var(--py)*100%),rgba(255,255,255,.45) 0%,rgba(255,255,255,.08) 34%,transparent 62%);opacity:calc(.2 + var(--hyp)*.55)}',
    '.cc-sweep{position:absolute;inset:0;pointer-events:none;z-index:7;mix-blend-mode:overlay;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.75) 50%,transparent 65%);transform:translateX(-130%)}',
    '.cc-card.cc-entra .cc-sweep{animation:cc-sweep 1.1s .2s ease-out both}',
    '@keyframes cc-sweep{to{transform:translateX(130%)}}',
    '.cc-sello{position:absolute;width:var(--cc-sello-w,36%);z-index:6;pointer-events:none;will-change:transform}',
    '.cc-sello[data-esquina="sup-izq"]{left:-9%;top:-5%}',
    '.cc-sello[data-esquina="sup-der"]{right:-9%;top:-5%}',
    '.cc-sello[data-esquina="inf-izq"]{left:-9%;bottom:-4%}',
    '.cc-sello[data-esquina="inf-der"]{right:-9%;bottom:-4%}',
    '.cc-sello > *{display:block;animation:cc-bob 3.4s ease-in-out infinite;filter:drop-shadow(0 2.4cqw 3cqw rgba(0,0,0,.5)) drop-shadow(0 0 3cqw rgba(255,210,110,.35))}',
    '.cc-sello > img{width:100%}',
    '.cc-sello-crop{position:relative;overflow:hidden;width:100%}',
    '.cc-sello-crop img{position:absolute;max-width:none;height:auto;display:block}',
    '.cc-sello-texto{width:auto}',
    '.cc-sello-texto[data-esquina="sup-izq"],.cc-sello-texto[data-esquina="inf-izq"]{left:-6%}',
    '.cc-sello-texto[data-esquina="sup-der"],.cc-sello-texto[data-esquina="inf-der"]{right:-6%}',
    '.cc-sello-texto b{position:relative;font:italic 900 var(--cc-sello-t,14cqw)/1 "Arial Black","Segoe UI Black","Helvetica Neue",Impact,system-ui,sans-serif;letter-spacing:-.02em;white-space:nowrap;padding:0 1.5cqw;color:transparent;filter:drop-shadow(0 2cqw 2.4cqw rgba(0,0,0,.5))}',
    '.cc-sello-texto b::before,.cc-sello-texto b::after{content:attr(data-t);position:absolute;inset:0;padding:0 1.5cqw}',
    '.cc-sello-texto b::before{color:var(--cc-sello-borde);-webkit-text-stroke:2cqw var(--cc-sello-borde);text-shadow:0 1.2cqw 0 var(--cc-sello-borde)}',
    '.cc-sello-texto b::after{color:transparent;background:var(--cc-sello-fill);-webkit-background-clip:text;background-clip:text}',
    '.cc-sello.cc-oculto > *{opacity:0;animation:none;transform:scale(.2)}',
    '.cc-sello.cc-pop > *{animation:cc-pop .75s cubic-bezier(.2,1.6,.4,1) both,cc-bob 3.4s ease-in-out .75s infinite}',
    '@keyframes cc-bob{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-1.8cqw) rotate(-2.5deg)}}',
    '@keyframes cc-pop{0%{opacity:0;transform:scale(.2) rotate(-18deg)}100%{opacity:1;transform:scale(1) rotate(0deg)}}',
    '@media (prefers-reduced-motion:reduce){.ccp{animation:none!important;opacity:.6;transform:none}.cc-sello > *,.cc-sello.cc-pop > *{animation:none;opacity:1;transform:none}.cc-card.cc-entra .cc-sweep{animation:none}}'
  ].join('\n');

  function inyectarCSS() {
    var prev = document.getElementById('carta-capas-css');
    if (prev && prev.getAttribute('data-v') === '2') return;
    if (prev) prev.remove();
    var s = document.createElement('style');
    s.id = 'carta-capas-css';
    s.setAttribute('data-v', '2');
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function clamp(v) { return Math.max(-1, Math.min(1, v)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(v, d) { v = Number(v); return isFinite(v) ? v : d; }
  // Lo que va dentro de `style` o de atributos solo puede ser de una lista cerrada (la config puede venir de la BD).
  var MEZCLAS = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light',
    'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity', 'plus-lighter'];
  var ESQUINAS = ['sup-izq', 'sup-der', 'inf-izq', 'inf-der'];
  function mezclaSegura(m) { return MEZCLAS.indexOf(m) >= 0 ? m : 'normal'; }
  function esquinaSegura(e) { return ESQUINAS.indexOf(e) >= 0 ? e : 'sup-izq'; }
  function colorSeguro(c) { return typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : null; }

  function particulasHTML(c, semilla) {
    var p = PARTICULAS[c.particulas] || PARTICULAS['destellos-dorados'];
    var seed = Math.max(1, Math.floor(num(c.semilla, semilla)));
    function r() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    var n = Math.max(0, Math.min(200, Math.round(num(c.cantidad, p.cantidad) * (c._factor || 1))));
    var t = Math.max(.2, num(c.tamano, 1)), v = Math.max(.2, num(c.velocidad, 1));
    var colores = colorSeguro(c.color) ? [c.color] : p.colores, h = '';
    for (var i = 0; i < n; i++) {
      var forma = p.formas.length > 1 ? (r() < .42 ? p.formas[0] : p.formas[1]) : p.formas[0];
      var tm = TAM[forma], du = DUR[p.anim];
      var s = (tm[0] + r() * (tm[1] - tm[0])) * t, d = (du[0] + r() * (du[1] - du[0])) / v;
      var top = p.anim === 'fall' ? -8 : p.anim === 'rise' ? 106 : 3 + r() * 92;
      var estilo = 'left:' + (r() * 100).toFixed(1) + '%;top:' + top.toFixed(1) + '%;--s:' + s.toFixed(2) + 'cqw;--d:' + d.toFixed(2) + 's;--dl:' + (-r() * d).toFixed(2) + 's;--c:' + colores[i % colores.length] +
        ';--sw:' + ((r() - .5) * 20).toFixed(1) + 'cqw;--rot:' + ((r() < .5 ? -1 : 1) * (180 + r() * 540)).toFixed(0) + 'deg' + (p.brillo ? ';--g:' + p.brillo : '');
      h += '<i class="ccp ccp-' + forma + ' ccp-' + p.anim + '" style="' + estilo + '">' + (SVG[forma] || '') + '</i>';
    }
    return h;
  }

  var contador = 0;

  function montar(el, opciones) {
    inyectarCSS();
    var op = Object.assign({
      capas: [], sello: null, marco: 'ssr', aura: null, borde: 2.2, holo: false,
      profundidad: 14, inclinacion: 14, reposo: true, zona: null,
      proporcion: 700 / 991, etiqueta: 'Carta', aparecer: true
    }, opciones || {});
    var id = ++contador;

    el.classList.add('cc');
    el.innerHTML = '<div class="cc-card" tabindex="0" role="img"></div>';
    var card = el.firstChild;
    var capas = [], sello = null, selloOculto = false, primera = true, listo = Promise.resolve();
    var zona = op.zona || el.parentElement || el;

    function capaHTML(c, i) {
      var estilo = 'inset:-' + num(c.margen, 0) + '%;' +
        (mezclaSegura(c.mezcla) !== 'normal' ? 'mix-blend-mode:' + mezclaSegura(c.mezcla) + ';' : '') +
        (c.opacidad != null && c.opacidad !== 1 ? 'opacity:' + num(c.opacidad, 1) + ';' : '');
      var prof = c.profundidad == null ? 1 : num(c.profundidad, 1);
      var tipo = c.particulas || (c.destellos ? 'destellos-dorados' : null);
      if (tipo) {
        var cfg = Object.assign({}, c, { particulas: tipo, _factor: op.estatica ? 0.4 : 1 });
        return '<div class="cc-capa cc-part" data-p="' + prof + '" style="' + estilo + '">' + particulasHTML(cfg, 7 + id + i) + '</div>';
      }
      if (!c.src) return '';
      return '<div class="cc-capa" data-p="' + prof + '" style="' + estilo + '"><img src="' + esc(c.src) + '" alt="" decoding="async" draggable="false"></div>';
    }

    function selloHTML() {
      var s = op.sello;
      if (!s || (!s.src && !s.texto)) return '';
      var esq = esquinaSegura(s.esquina);
      if (s.src) {
        var rc = s.recorte, img;
        if (rc && rc.length === 4 && rc[2] > 0 && rc[3] > 0) {
          img = '<div class="cc-sello-crop" style="aspect-ratio:' + num(s.relacion, rc[2] / rc[3]) + '"><img src="' + esc(s.src) + '" alt="" draggable="false" style="width:' + (100 / rc[2]).toFixed(3) + '%;left:' + (-rc[0] / rc[2] * 100).toFixed(3) + '%;top:' + (-rc[1] / rc[3] * 100).toFixed(3) + '%"></div>';
        } else {
          img = '<img src="' + esc(s.src) + '" alt="" draggable="false">';
        }
        return '<div class="cc-sello" data-esquina="' + esq + '" style="--cc-sello-w:' + num(s.tamano, 36) + '%">' + img + '</div>';
      }
      var est = SELLOS[s.estilo] || SELLOS.oro;
      return '<div class="cc-sello cc-sello-texto" data-esquina="' + esq + '" style="--cc-sello-t:' + num(s.tamano, 14) + 'cqw;--cc-sello-fill:' + est[0] + ';--cc-sello-borde:' + est[1] + '"><b data-t="' + esc(s.texto) + '">' + esc(s.texto) + '</b></div>';
    }

    function render() {
      el.style.setProperty('--cc-ratio', num(op.proporcion, 700 / 991));
      card.setAttribute('aria-label', op.etiqueta || 'Carta');
      card.innerHTML = '<div class="cc-in"><div class="cc-art">' +
        (op.capas || []).map(function (c, i) { return c && c.visible !== false ? capaHTML(c, i) : ''; }).join('') +
        '<div class="cc-holo"></div><div class="cc-glare"></div><div class="cc-sweep"></div></div><div class="cc-frame"></div></div>' + selloHTML();
      capas = [].slice.call(card.querySelectorAll('.cc-capa'));
      sello = card.querySelector('.cc-sello');
      if (sello && selloOculto) sello.classList.add('cc-oculto');

      var sin = !op.marco || op.marco === 'ninguno';
      var m = MARCOS[op.marco] || [op.marco, null];
      card.classList.toggle('cc-sin-marco', sin);
      card.style.setProperty('--cc-marco', sin ? 'none' : m[0]);
      card.style.setProperty('--cc-aura', op.aura || m[1] || 'rgba(255,255,255,.12)');
      card.style.setProperty('--cc-borde', num(op.borde, 2.2) + 'cqw');
      card.classList.toggle('cc-con-holo', !!op.holo);

      if (primera && op.aparecer) {
        card.classList.add('cc-cargando');
        var imgs = [].slice.call(card.querySelectorAll('img'));
        listo = Promise.race([
          Promise.all(imgs.map(function (im) {
            return im.complete ? Promise.resolve() : new Promise(function (ok) { im.onload = im.onerror = ok; });
          })),
          new Promise(function (ok) { setTimeout(ok, 4000); })
        ]).then(function () { card.classList.remove('cc-cargando'); });
      }
      primera = false;
    }
    render();

    var reducir = false;
    try { reducir = global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    var tx = 0, ty = 0, x = 0, y = 0, activo = false, arrastrando = false, giro = false, timerTecla = null;
    var visible = true, raf = 0, fase = id * 1.7;

    function desdePuntero(ev) {
      var r = el.getBoundingClientRect();
      tx = clamp((ev.clientX - (r.left + r.width / 2)) / (r.width / 2));
      ty = clamp((ev.clientY - (r.top + r.height / 2)) / (r.height / 2));
    }
    function onMove(ev) { if (ev.pointerType === 'mouse' || arrastrando) { desdePuntero(ev); activo = true; } }
    function onLeave(ev) { if (ev.pointerType === 'mouse' && !arrastrando) { activo = false; tx = ty = 0; } }
    function onDown(ev) { arrastrando = true; try { card.setPointerCapture(ev.pointerId); } catch (e) {} desdePuntero(ev); activo = true; }
    function onUp(ev) { arrastrando = false; if (ev.pointerType !== 'mouse') { activo = false; tx = ty = 0; } }
    function onKey(ev) {
      var k = ev.key, p = .7;
      if (k === 'ArrowLeft') tx = -p; else if (k === 'ArrowRight') tx = p;
      else if (k === 'ArrowUp') ty = -p; else if (k === 'ArrowDown') ty = p; else return;
      ev.preventDefault(); activo = true; clearTimeout(timerTecla);
      timerTecla = setTimeout(function () { activo = false; tx = ty = 0; }, 1400);
    }
    function onOri(e) {
      if (e.gamma == null || arrastrando) return;
      giro = true; tx = clamp(e.gamma / 25); ty = clamp((e.beta - 40) / 25);
    }

    if (op.estatica) {
      card.removeAttribute('tabindex');
      card.style.cursor = 'default';
    } else {
      zona.addEventListener('pointermove', onMove);
      zona.addEventListener('pointerleave', onLeave);
      card.addEventListener('pointerdown', onDown);
      card.addEventListener('pointerup', onUp);
      card.addEventListener('pointercancel', onUp);
      card.addEventListener('keydown', onKey);
    }

    var io = null;
    if ('IntersectionObserver' in global) {
      io = new IntersectionObserver(function (ents) {
        visible = ents[0].isIntersecting;
        if (visible && !raf && !op.estatica) raf = requestAnimationFrame(cuadro);
      });
      io.observe(el);
    }

    function cuadro(t) {
      raf = 0;
      if (!visible) return;
      if (!activo && !giro && op.reposo && !reducir) {
        tx = Math.sin(t / 1500 + fase) * .38;
        ty = Math.sin(t / 2100 + fase + 1) * .24;
      }
      x += (tx - x) * .1; y += (ty - y) * .1;
      var inc = num(op.inclinacion, 14), pro = num(op.profundidad, 14);
      card.style.transform = 'rotateY(' + (x * inc).toFixed(2) + 'deg) rotateX(' + (-y * inc).toFixed(2) + 'deg)';
      for (var i = 0; i < capas.length; i++) {
        var d = capas[i].dataset.p * pro;
        capas[i].style.transform = 'translate3d(' + (-x * d).toFixed(2) + 'px,' + (-y * d).toFixed(2) + 'px,0)';
      }
      if (sello) {
        var sd = pro * 2;
        sello.style.transform = 'translate3d(' + (-x * sd).toFixed(2) + 'px,' + (-y * sd).toFixed(2) + 'px,60px)';
      }
      card.style.setProperty('--px', ((x + 1) / 2).toFixed(3));
      card.style.setProperty('--py', ((y + 1) / 2).toFixed(3));
      card.style.setProperty('--hyp', Math.min(1, Math.sqrt(x * x + y * y)).toFixed(3));
      raf = requestAnimationFrame(cuadro);
    }
    if (!op.estatica) raf = requestAnimationFrame(cuadro);

    var SIN_REDIBUJO = { holo: 1, profundidad: 1, inclinacion: 1, reposo: 1 };

    return {
      elemento: card,
      get listo() { return listo; },
      set: function (cambios) {
        cambios = cambios || {};
        Object.assign(op, cambios);
        var redibujar = Object.keys(cambios).some(function (k) { return !SIN_REDIBUJO[k]; });
        if (redibujar) render();
        else card.classList.toggle('cc-con-holo', !!op.holo);
      },
      ocultarSello: function () {
        selloOculto = true;
        if (!sello) return;
        sello.classList.remove('cc-pop');
        sello.classList.add('cc-oculto');
      },
      entrar: function () {
        selloOculto = false;
        card.classList.remove('cc-entra'); void card.offsetWidth; card.classList.add('cc-entra');
        if (sello) { sello.classList.remove('cc-oculto', 'cc-pop'); void sello.offsetWidth; sello.classList.add('cc-pop'); }
      },
      habilitarGiroscopio: function () {
        var D = global.DeviceOrientationEvent;
        if (!D) return Promise.resolve(false);
        var p = typeof D.requestPermission === 'function' ? D.requestPermission() : Promise.resolve('granted');
        return p.then(function (s) {
          if (s !== 'granted') return false;
          global.addEventListener('deviceorientation', onOri);
          return true;
        }).catch(function () { return false; });
      },
      destruir: function () {
        cancelAnimationFrame(raf); raf = 0; visible = false;
        if (io) io.disconnect();
        zona.removeEventListener('pointermove', onMove);
        zona.removeEventListener('pointerleave', onLeave);
        global.removeEventListener('deviceorientation', onOri);
        clearTimeout(timerTecla);
        el.innerHTML = '';
        el.classList.remove('cc');
      }
    };
  }

  /* ---------- presets por rareza ---------- */
  var PRESETS = {
    n:   { marco: 'n',   particulas: null, sello: null, holo: false },
    r:   { marco: 'r',   particulas: { particulas: 'destellos-arcoiris', cantidad: 16, tamano: 0.8, opacidad: 0.75 }, sello: null, holo: false },
    sr:  { marco: 'sr',  particulas: { particulas: 'destellos-arcoiris', cantidad: 36 }, sello: { texto: 'SR', estilo: 'morado', tamano: 12 }, holo: false },
    ssr: { marco: 'ssr', particulas: { particulas: 'destellos-dorados', cantidad: 55 }, sello: { texto: 'SSR', estilo: 'oro', tamano: 14 }, holo: false },
    ur:  { marco: 'ur',  particulas: { particulas: 'destellos-arcoiris', cantidad: 65 }, sello: { texto: 'UR', estilo: 'arcoiris', tamano: 14 }, holo: true }
  };
  PRESETS.comun = PRESETS.n; PRESETS.rara = PRESETS.r; PRESETS.epica = PRESETS.sr;

  function hash(s) {
    s = String(s || ''); var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) % 9973 + 1;
  }

  // imagen: una ruta (carta de una sola imagen) o un arreglo de capas ya armadas.
  function desdeRareza(rareza, imagen, extra) {
    var p = PRESETS[String(rareza || 'n').toLowerCase()] || PRESETS.n;
    var sola = !Array.isArray(imagen);
    var capas = sola ? [{ src: imagen, profundidad: 0.35, margen: 4 }] : imagen.slice();
    var yaTiene = capas.some(function (c) { return c && (c.particulas || c.destellos); });
    if (p.particulas && !yaTiene) {
      var part = Object.assign({ semilla: hash(sola ? imagen : JSON.stringify(capas[0] || '')) }, p.particulas);
      if (sola) { part.profundidad = 1.4; part.margen = 6; part.mezcla = 'screen'; capas.push(part); }
      else { part.profundidad = 0.55; part.margen = 4; capas.splice(Math.min(1, capas.length), 0, part); }
    }
    var cfg = { marco: p.marco, capas: capas, holo: p.holo };
    if (p.sello) cfg.sello = Object.assign({ esquina: 'sup-izq' }, p.sello);
    return Object.assign(cfg, extra || {});
  }

  function montarRareza(el, rareza, imagen, extra) {
    return montar(el, desdeRareza(rareza, imagen, extra));
  }

  var api = { seguro: { mezcla: mezclaSegura, esquina: esquinaSegura, color: colorSeguro }, montar: montar, montarRareza: montarRareza, desdeRareza: desdeRareza, presets: PRESETS, marcos: MARCOS, sellos: SELLOS, particulas: PARTICULAS, version: 3 };
  global.CartaCapas = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : {});
