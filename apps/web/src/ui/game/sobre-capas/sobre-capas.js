/*!
 * sobre-capas.js v1 · Waifu Baker
 * Sobre de cartas por capas, con plástico 3D, sellos de aluminio y apertura de rasgar o de sticker.
 * Usa el mismo motor de efectos que carta-capas.js (brillo solo en el dibujo, ondas que brillan, partículas, holo),
 * así que carga primero carta-capas.js v7 o posterior.
 *
 *   var s = SobreCapas.montar(el, {
 *     nombre: 'FAN ART · VOL. 1', codigo: 'FA01', cartas: 5,
 *     capas: [ { src: 'sobres/fa01/fondo.webp', profundidad: .25, margen: 3 }, ... ],   // mismas capas que una carta
 *     sellos: { arriba: '#FF3EA5', abajo: '#C6F432', patron: null, patronTamano: 40 },
 *     vista: '3d' | 'plano', apertura: 'rasgar' | 'sticker',
 *     alAbrir: function (s) { ...sacar las cartas... }
 *   });
 *   s.abrir()  s.reiniciar()  s.ocultar()  s.set({...})  s.guias(true)  s.destruir()
 *
 * El lienzo del arte es de 1000 × 1750 px. Zonas: sellos 0–150 y 1625–1750 (en 3D), línea de rasgado y = 230,
 * logo y 260–480, banda del set y 1450–1650 y 80 px libres a cada lado.
 * Las imágenes del plástico se configuran una vez: SobreCapas.recursos = { brillo, sombra, silueta }.
 *
 * Waifu Baker, spec 030: copia del paquete de Bruno con estos cambios (cada uno marcado con «spec 030»):
 *   - fuentes por variables de next/font (--font-dela, --font-archivo), con el nombre de Google de respaldo;
 *   - opción `textos` (indicación, etiqueta accesible, «carta/cartas» y guías) para los diccionarios;
 *   - colores de sellos e insignia y URL del patrón y del logo por las listas cerradas de CartaCapas.seguro;
 *   - `estatica` (sin bucle ni escuchas), `gestos: false` (solo teclado o abrir()), `alVibrar` y `alSonido`.
 */
