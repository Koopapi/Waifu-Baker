# Spec 017 — Armado de cartas por capas

Estado: propuesta (23 oct 2026), pendiente de aprobación del dueño.

## Contexto y objetivo
La spec 016 llevó al panel el editor de cartas por capas de Bruno. Al aprobarlo, el dueño decidió que **todas las
cartas serán cartas por capas**, como la carta de Yuki del paquete de Bruno: la imagen central de cada carta es **la
chica recortada, sin fondo** (PNG con transparencia), y alrededor se arma el fondo, las partículas, el marco y el
sello. El dueño y Bruno arman cada carta a mano antes de lanzar una colección; las ilustraciones que hay hoy en el
sistema son material de prueba que se recortará fuera (Photoshop u otra herramienta).

Esta spec hace que las cartas se **creen y se armen** así en el panel: subir la chica crea la carta, los fondos salen de
una biblioteca de la colección o de uno propio de la carta, cada capa se puede mover, escalar y girar, el estilo sigue a
la rareza mientras nadie lo toque, y una colección solo se publica con todas sus cartas armadas. El proyecto aún no está
en producción: no hay conversión de cartas antiguas ni periodo de transición. Lo que ve el coleccionista (la carta por
capas en toda la web) es la spec 018. No cambia ninguna regla de rarezas, sorteo, probabilidades ni concesiones.

## Usuarios / actores
- **Administrador** (el dueño y Bruno): crea y arma las cartas en el panel.
- **Coleccionista**: sin cambios en esta spec.

## Historias de usuario
- H1: Como administrador quiero subir la imagen recortada de la chica y que se cree la carta con ella como personaje.
- H2: Como administrador quiero tener fondos reutilizables en la colección y poder poner a una carta uno propio.
- H3: Como administrador quiero encuadrar a la chica: moverla, acercarla o alejarla y girarla un poco.
- H4: Como administrador quiero que la carta se vista sola con el estilo de su rareza mientras no lo toque.
- H5: Como dueño quiero que no se pueda publicar una colección con cartas a medio armar.
- H6: Como administrador quiero importar y exportar el formato del creador de Bruno.

## Vocabulario
- **Imagen de la chica (personaje)**: la ilustración recortada, con transparencia, que es el centro de la carta.
- **Fondo**: capa de imagen que va detrás del personaje; sale de la biblioteca de la colección o es propio de la carta.
- **Biblioteca de fondos**: los fondos subidos a una colección para elegirlos al armar sus cartas.
- **Carta armada**: tiene una capa de personaje visible y un fondo visible.
- **Encuadre de una capa**: su posición (x, y), su escala y su giro dentro del lienzo, además de la profundidad, el
  margen, la mezcla y la opacidad de la spec 016.
- **Estilo automático**: marco, partículas y sello del escalón de la rareza puestos por el sistema; deja de serlo en
  cuanto el administrador cambia a mano el marco, las partículas o el sello.
- El resto (lienzo, escalón, capa visible) como en la spec 016.

## Requisitos funcionales (criterios de aceptación en EARS)

### La chica crea la carta
- RF-1: CUANDO el administrador suba una o varias imágenes de chica a una colección, EL SISTEMA creará por cada una una
  carta con esa imagen como capa de personaje, centrada en el lienzo, y el estilo automático de su escalón.
- RF-2: EL SISTEMA aceptará imágenes de chica PNG o WebP de hasta 20 MB y al menos 991 px de alto, de cualquier
  proporción.
- RF-3: SI la imagen de chica no tiene ninguna zona transparente, ENTONCES EL SISTEMA la aceptará pero avisará de que
  parece no estar recortada.
- RF-4: CUANDO el administrador sustituya la imagen de chica de una carta, EL SISTEMA mantendrá su encuadre y el resto de
  capas y ajustes.
- RF-5: EL SISTEMA no permitirá quitar la capa de personaje de una carta ni dejarla sin ninguna capa visible (sustituye
  a la spec 016, RF-14: ninguna carta vuelve al montaje con el marco de Pencil).

### Fondos
- RF-6: EL SISTEMA permitirá subir fondos a la biblioteca de una colección, verlos y quitarlos.
- RF-7: EL SISTEMA aplicará a los fondos las reglas de las capas de imagen de la spec 016 (formato, peso, proporción
  del lienzo con escalado, WebP).
- RF-8: CUANDO el administrador arme una carta, EL SISTEMA le permitirá elegir un fondo de la biblioteca de su colección
  o subir uno propio para esa carta.
- RF-9: SI un fondo de la biblioteca está en uso, ENTONCES EL SISTEMA no permitirá quitarlo e indicará cuántas cartas lo
  usan.

