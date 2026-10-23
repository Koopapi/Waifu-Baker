# Spec 016 — Cartas por capas: editor en el panel

Estado: propuesta (23 oct 2026), pendiente de aprobación del dueño.

Origen: la propuesta de Bruno «Spec 016: cartas por capas (parallax) en el panel» (PR #14, 71 RF), partida en tres
specs por decisión del dueño (23 oct 2026): **016 editor en el panel** (esta), **017 cartas por capas para el
coleccionista** (imagen plana, apertura, colección, ficha, giroscopio, revisión 18+ y zonas públicas) y **018 crear
cartas desde capas e importar/exportar**. La tabla del final relaciona cada RF con el de la propuesta original.

## Contexto y objetivo
Hoy cada carta nace de una sola ilustración que el sistema compone con el marco de su rareza (spec 003). El paquete de
diseño de Bruno trae cartas por capas: varias ilustraciones del mismo lienzo que se mueven a distinta velocidad
(parallax), partículas, modos de mezcla, un marco metálico por escalón de rareza y un sello que flota fuera de la
carta; la librería (`ui/game/carta-capas/`) ya está en `pruebas` (#15). Esta spec lleva el **editor** al panel: el
administrador añade capas a una carta existente, las ajusta con una vista previa en vivo y las guarda. **El
coleccionista todavía no ve las capas** (eso es la spec 017): hasta entonces las cartas se le siguen mostrando como
hoy. No cambia ninguna regla de colecciones, rarezas, sorteo, probabilidades ni concesiones.

## Usuarios / actores
- **Administrador**: añade y ajusta las capas de las cartas desde el panel.
- **Coleccionista**: sin cambios en esta spec.

## Historias de usuario
- H1: Como administrador quiero añadir capas a una carta ya creada para que tenga profundidad sin rehacerla.
- H2: Como administrador quiero ver la carta en vivo mientras ajusto sus capas para saber cómo se verá.
- H3: Como administrador quiero enterarme si otro administrador guardó la misma carta mientras yo la editaba, para no
  pisar su trabajo sin saberlo.
- H4: Como administrador quiero que, al cambiar la rareza de una carta con capas, su marco y su sello la sigan.

## Vocabulario
- **Configuración por capas**: capas de atrás hacia adelante, marco, sello, holo y proporción, en el formato del
  creador de Bruno (`CartaConfig`); cada imagen se guarda como clave del almacén, nunca como URL.
- **Capa de imagen**: una ilustración del lienzo con profundidad, margen, modo de mezcla, opacidad y visibilidad.
- **Capa visible**: capa de imagen no oculta y con opacidad mayor que 0.
- **Capa de partículas**: destellos, confeti, pétalos… generados por el sistema; no lleva imagen.
- **Lienzo**: proporción común de las capas de imagen, 700 × 991 (se recomienda subirlas a 1400 × 1982).
- **Escalón**: el aspecto visual de la rareza en la carta por capas (marco, partículas y sello): N, R, SR, SSR y UR,
  con el reparto de `domain/catalog/rarity-tier.ts` (común y poco común → N, rara → R, épica → SR, legendaria → SSR,
  secreta → UR). Solo cambia cómo se ve la carta.

## Requisitos funcionales (criterios de aceptación en EARS)

### Acceso
- RF-1: EL SISTEMA solo permitirá ver, crear, editar o quitar configuraciones por capas a cuentas con rol de
  administrador.
- RF-2: EL SISTEMA registrará cada cambio en la configuración por capas de una carta con autor, fecha, valores
  anteriores y valores nuevos (como spec 003, RF-3).
- RF-3: EL SISTEMA mostrará a cualquier administrador las capas de una carta 18+ en el panel, esté revisada o no.
- RF-4: EL SISTEMA no entregará ninguna configuración ni imagen de capa fuera del panel de administración (el
  coleccionista y los visitantes siguen viendo la carta como hoy hasta la spec 017).

### Editor
- RF-5: EL SISTEMA mostrará en el editor de cada carta una sección «Carta por capas» con una vista previa en vivo sobre
  fondo oscuro, que se actualiza sin recargar la página al cambiar cualquier ajuste.
- RF-6: EL SISTEMA permitirá subir varias capas de imagen a la vez, cambiar su orden y ocultarlas o mostrarlas.
- RF-7: EL SISTEMA permitirá ajustar por capa de imagen la profundidad, el margen, el modo de mezcla y la opacidad, y
  solo ofrecerá los modos de mezcla que la futura imagen plana reproduce igual que la web.
- RF-8: EL SISTEMA permitirá añadir capas de partículas con su tipo, cantidad, tamaño, velocidad y color.
- RF-9: EL SISTEMA permitirá elegir el marco entre los cinco escalones (N, R, SR, SSR, UR) y, con «Aplicar estilo de la
  rareza», pondrá el marco, las partículas y el sello del escalón de la rareza de la carta.
- RF-10: EL SISTEMA permitirá poner un sello de texto con su estilo o un sello de imagen, en cualquiera de las cuatro
  esquinas, o no poner sello.
- RF-11: EL SISTEMA no pondrá texto encima de la carta por capas (ni número ni nombre).

### Guardar
- RF-12: CUANDO el administrador guarde, EL SISTEMA guardará la configuración por capas junto a la carta; una carta sin
  capas pasará a ser carta con capas.
- RF-13: SI la configuración no tiene ninguna capa visible, ENTONCES EL SISTEMA no la guardará e indicará que hace
  falta al menos una.
- RF-14: CUANDO el administrador quite todas las capas de una carta y guarde, EL SISTEMA la dejará sin capas, con su
  imagen compuesta con el marco de Pencil de siempre.
- RF-15: EL SISTEMA conservará el número, el nombre, la rareza y la colección de la carta, tenga capas o no.
- RF-16: EL SISTEMA permitirá editar las capas también en cartas de colecciones publicadas.

### Edición simultánea
- RF-17: SI otro administrador guardó la configuración de la carta después de que el editor la cargara, ENTONCES EL
  SISTEMA no guardará y avisará del conflicto.
- RF-18: CUANDO el administrador avisado elija recargar, EL SISTEMA descartará sus cambios y mostrará lo guardado; CUANDO
  elija guardar de todos modos y lo confirme, EL SISTEMA guardará su configuración sobre la otra.

### Validación de las capas
- RF-19: EL SISTEMA aceptará capas de imagen PNG, JPEG o WebP de hasta 20 MB; SI una no cumple, ENTONCES la rechazará
  indicando el motivo y seguirá con las demás del lote.
- RF-20: SI una capa de imagen mide menos de 700 px de ancho o su proporción difiere más de un 1 % de 700 × 991,
  ENTONCES EL SISTEMA la rechazará indicando lo esperado; CUANDO tenga la proporción con otro tamaño, la escalará al
  lienzo.
- RF-21: EL SISTEMA guardará cada capa de imagen convertida a WebP optimizado.
- RF-22: SI una carta ya tiene 8 capas de imagen, ENTONCES EL SISTEMA no permitirá añadir otra e indicará el límite;
  las capas de partículas no cuentan.
- RF-23: EL SISTEMA aceptará la imagen del sello aunque no tenga la proporción del lienzo.
- RF-24: SI la misma imagen está dos veces en la misma carta, ENTONCES EL SISTEMA la guardará y mostrará un aviso;
  entre cartas distintas no habrá aviso.

### Cambio de rareza
- RF-25: CUANDO cambie la rareza de una carta con capas, EL SISTEMA cambiará su marco y su sello de texto al escalón
  nuevo, mantendrá sus capas de partículas y, SI tiene sello de imagen, ENTONCES lo mantendrá y avisará de que hay que
  revisarlo.

## Requisitos no funcionales
- Seguridad: la configuración se valida en el servidor con listas cerradas (modos de mezcla, esquinas, partículas,
  colores) y el componente las vuelve a filtrar al pintar (#18); las imágenes de capa solo se sirven al administrador,
  con enlace firmado y caducidad como el resto del arte.
- Las capas subidas que nunca se guardan se borran solas a las 24 h.
- Peso: el editor y la librería se cargan solo en el panel; ninguna página del coleccionista crece (`pnpm budget`).
- Accesibilidad: el editor se usa con teclado (también para ordenar capas); la vista previa tiene nombre para lectores
  de pantalla. Movimiento reducido: la vista previa no se balancea sola.
- Idioma: todos los textos del editor en inglés y español.
- Sistema de diseño: el editor usa los componentes de `ui/`; la carta por capas tiene su componente en Pencil.

## Casos límite
- Todas las capas ocultas o con opacidad 0: no se guarda (RF-13).
- Dos administradores guardan la misma carta: el segundo recibe el aviso (RF-17, RF-18).
- Falla una capa a mitad de un lote: las demás se suben (RF-19).
- Carta 18+: el administrador ve y edita sus capas; como el coleccionista aún no las ve, la revisión 18+ de las capas
  llega con la spec 017.
- Cambio de rareza con sello de imagen: se mantiene con aviso (RF-25).

## Fuera de alcance
- Lo que ve el coleccionista, la imagen plana, la revisión 18+ de capas, el giroscopio y las zonas públicas (spec 017).
- Crear una carta nueva desde capas e importar o exportar del creador independiente (spec 018).
- Historial de versiones y deshacer, copiar la configuración entre cartas y plantillas.
- Cambiar las rarezas del juego, el sorteo o las probabilidades.

## Criterios de finalización
Cada RF con su test en verde (Vitest o Playwright) y la suite completa en verde; E2E del panel en escritorio: añadir
capas a una carta, ajustar y ver la vista previa, guardar, conflicto entre dos administradores, quitar las capas y
cambio de rareza; `pnpm budget` sin cambios en las páginas del coleccionista; demo manual del dueño.

## Relación con la propuesta de Bruno (PR #14)
| Esta spec | Propuesta original | Esta spec | Propuesta original |
|---|---|---|---|
| RF-1 | RF-1 | RF-14 | RF-18, RF-68 |
| RF-2 | RF-2 | RF-15 | RF-25 |
| RF-3 | RF-3 | RF-16 | RF-51 |
| RF-4 | nuevo (salvaguarda hasta la 017) | RF-17 | RF-19 |
| RF-5 | RF-4, RF-5, RF-14 | RF-18 | RF-20, RF-21 |
| RF-6 | RF-6, RF-7, RF-8 | RF-19 | RF-30, RF-31 |
| RF-7 | RF-9, RF-69 | RF-20 | RF-32 a RF-34 |
| RF-8 | RF-10 | RF-21 | RF-35 |
| RF-9 | RF-11, RF-13 | RF-22 | RF-36, RF-37 |
| RF-10 | RF-12 | RF-23 | RF-38 |
| RF-11 | RF-15 | RF-24 | RF-39, RF-40 |
| RF-12 | RF-16, RF-22 | RF-25 | RF-41 a RF-44 |
| RF-13 | RF-17 | | |

Pasan a la spec 017: RF-26 a RF-29, RF-45 a RF-50, RF-52 a RF-63 y RF-71. A la 018: RF-23, RF-24, RF-64 a RF-67 y RF-70.

## Decisiones (23 oct 2026)
- Se integra en este repo (Bruno no puede seguirla) y se parte en tres specs; esta es la primera.
- Se usa lo de Bruno: cinco marcos metálicos con su reparto de rarezas y el sello de texto con el escalón al estilo
  gacha (SSR, UR…). Las rarezas del juego no cambian.
- Se mantienen las decisiones de su entrevista (21 oct 2026) que caen en esta parte: lienzo 700 × 991 con tolerancia
  del 1 % y escalado, mínimo 700 px, WebP, máximo 8 capas de imagen, al menos una visible, aviso de conflicto con
  recargar o forzar, aviso de imagen repetida solo dentro de la misma carta, edición libre en colecciones publicadas y
  cambio de rareza que arrastra marco y sello de texto.
