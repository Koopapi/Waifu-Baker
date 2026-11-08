# Spec 030 — Sobres por capas: editor de sobres y apertura con el diseño de Bruno

Estado: **aprobada por el dueño el 6 nov 2026**, tras la entrevista del mismo día.

Referencia: el paquete de Bruno «creador de sobres y apertura de sobres» del 6 nov 2026 (`sobre-capas.js` v1,
`creador-sobres.html`, `apertura-sobre.html`), que se copiará a `docs/waifu-baker/sobres/` como referencia. El paquete
es material de consulta: lo que manda es esta spec.

Decisiones del dueño en la entrevista:
1. Se mantiene el flujo de apertura actual (spec 023) y se toman de Bruno el diseño del sobre y las animaciones de la
   apertura.
2. Hay un editor de sobres en el panel, como el creador de Bruno.
3. Cada colección tiene dos diseños: uno para el sobre plata y otro para el gold.
4. El efecto especial de la SSR de Bruno lo llevan la Legendaria y la EX.
5. Mientras una colección no tenga su diseño, se ve el sobre de Bruno básico, armado con la portada que ya tiene.
6. «Abrir todos» sigue igual de rápido, con el sobre nuevo y el efecto de Legendaria y EX en las destacadas.
7. Los recursos del paquete (plástico 3D, textura «líquido» y arte de ejemplo) se usan desde ya; la confirmación de su
   licencia con Bruno se hace por separado.
8. Las cartas siguen saliendo boca abajo y se voltean una a una para revelarse, como hoy (no boca arriba como en la de
   Bruno).
9. Las fuentes del sobre (Dela Gothic One y Archivo) se cargan solo en las pantallas donde aparecen sobres.
10. Tras probarla (6 nov 2026), la Legendaria y la EX salen solo con el efecto de Bruno: se quitan el confeti, las
    partículas, la celebración, el destello, el brillo previo y el sonido de su rareza, que se sumaban y daban un pequeño
    lag. La carta viva se carga antes de voltearse.

## Contexto y objetivo
Hoy cada colección muestra un sobre plano hecho con su carta de portada o con una imagen a mano, y la apertura es la de
la spec 023. Bruno diseñó un sobre mucho más vistoso: plástico 3D con brillos y arrugas, capas con parallax y
partículas, sellos de aluminio, logo, banda del set e insignia, que se rasga por la línea o se despega como sticker. Las
cartas suben desde dentro del sobre y la SSR sale con rayos dorados. Esta spec trae ese sobre y esas animaciones al
juego sin cambiar el flujo que ya funciona: el servidor decide la tirada, se reanuda tras recargar, hay movimiento
reducido, teclado, sonido y «Abrir todos». Además deja diseñar cada sobre desde el panel con las mismas herramientas
que el creador de Bruno.

## Usuarios / actores
- **Administrador** (el dueño y Bruno): diseña los sobres de cada colección en el panel.
- **Coleccionista**: ve los sobres y los abre.

## Historias de usuario
- H1: Como administrador quiero diseñar el sobre plata y el sobre gold de cada colección con capas, partículas, sellos
  e insignia, para que cada colección tenga su propio sobre.
- H2: Como administrador quiero ver una revisión que me avise de imágenes mal medidas o de arte que cruza la línea de
  rasgado, para no publicar un sobre roto.
- H3: Como coleccionista quiero abrir un sobre que se sienta físico, rasgándolo o despegándolo, y ver salir las cartas
  de dentro.
- H4: Como coleccionista quiero que una Legendaria o una EX se anuncien y salgan con un efecto especial.

## Vocabulario
- **Diseño del sobre**: la configuración de un sobre (capas, partículas, sellos, logo, insignia, holo, foil, versión y
  forma de abrir), en el formato del creador de Bruno.
- **Versión del sobre**: 3D (con plástico y silueta de almohada) o plano (con dientes y sin plástico).
- **Forma de abrir**: rasgar por la línea o despegar un sticker.
- **Sobre básico**: el sobre de Bruno armado solo, sin diseño propio, con la portada de la colección como arte.
- **Línea de rasgado**: la franja de arriba del sobre por donde se abre; en el lienzo de 1000 × 1750 px está a 230 px.
- **Efecto especial**: el de la SSR de Bruno (el mazo late antes, rayos dorados, estrella con la rareza, campanita y
  vibración).