### Encuadre
- RF-10: EL SISTEMA permitirá mover, escalar y girar cada capa de imagen en el editor, arrastrando sobre la vista
  previa o con controles numéricos y con el teclado, con la vista previa actualizada al momento.
- RF-11: EL SISTEMA limitará la escala entre el 10 % y el 400 % y el giro entre −180° y 180°, y permitirá restablecer el
  encuadre de una capa.
- RF-12: EL SISTEMA dibujará el encuadre de cada capa sin perder el parallax ni el brillo de la carta por capas.

### Estilo
- RF-13: MIENTRAS una carta conserve el estilo automático, CUANDO cambie su rareza, EL SISTEMA le pondrá el marco, las
  partículas y el sello del escalón nuevo.
- RF-14: CUANDO el administrador cambie a mano el marco, las partículas o el sello, EL SISTEMA dejará de aplicar el
  estilo automático a esa carta (el cambio de rareza seguirá la spec 016, RF-25).

### Publicar
- RF-15: SI alguna carta de una colección no está armada (personaje y fondo visibles), ENTONCES EL SISTEMA no permitirá
  publicarla e indicará qué cartas faltan, con enlace a cada una.
- RF-16: EL SISTEMA mantendrá el resto de comprobaciones de publicación (personaje, nombre, rareza y revisión 18+).

### Importar y exportar
- RF-17: CUANDO el administrador exporte una carta, EL SISTEMA entregará la configuración en el formato del creador de
  Bruno, con los nombres de archivo de sus capas y su encuadre.
- RF-18: CUANDO el administrador importe una configuración del creador y suba sus archivos, EL SISTEMA colocará cada
  archivo en su capa; SI la configuración no es válida, ENTONCES no cambiará la carta e indicará qué parte falla.
- RF-19: SI una configuración importada usa un modo de mezcla que el editor no ofrece, ENTONCES EL SISTEMA lo cambiará a
  normal e indicará qué capas cambiaron.

### Demo y pruebas
- RF-20: EL SISTEMA creará armadas las cartas de la demo y de las colecciones de prueba: con la chica recortada cuando
  exista (como Yuki) y, mientras no haya recortes, con la ilustración completa como personaje sobre un fondo de la
  biblioteca.

## Requisitos no funcionales
- `carta-capas.js` aprende el encuadre por capa (x, y, escala, giro) sin romper las configuraciones que ya existen ni el
  formato del creador (los campos nuevos son opcionales); las animaciones siguen siendo solo `transform` y `opacity`.
- Las capas y fondos solo se sirven al administrador (spec 016, RF-4) hasta la spec 018.
- Textos nuevos en inglés y español, en el diccionario del panel (no en el general).
- Peso: ninguna página del coleccionista crece (`pnpm budget`).
- Sistema de diseño: el editor ampliado y la biblioteca de fondos usan componentes de `ui/` y tienen su maqueta en Pencil.

## Casos límite
- Imagen de chica sin transparencia (sin recortar): se acepta con aviso (RF-3).
- Chica muy pequeña o muy grande para la carta: se ajusta con la escala (RF-10, RF-11).
- Fondo de la biblioteca en uso: no se quita (RF-9).
- Colección con una carta sin fondo: no se publica (RF-15).
- Importación con más de 8 capas de imagen: se rechaza (RF-18).

## Fuera de alcance
- Quitar el fondo de las ilustraciones dentro del panel (se hace fuera).
- Lo que ve el coleccionista: la imagen plana, la apertura, la colección, la ficha, el giroscopio, las zonas públicas y
  la revisión 18+ de capas (spec 018). Hasta entonces, lo que vea el coleccionista en la demo es provisional.
- Conversión automática de cartas antiguas y periodo de transición (no hay producción).
- Historial de versiones, plantillas y copiar capas entre cartas.

## Criterios de finalización
Cada RF con su test en verde y la suite completa en verde; E2E del panel en escritorio: subir una chica recortada y ver
la carta creada, elegir un fondo de la biblioteca y uno propio, encuadrar a la chica, cambiar la rareza con estilo
automático, intentar publicar con una carta sin armar, exportar e importar; la demo arranca con sus cartas armadas;
`pnpm budget` sin cambios en el coleccionista; demo manual del dueño.

## Decisiones (23 oct 2026)
- Todas las cartas son cartas por capas (sistema de Bruno); el dueño y Bruno las arman a mano antes de lanzar.
- La imagen central es la chica recortada sin fondo; el recorte se hace fuera del panel.
- Fondos: biblioteca por colección y, si hace falta, uno propio por carta.
- Encuadre: mover, escalar y girar cada capa.
- No se publica una colección con cartas sin armar.
- Sin conversión de cartas antiguas ni transición: el proyecto aún no está en producción.
- De la propuesta de Bruno entran aquí sus RF-23, RF-24, RF-64 a RF-66 y RF-70.
