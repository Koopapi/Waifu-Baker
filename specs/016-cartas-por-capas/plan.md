# Plan 016 — Cartas por capas (parallax) en el panel

Respeta `docs/constitution.md` y `docs/reglas-de-negocio.md` (RN-190 a RN-197). Parte de la base ya fusionada en
`pruebas` (#15): `carta-capas.js` v3 con sus tipos, el envoltorio `ui/game/CartaCapas.tsx` y el mapeo de rarezas
`domain/catalog/rarity-tier.ts`. Reutiliza dos piezas que ya existen: el **control por versión** de las cartas
(`cards.version` + `expectedVersion`, error `stale_version`) y el patrón de **arte pendiente de revisión** de las
cartas 18+ publicadas (`pendingOriginalKey`), ampliado: lo pendiente es la **configuración completa** (capas, sus
imágenes y la imagen plana generada), no una sola imagen.

El editor del panel usa el estilo actual del panel, sin Street pop; solo su vista previa va sobre fondo oscuro. Cuando
Street pop termine se le aplica la variante calmada.

## 1. Modelo de datos y migración

Migración `0011_card_layers.sql` (Drizzle), solo columnas nuevas en `cards`, todas opcionales:

| Columna | Tipo | Qué guarda |
|---|---|---|
| `layers` | `jsonb` | Configuración por capas **vigente** (la que ven los coleccionistas). `null` = carta sin capas |
| `layers_pending` | `jsonb` | Configuración **pendiente de revisión** (solo cartas 18+ de colecciones publicadas) |
| `pending_keys` | `jsonb` | Imagen plana de la configuración pendiente: `{ full, mid, thumb, public, blurhash }` |

- La configuración se guarda en el formato del creador (`CartaConfig`), con una diferencia: cada `src` de capa o sello
  es una **clave del almacén** (`sets/<setId>/layers/<sha256>.webp`), nunca una URL. Al servirla se cambian las claves
  por enlaces firmados.
- La **imagen plana vigente** ocupa las columnas de siempre (`key_full`, `key_mid`, `key_thumb`, `key_public`,
  `blurhash`). Así el álbum público, la portada de la demo, la portada del sobre, las miniaturas del panel y las vistas
  previas para redes usan la imagen de las capas sin tocar su código (RF-29, RF-61, RF-62).
- Carta creada desde capas: `original_key` queda vacío y `original_sha256` es la huella de la configuración canónica
  (sigue siendo única por colección, como exige el índice actual).
- Sin tablas nuevas: las imágenes de capa llevan su huella en la clave y solo pueden usarlas cartas de la misma
  colección, así que saber si una sigue en uso es recorrer las configuraciones de esa colección.
- `cards.version` sube con cada guardado de capas: es el control de edición simultánea (RF-19).

## 2. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `domain/cards/layers.ts` | Puro. Esquema (zod) de la configuración guardada; límites (8 capas de imagen, partículas aparte); «hay al menos una capa visible»; proporción 700 × 991 ± 1 % y ancho mínimo 700 px; capas de imagen repetidas en la misma carta | RF-17, RF-32, RF-33, RF-36 a RF-39 |
| `domain/cards/layers-review.ts` | Puro. Compara dos configuraciones y dice si el cambio anula la revisión 18+ (imágenes añadidas, quitadas o sustituidas; capa de imagen que pasa a visible) | RF-45 a RF-47 |
| `domain/cards/layers-rarity.ts` | Puro. Al cambiar la rareza: marco y sello de texto del escalón nuevo; sello de imagen intacto con aviso; partículas intactas | RF-41 a RF-44 |
| `domain/cards/layers-io.ts` | Puro. Exportar (claves → nombres de archivo) e importar (nombres de archivo → capas subidas) en el formato del creador, con errores por campo | RF-64 a RF-66 |
| `server/cards/flatten.ts` | Genera la imagen plana en el servidor con `sharp` (ver §3) en los cuatro tamaños de siempre | RF-26 a RF-28 |
| `server/cards/layer-images.ts` | Valida cada archivo (formato, peso, ancho, proporción), lo escala a 1400 × 1982 y lo guarda en WebP (calidad 90); sello: WebP de hasta 600 px de ancho, sin regla de proporción | RF-30 a RF-35, RF-38 |
| `server/services/card-layers.ts` | Casos de uso: guardar capas (con versión y forzado), crear carta desde capas, quitar capas, aplicar cambio de rareza, aprobar lo pendiente al revisar, liberar imágenes que ya no usa nadie; auditoría de cada cambio | RF-2, RF-16 a RF-25, RF-41 a RF-52 |
| `server/services/cards.ts` | `updateCard` y `bulkUpdateCards`: con capas, el cambio de rareza o de número regenera la imagen plana en vez de componer con Pencil; `reviewCard`: al aprobar, promueve la configuración pendiente completa; `deleteKeys`: no borra claves que sigan en alguna configuración | RF-41, RF-49, RF-26 |
| `domain/signed-url.ts` + `server/cards/image-urls.ts` | Enlaces firmados también para imágenes de capa (`layerImageUrl(cardId, sha, userId)`), 10 minutos como el resto | RF-63, RNF de seguridad |
| `app/api/cards/layer/route.ts` | Sirve una imagen de capa al coleccionista (ver §4) | RF-50, RF-63 |
| `app/api/admin/cards/[id]/layers/route.ts` | `GET` exporta; `PUT` guarda (configuración + `version` + `force`); `DELETE` quita las capas | RF-16, RF-18 a RF-21, RF-64 |
| `app/api/admin/layer-uploads/route.ts` | Sube imágenes de capa una a una a un área temporal (`tmp/layers/<uuid>`) y devuelve su resultado (aceptada, rechazada con motivo, escalada); el lote sigue aunque falle una | RF-6, RF-31 a RF-34 |
| `app/api/admin/sets/[id]/layer-cards/route.ts` | Crea una carta en borrador desde capas con el siguiente número libre | RF-23 |
| `server/scheduler.ts` | Tarea diaria: borra del área temporal lo que tenga más de 24 h | — |
| `features/admin/cards/LayersEditor.tsx` | Sección «Carta por capas» del editor de carta: lista de capas (subir varias, ordenar arrastrando y con teclado, ocultar, profundidad, margen, mezcla, opacidad), partículas, marco, sello, «Aplicar estilo de la rareza», importar y exportar, aviso de conflicto con «Recargar» y «Guardar de todos modos» | RF-4 a RF-14, RF-19 a RF-21, RF-64 a RF-66 |
| `features/admin/cards/LayersPreview.tsx` | Vista previa en vivo con `CartaCapas` sobre fondo oscuro; se actualiza sin recargar | RF-4, RF-5, RF-14 |
| `features/admin/cards/CardWorkspace.tsx`, `app/admin/sets/[id]/page.tsx` | Monta la sección; botón «Nueva carta desde capas» en colecciones en borrador; distintivo «Capas pendientes de revisión» | RF-3, RF-23, RF-48 |
| `ui/game/CartaCapas.tsx` | Añade `habilitarGiroscopio()` al manejador | RF-59, RF-60 |
| `features/opening/Card3D.tsx` | Si la carta trae capas: la cara monta `CartaCapas` interactiva con el sello oculto y `entrar()` al voltear; la inclinación propia de `Card3D` se desactiva para no sumarse | RF-55, RF-57 |
| `app/sobres/actions.ts`, `features/packs/OpenAllView.tsx` | Las cartas de la apertura y de «Abrir todos» llevan su configuración con enlaces firmados; en el resumen y en «Abrir todos», estáticas | RF-55, RF-56 |
| `features/collection/BinderView.tsx`, `CardSheet.tsx`, `app/(app)/coleccion/[setId]/page.tsx` | Rejilla estática y ficha interactiva **solo para cartas con capas**; las demás, idénticas a hoy | RF-53, RF-54, RF-56 |
| `features/opening/GyroButton.tsx` | Botón «Mover con el móvil» en la ficha y la apertura (solo en pantallas táctiles con giroscopio) | RF-59, RF-60 |
| `i18n/dictionaries/{en,es}/admin.ts`, `errors.ts` | Textos del editor y códigos de error nuevos (`layer_ratio`, `layer_too_small`, `too_many_layers`, `no_visible_layer`, `invalid_import`…) | RNF de idioma |

## 3. Imagen plana en el servidor (RF-26 a RF-28)

Con `sharp`, que ya es dependencia del proyecto (compone hoy las cartas con Pencil). **No hace falta ninguna dependencia
de npm nueva.**

1. Lienzo de 1400 × 1982 (2 × 700 × 991), transparente.
2. Capas de imagen visibles, de atrás hacia adelante, en reposo: sin desplazamiento de parallax, con su `margen`
   (la capa se amplía un `margen` % por lado y se recorta al lienzo, como en el navegador). La opacidad se aplica
   multiplicando el canal alfa. El modo de mezcla se traduce al de `sharp`: `multiply`, `screen`, `overlay`,
   `darken`, `lighten`, `color-dodge` → `colour-dodge`, `color-burn` → `colour-burn`, `hard-light`, `soft-light`,
   `difference`, `exclusion`. Son los únicos que ofrece el editor (RF-69); un JSON importado con `hue`, `saturation`,
   `color` o `luminosity` pasa a normal con aviso de las capas cambiadas (RF-70). Así el plano y la web no difieren.
3. Partículas en posición fija: `domain/cards/particles.ts` replica el generador con semilla de `carta-capas.js`
   (mismo `semilla`, mismas posiciones, tamaños y colores) y produce un SVG con cada partícula en su opacidad máxima;
   `sharp` lo rasteriza y lo compone en la profundidad y con la mezcla de su capa. Un test compara las posiciones con
   las del script del navegador para la misma semilla.
4. Marco: el degradado metálico del escalón como SVG (los mismos colores que `MARCOS` de `carta-capas.js`), con el
   grosor de `borde` y las esquinas redondeadas; recorte del conjunto con la máscara redondeada.
5. Sello: imagen (con su `recorte`) o texto con su estilo (`oro`, `plata`, `arcoiris`, `rosa`, `azul`, `morado`) en su
   esquina, con **Archivo Black** (licencia OFL) como archivo en `assets/fonts`, igual que Space Grotesk. La web usa
   la misma fuente (RF-71): se carga con `next/font` (`--font-sello`) y una regla de mayor especificidad
   (`.cc .cc-sello-texto b`) sustituye el «Arial Black» de `carta-capas.js` sin modificar el script. Es un archivo de
   fuente, no un paquete de npm.
6. Sin holo en la imagen plana (es un efecto que depende del ángulo).
7. Tamaños como hoy, con la proporción del lienzo: `full` 1400 × 1982, `mid` 700 × 991, `thumb` 300 × 425 y `public`
   600 × 849 con la marca de agua de siempre; `blurhash` del `full`. Las claves llevan la huella del contenido, como las
   compuestas.

La diferencia de proporción con las compuestas (5:7 frente a 700:991, menos del 1,2 %) se absorbe con `object-cover`
donde hoy se pinta la imagen; se revisa en las capturas de cada pantalla.

## 4. Protección del arte (RF-44, RF-50, RF-63; constitución, principio 6)

- **Zonas públicas**: siguen sirviendo solo `key_public` (imagen plana reducida y con marca de agua) por
  `/api/album/<slug>/img`; ninguna ruta pública conoce las claves de capa.
- **Coleccionista**: `/api/cards/layer?c=<carta>&k=<huella>&e=<caducidad>&sig=<firma>` responde la imagen solo si
  (1) la firma es válida, del mismo usuario y no ha caducado (10 min); (2) el usuario posee la carta; (3) la huella está
  en la configuración **vigente** de la carta (nunca en la pendiente); y (4) si la colección es 18+, el usuario tiene
  la declaración de edad **y** el tier adulto verificado. Si falla cualquiera, 404, como la ruta de imágenes actual.
  `Cache-Control: private` con la vida restante del enlace.
- **Lo pendiente nunca sale**: la configuración pendiente y su imagen plana solo se leen desde el panel
  (`/api/admin/assets`, que exige rol de administrador). Las acciones que arman los datos del coleccionista leen
  siempre `layers` y las columnas `key_*` vigentes.
- **Cualquier administrador** ve las capas de una carta 18+ en el panel, revisada o no (RF-3).

## 5. Flujo de guardado

`saveCardLayers(db, store, actor, cardId, { config, expectedVersion, force })`, en una transacción con la carta
bloqueada (`for update`):

1. Si `version ≠ expectedVersion` y no hay `force` → `stale_version` (RF-19). Con `force` se guarda y la auditoría lo
   marca como forzado (RF-21).
2. Valida la configuración (`domain/cards/layers.ts`); mueve las imágenes nuevas del área temporal a
   `sets/<setId>/layers/<sha>.webp`.
3. Genera la imagen plana (§3).
4. Decide el destino:
   - Colección 18+ **publicada** y el cambio anula la revisión (`layers-review`), o ya hay algo pendiente →
     `layers_pending` + `pending_keys`; lo vigente no cambia (RF-48).
   - Colección 18+ en borrador y el cambio anula la revisión → se aplica y se quita la revisión (RF-45, RF-46).
   - El resto → se aplica a lo vigente (RF-47, RF-52).
5. `version + 1`, auditoría con valores anteriores y nuevos (RF-2), y se liberan las imágenes y los planos que ya no
   use ninguna carta de la colección.

Al revisar (`reviewCard`) una carta con algo pendiente: `layers_pending` → `layers`, `pending_keys` → `key_*`, se vacía
lo pendiente y se libera lo viejo (RF-49). Quitar todas las capas (RF-18) vuelve a la imagen compuesta con Pencil si la
carta tiene original (RF-68); en una carta creada desde capas la API lo rechaza y el editor no ofrece quitarlas todas
(RF-67).

## 6. Decisiones

- **Lo pendiente es la configuración completa**: las tres columnas `layers_pending`, `pending_keys` y lo vigente
  separados garantizan que el coleccionista nunca vea una mezcla de lo revisado y lo nuevo.
- **Imagen plana en las columnas de siempre**: evita tocar el álbum público, las vistas previas para redes, la demo y
  la portada del sobre, y mantiene un solo camino para las imágenes simples.
- **Huella en la clave** para las imágenes de capa: deduplica dentro de la colección (RF-40 sin aviso) y hace seguro
  borrar solo lo que nadie referencia.
- **Subida en dos pasos** (área temporal + guardar): el editor muestra al momento qué capas se aceptaron o rechazaron
  sin tocar la carta; nada cambia hasta «Guardar».
- **El editor no lleva Street pop** salvo el fondo oscuro de la vista previa.
- **Archivo Black** como única pieza nueva, y es un archivo de fuente OFL, no una dependencia.

## 7. Pruebas

Cada RF con su test, con nombres `test_s016_rfN_*`, y validación con `node scripts/rf-coverage.mjs ../../specs/016-cartas-por-capas`.

- **Vitest unitario**: esquema y límites, capas visibles, proporción, repetidas (RF-17, RF-32, RF-33, RF-36 a RF-39);
  impacto en la revisión (RF-45 a RF-47); cambio de rareza (RF-41 a RF-44); importar y exportar (RF-64 a RF-66);
  partículas con la misma semilla que el script (RF-28); mapeo de mezclas (RF-27).
- **Vitest de integración** (BD `waifu_baker_test`): guardar, conflicto y forzado (RF-19 a RF-21); crear desde capas con
  número libre (RF-23); imagen plana en los cuatro tamaños y en `key_public` (RF-26, RF-29); pendiente en 18+
  publicada y promoción al revisar (RF-48, RF-49); la ruta de capas niega sin sesión, sin propiedad, sin doble control y
  para lo pendiente (RF-50, RF-63); auditoría (RF-2); limpieza de imágenes sin uso.
- **Playwright**: `e2e/card-layers.spec.ts`: el administrador añade capas a una carta, ve la vista previa, guarda,
  provoca un conflicto con dos pestañas, crea una carta desde capas, importa y exporta (RF-3 a RF-23, RF-64 a RF-66);
  el coleccionista abre un sobre y la ve por capas, con el sello al voltear, estática en la rejilla e interactiva en la
  ficha (RF-53 a RF-58); el álbum público solo recibe la imagen plana (RF-62); 18+ publicada: el coleccionista sigue
  viendo la versión revisada hasta la revisión (RF-48, RF-49). En los cuatro proyectos (escritorio, Pixel 7, iPhone 14,
  movimiento reducido); el giroscopio se comprueba con el permiso simulado en `iphone-14` (RF-59, RF-60).
- **Rendimiento**: 60 fps en la apertura y la ficha, y desplazamiento de una rejilla de 50 cartas con capas, medidos con
  la traza de rendimiento en Pixel 6a e iPhone 12 (RNF).

## 8. Entregas

Cada entrega se puede probar en el navegador (demo local) y va en su propio PR contra `pruebas` (detalle en
`tasks.md`):

1. **Editor con vista previa y guardado**: migración, dominio, subida de capas, editor, vista previa en vivo,
   guardado con aviso de conflicto.
2. **Imagen plana**: generación en el servidor al guardar; la carta con capas en miniaturas del panel, álbum público
   y portada.
3. **Lo que ve el coleccionista**: rutas firmadas con doble control 18+, apertura, «Abrir todos», colección, ficha y
   giroscopio.
4. **18+ y rareza**: configuración pendiente hasta la revisión, cambio de rareza.
5. **Crear desde capas, importar y exportar**.
6. **Cierre**: E2E completo, rendimiento, `validation.md` y RN-190 a RN-198 a «Vigente».

## 9. Riesgos

- **Fidelidad del plano**: `sharp` no tiene todos los modos de mezcla del navegador (§3, paso 2). Mitigación: aviso en
  el editor y test visual con una carta de referencia.
- **Rendimiento de las rejillas** con muchas cartas con capas: `estatica` y el `IntersectionObserver` del script ya
  reducen el trabajo; si no llega a 60 fps, la rejilla usa la imagen plana y la carta por capas solo en la ficha (lo
  que el propio LEEME de carta-capas recomienda). Esa alternativa necesitaría cambiar RF-56 en la spec.
- **Tamaño de las capas**: 8 capas de 1400 × 1982 en WebP pueden sumar 1–2 MB por carta. Se mide en la entrega 5; si
  hace falta, la rejilla pide una versión reducida de cada capa.

## 10. Decisiones de la revisión del plan (21 oct 2026)

1. Una carta creada desde capas no puede quedarse sin capas (RF-67); con imagen original vuelve a Pencil (RF-68).
2. Solo los modos de mezcla que `sharp` reproduce igual; los importados que no, a normal con aviso (RF-69, RF-70).
3. Archivo Black para el sello de texto, en la imagen plana y en la web (RF-71).
