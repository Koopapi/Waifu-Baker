# Spec 025 — Configurador de cartas v4 (el de Bruno) en el panel

Estado: aprobada por el dueño el 29 oct 2026, con sus decisiones (D1 a D4 y marco personalizado). Siguiente paso:
maquetas en Pencil.

Origen: paquete «waifu-baker-configurador-cartas» que Bruno entregó el 29 oct 2026 (`carta-capas.js` v4 y
`creador-cartas.html` v4), copiado como referencia en `docs/waifu-baker/configurador-cartas/`. Su
`PROMPT-INTEGRACION.md` es material de referencia: lo que pide entra solo a través de esta spec y de las decisiones del
dueño.

## Contexto y objetivo
Las specs 016 a 018 llevaron al panel el editor de cartas por capas con la versión 3 de la carta de Bruno, y la 022 cambió
los marcos y los sellos de las cinco rarezas. Desde entonces Bruno siguió puliendo su configurador. Al dueño le gusta
cómo quedó y quiere armar las cartas **con lo que Bruno tiene**. La v4 trae efectos nuevos en la carta (brillo solo
sobre el dibujo de una capa e intensidad del holo) y controles que el editor del panel no tiene (ajustes de la vista
previa, «Probar revelado», marco personalizado, sin marco, grosor del borde, «Usar como sello», partículas de un solo
color y «Otra variación», recorte automático del sello). Esta spec trae todo eso al panel **sin perder** lo que el panel
ya hace y el configurador no: la chica y el fondo obligatorios, la biblioteca general, el encuadre de cada capa, el
estilo automático por rareza, la revisión 18+, importar y exportar, el aviso de edición simultánea y el registro en la
auditoría.

## Usuarios / actores
- **Administrador** (el dueño y Bruno): arma las cartas en el panel.
- **Coleccionista**: ve los efectos nuevos en sus cartas (apertura, ficha y colección).

## Historias de usuario
- H1: Como administrador quiero que el brillo holográfico, dorado, plateado o el destello caigan solo sobre la chica (o
  sobre la capa que elija) para que el fondo no se ensucie.
- H2: Como administrador quiero ajustar qué tan fuerte se ve el holo de la carta.
- H3: Como administrador quiero probar en la vista previa cómo se ve la carta al revelarse y con más o menos
  inclinación, sin tener que abrir un sobre.
- H4: Como administrador quiero tener todos los controles del configurador de Bruno en el editor del panel, para no
  tener que armar la carta fuera y luego importarla.
- H5: Como coleccionista quiero ver la carta con los mismos efectos que vio quien la armó.

## Vocabulario
- **Brillo de capa**: efecto (holográfico, destello que pasa, metálico dorado o metálico plateado) que se pinta solo
  donde una capa de imagen tiene dibujo, nunca en su parte transparente; tiene intensidad de 0 a 100 %.
- **Intensidad del holo**: qué tan fuerte se ve el holo de toda la carta, de 0 a 100 % (40 % si no se elige).
- **Ajustes de la vista previa**: profundidad del parallax, inclinación máxima, versión holo y movimiento solo. Solo
  cambian cómo se ve la carta en el editor; no se guardan en la carta.
- **Probar revelado**: oculta el sello y lo hace entrar con su animación y el destello, como al revelar en un sobre.

## Requisitos funcionales (criterios de aceptación en EARS)

### La carta (lo que se guarda y ve el coleccionista)
- RF-1: EL SISTEMA permitirá poner a cada capa de imagen un brillo de capa, con su tipo y su intensidad, o ninguno.
- RF-2: EL SISTEMA pintará el brillo de capa solo sobre las partes con dibujo de esa capa.
- RF-3: DONDE la carta sea holo, EL SISTEMA permitirá fijar su intensidad del holo entre 0 y 100 %.
- RF-4: EL SISTEMA mostrará el brillo de capa y la intensidad del holo igual en la vista previa del editor, en la
  apertura de sobres y en la ficha de la carta.
- RF-5: CUANDO se regenere la imagen fija de una carta (spec 018, RF-3), EL SISTEMA incluirá su brillo de capa en reposo
  y su intensidad del holo.
- RF-6: MIENTRAS el usuario prefiera menos movimiento, EL SISTEMA mostrará el destello que pasa quieto, en el centro de la
  capa.
- RF-7: EL SISTEMA seguirá mostrando sin cambios las cartas guardadas antes de esta spec (sin brillo de capa y con la
  intensidad del holo por defecto).

