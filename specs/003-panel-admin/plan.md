# Plan 003 — Panel de administración

Plan técnico de `spec.md`. Respeta `docs/constitution.md` y `docs/architecture.md`. Como el
panel llega antes que las specs 001 y 002, este plan implementa también lo mínimo de ambas que
necesita: las tablas del catálogo, el login (Patreon y uno de desarrollo) y el rol de
administrador. Las specs 001 y 002 se escribirán sobre esta base.

## 1. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `domain/catalog/collection-rules.ts` | Estados, qué se puede editar en cada estado, transiciones | RF-5, RF-8, RF-9 |
| `domain/catalog/publish-check.ts` | Comprobaciones previas a publicar, lista de problemas | RF-6, RF-7 |
| `domain/catalog/odds.ts` | Validación de ranuras y porcentaje por rareza y por carta | RF-17, RF-20 |
| `domain/catalog/upload-rules.ts` | Tipos, tamaño y ancho mínimo de imagen | RF-12 |
| `domain/catalog/numbering.ts` | Numeración consecutiva y reordenación | RF-15 |
| `server/ports/card-store.ts` | Interfaz de almacenamiento de imágenes (original, compuestas) | RF-11, RF-16 |
| `server/adapters/local-card-store.ts` | Disco local en desarrollo (`var/cards/`), fuera de `public/` | RF-11 |
| `server/cards/compose.ts` | `sharp`: arte + marco por rareza + nombre y número → 4 tamaños + blurhash | RF-16, RF-22 |
| `server/services/collections.ts` | Crear, editar, publicar, archivar; aplica reglas y registra historial | RF-4 a RF-9, RF-21 |
| `server/services/cards.ts` | Subida, duplicados, edición en lote, reorden, revisión 18+, regeneración | RF-11 a RF-19 |
| `server/services/characters.ts` | Personajes y bloqueo de borrado con cartas | RF-10 |
| `server/services/tiers.ts` | Reglas tier → colección | RF-24 |
| `server/services/users-admin.ts` | Búsqueda, detalle y regalo de sobres | RF-25 a RF-27 |
| `server/services/audit.ts` | Historial de cambios e intentos denegados | RF-2, RF-3 |
| `server/auth/` | Auth.js: Patreon + login de desarrollo; rol admin por lista | RF-1 |
| `app/admin/**` | Páginas y server actions finas | todas |
| `features/opening/*` | Reutilizado para vista previa y simulación con cartas reales | RF-22, RF-23 |

## 2. Modelo de datos (Drizzle)

Tablas de `docs/architecture.md` que este plan crea: `users` (con `role` text: `user` | `admin`),
`characters`, `sets`, `cards`, `drop_tables`, `tier_rules`, `packs` (solo lo necesario para
regalar), `audit_log`. Columnas añadidas respecto a la arquitectura:

- `sets`: `status` (`draft` | `published` | `archived`), `pack_size`, `updated_at`, `version`.
- `cards`: `status` (`draft` | `ready`), `original_key`, `original_sha256` (duplicados),
  `width`, `height`, `flavor_text`, `adult_reviewed_by`, `adult_reviewed_at`,
  `pending_original_key` (arte nuevo pendiente de revisión en 18+ publicada), `updated_at`,
  `version` (concurrencia optimista).
- `drop_tables`: `slots` jsonb `[{ "common": 70, … }]` + `holo_chance`; una fila editable por set
  en borrador; al publicar se congela con `published_at`.
- `packs.source` admite `manual`; nueva columna `reason`.

## 3. Algoritmos

- **Publicación (RF-6, RF-7)**: función pura que recibe set, cartas y drop table y devuelve
  `Problem[]` (`{code, message, target}`); publicar solo si está vacía, en una transacción que
  pone `status=published`, congela la drop table y registra historial.
- **Bloqueo (RF-8)**: `canEdit(setStatus, field)`; los servicios lo consultan antes de escribir,
  y la UI lo usa solo para desactivar controles.
- **Porcentaje por carta (RF-20)**: P(carta en un sobre) = 1 − Π por ranura (1 − p_ranura(rareza)
  / n_cartas(rareza)). Se muestra también la probabilidad por rareza y ranura.