## Requisitos funcionales (criterios de aceptación en EARS)

### Editor de sobres (panel)
- RF-1: EL SISTEMA ofrecerá en cada colección un editor de sobres con un diseño para el sobre plata y otro para el gold.
- RF-2: EL SISTEMA mostrará el editor con la misma distribución, controles y textos que el creador de Bruno, con el
  sistema de diseño del editor de cartas.
- RF-3: EL SISTEMA mostrará en el editor una vista previa en vivo del sobre que se inclina con el puntero y permite
  probar la apertura con cartas de muestra, pasar a la siguiente carta y volver a cerrarlo.
- RF-4: EL SISTEMA permitirá subir capas de 1000 × 1750 px en PNG, WebP o JPG, y les dará valores iniciales según el
  nombre del archivo, como el creador de Bruno.
- RF-5: EL SISTEMA permitirá en cada capa elegir modo de mezcla, opacidad, profundidad, margen extra y brillo solo en el
  dibujo, y ordenarla, ocultarla o quitarla.
- RF-6: EL SISTEMA permitirá agregar capas de partículas con tipo, cantidad, tamaño, velocidad, color y variación.
- RF-7: EL SISTEMA permitirá elegir la versión del sobre, la forma de abrir, el logo (Waifu Baker, imagen propia o
  ninguno), la insignia con su color, el holo y el foil con su intensidad, y los colores y el patrón holo de los
  sellos.
- RF-8: EL SISTEMA tomará el nombre, el código y el número de cartas del sobre de la colección, sin poder cambiarlos en
  el editor.
- RF-9: EL SISTEMA avisará, sin impedir guardar, si una imagen no mide 1000 × 1750, si el fondo tiene transparencia, si
  algo de una capa cruza la línea de rasgado, si el nombre es largo o si falta un archivo.
- RF-10: CUANDO el administrador guarde, EL SISTEMA guardará el diseño y sus imágenes en el almacenamiento del proyecto,
  generará la miniatura de 500 × 875 y lo registrará en la auditoría.
- RF-11: CUANDO el administrador vuelva al editor, EL SISTEMA cargará el diseño guardado con sus imágenes, sin pedir
  que las suba otra vez.
- RF-12: SI el diseño guardado no es válido, ENTONCES EL SISTEMA no lo guardará e indicará qué campo falla.
- RF-13: EL SISTEMA permitirá editar sobres solo a los administradores.

### El sobre en el juego
- RF-14: MIENTRAS una colección tenga diseño para un tipo de sobre, EL SISTEMA mostrará ese diseño en sus sobres de ese
  tipo.
- RF-15: MIENTRAS una colección no tenga diseño para un tipo de sobre, EL SISTEMA mostrará el sobre básico, con la carta
  de portada o la imagen a mano de la colección, sellos plateados en el plata y dorados en el gold.
- RF-16: EL SISTEMA mostrará el mismo sobre en «Mis sobres», en la apertura, en «Abrir todos» y en el simulador del
  panel, con la miniatura en las listas.
- RF-17: MIENTRAS el sobre esté cerrado, EL SISTEMA no dejará ver ninguna carta, aunque se incline al máximo.

### Apertura
- RF-18: CUANDO el coleccionista rasgue el sobre o despegue el sticker según su diseño, EL SISTEMA lo abrirá con la
  animación de Bruno: la tira sale volando, hay un destello, el sonido de rasgado y una vibración corta.
- RF-19: CUANDO el sobre se abra, EL SISTEMA hará subir las cartas boca abajo desde dentro a los 0,38 s, ocultará el
  sobre a los 1,25 s y dejará el mazo en el centro, listo para revelar, a los 1,9 s.
- RF-20: EL SISTEMA mostrará las cartas derechas, con solo la de arriba visible; al tocarla, arrastrarla o pulsar el
  botón, la volteará para revelarla, y con el mismo gesto sobre una carta ya revelada la apartará a un lado y pasará a
  la siguiente.
