# Tareas 016 — Cartas por capas (parallax) en el panel

Cada entrega va en su propia rama desde `pruebas` y en su PR, con `pnpm typecheck`, `pnpm lint`, `pnpm test` y los E2E
de lo que toca en verde. Al final de cada entrega, «Cómo probarlo» describe el recorrido en la demo local
(`pnpm demo --dev`, http://localhost:3300, entrar como administrador).

## Entrega 1 — Editor con vista previa y guardado
- [ ] **T1 — Migración `0011_card_layers`**: columnas `layers`, `layers_pending` y `pending_keys` en `cards` ·
  Hecho cuando: `pnpm db:migrate` aplica en limpio y el test de integración que recrea la BD pasa.
- [ ] **T2 — Dominio de la configuración**: `domain/cards/layers.ts` (esquema, máximo 8 capas de imagen, partículas
  aparte, al menos una visible, proporción 700 × 991 ± 1 %, ancho mínimo 700 px, imagen repetida en la misma carta,
  lista de mezclas permitidas) · RF-17, RF-32, RF-33, RF-36 a RF-39, RF-67, RF-69 · Hecho cuando: pasan sus tests
  `test_s016_rfN_*`.
- [ ] **T3 — Subida de capas**: `server/cards/layer-images.ts` y `POST /api/admin/layer-uploads` (área temporal,
  WebP 1400 × 1982, sello hasta 600 px sin regla de proporción, rechazo con motivo y el lote sigue) · RF-6, RF-30 a
  RF-35, RF-38 · Depende de T2 · Hecho cuando: pasan los tests de integración con archivos válidos, de otra proporción,
  pequeños, pesados y de formato no admitido.
- [ ] **T4 — Guardar capas**: `server/services/card-layers.ts` (`saveCardLayers` con versión y forzado, mover del área
  temporal, quitar capas con RF-67/RF-68, auditoría, liberar imágenes sin uso) y `GET/PUT/DELETE
  /api/admin/cards/[id]/layers` · RF-1, RF-2, RF-14 a RF-22, RF-67, RF-68 · Depende de T1, T3 · Hecho cuando: pasan los
  tests de integración de guardar, conflicto, forzado, quitar y auditoría.
- [ ] **T5 — Editor del panel**: sección «Carta por capas» en el editor de carta con el estilo actual del panel: subir
  varias, ordenar (arrastrando y con teclado), ocultar, profundidad, margen, mezcla (solo las permitidas), opacidad,
  partículas, marco, sello de texto o imagen y esquina, «Aplicar estilo de la rareza»; textos en los diccionarios ·
  RF-3 a RF-13, RF-69 · Depende de T4.
- [ ] **T6 — Vista previa en vivo**: `LayersPreview` con `CartaCapas` sobre fondo oscuro; se actualiza al cambiar
  cualquier ajuste, sin recargar · RF-4, RF-5, RF-14 · Depende de T5.
- [ ] **T7 — Conflicto**: aviso con «Recargar» y «Guardar de todos modos» (con confirmación) · RF-19 a RF-21 ·
  Depende de T4, T5.
- [ ] **T8 — E2E del editor**: `e2e/card-layers.spec.ts`, parte del panel (añadir capas, vista previa, guardar,
  recargar y ver lo guardado, conflicto con dos pestañas) · Depende de T5 a T7.
- **Cómo probarlo**: Panel → Colecciones → FA01 → editar una carta → «Carta por capas»: subir las capas de Yuki
  (`docs/waifu-baker/waifu-baker/codigo/carta-capas/cartas/yuki/`), ajustarlas viendo la vista previa, guardar, recargar
  y comprobar que siguen; abrir la misma carta en dos pestañas y guardar en ambas para ver el aviso. En esta entrega el
  coleccionista todavía ve la carta como antes.

## Entrega 2 — Imagen plana
- [ ] **T9 — Partículas con semilla**: `domain/cards/particles.ts` replica el generador de `carta-capas.js` · RF-28 ·
  Hecho cuando: un test compara posiciones, tamaños y colores con los del script para la misma semilla.
- [ ] **T10 — Archivo Black**: archivo OFL en `assets/fonts`, `next/font` en el sitio y regla `.cc .cc-sello-texto b`
  para el sello de la web · RF-71 · Hecho cuando: el sello de la vista previa usa Archivo Black (test de estilo
  computado) y `assets/fonts/OFL.txt` lo cita.
- [ ] **T11 — `server/cards/flatten.ts`**: capas en reposo con margen, opacidad y mezcla; partículas; marco del escalón;
  sello; cuatro tamaños con la proporción del lienzo, marca de agua en `public`, `blurhash` · RF-26 a RF-28 · Depende de
  T9, T10 · Hecho cuando: pasan los tests (tamaños, mezclas, carta de referencia comparada con una imagen esperada).
- [ ] **T12 — Plano al guardar y en las columnas de siempre**: `saveCardLayers` genera el plano y lo guarda en `key_*`;
  `deleteKeys` respeta las claves de las configuraciones; las cartas sin capas siguen componiéndose con Pencil · RF-26,
  RF-29, RF-61, RF-62, RF-68 · Depende de T11.
- **Cómo probarlo**: guardar capas en una carta y ver su miniatura nueva en el panel; en el álbum público del
  coleccionista, la carta sale plana y con marca de agua; quitar las capas y ver que vuelve la imagen de Pencil.

## Entrega 3 — Lo que ve el coleccionista
- [ ] **T13 — Enlaces firmados de capa y `GET /api/cards/layer`**: firma, propiedad, solo configuración vigente y doble
  control 18+ · RF-50, RF-63 · Hecho cuando: pasan los tests de integración (sin sesión, sin propiedad, firma caducada,
  capa pendiente, 18+ sin doble control → 404).
- [ ] **T14 — Datos del coleccionista**: la apertura, «Abrir todos», la colección y la ficha reciben la configuración
  con enlaces firmados solo para las cartas con capas · RF-53, RF-54 · Depende de T13.
- [ ] **T15 — Apertura**: `Card3D` monta `CartaCapas` interactiva con el sello oculto y `entrar()` al voltear; sin la
  inclinación propia; resumen y «Abrir todos» estáticos · RF-55 a RF-57 · Depende de T14.
- [ ] **T16 — Colección y ficha**: rejilla estática y ficha interactiva para las cartas con capas; las demás, idénticas ·
  RF-54, RF-56, RF-58 · Depende de T14.
- [ ] **T17 — Giroscopio**: `habilitarGiroscopio` en el envoltorio y botón en la ficha y la apertura (pantallas
  táctiles con giroscopio); sin error si se deniega · RF-59, RF-60 · Depende de T15, T16.
- **Cómo probarlo**: como coleccionista, abrir un sobre de FA01 hasta que salga la carta con capas (o regalársela desde
  el panel) y verla con parallax, con el sello al voltear; en «Mi colección», estática en la rejilla e interactiva en la
  ficha; en el móvil (dirección «Network»), el botón del giroscopio.

## Entrega 4 — 18+ y cambio de rareza
- [ ] **T18 — Impacto en la revisión**: `domain/cards/layers-review.ts` · RF-45 a RF-47 · Hecho cuando: pasan sus tests.
- [ ] **T19 — Configuración pendiente completa**: en 18+ publicada, lo que anula la revisión va a `layers_pending` +
  `pending_keys`; el coleccionista sigue viendo lo vigente; `reviewCard` promueve todo; en borrador, se aplica y se
  quita la revisión · RF-45 a RF-49 · Depende de T12, T18.
- [ ] **T20 — Distintivo «Capas pendientes de revisión»** en el panel y vista de lo pendiente para cualquier
  administrador · RF-3, RF-48 · Depende de T19.
- [ ] **T21 — Cambio de rareza**: `domain/cards/layers-rarity.ts`; `updateCard` y `bulkUpdateCards` actualizan marco y
  sello de texto, avisan del sello de imagen y regeneran el plano · RF-41 a RF-44 · Depende de T12.
- **Cómo probarlo**: en una colección 18+ publicada (demo con colección adulta), cambiar una capa y comprobar que el
  coleccionista verificado sigue viendo la versión anterior hasta marcarla revisada; cambiar la rareza de una carta con
  capas y ver el marco y el sello nuevos.

## Entrega 5 — Crear desde capas, importar y exportar
- [ ] **T22 — Nueva carta desde capas**: botón en colecciones en borrador y `POST /api/admin/sets/[id]/layer-cards`
  (siguiente número libre, borrador, comprobaciones de publicación) · RF-23, RF-24 · Depende de T12.
- [ ] **T23 — Importar y exportar**: `domain/cards/layers-io.ts` (claves ↔ nombres de archivo, mezclas no permitidas a
  normal con aviso) y botones en el editor · RF-64 a RF-66, RF-70 · Depende de T5.
- **Cómo probarlo**: crear una carta nueva desde las capas de Yuki; exportar su JSON, abrirlo en
  `creador-cartas.html`, y volver a importarlo en otra carta con sus archivos.

## Entrega 6 — Cierre
- [ ] **T24 — E2E completo** en los cuatro proyectos (panel, coleccionista, álbum público, 18+) · todos los RF.
- [ ] **T25 — Rendimiento**: 60 fps en la apertura y la ficha y en una rejilla de 50 cartas con capas (Pixel 6a,
  iPhone 12) · RNF.
- [ ] **T26 — Validación y documentos**: `validation.md` con `scripts/rf-coverage.mjs`, RN-190 a RN-198 a «Vigente»,
  `docs/DESIGN.md` y AGENTS.md al día.