- **Duplicados (RF-13)**: sha256 del archivo original, único por set.
- **Composición (RF-16)**: arte 832×1216 recortado a 63:88 en `cover`, marco SVG por rareza
  (provisional hasta tener el de Pencil), textos nombre y número, exporta `full` 1500×2100,
  `mid` 750×1050, `thumb` 300×420, `public` 600×840 con marca de agua; blurhash 4×3.
- **Concurrencia (RF y caso límite)**: toda edición envía `version`; `UPDATE … WHERE version = $v`;
  0 filas → error "La carta cambió desde que la abriste".

## 4. Contrato

Server actions en `app/admin/**/actions.ts` (todas verifican rol en el servidor):
`createSet`, `updateSet`, `publishSet`, `archiveSet`, `saveOdds`, `createCharacter`,
`updateCharacter`, `deleteCharacter`, `bulkUpdateCards`, `reorderCards`, `updateCard`,
`reviewCard`, `deleteCard`, `saveTierRule`, `giftPacks`.

Rutas: `POST /api/admin/uploads` (multipart, un archivo por petición; el cliente envía 3 a la
vez), `GET /api/admin/assets/[...key]` (sirve originales y compuestas solo a administradores).
Errores con `code` y `message` en español.

## 5. Decisiones técnicas

- **Panel propio dentro de Next** frente a CMS embebido (Payload): Payload ahorraría formularios,
  pero mete un segundo sistema de esquema y migraciones en la misma base, y las piezas que
  importan (cuadrícula con edición en lote, vista previa con holo, simulación de sobre) serían
  componentes propios igualmente.
- **Procesado síncrono por archivo** frente a cola con Redis: evita levantar Redis y BullMQ todavía.
  El cliente sube **de una en una y en orden de nombre de archivo** para que la numeración siga ese
  orden (con 3 en paralelo los números salían desordenados). Medido: 11 imágenes en 7,2 s (~21 s
  para 32), dentro del RNF de 2 minutos.
- **El número impreso es `WB01 · 001`, sin total**: así añadir o quitar cartas no obliga a
  regenerar todas las demás; solo se regeneran las que cambian de número.
- **Disco local detrás de un puerto** frente a MinIO desde el día uno: el adaptador S3 se añade
  al desplegar sin tocar servicios.
- **Marco SVG generado en código** como provisional: permite ver cartas compuestas hoy; el de
  Pencil sustituye el SVG sin cambiar la interfaz de `compose`.
- **Auth.js con sesiones JWT**: el proveedor de credenciales de desarrollo lo exige; Patreon
  funciona igual. El rol se fija al iniciar sesión según `ADMIN_PATREON_IDS` (o `DEV_LOGIN_ADMIN`
  en desarrollo).
- **Login de desarrollo** solo si `DEV_LOGIN=1` y `NODE_ENV !== 'production'`; un test lo comprueba.

## 6. Dependencias nuevas

- `sharp`, `blurhash`: composición de cartas (ya previstas en la arquitectura).
- `@dnd-kit/core` + `@dnd-kit/sortable`: reordenar cartas arrastrando (RF-15), accesible por
  teclado. Alternativa descartada: HTML drag and drop nativo, sin soporte táctil ni teclado.
- Sin librería de componentes: Tailwind y elementos nativos (`<dialog>`, `<details>`), para no
  sumar dependencias en un panel de un solo usuario.

## 7. Estrategia de tests

- Unit (Vitest, sin BD): `collection-rules`, `publish-check`, `odds`, `upload-rules`, `numbering`.
- Integración (Vitest + Postgres `waifu_baker_test`, migraciones aplicadas en el setup): servicios
  de colecciones, cartas (subida real con imágenes de prueba generadas por `sharp`, duplicados,
  regeneración, concurrencia), revisión 18+, regalos, guardia de administrador.
- E2E (Playwright, escritorio): flujo completo de los criterios de finalización.
- Cada test se nombra `rfN_*` para el informe de cobertura.

## 8. Entregas

1. Base: Vitest, Drizzle, esquema, login, guardia de administrador.
2. Colecciones, personajes e historial.
3. Subida, composición, cuadrícula y edición en lote.
4. Revisión 18+, probabilidades, publicación y archivo.
5. Vista previa y simulación de sobre.
6. Tiers y usuarios.
7. E2E y validación RF por RF.