- RF-21: CUANDO la carta de arriba sea Legendaria o EX, EL SISTEMA hará latir el mazo antes de voltearla.
- RF-22: CUANDO se revele una Legendaria o una EX, EL SISTEMA la presentará con el efecto especial: rayos dorados,
  estrella con su rareza, campanita y vibración.
- RF-23: EL SISTEMA mostrará los puntos de avance del mazo y, al final, el resumen con el diseño de Bruno, conservando
  las miniaturas, la rareza y «¡Nueva!».
- RF-24: EL SISTEMA conservará el resto del flujo de la spec 023: la tirada la decide el servidor al confirmar la
  apertura, el orden de menor a mayor rareza, el error con el sobre cerrado, la reanudación tras recargar, el teclado,
  el botón «Abrir sin deslizar», el sonido con silencio recordado y el movimiento reducido.
- RF-26: CUANDO se revele una Legendaria o una EX, EL SISTEMA mostrará solo el efecto especial, con la vibración de
  Bruno, sin el confeti, las partículas, la celebración, el destello, el brillo previo de los bordes ni el sonido de su
  rareza.
- RF-27: MIENTRAS una carta con versión viva esté arriba del mazo sin revelar, EL SISTEMA la irá cargando oculta, para
  que al voltearla se vea sin esperar.
- RF-25: CUANDO empiece «Abrir todos», EL SISTEMA mantendrá su ráfaga y su ritmo actuales con el sobre nuevo, y
  presentará las Legendarias y EX destacadas con el efecto especial.

## Requisitos no funcionales
- Mismo aspecto que la referencia: el sobre y sus efectos salen del componente de Bruno y de sus imágenes de plástico, sin
  reescribir los efectos.
- Seguridad: las imágenes del diseño se sirven con URL firmadas; el diseño se valida en el servidor (modos de mezcla,
  colores, rutas solo del almacenamiento propio) igual que la configuración de las cartas. Pasar a la versión de la
  carta del paquete no quita esas validaciones.
- Rendimiento: el JavaScript de la primera carga de las páginas del coleccionista sigue por debajo de 250 kB
  comprimidos (`pnpm budget`), y la apertura mantiene 60 fps en Pixel 6a e iPhone 12.
- Navegadores: Chrome y Edge 111+, Safari 16.2+ y Firefox 113+, como pide el componente.
- Idioma: todos los textos nuevos en inglés y español.
- Sistema de diseño: el editor de sobres usa los componentes del editor de cartas.
- Movimiento reducido: sin inclinación, sin partículas y sin efecto especial animado; se abre con el botón.

## Casos límite
- Colección con sobres ya entregados: al guardar un diseño, los sobres sin abrir se ven con el nuevo.
- Colección 18+: su sobre solo se ve con el doble filtro, como sus cartas.
- Colección archivada: sus sobres sin abrir se siguen abriendo con su diseño.
- Imagen de capa que falla al cargar: el sobre se ve sin esa capa y se puede abrir igual.
- Sobre de 1 carta: no hay puntos de avance ni mazo; la carta sale sola.
- Sobre plano: no lleva plástico; se recorta con dientes.
- Tema Street pop o Kawaii: la mesa de apertura sigue oscura (spec 026) y el sobre no cambia con el tema.

## Fuera de alcance
- Cambiar quién decide la tirada, las probabilidades o el contenido de los sobres.
- Historial de versiones del diseño del sobre y borrador en el navegador (como en la spec 027).
- Generar la miniatura en el servidor.
- Sobres de eventos o tienda (specs siguientes).
- Cambiar el diseño de las cartas.

## Criterios de finalización
Cada RF con su test en verde: unidad para la validación del diseño, integración para guardar y cargar con imágenes, y E2E
de diseñar un sobre, guardarlo, recargar y abrirlo en el juego con una Legendaria. Suite completa en verde en los cuatro
proyectos; comparación lado a lado con `creador-sobres.html` y `apertura-sobre.html`; prueba en un teléfono real.

## Dudas abiertas
- Ninguna. Resueltas el 6 nov 2026: las cartas siguen boca abajo con volteo (decisión 8) y las fuentes del sobre se
  cargan solo donde hay sobres (decisión 9; la regla de la spec 026 sigue valiendo en el resto de la web).
