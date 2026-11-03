# Plan — Spec 027: guardado claro del armador de cartas

Estado: spec aprobada por el dueño el 3 nov 2026 (10 versiones por carta, borrador de 5 días). Rama
`spec/027-guardado-del-armador` (sale de `pruebas`). Antes del código: maqueta HTML de la ventana con el estado, la
pregunta al cerrar, el aviso de borrador y la lista de versiones, para que el dueño la apruebe (como en la 025 y la 026).

## Decisión principal: un solo guardado en una sola transacción

Hoy la ficha se guarda con una acción de servidor (`updateCard`) y las capas con `PUT /api/admin/cards/[id]/layers`
(`saveCardLayers`); cada una abre su transacción y sube `cards.version`. El arreglo de fondo es un **servicio único**
`saveCard(db, store, actorId, cardId, { ficha?, layers?, expectedVersion, force, restoredFrom? })` en
`server/services/card-save.ts` que, en **una** transacción: bloquea la carta, comprueba la versión (RF-2: conflicto =
no se guarda nada), aplica el parche de la ficha (reutilizando `applyPatch` y `retierIfLayered` de `cards.ts`), asienta
el estilo automático con la rareza **nueva**, saca la imagen fija una sola vez (`renderCardFlat`), asienta las claves
temporales, actualiza la fila, **inserta la versión** y registra la auditoría. `updateCard` y `saveCardLayers` pasan a
ser envoltorios finos del mismo servicio (sus tests siguen valiendo); la carga en lote y «Regenerar» no cambian.

Lo que se devuelve a la ventana: la carta completa (`CardDTO`) con su versión nueva y, si aplica, `pending` (18+).

## Datos

- Migración `0020_versiones_de_carta.sql`: tabla `card_versions` (`id`, `card_id` → `cards` con borrado en cascada,
  `number` correlativo por carta, `ficha` jsonb con nombre, texto, personaje, rareza y variante, `layers` jsonb (la
  configuración o `null`), `changed` (`ficha` | `capas` | `ambas`), `pending` boolean (RF-23), `actor_user_id` → `users`
  (`set null` al borrar la cuenta), `created_at`); única `(card_id, number)`. La misma migración **siembra la versión 1**
  de cada carta existente con su estado actual (RF-25).
- `domain/cards/versions.ts` (puro): `MAX_VERSIONS = 10`, `snapshotOf(card)`, `changedParts(prev, next)`,
  `versionsToPrune(numbers)` (RF-18, RF-21).
- `domain/cards/draft.ts` (puro): forma del borrador (`cardId`, `baseVersion`, `ficha`, `layers`, `savedAt`) validada con
  zod, `DRAFT_TTL_MS` = 5 días, `isStale(draft, now)`, `draftKey(cardId)`. El borrador lleva claves de imagen y ajustes,
  nunca imágenes (RNF seguridad).
- `TEMP_LAYER_TTL_MS` pasa de 24 h a 5 días (RF-15); la purga sigue corriendo cada 24 h.

## Servidor

- `services/card-save.ts`: `saveCard` (arriba), `listVersions(db, cardId)` (número, fecha, quién —nombre de la cuenta o
  «—» si ya no existe—, `changed`, `pending`), `getVersion(db, cardId, n)` (la foto completa para cargarla en la
  ventana), `insertVersion` y `pruneVersions` (devuelve las claves de imagen de las versiones borradas).
- `releaseLayerImages` cuenta también las claves que usa cualquier versión conservada de las cartas de la colección
  (RF-22): consulta `card_versions` junto a `cards.layers` y `cards.layersPending`. `deleteCard` recoge las claves de la
  carta y de sus versiones y las suelta tras borrar (caso límite «borrar la carta»).
- Auditoría (RF-24): los registros existentes (`card_update`, `card_layers_*`) llevan `meta.version`; volver a una
  versión y guardar añade `meta.restoredFrom`.
- Rutas:
  - `PUT /api/admin/cards/[id]` (nueva, JSON `{ ficha?, layers?: config | null, version, force?, restoredFrom? }`):
    el guardado único (RF-1 a RF-3). `layers: null` quita las capas (hoy `DELETE …/layers`).
  - `GET /api/admin/cards/[id]/versions` y `GET /api/admin/cards/[id]/versions/[n]` (RF-19, RF-20).
  - `POST /api/admin/cards/[id]/layers/present` con claves → `{ missing }` (RF-16: al recuperar un borrador).
  - `PUT`/`DELETE /api/admin/cards/[id]/layers` se quedan (tests de la 016) delegando en `saveCard`.
- El modo pendiente 18+ (spec 018, RF-18) no cambia: `saveCard` escribe `layersPending`/`pendingKeys` como hoy y la
  versión nace con `pending = true` (RF-23). Aprobar o descartar lo pendiente no crea versión (fuera de alcance).

## Cliente