### Controles nuevos del editor
- RF-8: EL SISTEMA mostrará bajo la vista previa del editor los ajustes de la vista previa y el botón «Probar revelado».
- RF-9: CUANDO el administrador pulse «Probar revelado», EL SISTEMA ocultará el sello y lo hará entrar con su animación
  y el destello que cruza la carta.
- RF-10: EL SISTEMA no guardará los ajustes de la vista previa en la carta.
- RF-11: EL SISTEMA permitirá elegir el grosor del borde del marco entre 0,8 y 5 % del ancho de la carta.
- RF-12: CUANDO el administrador pulse «Usar como sello» en una capa de imagen, EL SISTEMA pondrá esa imagen como sello
  de imagen y la quitará de las capas.
- RF-13: CUANDO el administrador ponga un sello de imagen con mucho espacio transparente alrededor, EL SISTEMA lo
  recortará a su contenido.
- RF-14: EL SISTEMA permitirá dar a una capa de partículas un solo color para todas.
- RF-15: CUANDO el administrador pulse «Otra variación» en una capa de partículas, EL SISTEMA cambiará la posición y el
  ritmo de sus partículas sin cambiar su tipo, cantidad, tamaño ni velocidad.
- RF-16: EL SISTEMA permitirá elegir como marco, además del de la rareza, un marco personalizado con dos colores (color
  y brillo) o «Sin marco».
- RF-17: MIENTRAS una carta tenga marco personalizado o «Sin marco», EL SISTEMA lo conservará al cambiar su rareza y
  solo cambiará su sello de texto al de la rareza nueva.