(function (global) {
  'use strict';

  var L = 230 / 1750 * 100, T0 = 60 / 1750 * 100, DIENTES = 16;

  var CSS = [
    '.sc{position:relative;container-type:inline-size;aspect-ratio:1000/1750;--sc-L:' + L.toFixed(3) + '%;--sc-T:' + T0.toFixed(3) + '%}',
    '.sc *{box-sizing:border-box}',
    '.sc{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}',
    '.sc-mover{position:absolute;inset:0;animation:sc-flotar 4.5s ease-in-out infinite}',
    '.sc-quieto .sc-mover{animation:none}',
    '@keyframes sc-flotar{50%{translate:0 -3cqw}}',
    '.sc.sc-sale .sc-mover{animation:none;transition:transform .6s cubic-bezier(.5,0,.8,.4),opacity .5s .15s;transform:translateY(85%) rotate(4deg);opacity:0}',
    '.sc-sombra{position:absolute;inset:0;filter:drop-shadow(0 10cqw 8cqw rgba(0,0,0,.55)) drop-shadow(2.6cqw 2.6cqw 0 rgba(255,62,165,.85))}',
    '.sc-v3d .sc-sombra{filter:drop-shadow(0 12cqw 9cqw rgba(0,0,0,.62)) drop-shadow(0 0 6cqw rgba(255,62,165,.5))}',
    '.sc-sobre{--x:0;--y:0;--px:.5;--py:.5;--hyp:0;--p:0;position:absolute;inset:0;touch-action:none;cursor:grab;outline:none;border-radius:2cqw;' +
      'transform:perspective(333cqw) rotateY(calc(var(--x)*15deg)) rotateX(calc(var(--y)*-15deg))}',
    '.sc-v3d .sc-sobre{transform:perspective(281cqw) rotateY(calc(var(--x)*20deg)) rotateX(calc(var(--y)*-16deg))}',
    '.sc-sobre:focus-visible{outline:3px solid #C6F432;outline-offset:6px}',
    '.sc-parte{position:absolute;inset:0}',
    '.sc-v3d .sc-parte,.sc-v3d .sc-interior{-webkit-mask:var(--sc-silueta) 0 0/100% 100% no-repeat;mask:var(--sc-silueta) 0 0/100% 100% no-repeat}',
    '.sc-pila{position:absolute;inset:0;overflow:hidden;background:#3B2FC9}',
    '.sc-pila .cc-capa{transform:translate3d(calc(var(--x)*var(--d,0)*-4cqw),calc(var(--y)*var(--d,0)*-4cqw),0)}',
    '.sc-c{position:absolute;inset:0;pointer-events:none}',
    '.sc-pila .cc-holo{z-index:auto;opacity:0}',
    '.sc-con-holo .sc-pila .cc-holo{opacity:calc(var(--sc-holo,.4)*(.5 + var(--hyp)*1.05))}',

    /* foil y textura metálica del plástico */
    '.sc-foil{mix-blend-mode:color-dodge;opacity:calc(var(--sc-foil,.6) * .7);background:linear-gradient(115deg,transparent 18%,rgba(255,62,165,.7) 32%,rgba(255,217,61,.6) 42%,rgba(63,224,208,.7) 52%,rgba(198,244,50,.6) 62%,transparent 78%);' +
      'background-size:300% 300%;background-position:calc(var(--px)*100%) calc(var(--py)*100%);-webkit-mask:linear-gradient(to bottom,#000 0 16%,rgba(0,0,0,.22) 25%,rgba(0,0,0,.22) 75%,#000 84%);mask:linear-gradient(to bottom,#000 0 16%,rgba(0,0,0,.22) 25%,rgba(0,0,0,.22) 75%,#000 84%)}',
    '.sc-metal{opacity:.18;mix-blend-mode:overlay;background:repeating-linear-gradient(-35deg,rgba(255,255,255,.9) 0 1px,transparent 1px 4px)}',

    /* sellos de arriba y abajo */
    '.sc-sello{position:absolute;left:0;right:0;height:5.6%;mix-blend-mode:hard-light;opacity:.85}',
    '.sc-sello.arriba{top:0;background:repeating-linear-gradient(90deg,rgba(255,255,255,.55) 0 1.5px,rgba(23,19,43,.35) 1.5px 4px),linear-gradient(var(--sc-s1),color-mix(in srgb,var(--sc-s1) 60%,#fff))}',
    '.sc-sello.abajo{bottom:0;background:repeating-linear-gradient(90deg,rgba(255,255,255,.55) 0 1.5px,rgba(23,19,43,.35) 1.5px 4px),linear-gradient(var(--sc-s2),color-mix(in srgb,var(--sc-s2) 55%,#3FE0D0))}',
    '.sc-v3d .sc-sello{opacity:1;mix-blend-mode:normal}',
    '.sc-v3d .sc-sello.arriba{height:8.6%;background:linear-gradient(to bottom,rgba(255,255,255,.15) 0%,rgba(255,255,255,.55) 38%,rgba(0,0,0,.2) 72%,rgba(0,0,0,.5) 100%),' +
      'linear-gradient(100deg,color-mix(in srgb,var(--sc-s1) 65%,#000) 0%,var(--sc-s1) calc(var(--px)*60% + 8%),#fff calc(var(--px)*60% + 18%),color-mix(in srgb,var(--sc-s1) 50%,#fff) calc(var(--px)*60% + 28%),color-mix(in srgb,var(--sc-s1) 65%,#000) 100%)}',
    '.sc-v3d .sc-sello.abajo{height:7.2%;background:linear-gradient(to top,rgba(255,255,255,.15) 0%,rgba(255,255,255,.55) 38%,rgba(0,0,0,.2) 72%,rgba(0,0,0,.5) 100%),' +
      'linear-gradient(100deg,color-mix(in srgb,var(--sc-s2) 60%,#000) 0%,var(--sc-s2) calc(var(--px)*60% + 8%),#fff calc(var(--px)*60% + 18%),color-mix(in srgb,var(--sc-s2) 50%,#8af0e4) calc(var(--px)*60% + 28%),color-mix(in srgb,var(--sc-s2) 55%,#1a6b66) 100%)}',
    /* patrón holo en los sellos: arcoíris recortado por la imagen del patrón */
    '.sc-sello i{position:absolute;inset:0;mix-blend-mode:screen;opacity:.9;background:repeating-linear-gradient(65deg,#ff3d7a 0%,#ffae2e 5%,#fff36a 10%,#4dff9a 15%,#38e3ff 20%,#6b7bff 25%,#d84bff 30%,#ff3d7a 35%);' +
      'background-size:200% 200%;background-position:calc(65% - var(--px)*30%) calc(65% - var(--py)*30%);-webkit-mask-size:var(--sc-spt,40%) auto;mask-size:var(--sc-spt,40%) auto;-webkit-mask-position:center;mask-position:center}',

    /* logo, insignia y banda del set */
    '.sc-logo{transform:translate3d(calc(var(--x)*-6cqw),calc(var(--y)*-6cqw),0);inset:auto;top:14.86%;left:6%;right:6%;height:12.6%;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:.86}',
    '.sc-logo b{font-family:var(--font-dela,"Dela Gothic One"),"Dela Gothic One","Arial Black",system-ui,sans-serif;font-weight:400;font-size:15.5cqw;letter-spacing:-.01em;' +
      'background:linear-gradient(100deg,#C6F432 10%,#fff 40%,#3FE0D0 55%,#C6F432 80%);background-size:260% 100%;background-position:calc(var(--px)*100%) 50%;' +
      '-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:.45cqw #17132B;filter:drop-shadow(1.1cqw 1.1cqw 0 #17132B) drop-shadow(1cqw 1cqw 0 #FF3EA5)}',
    '.sc-logo b + b{font-size:12cqw;transform:skewX(-8deg)}',
    '.sc-logo img{max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(1cqw 1cqw 0 #17132B)}',
    '.sc-insignia{inset:auto;top:28%;right:4%;transform:translate3d(calc(var(--x)*-7cqw),calc(var(--y)*-7cqw),0) rotate(9deg)}',
    '.sc-insignia span{display:block;font:900 italic 4.4cqw/1 var(--font-archivo,Archivo),Archivo,"Arial Black",system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;' +
      'color:#17132B;background:var(--sc-ins,#C6F432);border:.8cqw solid #fff;border-radius:1.6cqw;padding:1.6cqw 3cqw;box-shadow:1.4cqw 1.4cqw 0 #FF3EA5}',
    '.sc-set{transform:translate3d(calc(var(--x)*-3.2cqw),calc(var(--y)*-3.2cqw),0);inset:auto;top:82.86%;left:0;right:0;height:11.43%;display:grid;place-items:center}',
    '.sc-banda{width:112%;transform:rotate(-5deg);background:#17132B;border-block:1cqw solid #C6F432;padding:2.4cqw 0 2.8cqw;display:flex;flex-direction:column;align-items:center;gap:1.2cqw}',
    '.sc-banda strong{font-family:var(--font-dela,"Dela Gothic One"),"Dela Gothic One","Arial Black",system-ui,sans-serif;font-weight:400;font-size:7.6cqw;line-height:1;color:#fff;text-shadow:.8cqw .8cqw 0 #FF3EA5;white-space:nowrap}',
    '.sc-banda span{display:flex;gap:2cqw;align-items:center;font:900 italic 3.9cqw/1.2 var(--font-archivo,Archivo),Archivo,"Arial Narrow",system-ui,sans-serif;letter-spacing:.12em;color:#fff}',
    '.sc-banda em{font-style:italic;background:#C6F432;color:#17132B;padding:.4cqw 2cqw;transform:skewX(-12deg)}',

    /* volumen y brillo del plástico */
    '.sc-volumen{background:linear-gradient(90deg,rgba(23,19,43,.5),transparent 9%,transparent 91%,rgba(23,19,43,.5)),linear-gradient(to bottom,transparent 5.4%,rgba(23,19,43,.45) 5.6%,transparent 8.5%,transparent 91.5%,rgba(23,19,43,.45) 94.4%,transparent 94.6%)}',
    '.sc-glare{mix-blend-mode:soft-light;background:radial-gradient(circle at calc(var(--px)*100%) calc(var(--py)*100%),rgba(255,255,255,.75),transparent 48%)}',
    '.sc-v3d .sc-glare{background:radial-gradient(ellipse 45% 30% at calc(var(--px)*100%) calc(var(--py)*100%),rgba(255,255,255,.85),transparent 70%)}',
    '.sc-pl-sombra,.sc-pl-brillo,.sc-lustre{display:none}',
    '.sc-v3d .sc-pl-sombra,.sc-v3d .sc-pl-brillo,.sc-v3d .sc-lustre{display:block}',
    '.sc-v3d .sc-volumen{display:none}',
    '.sc-pl-sombra{background:var(--sc-sombra) 0 0/100% 100% no-repeat;opacity:calc(.9 * var(--sc-pl,1))}',
    '.sc-pl-brillo{inset:-2%;background:var(--sc-brillo) 50% 50%/96.2% 96.2% no-repeat;opacity:calc(.92 * var(--sc-pl,1));transform:translate(calc((var(--px) - .5) * -1.6%),calc((var(--py) - .5) * -1%))}',
    '.sc-lustre{mix-blend-mode:screen;opacity:calc(.55 * var(--sc-pl,1));background:' +
      'linear-gradient(90deg,transparent calc(var(--px)*64% + 1%),rgba(255,255,255,.42) calc(var(--px)*64% + 10%),rgba(255,255,255,.14) calc(var(--px)*64% + 17%),transparent calc(var(--px)*64% + 26%)),' +
      'linear-gradient(90deg,transparent calc(var(--px)*64% + 30%),rgba(255,255,255,.26) calc(var(--px)*64% + 32.5%),transparent calc(var(--px)*64% + 35%)),' +
      'linear-gradient(to bottom,rgba(255,255,255,.18) 9%,transparent 22%),' +
      'linear-gradient(90deg,rgba(255,255,255,calc((1 - var(--px)) * .55)) 0,transparent 2.5%,transparent 97.5%,rgba(255,255,255,calc(var(--px) * .55)) 100%)}',

    /* rasgar */
    '.sc-rasgar .sc-tira{transform-origin:100% var(--sc-L);transform:translateY(calc(var(--p)*-1cqw)) rotate(calc(var(--p)*-4deg))}',
    '.sc-rasgar.sc-abierto .sc-tira{transition:transform .8s cubic-bezier(.2,.7,.25,1),opacity .5s .3s;transform:translate(70%,-170%) rotate(32deg);opacity:0}',
    '.sc-rasgar .sc-interior,.sc-rasgar .sc-solapa-w,.sc-rasgar .sc-borde-st,.sc-rasgar .sc-brillo-st{display:none}',
    /* sticker */
    '.sc-interior{position:absolute;inset:0;clip-path:inset(var(--sc-T) 0 calc(100% - var(--sc-L)) 0);transition:opacity .35s;background:linear-gradient(to bottom,#0b0918 0%,#1d1648 55%,#3B2FC9 82%,#C6F432 100%);box-shadow:inset 0 0 18px rgba(0,0,0,.8)}',
    '.sc-abierto .sc-interior{opacity:0}',
    '.sc-borde-st{position:absolute;left:0;right:0;top:calc(var(--sc-L) - 1.2%);height:1.2%;background:linear-gradient(to bottom,rgba(255,255,255,.95),rgba(255,255,255,.5));box-shadow:0 1px 0 rgba(23,19,43,.7)}',
    '.sc-brillo-st{position:absolute;inset:0;mix-blend-mode:screen;opacity:.55;pointer-events:none;background:linear-gradient(105deg,transparent calc(var(--px)*70% - 10%),rgba(255,255,255,.8) calc(var(--px)*70%),transparent calc(var(--px)*70% + 10%))}',
    '.sc-solapa-w{position:absolute;top:0;bottom:0;left:0;width:200%;z-index:4;pointer-events:none;filter:drop-shadow(2px 5px 4px rgba(0,0,0,.5))}',
    '.sc-solapa{position:absolute;inset:0}',
    '.sc-abierto .sc-solapa-w{transition:transform .8s cubic-bezier(.2,.7,.25,1),opacity .45s .3s;transform:translate(22%,-150%) rotate(30deg);opacity:0}',

    /* línea de corte, guía del dedo y destello al abrir */
    '.sc-corte{position:absolute;left:0;right:0;top:var(--sc-L);height:0;z-index:4;pointer-events:none}',
    '.sc-sticker .sc-corte{top:calc(var(--sc-L)*.55);z-index:5}',
    '.sc-sticker .sc-linea,.sc-sticker .sc-luz-corte{display:none}',
    '.sc-linea{position:absolute;left:3%;right:3%;top:-1px;border-top:max(2px,.9cqw) dashed rgba(255,255,255,.95);filter:drop-shadow(0 1.5px 0 #17132B)}',
    '.sc-luz-corte{position:absolute;top:-1.1cqw;height:2.2cqw;left:calc(var(--a,0)*100%);width:calc((var(--b,0) - var(--a,0))*100%);background:#C6F432;border-radius:1cqw;box-shadow:0 0 3.7cqw 1.1cqw #C6F432,0 0 9.6cqw 2.2cqw rgba(255,255,255,.7)}',
    '.sc-dedo{position:absolute;top:-4cqw;left:4%;width:8cqw;height:8cqw;border-radius:50%;background:#fff;border:1.1cqw solid #17132B;box-shadow:0 0 0 1.8cqw rgba(255,255,255,.35);animation:sc-dedo 2.2s ease-in-out infinite}',
    '@keyframes sc-dedo{0%{left:4%;opacity:0}12%{opacity:1}70%{left:86%;opacity:1}85%,100%{left:90%;opacity:0}}',
    '.sc-cortando .sc-dedo,.sc-abierto .sc-corte,.sc-sin-dedo .sc-dedo{display:none}',
    '.sc-flash{position:absolute;left:-30%;right:-30%;top:calc(var(--sc-L) - 15cqw);height:30cqw;z-index:5;pointer-events:none;opacity:0;background:radial-gradient(ellipse 50% 50% at 50% 50%,#fff 0%,rgba(198,244,50,.85) 30%,rgba(255,62,165,.3) 60%,transparent 72%)}',
    '.sc-flash.on{animation:sc-flash .9s ease-out forwards}',
    '@keyframes sc-flash{0%{opacity:0;transform:scaleY(.3)}25%{opacity:1;transform:scaleY(1.4)}100%{opacity:0;transform:scaleY(2.4)}}',

    /* guías del lienzo */
    '.sc-guias{position:absolute;inset:0;z-index:6;pointer-events:none;font:800 clamp(9px,3.6cqw,11px)/1.15 var(--font-archivo,Archivo),Archivo,system-ui,sans-serif}',
    '.sc-g{position:absolute;left:0;right:0}',
    '.sc-g span{position:absolute;background:#17132B;color:#fff;padding:1px 5px;border-radius:3px;white-space:nowrap}',
    '.sc-g-sello{background:repeating-linear-gradient(45deg,rgba(255,62,165,.7) 0 4px,transparent 4px 8px)}',
    '.sc-g-sello.arriba{top:0;height:8.57%}.sc-g-sello.abajo{bottom:0;height:7.14%}',
    '.sc-g-sello.arriba span{top:4px;left:4px}.sc-g-sello.abajo span{bottom:calc(100% + 2px);right:4px}',
    '.sc-g-corte{top:var(--sc-L);border-top:2px solid #C6F432}',
    '.sc-g-corte span{right:4px;bottom:3px;background:#C6F432;color:#17132B}',
    '.sc-g-caja{border:2px dashed #3FE0D0;left:8%;right:8%;background:rgba(63,224,208,.12)}',
    '.sc-g-caja span{left:-2px;top:-2px;background:#3FE0D0;color:#17132B}',
    '.sc-g-logo{top:14.86%;height:12.57%}',
    '.sc-g-set{top:82.86%;height:11.43%;border-color:#FFD93D;background:rgba(255,217,61,.12)}',
    '.sc-g-set span{background:#FFD93D}',
    '.sc-g-margen{top:0;bottom:0;width:8%;background:rgba(255,255,255,.14)}',
    '.sc-g-margen.izq{left:0;right:auto;border-right:1px dashed rgba(255,255,255,.7)}.sc-g-margen.der{right:0;left:auto;border-left:1px dashed rgba(255,255,255,.7)}',

    '@media (prefers-reduced-motion:reduce){.sc-mover,.sc-dedo{animation:none}.sc-abierto .sc-solapa-w{transition:opacity .2s;transform:none}.sc-rasgar.sc-abierto .sc-tira{transition:opacity .2s;transform:none}}'
  ].join('\n');

  function inyectarCSS() {
    var prev = document.getElementById('sobre-capas-css');
    if (prev && prev.getAttribute('data-v') === '2m') return;
    if (prev) prev.remove();
    var s = document.createElement('style');
    s.id = 'sobre-capas-css'; s.setAttribute('data-v', '2m'); s.textContent = CSS;
    document.head.appendChild(s);
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(v, d) { v = Number(v); return isFinite(v) ? v : d; }
  function cl(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function url(u) { return 'url("' + String(u).replace(/["\\]/g, '\\$&') + '")'; }

  var TEXTOS = {
    rasgar: { indicacion: 'Desliza el dedo por la línea', aria: 'Desliza por la línea punteada o pulsa Enter para abrirlo.' },
    sticker: { indicacion: 'Despega el sticker de arriba →', aria: 'Despega el sticker de arriba deslizando hacia la derecha, o pulsa Enter para abrirlo.' },
    // Spec 030: el resto de textos del sobre, también reemplazables con `textos`.
    sobre: 'Sobre', carta: 'carta', cartas: 'cartas', guiaSello: 'Sello', guiaCorte: 'Rasgado', guiaLogo: 'Logo', guiaSet: 'Set'
  };
  // Spec 030: los textos de `opciones.textos` (los diccionarios del juego) sobre los de fábrica.
  function textos(t) {
    t = t || {};
    var o = Object.assign({}, TEXTOS, t);
    o.rasgar = Object.assign({}, TEXTOS.rasgar, t.rasgar || {});
    o.sticker = Object.assign({}, TEXTOS.sticker, t.sticker || {});
    return o;
  }
  // Spec 030: colores y URL del registro por las listas cerradas de carta-capas (el registro viene de la BD).
  function colorSeguro(C, c) { return C.seguro ? C.seguro.color(c) : (typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : null); }
  function urlSegura(C, u) { return C.seguro ? C.seguro.url(u) : (typeof u === 'string' && /^[^"'()\\\s<>]+$/.test(u) ? u : null); }

  var contador = 0;

  function montar(el, opciones) {
    var C = global.CartaCapas;
    if (!C || !C.motor) throw new Error('sobre-capas.js necesita carta-capas.js v7 o posterior (con CartaCapas.motor) cargado antes.');
    C.motor.inyectarCSS(); inyectarCSS();
    var TX = textos(opciones && opciones.textos);

    var DEF = {
      nombre: 'FAN ART · VOL. 1', codigo: 'FA01', cartas: 5, capas: [],
      holo: false, holoIntensidad: .4, foil: true, foilIntensidad: .6,
      sellos: { arriba: '#FF3EA5', abajo: '#C6F432', patron: null, patronTamano: 40 },
      logo: true, insignia: null, vista: '3d', apertura: 'rasgar', plastico: 1,
      inclinacion: 1, reposo: true, flotar: true, sonido: true, zona: null, etiqueta: null,
      alAbrir: null, alPista: null,
      // Spec 030
      estatica: false, gestos: true, alVibrar: null, alSonido: null, textos: null
    };
    var op = Object.assign({}, DEF, opciones || {});
    op.sellos = Object.assign({}, DEF.sellos, (opciones && opciones.sellos) || {});
    var id = ++contador;
    var R = api.recursos;

    var reducir = false;
    try { reducir = global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

    el.classList.add('sc');
    el.innerHTML =
      '<div class="sc-mover"><div class="sc-flash" aria-hidden="true"></div><div class="sc-sombra">' +
        '<div class="sc-sobre" tabindex="0" role="button">' +
          '<div class="sc-parte sc-cuerpo"></div><div class="sc-interior" aria-hidden="true"></div>' +
          '<div class="sc-parte sc-tira"></div>' +
          '<div class="sc-solapa-w" aria-hidden="true"><div class="sc-solapa"></div></div>' +
          '<div class="sc-corte" aria-hidden="true"><span class="sc-linea"></span><span class="sc-luz-corte"></span><span class="sc-dedo"></span></div>' +
          '<div class="sc-guias" aria-hidden="true" hidden>' +
            '<div class="sc-g sc-g-margen izq"></div><div class="sc-g sc-g-margen der"></div>' +
            '<div class="sc-g sc-g-sello arriba"><span>' + esc(TX.guiaSello) + ' · 0–150</span></div>' +
            '<div class="sc-g sc-g-corte"><span>' + esc(TX.guiaCorte) + ' · y 230</span></div>' +
            '<div class="sc-g sc-g-caja sc-g-logo"><span>' + esc(TX.guiaLogo) + ' · y 260–480</span></div>' +
            '<div class="sc-g sc-g-caja sc-g-set"><span>' + esc(TX.guiaSet) + ' · y 1450–1650</span></div>' +
            '<div class="sc-g sc-g-sello abajo"><span>' + esc(TX.guiaSello) + ' · 1625–1750</span></div>' +
          '</div>' +
        '</div></div></div>';
    var q = function (s) { return el.querySelector(s); };
    var sobre = q('.sc-sobre'), cuerpo = q('.sc-cuerpo'), tira = q('.sc-tira'), solapa = q('.sc-solapa'), luzCorte = q('.sc-luz-corte'), flash = q('.sc-flash');
    var zona = op.zona || el.parentElement || el;
    var T = T0;

    /* ---------- capas ---------- */
    function pila() {
      var arte = (op.capas || []).map(function (c, i) {
        return c && c.visible !== false ? C.motor.capaHTML(c, i, { semilla: 11 + id * 7 + i }) : '';
      }).join('');
      var s = op.sellos || {}, pat = '', patron = urlSegura(C, s.patron);   // spec 030: URL segura
      if (patron) pat = '<i style="-webkit-mask-image:' + esc(url(patron)) + ';mask-image:' + esc(url(patron)) + '"></i>';
      var logo = '', logoSrc = op.logo && typeof op.logo === 'object' ? urlSegura(C, op.logo.src) : null;
      if (logoSrc) logo = '<div class="sc-c sc-logo"><img src="' + esc(logoSrc) + '" alt="" draggable="false"></div>';
      else if (op.logo === true) logo = '<div class="sc-c sc-logo"><b>WAIFU</b><b>BAKER</b></div>';
      var insColor = op.insignia ? colorSeguro(C, op.insignia.color) : null;   // spec 030: color seguro
      var ins = op.insignia && op.insignia.texto ? '<div class="sc-c sc-insignia"' + (insColor ? ' style="--sc-ins:' + esc(insColor) + '"' : '') + '><span>' + esc(op.insignia.texto) + '</span></div>' : '';
      var banda = (op.nombre || op.codigo) ? '<div class="sc-c sc-set"><div class="sc-banda">' + (op.nombre ? '<strong' + (String(op.nombre).length > 17 ? ' style="font-size:' + (7.6 * 17 / String(op.nombre).length).toFixed(2) + 'cqw"' : '') + '>' + esc(op.nombre) + '</strong>' : '') +
        '<span>' + (op.codigo ? '<em>' + esc(op.codigo) + '</em>' : '') + (op.cartas ? esc(Math.round(num(op.cartas, 0))) + ' ' + esc(Number(op.cartas) === 1 ? TX.carta : TX.cartas) : '') + '</span></div></div>' : '';
      return '<div class="sc-pila">' + arte + '<div class="cc-holo"></div>' +
        (op.foil ? '<div class="sc-c sc-foil"></div>' : '') + '<div class="sc-c sc-metal"></div>' +
        '<div class="sc-c"><div class="sc-sello arriba">' + pat + '</div><div class="sc-sello abajo">' + pat + '</div></div>' +
        logo + ins + banda +
        '<div class="sc-c sc-volumen"></div><div class="sc-c sc-glare"></div>' +
        '<div class="sc-c sc-pl-sombra"></div><div class="sc-c sc-lustre"></div><div class="sc-c sc-pl-brillo"></div></div>';
    }

    function render() {
      var v3 = op.vista !== 'plano';
      el.classList.toggle('sc-v3d', v3);
      el.classList.toggle('sc-quieto', !op.flotar || reducir || !!op.estatica);
      el.classList.toggle('sc-con-holo', !!op.holo);
      el.style.setProperty('--sc-silueta', url(R.silueta));
      el.style.setProperty('--sc-sombra', url(R.sombra));
      el.style.setProperty('--sc-brillo', url(R.brillo));
      el.style.setProperty('--sc-s1', colorSeguro(C, op.sellos.arriba) || '#FF3EA5');   // spec 030: colores seguros
      el.style.setProperty('--sc-s2', colorSeguro(C, op.sellos.abajo) || '#C6F432');
      el.style.setProperty('--sc-spt', cl(num(op.sellos.patronTamano, 40), 5, 300) + '%');
      el.style.setProperty('--sc-holo', cl(num(op.holoIntensidad, .4), 0, 1));
      el.style.setProperty('--sc-foil', cl(num(op.foilIntensidad, .6), 0, 1));
      el.style.setProperty('--sc-pl', cl(num(op.plastico, 1), 0, 1.5));
      var ap = op.apertura === 'sticker' ? 'sticker' : 'rasgar';
      sobre.classList.toggle('sc-rasgar', ap === 'rasgar'); sobre.classList.toggle('sc-sticker', ap === 'sticker');
      var nombre = op.etiqueta || (TX.sobre + ' ' + (op.nombre || '') + (op.codigo ? ' ' + op.codigo : ''));
      sobre.setAttribute('aria-label', nombre.trim() + '. ' + TX[ap].aria);
      T = v3 ? 0 : T0;   // en 3D los dientes los pone la silueta del plástico
      var h = pila();
      cuerpo.innerHTML = h;
      tira.innerHTML = h + '<div class="sc-borde-st"></div><div class="sc-brillo-st"></div>';
      [].forEach.call(el.querySelectorAll('.sc-pila .cc-capa'), function (c) { c.style.setProperty('--d', c.getAttribute('data-p') || 0); });
      formas();
    }

    /* ---------- formas: borde de los dientes y de la línea de corte ---------- */
    function formas() {
      tira.style.clipPath = ''; solapa.style.clipPath = '';
      if (op.apertura === 'sticker') {
        var abajo = [], i;
        for (i = DIENTES * 2; i >= 0; i--) abajo.push((i / (DIENTES * 2) * 100).toFixed(2) + '% ' + (i % 2 ? 100 : 100 - T).toFixed(2) + '%');
        cuerpo.style.clipPath = 'polygon(0% ' + L.toFixed(2) + '%,100% ' + L.toFixed(2) + '%,' + abajo.join(',') + ')';
        geometria(); pelar(G.f0);
        return;
      }
      var jag = [], arriba = [], ab = [], n = 40, j;
      for (j = 0; j <= n; j++) jag.push([j / n * 100, L + (j === 0 || j === n ? 0 : (Math.random() - .5) * .9)]);
      for (j = 0; j <= DIENTES * 2; j++) arriba.push([j / (DIENTES * 2) * 100, j % 2 ? 0 : T]);
      for (j = DIENTES * 2; j >= 0; j--) ab.push([j / (DIENTES * 2) * 100, j % 2 ? 100 : 100 - T]);
      var p = function (a) { return a.map(function (k) { return k[0].toFixed(2) + '% ' + k[1].toFixed(2) + '%'; }).join(','); };
      tira.style.clipPath = 'polygon(' + p(arriba) + ',' + p(jag.slice().reverse()) + ')';
      cuerpo.style.clipPath = 'polygon(' + p(jag) + ',' + p(ab) + ')';
    }

    /* sticker: el pliegue avanza en diagonal; lo de la izquierda se refleja sobre él y muestra el reverso */
    var G = {}, f = 0;
    function geometria() {
      var W = sobre.offsetWidth || 1, H = sobre.offsetHeight || 1.75;
      G.W = W; G.H = H; G.Ly = H * L / 100; G.Ty = H * T / 100; G.c = G.Ly * 1.15;
      G.strip = [];
      for (var i = 0; i <= DIENTES * 2; i++) G.strip.push([i / (DIENTES * 2) * W, i % 2 ? 0 : G.Ty]);
      G.strip.push([W, G.Ly], [0, G.Ly]);
      G.f0 = (0.13 * W - G.c) / W;
    }
    function lado(k, nf) { return k[0] - (nf * G.W + G.c * (1 - k[1] / G.Ly)); }
    function recortar(poly, nf, signo) {
      var out = [], n = poly.length;
      for (var i = 0; i < n; i++) {
        var a = poly[i], b = poly[(i + 1) % n], sa = signo * lado(a, nf), sb = signo * lado(b, nf);
        if (sa >= 0) out.push(a);
        if ((sa >= 0) !== (sb >= 0)) { var t = sa / (sa - sb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
      }
      return out;
    }
    function reflejar(k, nf) {
      var p0x = nf * G.W + G.c, len = Math.hypot(G.c, G.Ly), dx = -G.c / len, dy = G.Ly / len;
      var vx = k[0] - p0x, vy = k[1], d = vx * dx + vy * dy;
      return [p0x + 2 * d * dx - vx, 2 * d * dy - vy];
    }
    function poli(pts) {
      if (pts.length < 3) return 'polygon(0 0,0 0,0 0)';
      return 'polygon(' + pts.map(function (k) { return k[0].toFixed(1) + 'px ' + k[1].toFixed(1) + 'px'; }).join(',') + ')';
    }
    function pelar(nf) {
      f = nf;
      tira.style.clipPath = poli(recortar(G.strip, f, 1));
      solapa.style.clipPath = poli(recortar(G.strip, f, -1).map(function (k) { return reflejar(k, f); }));
      var len = Math.hypot(G.c, G.Ly), nx = G.Ly / len, ny = G.c / len, w = 2 * G.W, h = G.H;
      var ang = Math.atan2(nx, -ny) * 180 / Math.PI, Lg = Math.abs(w * nx) + Math.abs(h * ny);
      var sx = w / 2 - nx * Lg / 2, sy = h / 2 - ny * Lg / 2, t0 = (f * G.W + G.c - sx) * nx + (0 - sy) * ny;
      var st = function (c, d) { return c + ' ' + (t0 + d).toFixed(1) + 'px'; };
      solapa.style.background = 'repeating-linear-gradient(-35deg,rgba(59,47,201,.07) 0 2px,transparent 2px 7px),' +
        'linear-gradient(' + ang.toFixed(1) + 'deg,' + [st('#6f6994', 0), st('#d8d4ea', 7), st('#ffffff', 24), st('#ece9f7', 60), st('#cfc9e4', 150)].join(',') + ')';
    }
    function animarPeel(destino, ms, fin, conSonido) {
      var desde = f, t0 = performance.now();
      if (reducir) { pelar(destino); if (fin) fin(); return; }
      (function paso(t) {
        if (op.apertura !== 'sticker' || vivo === false) return;
        var k = Math.min(1, (t - t0) / ms), e = destino < desde ? 1 - Math.pow(1 - k, 3) * (1 - 1.6 * k * (1 - k)) : 1 - Math.pow(1 - k, 2);
        pelar(desde + (destino - desde) * e);
        if (conSonido && k < 1) grano();
        if (k < 1) requestAnimationFrame(paso); else if (fin) fin();
      })(t0);
    }
    function onResize() { if (estado === 'cerrado' && op.apertura === 'sticker') { var r = f - G.f0; geometria(); pelar(G.f0 + r); } }
    if (!op.estatica) global.addEventListener('resize', onResize);   // spec 030: la vista fija no escucha nada

    /* ---------- sonido (ruido filtrado, sin archivos) ---------- */
    var ctx = null, ruido = null, ultimoGrano = 0;
    function audio() {
      if (!op.sonido) return null;
      try {
        if (!ctx) {
          ctx = new (global.AudioContext || global.webkitAudioContext)();
          ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
          var d = ruido.getChannelData(0);
          for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
      } catch (e) { return null; }
    }
    function soplo(dur, tipo, f0, f1, vol, qq) {
      var a = audio(); if (!a) return;
      var t = a.currentTime, src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
      src.buffer = ruido; fl.type = tipo; fl.Q.value = qq || 1;
      fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
      src.connect(fl); fl.connect(g); g.connect(a.destination);
      src.start(t, Math.random() * .5); src.stop(t + dur + .02);
    }
    function grano() {
      var ahora = performance.now();
      if (op.apertura !== 'sticker') {
        if (ahora - ultimoGrano < 38) return; ultimoGrano = ahora;
        var fa = 1800 + Math.random() * 2400; soplo(.05, 'bandpass', fa, fa * .8, .16, 1.2); return;
      }
      if (ahora - ultimoGrano < 26) return; ultimoGrano = ahora;
      var fr = 2600 + Math.random() * 3200; soplo(.035, 'bandpass', fr, fr * .85, .13, 1.4);
    }
    function rasgon() {
      if (op.apertura !== 'sticker') { soplo(.38, 'bandpass', 3200, 700, .55, .8); soplo(.2, 'highpass', 2500, 5000, .2); return; }
      soplo(.28, 'bandpass', 5200, 1600, .38, .8); soplo(.12, 'highpass', 3000, 6000, .16);
    }
    function pegar() { soplo(.09, 'lowpass', 900, 300, .25); }
    // Spec 030: con `alVibrar`, la vibración la decide el juego (silencio recordado de la spec 013).
    function vibrar(p) { if (typeof op.alVibrar === 'function') { op.alVibrar(p); return; } try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

    /* ---------- inclinación ---------- */
    var tx = 0, ty = 0, x = 0, y = 0, activo = false, raf = 0, vivo = true, fase = id * 1.3;
    function cuadro(t) {
      raf = vivo ? requestAnimationFrame(cuadro) : 0;
      if (estado === 'abierto') return;
      if (!activo && !reducir && estado === 'cerrado' && op.reposo) { tx = Math.sin(t / 1600 + fase) * .35; ty = Math.sin(t / 2300 + fase + 1) * .22; }
      if (cortando || estado === 'abriendo') { tx *= .9; ty *= .9; }
      x += (tx - x) * .1; y += (ty - y) * .1;
      var k = cl(num(op.inclinacion, 1), 0, 2), xx = x * k, yy = y * k;
      sobre.style.setProperty('--x', xx.toFixed(3)); sobre.style.setProperty('--y', yy.toFixed(3));
      sobre.style.setProperty('--px', ((x + 1) / 2).toFixed(3)); sobre.style.setProperty('--py', ((y + 1) / 2).toFixed(3));
      sobre.style.setProperty('--hyp', Math.min(1, Math.sqrt(x * x + y * y)).toFixed(3));
    }
    function onZona(ev) {
      if (estado !== 'cerrado' || cortando) return;
      if (ev.pointerType !== 'mouse' && !presionado) return;
      var r = el.getBoundingClientRect();
      tx = cl((ev.clientX - (r.left + r.width / 2)) / (r.width * .8), -1, 1);
      ty = cl((ev.clientY - (r.top + r.height / 2)) / (r.height * .6), -1, 1);
      activo = true;
    }
    function onSalir() { activo = false; }
    if (!op.estatica) { zona.addEventListener('pointermove', onZona); zona.addEventListener('pointerleave', onSalir); }

    /* ---------- abrir ---------- */
    var estado = 'cerrado', cortando = false, presionado = false, arrastre = null, inicioToque = 0, xa = 0, xb = 0;
    function progreso(p) {
      sobre.style.setProperty('--p', p.toFixed(3));
      luzCorte.style.setProperty('--a', xa.toFixed(3)); luzCorte.style.setProperty('--b', xb.toFixed(3));
    }
    function relativo(ev) { var r = sobre.getBoundingClientRect(); return { x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height }; }
    function onDown(ev) {
      if (estado !== 'cerrado' || op.gestos === false) return;   // spec 030: sin gestos, solo teclado o abrir()
      presionado = true; inicioToque = performance.now();
      var p = relativo(ev); audio();
      try { sobre.setPointerCapture(ev.pointerId); } catch (e) {}
      if (op.apertura !== 'sticker') {
        if (Math.abs(p.y - L / 100) < .09) { cortando = true; sobre.classList.add('sc-cortando'); xa = xb = cl(p.x, 0, 1); progreso(0); }
        return;
      }
      if (p.y < L / 100 + .08) { cortando = true; sobre.classList.add('sc-cortando'); arrastre = { x: p.x, f: f }; }
    }
    function onMove(ev) {
      if (!cortando) return;
      var p = relativo(ev);
      if (op.apertura !== 'sticker') {
        var px = cl(p.x, 0, 1);
        if (px < xa || px > xb) grano();
        xa = Math.min(xa, px); xb = Math.max(xb, px);
        var av = (xb - xa) / .78;
        progreso(Math.min(1, av));
        if (av >= 1) { cortando = false; abrirYa(); }
        return;
      }
      var nf = cl(arrastre.f + (p.x - arrastre.x) * 1.25, G.f0, 1.2);
      if (nf > f + .003) grano();
      pelar(nf);
      if (nf >= 1) { cortando = false; abrirYa(); }
    }
    function soltar() {
      presionado = false; activo = false;
      if (estado !== 'cerrado') return;
      var rapido = performance.now() - inicioToque < 260;
      if (cortando && op.apertura !== 'sticker') {
        cortando = false; sobre.classList.remove('sc-cortando'); xa = xb = 0; progreso(0);
        if (rapido) pista();
      } else if (cortando) {
        cortando = false;
        if (f > .55) { animarPeel(1.2, 220, abrirYa); return; }
        sobre.classList.remove('sc-cortando');
        if (f > G.f0 + .02) { animarPeel(G.f0, 320, null); pegar(); }
        if (rapido) pista();
      } else if (rapido) pista();
    }
    function onKey(ev) { if ((ev.key === 'Enter' || ev.key === ' ') && estado === 'cerrado') { ev.preventDefault(); abrir(); } }
    if (!op.estatica) {
      sobre.addEventListener('pointerdown', onDown);
      sobre.addEventListener('pointermove', onMove);
      sobre.addEventListener('pointerup', soltar);
      sobre.addEventListener('pointercancel', soltar);
      sobre.addEventListener('keydown', onKey);
    } else { sobre.removeAttribute('tabindex'); sobre.setAttribute('role', 'img'); }

    function pista() {
      if (typeof op.alPista === 'function') op.alPista(inst);
      if (op.apertura === 'sticker' && !reducir && estado === 'cerrado' && !cortando) animarPeel(G.f0 + .12, 180, function () { animarPeel(G.f0, 260, null); });
    }

    // abre con animación, como si el jugador deslizara solo
    function abrir() {
      if (estado !== 'cerrado' || cortando) return;
      audio();
      if (op.apertura !== 'sticker') {
        if (reducir) { xa = 0; xb = 1; progreso(1); abrirYa(); return; }
        sobre.classList.add('sc-cortando'); cortando = true;
        var t0 = performance.now();
        (function paso(t) {
          if (!vivo || op.apertura === 'sticker' || estado !== 'cerrado') return;
          var k = Math.min(1, (t - t0) / 520); xa = .06; xb = .06 + .88 * k; progreso(k);
          if (k < 1) { grano(); requestAnimationFrame(paso); } else { cortando = false; abrirYa(); }
        })(t0);
        return;
      }
      sobre.classList.add('sc-cortando'); cortando = true;
      animarPeel(1.2, 900, function () { cortando = false; abrirYa(); }, true);
    }
    function abrirYa() {
      if (estado !== 'cerrado') return;
      estado = 'abriendo'; sobre.classList.remove('sc-cortando');
      if (op.apertura === 'sticker') pelar(1.2); else { xa = 0; xb = 1; progreso(1); }
      rasgon(); vibrar(45);
      if (typeof op.alSonido === 'function') op.alSonido('rasgon');   // spec 030: aviso para el motor de sonido del juego
      sobre.classList.add('sc-abierto');
      flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on');
      setTimeout(function () { if (estado === 'abriendo') estado = 'abierto'; }, 900);
      if (typeof op.alAbrir === 'function') op.alAbrir(inst);
    }
    function reiniciar() {
      estado = 'cerrado'; cortando = false; presionado = false; xa = xb = 0; progreso(0);
      el.classList.remove('sc-sale');
      sobre.classList.remove('sc-abierto', 'sc-cortando');
      flash.classList.remove('on');
      render();
    }
    function ocultar() {
      el.classList.add('sc-sale');
      return new Promise(function (ok) { setTimeout(ok, reducir ? 150 : 650); });
    }

    render();
    if (!op.estatica) raf = requestAnimationFrame(cuadro);

    var inst = {
      elemento: sobre,
      get estado() { return estado; },
      get textoIndicacion() { return TX[op.apertura === 'sticker' ? 'sticker' : 'rasgar'].indicacion; },
      get opciones() { return op; },
      abrir: abrir,
      reiniciar: reiniciar,
      ocultar: ocultar,
      set: function (cambios) {
        cambios = cambios || {};
        if (cambios.sellos) cambios = Object.assign({}, cambios, { sellos: Object.assign({}, op.sellos, cambios.sellos) });
        Object.assign(op, cambios);
        if (cambios.textos) TX = textos(op.textos);
        if (estado === 'cerrado') render(); else reiniciar();
      },
      guias: function (on) { q('.sc-guias').hidden = !on; },
      destruir: function () {
        vivo = false; cancelAnimationFrame(raf); raf = 0;
        zona.removeEventListener('pointermove', onZona); zona.removeEventListener('pointerleave', onSalir);
        sobre.removeEventListener('pointerdown', onDown); sobre.removeEventListener('pointermove', onMove);
        sobre.removeEventListener('pointerup', soltar); sobre.removeEventListener('pointercancel', soltar); sobre.removeEventListener('keydown', onKey);
        global.removeEventListener('resize', onResize);
        try { if (ctx) ctx.close(); } catch (e) {}
        el.innerHTML = ''; el.classList.remove('sc', 'sc-v3d', 'sc-quieto', 'sc-con-holo', 'sc-sale');
      }
    };
    return inst;
  }

  var api = {
    montar: montar,
    recursos: { brillo: 'img/plastico-brillo.webp', sombra: 'img/plastico-sombra.webp', silueta: 'img/plastico-silueta.webp' },
    aperturas: { rasgar: 'Rasgar por la línea', sticker: 'Despegar el sticker' },
    zonas: { lienzo: [1000, 1750], selloArriba: [0, 150], selloAbajo: [1625, 1750], corte: 230, logo: [260, 480], set: [1450, 1650], margen: 80 },
    version: 1
  };
  global.SobreCapas = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : {});