- `features/admin/cards/useCardDraft.ts`: el estado de la ventana en un solo sitio: `saved` (ficha + capas tal como
  están guardadas), `draft`, `dirty` (comparación de JSON con claves ordenadas, como `settleAutoStyle`), `status`
  (`clean` | `dirty` | `saving` | `saved(at)` | `conflict` | `no-storage`), `save()`, `discard()`, `restore(n)`. Escribe
  el borrador en `localStorage` (`wb:card-draft:<id>`) con un retraso de 500 ms tras el último cambio (RF-10, RNF
  rendimiento), lo borra al guardar o descartar (RF-13), y registra `beforeunload` mientras haya cambios (RF-9). Todo
  acceso al almacenamiento va en `try/catch`: sin él, `status = no-storage` y la ventana sigue funcionando.
- `CardWorkspace.tsx`: la ficha pasa a campos controlados por `useCardDraft`; desaparecen el `Guardar` del formulario y
  el `onClose()` tras guardar (RF-3); un solo botón «Guardar» (RF-1, RF-5) en el pie de la ventana con el estado al lado
  (RF-4). `LayersEditor` recibe `draft`/`setDraft` por props en vez de su estado propio (su lógica de subir, importar,
  encuadrar y conflictos no cambia). Cambiar el arte, aprobar o descartar lo pendiente siguen siendo acciones aparte;
  si hay cambios sin guardar, piden lo mismo que al cerrar (caso límite).
- `Modal`: prop nueva `preventClose` que anula `onInteractOutside` y `onEscapeKeyDown` de Radix (RF-6); el botón de
  cerrar sigue funcionando y pasa por la pregunta.
- Pregunta al cerrar (RF-7, RF-8): `confirm()` admite una **opción secundaria** (`secondary: { label, tone }`) y
  devuelve `"confirm" | "secondary" | "cancel"` (`useChoice`, mismo `ConfirmDialogView`); fila en `/sistema` y
  `docs/DESIGN.md`. La ventana usa «Guardar y cerrar» / «Descartar» / «Seguir editando».
- `ui/feedback/SaveStatus.tsx` (componente nuevo del sistema): texto con punto de color y `aria-live="polite"`
  (RNF accesibilidad), variantes `clean`, `dirty`, `saving`, `saved`, `no-storage`.
- Aviso de borrador (RF-11, RF-12, RF-14): `Alert` existente con fecha y hora, nota «la carta cambió después de este
  borrador» si `baseVersion !== card.version`, y botones «Recuperar» / «Descartar». Al recuperar, se comprueban las
  claves (`…/layers/present`) y se quitan las capas sin imagen con aviso (RF-16).
- `features/admin/cards/VersionsPanel.tsx`: sección plegable «Versiones» al final de la ventana; carga la lista al
  abrirse (RNF: no retrasa la ventana) y muestra cada versión con fecha, hora, quién, qué cambió, «pendiente de
  revisión» si aplica y una **carta mini viva en reposo** dibujada en el navegador con `carta-capas` a partir de las
  claves de esa versión (como la vista previa del editor; sin guardar imágenes por versión). «Volver a esta versión»
  carga la foto como cambios sin guardar (RF-20) y marca `restoredFrom`.
- Textos nuevos en `i18n/admin-layers.ts` (diccionario solo del panel; el general viaja a todas las páginas), en inglés
  y español (RNF idioma). Los dos temas (kawaii y Street pop) se revisan en `/sistema` (RNF tema).

## Tests

- Unidad: `versions.ts` (poda a 10, `changedParts`), `draft.ts` (caducidad 5 días, borrador inválido se ignora),
  `useCardDraft` (dirty, retraso de escritura, borrado al guardar, `no-storage`), `SaveStatus` y `useChoice`
  (componentes), `Modal` con `preventClose`.
- Integración (BD real, dibujo rápido inyectado): `saveCard` guarda ficha y capas juntas y sube la versión una vez
  (RF-1); ficha válida + capas inválidas → nada cambia (RF-2); conflicto → nada cambia; versiones 1..10 y poda
  (RF-17, RF-18, RF-21); claves de versiones no se sueltan (RF-22); 18+ pendiente marca la versión (RF-23); auditoría con
  `meta.version`/`restoredFrom` (RF-24); migración siembra la versión 1 (RF-25); purga a los 5 días (RF-15); borrar la
  carta borra versiones y suelta imágenes.
- E2E `card-save.spec.ts` (4 proyectos): el flujo entero de «Criterios de finalización», incluida la recarga con
  borrador y la vuelta a una versión; `test_s027_rfN_` en cada paso para `rf-coverage`.
- Peso: las páginas del coleccionista no cambian (`pnpm budget`); el panel no entra en el presupuesto.

## Riesgos

- `LayersEditor` es grande (1000+ líneas): el cambio a estado controlado se hace en una tarea propia con sus tests
  actuales en verde antes de seguir.
- `localStorage` en Safari privado lanza al escribir: cubierto por `try/catch` y el estado `no-storage`.
- Dos pestañas con la misma carta: el borrador es el último escrito; el conflicto de versión lo resuelve la 016.