- RF-18: EL SISTEMA mostrará el marco personalizado y «Sin marco» igual en la carta viva y en su imagen fija.
- RF-19: EL SISTEMA aceptará en el marco personalizado solo colores en formato hexadecimal (#rrggbb).
- RF-20: CUANDO el administrador suba varias capas a la vez en el editor de una carta, EL SISTEMA las ordenará por nombre de archivo y usará el
  nombre (`fondo`, `personaje`, `overlay`, `sello`…) para proponer su papel, profundidad, margen y mezcla, como el
  configurador de Bruno.

### Aspecto del editor (D1)
- RF-21: EL SISTEMA mostrará el editor con la distribución del configurador de Bruno: vista previa grande sobre una
  escena oscura a la izquierda, ajustes de la vista previa debajo de ella, y capas, rareza y sello a la derecha; en
  pantallas de 390 px, la vista previa arriba y los controles debajo, sin scroll horizontal.
- RF-22: EL SISTEMA mostrará cada ajuste numérico como un deslizador con su nombre a la izquierda y su valor con unidad a
  la derecha, que también se cambia con las flechas del teclado.
- RF-23: EL SISTEMA mostrará la lista de capas con la de adelante arriba, las marcas «Adelante» y «Atrás», y en cada fila
  una miniatura, el nombre, un resumen (mezcla, profundidad y brillo) y los botones ocultar, adelante, atrás y quitar.
- RF-24: CUANDO el administrador abra una fila de la lista de capas, EL SISTEMA mostrará sus ajustes debajo de ella, con
  la fila resaltada.
- RF-25: EL SISTEMA mostrará los escalones de rareza como fichas seleccionables con la muestra del color de su marco, y
  el tipo de sello (ninguno, texto o imagen) como un selector de tres opciones juntas.
- RF-26: EL SISTEMA construirá los deslizadores, la lista de capas, las fichas y el selector de opciones juntas como
  componentes reutilizables del sistema de diseño, con los colores y las fuentes actuales del sitio.

### Lo que no cambia
- RF-27: EL SISTEMA conservará en el editor la chica y el fondo, la biblioteca general, el encuadre de cada capa, el
  estilo automático por rareza, importar y exportar, el aviso de edición simultánea y el registro en la auditoría
  (specs 016 a 018).
- RF-28: SI se cambian el brillo de capa o la intensidad del holo de una carta de una colección 18+ publicada, ENTONCES
  EL SISTEMA dejará el cambio pendiente de revisión, como cualquier otro cambio de capas (spec 018, RF-18).
- RF-29: CUANDO se importe una configuración del configurador v4 de Bruno, EL SISTEMA conservará su brillo de capa y su
  intensidad del holo.
- RF-30: CUANDO se exporte una carta, EL SISTEMA incluirá su brillo de capa y su intensidad del holo en el formato del
  configurador v4.

## Requisitos no funcionales
- Seguridad: el brillo de capa y la intensidad del holo se validan en el servidor con listas cerradas y límites, y la
  carta los vuelve a filtrar al pintar, como el resto de la configuración (#18). La imagen que usa el brillo como máscara
  es siempre la de la propia capa, servida desde el mismo dominio.
- La carta del sitio conserva lo propio del proyecto que la v4 de Bruno no tiene: el encuadre por capa (spec 017), los
  marcos y sellos de la spec 022 (salvo que D2 diga otra cosa) y los filtros de seguridad.
- Rendimiento: 60 fps en Pixel 6a e iPhone 12 con una carta EX con holo, 65 partículas y brillo de capa en la chica
  (constitución). Las páginas del coleccionista no crecen más de 2 KB comprimidos (`pnpm budget`).
- Accesibilidad: todos los controles nuevos con teclado y nombre para lectores de pantalla.
- Sistema de diseño: los componentes nuevos (RF-26) van en `ui/` con su componente en Pencil; los colores y las
  fuentes del configurador (lila, bordes gruesos, Dela Gothic One y Archivo) **no** entran aquí: son del tema Street pop,
  que los aplicará a todo el sitio a la vez.
- Idioma: todos los textos nuevos en inglés y español.
- Navegadores: revisar a mano en Safari (iPhone) el brillo de capa y el marco, que usan máscaras.

## Casos límite
- Capa con brillo y opacidad 0 u oculta: no se pinta ni la capa ni su brillo.
- Brillo en una capa sin transparencia (por ejemplo, el fondo): cubre toda la capa, lo cual es válido.
- Carta no holo con intensidad del holo guardada: la intensidad se ignora hasta que vuelva a ser holo.
- Configuración importada del configurador v3 o v4 con `ur`: se toma como EX.
- Carta común (plana, spec 022 RF-4): el brillo de capa se ve en la imagen fija, sin movimiento.
- Movimiento reducido: el destello que pasa queda quieto (RF-6); el resto como hoy (imagen fija).
- Configuración importada con un modo de mezcla fuera de los 12: esa capa pasa a normal con aviso (como hoy).
- Marco personalizado con «Aplicar estilo de la rareza»: vuelve al marco de la rareza (el estilo pasa a automático).
- «Sin marco» con borde: el grosor del borde no se usa mientras no haya marco.

## Fuera de alcance
- Cambiar las rarezas, el sorteo, las probabilidades o los sobres.
- La proporción libre de la carta del configurador (automática, 5:7, 2:3, 3:4…): en el sitio todas las cartas usan el
  lienzo de 700 × 991 de la spec 016.
- Guardar el trabajo a medias en el navegador (`localStorage`): el editor del panel ya guarda en la carta.
- La carta de ejemplo de Yuki como carta del sitio (es arte de prueba; Bruno debe confirmar su origen antes de usarla).
- La página `ejemplo.html` del paquete.
- Los colores y las fuentes del configurador (tema Street pop).
- Volver a los marcos de rareza y los sellos de Bruno: se quedan los de la spec 022 (el marco personalizado sí entra).

## Criterios de finalización
Cada RF con su test en verde y la suite completa en verde; maquetas en Pencil aprobadas antes del plan; abrir el
configurador de Bruno y el editor del panel lado a lado con la carta de Yuki (subida como prueba, sin publicar) y
comprobar que la carta se ve igual (brillo holográfico en la chica, EX con holo al 60 %); checklist en teléfono (iPhone y
Android); demo del dueño y de Bruno.

## Decisiones del dueño (29 oct 2026)
- **D1. Aspecto del editor:** se trae lo visual del configurador de Bruno (distribución, deslizadores, lista de capas
  con sus botones, fichas de rareza, selector de sello y escena oscura de la vista previa) como componentes reutilizables
  (RF-21 a RF-26). Los colores y las fuentes se quedan como están hasta el tema Street pop.
- **D2. Marcos y sellos:** se quedan los de la spec 022 (sellos C, R, E, LEG y EX).
- **D4. Componente de la carta:** lo nuevo de la v4 (brillo de capa, intensidad del holo y `ex`) pasa a nuestra copia,
  que conserva el encuadre de la spec 017, los marcos de la 022 y los filtros de seguridad.
- **D3. Modos de mezcla:** se quedan los 12 del panel; `hue`, `saturation`, `color` y `luminosity` no entran porque no
  salen igual en la imagen fija (spec 016, RF-7). Al importar una configuración que los use, pasan a normal con aviso.
- **Marco personalizado:** entra como en el configurador de Bruno: dos colores (color y brillo) y la opción «Sin
  marco» (RF-16 a RF-19). Los sellos siguen siendo los de la spec 022.

## Dudas abiertas
- Ninguna.
