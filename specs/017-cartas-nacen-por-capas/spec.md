# Spec 017 — Todas las cartas nacen por capas

Estado: propuesta (23 oct 2026), pendiente de aprobación del dueño.

## Contexto y objetivo
La spec 016 llevó al panel el editor de cartas por capas de Bruno. Al aprobarlo, el dueño decidió que **todas las
cartas serán cartas por capas**: el montaje original (una ilustración compuesta con el marco de Pencil) deja de ser la
forma de hacer cartas. Esta spec hace que toda carta tenga capas: las que ya existen se convierten solas, subir una
ilustración crea una carta por capas, el estilo sigue a la rareza mientras nadie lo toque, se pueden crear cartas
directamente desde varias capas y se importa y exporta el formato del creador de Bruno.

**El coleccionista todavía no ve las capas**: hasta la spec 018 sigue viendo la imagen compuesta de siempre, así que
nada sin revisar le llega. La spec 018 sustituye esa imagen por la plana generada desde las capas y muestra las cartas
con profundidad en toda la web. No cambia ninguna regla de rarezas, sorteo, probabilidades ni concesiones.

## Usuarios / actores
- **Administrador**: sube ilustraciones, crea cartas desde capas, importa y exporta, y ve sus cartas convertidas.
- **Coleccionista**: sin cambios visibles en esta spec.

## Historias de usuario
- H1: Como dueño quiero que todas las cartas existentes pasen a ser cartas por capas sin rehacerlas a mano.
- H2: Como administrador quiero subir una ilustración como hoy y que salga una carta por capas con el estilo de su
  rareza, para no montar capas cuando no hace falta.
- H3: Como administrador quiero que, mientras no toque el estilo, la carta se vista sola con el de su rareza aunque la
  cambie.
- H4: Como administrador quiero crear una carta directamente desde varias capas.
- H5: Como administrador quiero importar y exportar el formato del creador de Bruno para no repetir trabajo.

## Vocabulario
- **Capa base**: la capa de imagen que sale de la ilustración de la carta (al convertirla o al subirla).
- **Estilo automático**: marco, partículas y sello del escalón de la rareza, puestos por el sistema. Deja de serlo en
  cuanto el administrador cambia a mano el marco, las partículas o el sello.
- **Recorte al lienzo**: la ilustración se recorta centrada a la proporción 700 × 991 y se escala a 1400 × 1982, sin
  deformarla.
- El resto (configuración por capas, escalón, capa visible) como en la spec 016.

## Requisitos funcionales (criterios de aceptación en EARS)

### Conversión de las cartas existentes
- RF-1: CUANDO se aplique esta spec, EL SISTEMA convertirá cada carta sin capas en carta por capas de una sola capa: su
  ilustración original recortada al lienzo como capa base, con el estilo automático de su escalón.
- RF-2: SI una carta no tiene rareza, ENTONCES EL SISTEMA le pondrá el estilo del escalón N.
- RF-3: EL SISTEMA no tocará las cartas que ya tengan capas y dejará cada conversión en la auditoría; repetirla no
  cambia nada.
- RF-4: EL SISTEMA conservará al convertir el número, el nombre, la rareza, la colección y la revisión 18+ de la carta
  (la ilustración es la misma, solo recortada).
- RF-5: EL SISTEMA creará ya por capas las cartas de la demo y de las colecciones de prueba.

### Subir una ilustración
- RF-6: CUANDO el administrador suba una o varias ilustraciones a una colección, EL SISTEMA creará por cada una una carta
  por capas con su capa base recortada al lienzo y el estilo automático de su escalón.
- RF-7: EL SISTEMA aceptará ilustraciones PNG, JPEG o WebP de hasta 20 MB y al menos 700 px de ancho; las de otra
  proporción se recortarán al lienzo en vez de rechazarse.
- RF-8: MIENTRAS una carta conserve el estilo automático, CUANDO cambie su rareza, EL SISTEMA le pondrá el marco, las
  partículas y el sello del escalón nuevo.
- RF-9: CUANDO el administrador cambie a mano el marco, las partículas o el sello, EL SISTEMA dejará de aplicar el
  estilo automático a esa carta (el cambio de rareza seguirá la spec 016, RF-25).
