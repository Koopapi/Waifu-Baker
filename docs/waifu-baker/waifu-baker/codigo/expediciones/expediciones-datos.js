/*!
 * expediciones-datos.js · Waifu Baker
 * Catálogo de ejemplo: zonas, personajes, cartas, tabla de botín y plantillas de eventos.
 * En el sitio real esto sale de la base de datos y se edita desde el panel de administración.
 * Las personajes y cartas son de ejemplo (menos Yuki).
 */
(function (g) {
  'use strict';

  var DATOS = {
    terrenos: {
      'Ciudad':  { color: '#ff8ab0' },
      'Bosque':  { color: '#5ce1a5' },
      'Costa':   { color: '#5cc8e6' },
      'Ruinas':  { color: '#e6a85c' },
      'Montaña': { color: '#b8c8ff' }
    },

    roles: {
      'Recolectora':  '+30% de galletas',
      'Buscatesoros': 'Sobres y cartas ×1.5 más probables',
      'Cartógrafa':   'Fragmentos de mapa ×2',
      'Guardiana':    'Eventos malos a la mitad',
      'Carismática':  'Encuentros ×2 más frecuentes'
    },

    // x, y = posición en el mapa (% del ancho y alto). galletas = rango por tirada.
    zonas: [
      { id: 'bosque',  nombre: 'Bosque de los Susurros', terreno: 'Bosque',  dificultad: 30,  fragmentos: 0,  orden: 1, x: 19, y: 38, carta: 'fern-r',     galletas: [5, 10] },
      { id: 'ciudad',  nombre: 'Calles de Puerto Miel',  terreno: 'Ciudad',  dificultad: 30,  fragmentos: 0,  orden: 2, x: 25, y: 73, carta: 'tomoe-r',    galletas: [5, 10] },
      { id: 'costa',   nombre: 'Costa Coral',            terreno: 'Costa',   dificultad: 55,  fragmentos: 5,  orden: 3, x: 53, y: 80, carta: 'marina-r',   galletas: [6, 12] },
      { id: 'ruinas',  nombre: 'Ruinas de Velmora',      terreno: 'Ruinas',  dificultad: 80,  fragmentos: 10, orden: 4, x: 67, y: 51, carta: 'velma-sr',   galletas: [8, 15] },
      { id: 'montana', nombre: 'Paso de la Escarcha',    terreno: 'Montaña', dificultad: 110, fragmentos: 15, orden: 5, x: 46, y: 22, carta: 'shiro-sr',   galletas: [10, 18] },
      { id: 'camara',  nombre: 'Cámara Sellada',         terreno: 'Ruinas',  dificultad: 150, fragmentos: 25, orden: 6, x: 83, y: 23, carta: 'selene-ssr', galletas: [14, 24] }
    ],

    // Probabilidad por tirada (pesos que suman 100). Igual para todas las zonas en esta versión.
    botinBase: [
      { tipo: 'galletas',  peso: 62 },
      { tipo: 'fragmento', peso: 25 },
      { tipo: 'nada',      peso: 10 },
      { tipo: 'sobre',     peso: 2 },
      { tipo: 'carta',     peso: 1 }
    ],

    personajes: [
      { id: 'yuki',   nombre: 'Yuki',   terreno: 'Ciudad',  rol: 'Guardiana',    duo: null },
      { id: 'mika',   nombre: 'Mika',   terreno: 'Ciudad',  rol: 'Recolectora',  duo: 'sora' },
      { id: 'sora',   nombre: 'Sora',   terreno: 'Bosque',  rol: 'Cartógrafa',   duo: 'mika' },
      { id: 'lumi',   nombre: 'Lumi',   terreno: 'Bosque',  rol: 'Guardiana',    duo: null },
      { id: 'aria',   nombre: 'Aria',   terreno: 'Ruinas',  rol: 'Buscatesoros', duo: 'kaede' },
      { id: 'kaede',  nombre: 'Kaede',  terreno: 'Ruinas',  rol: 'Cartógrafa',   duo: 'aria' },
      { id: 'mira',   nombre: 'Mira',   terreno: 'Costa',   rol: 'Recolectora',  duo: null },
      { id: 'nami',   nombre: 'Nami',   terreno: 'Costa',   rol: 'Carismática',  duo: null },
      { id: 'rin',    nombre: 'Rin',    terreno: 'Montaña', rol: 'Guardiana',    duo: 'hana' },
      { id: 'hana',   nombre: 'Hana',   terreno: 'Montaña', rol: 'Carismática',  duo: 'rin' },
      { id: 'tomoe',  nombre: 'Tomoe',  terreno: 'Ciudad',  rol: 'Carismática',  duo: null },
      { id: 'fern',   nombre: 'Fern',   terreno: 'Bosque',  rol: 'Recolectora',  duo: null },
      { id: 'marina', nombre: 'Marina', terreno: 'Costa',   rol: 'Buscatesoros', duo: null },
      { id: 'velma',  nombre: 'Velma',  terreno: 'Ruinas',  rol: 'Guardiana',    duo: null },
      { id: 'shiro',  nombre: 'Shiro',  terreno: 'Montaña', rol: 'Cartógrafa',   duo: null },
      { id: 'selene', nombre: 'Selene', terreno: 'Ruinas',  rol: 'Buscatesoros', duo: null }
    ],

    // terrenoExtra: las SSR y UR sirven en un segundo terreno. arte: miniatura (si no hay, se dibuja una de ejemplo).
    cartas: [
      { id: 'yuki-ssr',   personaje: 'yuki',   rareza: 'SSR', titulo: 'Insignia dorada',      terrenoExtra: 'Costa', arte: 'yuki/yuki_mini.webp' },
      { id: 'yuki-n',     personaje: 'yuki',   rareza: 'N',   titulo: 'Primer día de ronda' },
      { id: 'mika-n',     personaje: 'mika',   rareza: 'N',   titulo: 'Turno en la panadería' },
      { id: 'sora-r',     personaje: 'sora',   rareza: 'R',   titulo: 'Mapa en blanco' },
      { id: 'lumi-r',     personaje: 'lumi',   rareza: 'R',   titulo: 'Guardiana del sendero', holo: true },
      { id: 'aria-sr',    personaje: 'aria',   rareza: 'SR',  titulo: 'Tras la puerta' },
      { id: 'kaede-ssr',  personaje: 'kaede',  rareza: 'SSR', titulo: 'La Cámara dibujada',   terrenoExtra: 'Montaña' },
      { id: 'mira-n',     personaje: 'mira',   rareza: 'N',   titulo: 'Bolsillos llenos' },
      { id: 'nami-r',     personaje: 'nami',   rareza: 'R',   titulo: 'Sonrisa de muelle' },
      { id: 'rin-n',      personaje: 'rin',    rareza: 'N',   titulo: 'Botas de nieve' },
      { id: 'hana-sr',    personaje: 'hana',   rareza: 'SR',  titulo: 'Té en la cumbre' },
      // Cartas exclusivas de zona (no salen en sobres)
      { id: 'fern-r',     personaje: 'fern',   rareza: 'R',   titulo: 'Hojas de otoño',       exclusiva: 'bosque' },
      { id: 'tomoe-r',    personaje: 'tomoe',  rareza: 'R',   titulo: 'Luces de Puerto Miel', exclusiva: 'ciudad' },
      { id: 'marina-r',   personaje: 'marina', rareza: 'R',   titulo: 'Perla escondida',      exclusiva: 'costa' },
      { id: 'velma-sr',   personaje: 'velma',  rareza: 'SR',  titulo: 'Centinela de Velmora', exclusiva: 'ruinas' },
      { id: 'shiro-sr',   personaje: 'shiro',  rareza: 'SR',  titulo: 'Huellas en la escarcha', exclusiva: 'montana' },
      { id: 'selene-ssr', personaje: 'selene', rareza: 'SSR', titulo: 'La que abrió el sello', exclusiva: 'camara', terrenoExtra: 'Montaña' }
    ],

    inicial: {
      galletas: 240,
      fragmentos: 3,
      sobres: 0,
      zonas: ['bosque', 'ciudad'],
      coleccion: ['yuki-ssr', 'yuki-n', 'mika-n', 'sora-r', 'lumi-r', 'aria-sr', 'kaede-ssr', 'mira-n', 'nami-r', 'rin-n', 'hana-sr'],
      vinculo: { yuki: 40 }
    },

    // Plantillas de eventos.
    // tipo: escena | bueno | malo | encuentro · n: personajes que necesita · rol: pide una carta con ese rol ({R})
    // duo: pide un dúo en el equipo ({D1}, {D2}) · zona: solo en esa zona · {A} {B} {C} = miembros al azar · {zona} = nombre
    plantillas: [
      { tipo: 'escena', n: 1, texto: '{A} se detuvo a dibujar el paisaje.' },
      { tipo: 'escena', n: 1, texto: 'Un gato siguió a {A} durante medio camino.' },
      { tipo: 'escena', n: 2, texto: '{A} y {B} discutieron qué camino tomar. {B} tenía razón.' },
      { tipo: 'escena', n: 2, texto: '{A} le enseñó a {B} una canción para el camino.' },
      { tipo: 'escena', n: 2, texto: '{B} se quedó dormida en el descanso y {A} no tuvo corazón para despertarla.' },
      { tipo: 'escena', n: 3, texto: '{A}, {B} y {C} se turnaron para hacer guardia.' },
      { tipo: 'escena', n: 1, zona: 'ciudad',  texto: '{A} buscó una panadería que juraba que existía. No existía.' },
      { tipo: 'escena', n: 1, zona: 'bosque',  texto: '{A} jura que un árbol le guiñó un ojo.' },
      { tipo: 'escena', n: 1, zona: 'costa',   texto: '{A} juntó conchas raras para su colección.' },
      { tipo: 'escena', n: 1, zona: 'ruinas',  texto: '{A} leyó en voz alta una inscripción antigua. Por suerte, no pasó nada.' },
      { tipo: 'escena', n: 2, zona: 'montana', texto: '{A} hizo un muñeco de nieve con la cara de {B}.' },
      { tipo: 'escena', n: 1, zona: 'camara',  texto: 'Las puertas de la Cámara se abrieron solas al ver llegar a {A}.' },
      { tipo: 'escena', duo: true, texto: '{D1} y {D2} no pararon de platicar. El viaje se hizo cortito.' },
      { tipo: 'escena', duo: true, texto: '{D1} le guardó a {D2} el mejor lugar para ver el atardecer.' },

      { tipo: 'bueno', n: 1, texto: '{A} encontró un cofre detrás de una pared falsa.' },
      { tipo: 'bueno', n: 1, texto: '{A} descubrió un atajo y avanzaron más rápido.' },
      { tipo: 'bueno', n: 2, texto: '{A} y {B} se repartieron el terreno y cubrieron el doble.' },
      { tipo: 'bueno', rol: 'Guardiana',    texto: '{R} vio la trampa a tiempo. Nadie salió herido.' },
      { tipo: 'bueno', rol: 'Buscatesoros', texto: '{R} notó un brillo entre las piedras: había algo enterrado.' },
      { tipo: 'bueno', rol: 'Cartógrafa',   texto: '{R} marcó una ruta nueva en el mapa.' },
      { tipo: 'bueno', rol: 'Recolectora',  texto: '{R} llenó la mochila hasta que ya no cerraba.' },
      { tipo: 'bueno', rol: 'Guardiana', zona: 'ciudad', texto: '{R} detuvo a un carterista y el dueño de la tienda les dio las gracias con regalos.' },

      { tipo: 'malo', n: 0, texto: 'Una tormenta los obligó a refugiarse un buen rato.' },
      { tipo: 'malo', n: 0, texto: 'El camino estaba bloqueado y tuvieron que rodear.' },
      { tipo: 'malo', n: 1, texto: '{A} se torció el tobillo y tuvieron que ir más despacio.' },
      { tipo: 'malo', n: 2, texto: '{A} y {B} se separaron y perdieron tiempo buscándose.' },
      { tipo: 'malo', n: 0, zona: 'montana', texto: 'Una ventisca los dejó sin ver nada durante horas.' },
      { tipo: 'malo', n: 0, zona: 'costa',   texto: 'La marea subió y tuvieron que esperar en las rocas.' },

      { tipo: 'encuentro', n: 1, texto: 'Un comerciante le regaló algo a {A} por su sonrisa.' },
      { tipo: 'encuentro', n: 1, texto: '{A} ayudó a una señora con sus bolsas y recibió una propina.' },
      { tipo: 'encuentro', rol: 'Carismática', texto: '{R} convenció a un vendedor de darles un descuento enorme.' },
      { tipo: 'encuentro', n: 1, zona: 'ciudad', texto: 'Una fan reconoció a {A} y le invitó un pastel.' }
    ]
  };

  DATOS.plantillas.forEach(function (p, i) { p.id = 'p' + (i + 1); });

  g.EXPEDICIONES_DATOS = DATOS;
  if (typeof module === 'object' && module.exports) module.exports = DATOS;
})(typeof window !== 'undefined' ? window : globalThis);
