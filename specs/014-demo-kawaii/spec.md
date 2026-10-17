# Spec 014 — Demo pulida con estilo kawaii

## Contexto y objetivo
La demo local funciona, pero se ve plana y de prototipo: sobres que son rectángulos de color, iconos de línea
fina, tarjetas sin profundidad, un temporizador que es solo texto, textos que se montan y errores pequeños
(textos que se salen, «sobre(s)»). El usuario quiere, antes de publicar, una demo muchísimo más atractiva con
el contenido actual. Esta spec rediseña la cara visual del coleccionista con un estilo **kawaii pop sobre fondo
oscuro**: iconos tipo pegatina, sobres compuestos con el arte de cada colección, una apertura con suspense,
pantallas con más vida y una demo que arranca optimizada. También evita cartas repetidas dentro de un sobre.
No cambia las reglas de recompensas, Patreon, colecciones ni álbumes.

## Usuarios / actores
- **Coleccionista**: abre sobres, ve su colección y reclama recompensas.
- **Administrador**: elige la portada de cada colección y puede subir sobres diseñados a mano.
- **Quien enseña la demo**: el usuario, en local.

## Historias de usuario
- H1: Como coleccionista quiero que abrir un sobre sea emocionante y bonito, y que la interfaz se vea cuidada.
- H2: Como coleccionista quiero sobres que muestren el arte de su colección y saber de un vistazo cuánto falta para el siguiente sobre gratis.
- H3: Como coleccionista no quiero que un sobre me traiga la misma carta varias veces.
- H4: Como administrador quiero elegir la portada del sobre de cada colección o subir uno diseñado a mano.
- H5: Como dueño del proyecto quiero enseñar una demo rápida y sin avisos de desarrollo.

## Requisitos funcionales (criterios de aceptación en EARS)

### Estilo
- RF-1: EL SISTEMA usará una paleta kawaii sobre fondo oscuro (rosa chicle, lavanda, menta, celeste y amarillo pastel) con radios más redondeados, sombras de color y brillos suaves, definida solo como tokens del sistema de diseño; los componentes adoptan el estilo sin cambiar cómo se usan y el texto mantiene un contraste de al menos 4,5:1.
- RF-2: EL SISTEMA dará profundidad a las superficies (degradado sutil, borde luminoso y sombra de color) y a los botones principales (relieve y un pequeño rebote al pulsarlos); con movimiento reducido no habrá rebotes.

### Iconos
- RF-3: EL SISTEMA tendrá iconos propios tipo pegatina (relleno de color, borde blanco grueso y sombra) para sobre, carta, galleta, regalo, reloj, colección, racha y perfil, diseñados en Pencil y como componentes del sistema.
- RF-4: EL SISTEMA usará para el resto de iconos una biblioteca de doble tono coloreada a juego; ninguna pantalla del coleccionista usará iconos de línea fina.

### Sobres
- RF-5: EL SISTEMA compondrá el sobre de cada colección: forma de sobre con bordes dentados, la ilustración de portada, el nombre y el código de la colección, acabado foil pastel con brillo y pegatinas decorativas.
- RF-6: EL SISTEMA dejará al administrador elegir en el panel la carta de portada de cada colección; SI no hay ninguna elegida, ENTONCES usará la de mayor rareza.
- RF-7: EL SISTEMA dejará al administrador subir una imagen de sobre diseñada a mano para una colección y quitarla; MIENTRAS exista, se mostrará en lugar del sobre compuesto.
- RF-8: EL SISTEMA mostrará el mismo sobre de cada colección en «Mis sobres», en la apertura y en «Abrir todos».

### Apertura
- RF-9: EL SISTEMA mostrará la apertura sobre un fondo con destellos y estrellas pastel animadas, con un dorso de carta kawaii diseñado.
- RF-10: EL SISTEMA mostrará las cartas nítidas para el tamaño de la pantalla y un holo que realce la ilustración sin teñirla; al tocar o hacer clic no aparecerá el recuadro de foco (se mantiene, redondeado, al usar el teclado).
- RF-11: CUANDO el coleccionista toque el sobre antes de rasgarlo, EL SISTEMA lo agitará brevemente.
- RF-12: CUANDO la siguiente carta por voltear sea rara o mejor, EL SISTEMA hará brillar sus bordes con el color de su rareza, más intenso cuanto más rara, antes de voltearla.
- RF-13: CUANDO se revele una carta rara o mejor, EL SISTEMA lanzará confeti de pegatinas, y CUANDO sea legendaria o secreta, una celebración breve a pantalla completa.
- RF-14: EL SISTEMA mostrará al final un resumen con las cartas en miniatura, su rareza y la etiqueta «¡Nueva!».
- RF-15: EL SISTEMA no montará los textos de la apertura sobre el selector de idioma ni sobre los botones, ni en móvil ni en escritorio.