- RF-10: CUANDO el administrador sustituya la ilustración de una carta, EL SISTEMA sustituirá su capa base y mantendrá
  el resto de capas y ajustes.

### Crear desde capas
- RF-11: EL SISTEMA permitirá crear una carta nueva a partir de varias capas en una colección en borrador, con el
  siguiente número libre.
- RF-12: EL SISTEMA aplicará a las cartas creadas desde capas las mismas comprobaciones de publicación que al resto
  (personaje, nombre, rareza y revisión 18+).
- RF-13: SI el administrador intenta dejar una carta sin ninguna capa de imagen visible, ENTONCES EL SISTEMA no lo
  permitirá (ninguna carta vuelve ya al montaje con el marco de Pencil).
- RF-14: SI una colección tiene cartas sin ilustración original (creadas solo desde capas), ENTONCES EL SISTEMA no
  permitirá publicarla hasta la spec 018, e indicará por qué.

### Importar y exportar
- RF-15: CUANDO el administrador exporte la configuración por capas de una carta, EL SISTEMA entregará el formato del
  creador de Bruno, con los nombres de archivo de sus capas.
- RF-16: CUANDO el administrador importe una configuración del creador y suba sus archivos, EL SISTEMA colocará cada
  archivo en su capa.
- RF-17: SI una configuración importada no es válida, ENTONCES EL SISTEMA no cambiará la carta e indicará qué parte
  falla.
- RF-18: SI una configuración importada usa un modo de mezcla que el editor no ofrece, ENTONCES EL SISTEMA lo cambiará a
  normal e indicará qué capas cambiaron.

### Mientras llega la spec 018
- RF-19: EL SISTEMA seguirá mostrando al coleccionista y en las zonas públicas la imagen compuesta de siempre de cada
  carta, y ninguna capa saldrá del panel (spec 016, RF-4).
- RF-20: EL SISTEMA dejará de ofrecer en el panel las acciones que solo tienen sentido con el montaje antiguo
  («Regenerar imágenes» con el marco de Pencil), salvo para mantener la imagen compuesta del coleccionista.

## Requisitos no funcionales
- La conversión corre una vez, en una tarea que se puede repetir sin efectos (idempotente), y procesa las cartas por
  lotes para no bloquear el servidor; si una carta falla, sigue con las demás y lo apunta.
- Las capas base se guardan en WebP como el resto de capas (spec 016) y solo se sirven al administrador.
- Textos nuevos en inglés y español, en el diccionario del panel (no en el general, que viaja a todas las páginas).
- Peso: ninguna página del coleccionista crece (`pnpm budget`).

## Casos límite
- Ilustración muy alargada: se recorta centrada; el administrador puede ajustar el margen o la profundidad después.
- Carta 18+ convertida: conserva su revisión (misma ilustración); un cambio posterior de capas sigue las reglas 18+
  que llegan con la spec 018 (mientras, nada sale del panel).
- Carta con capas de la spec 016 que conserva su imagen original: no se convierte (RF-3).
- Conversión interrumpida a mitad: al repetirla, sigue con las que faltan.
- Importación con más de 8 capas de imagen: se rechaza (RF-17).

## Fuera de alcance
- Lo que ve el coleccionista, la imagen plana, la revisión 18+ de capas, el giroscopio y las zonas públicas (spec 018).
- Historial de versiones, plantillas y copiar capas entre cartas.
- Cambiar las rarezas del juego, el sorteo o las probabilidades.

## Criterios de finalización
Cada RF con su test en verde y la suite completa en verde; la demo arranca con sus 26 cartas ya por capas; E2E del panel
en escritorio: subir una ilustración y ver la carta por capas, cambiar su rareza con estilo automático, crear una carta
desde capas, exportar e importar; `pnpm budget` sin cambios en el coleccionista; demo manual del dueño.

## Decisiones (23 oct 2026)
- Todas las cartas serán cartas por capas con el sistema de Bruno (al aprobar la spec 016).
- Las existentes se convierten solas (una capa con su ilustración y el estilo de su escalón).
- Subir una ilustración crea una carta por capas; también se pueden crear desde varias capas.
- Orden: primero que todas nazcan por capas (017) y luego que se vean en toda la web (018).
- De la propuesta de Bruno entran aquí sus RF-23, RF-24, RF-64 a RF-67 y RF-70.