### Pantallas
- RF-16: EL SISTEMA mostrará en «Mis sobres» los sobres de cada colección con su brillo, y en la tarjeta de sobre gratis un temporizador en forma de anillo que se va llenando hasta el siguiente.
- RF-17: EL SISTEMA mostrará en «Recompensas» el temporizador de anillo y la racha como una fila de pegatinas por día (hechos, el de hoy y los siguientes), con las galletas y el sobre con su icono y sin que ningún texto se salga de su casilla.
- RF-18: EL SISTEMA mostrará en «Mi colección» cada colección con su portada, una vista previa de sus cartas, el progreso y datos como cuántas holo tiene y su mejor carta.
- RF-19: EL SISTEMA escribirá las cantidades con el plural correcto en inglés y español («1 sobre», «3 sobres»), nunca «sobre(s)».
- RF-20: EL SISTEMA no tapará el símbolo de la colección de una carta con su contador de copias.

### Sorteo
- RF-21: EL SISTEMA no repetirá una carta dentro de un mismo sobre: SI en una ranura sale una carta que ya está en el sobre, ENTONCES elegirá otra de la misma rareza; las probabilidades por rareza no cambian y la página de probabilidades lo explica.
- RF-22: EL SISTEMA mantendrá auditables las aperturas hechas antes de este cambio con la versión del sorteo con que se hicieron.

### Demo y panel
- RF-23: CUANDO se lance `pnpm demo`, EL SISTEMA arrancará la versión optimizada de la web, sin avisos de desarrollo; la demo sigue siendo solo local y nunca existirá en la web publicada.
- RF-24: EL SISTEMA aplicará al panel de administración la paleta y los iconos nuevos, sin rediseñar sus pantallas.

## Requisitos no funcionales
- Antes de programar, maquetas en Pencil (sobre, dorso, iconos, «Mis sobres», apertura con sus estados, recompensas y
  colección, en móvil y escritorio) aprobadas por el usuario.
- Presupuesto de 250 kB de JavaScript por página (spec 013) y animaciones solo con `transform` y `opacity`; los iconos
  son SVG en línea, sin imágenes.
- Con movimiento reducido: sin agitar, sin confeti ni celebración, y brillo de rareza estático.
- Textos en inglés y español; todo con componentes del sistema de diseño.

## Casos límite
- Colección sin cartas de portada posibles (sin rareza asignada): el sobre se compone sin ilustración, con su color.
- Imagen de sobre subida con proporción distinta: se recorta al formato del sobre sin deformarla.
- Una rareza con menos cartas distintas que ranuras de esa rareza en un sobre: se permite repetir solo en ese caso
  (si no, el sobre no podría completarse); queda explicado en la página de probabilidades.
- Protección de mala suerte (pity): la carta que garantiza también respeta la regla de no repetir.
- Una apertura a medias de antes del cambio se reanuda con su versión del sorteo.

## Fuera de alcance
- Tema claro y selector de tema.
- Rediseño a fondo de las pantallas del panel.
- Cambios de sonido, nuevas colecciones o arte propio (OCs).
- Publicar la web (spec 015).

## Criterios de finalización
Maquetas aprobadas; todos los RF con test en verde; E2E: sobre compuesto y su portada elegida en el panel → abrir
un sobre con agitado, brillo de rareza, confeti y resumen → sin cartas repetidas → recompensas con anillo y racha
sin desbordes → colección con portada y datos, en los cuatro proyectos; capturas de antes y después de todas las
pantallas del coleccionista; `pnpm demo` en versión optimizada; prueba del usuario en su teléfono.

## Decisiones de la entrevista (16 oct 2026)
Kawaii pop sobre fondo oscuro con pastel vivos, pegatinas propias para los iconos clave y biblioteca de doble tono
para el resto, sobre compuesto con el arte de la colección con opción de sobre a mano (preparado para usar solo
sobres a mano más adelante), apertura rediseñada con suspense, y sin cartas repetidas dentro de un sobre.

Spec aprobada por el usuario el 16 oct 2026.
