# Plan — Spec 032: eliminar una colección desde el panel

## Punto de partida (9 nov 2026)
- `sets` va de borrador a publicada y de publicada a archivada (`nextStatusAllowed`); no hay borrado.
- Lo que apunta a una colección:
  - En cascada: `cards` (y con ellas `card_versions`), `drop_tables`, `pity_counters` y `pack_designs`.
  - Sin cascada: `packs` y `tier_rules`. `user_cards` y `expedition_cards` apuntan a `cards`, también sin cascada.
  - `sets.cover_card_id` (la carta de portada del sobre) es de la misma colección y queda en `set null`.
- Fuera de las claves foráneas:
  - las cartas de portada de la home (`app_settings.cover_cards`, lista de ids de cartas);
  - la colección de bienvenida (`sets.is_welcome`).
- Todas las imágenes de una colección viven bajo `sets/<id>/` (cartas, originales, capas, sobre a mano, diseños de
  sobre y sus miniaturas). La biblioteca vive en `library/` y las zonas en `zones/`.
- «Archivar» está en `PublishPanel`, con el `useConfirm` del sistema de diseño.

## Diseño

### Dominio (`domain/catalog/set-deletion.ts`, nuevo, puro)
- `matchesCode(typed, code)`: compara sin mayúsculas y sin espacios exteriores (RF-4).
- `deletionBlockers({ owners, uses })` devuelve la lista de motivos: `owners` (número de usuarios) y los usos
  `welcome`, `cover_cards` y `tier_rule` (con el nombre del tier). Una lista vacía permite eliminar (RF-8, RF-11).
- `canOfferArchive(status, blockers)`: solo si está publicada y hay dueños (RF-10).

### Servicio (`server/services/set-deletion.ts`, nuevo)
- `getSetDeletionInfo(db, store, setId)` devuelve:
  - `{ code, name, status, cards, images, packDesigns }`;
  - `owners`: usuarios distintos que aparecen en `packs`, o en `user_cards` / `expedition_cards` de sus cartas;
  - `uses` y `blockers`.
  - Las imágenes se cuentan con `store.list("sets/<id>/")`.
- `deleteSet(db, store, actorUserId, setId, typedCode)`:
  1. Transacción: `SELECT … FOR UPDATE` de la colección (si no existe, `not_found`), y `matchesCode` (si no coincide,
     `confirm_mismatch`).
  2. Vuelve a calcular los bloqueos dentro de la transacción (RF-14); si hay, `AdminError("set_not_deletable")` con
     los bloqueos.
  3. Registra en la auditoría `set_delete`, con `before: { code, name, status, cards }` (RF-7), antes de borrar.
  4. `DELETE FROM sets`: la cascada borra cartas, versiones, probabilidades, contadores y diseños (RF-5).
     - El bloqueo `FOR UPDATE` choca con el `KEY SHARE` que toma Postgres al insertar un sobre o una regla de tier
       que apunte a la colección. Así, una concesión simultánea espera y después falla por la clave foránea, o llega
       antes y la ve el paso 2.
     - Si aun así salta una violación de clave foránea (23503), se convierte en `set_not_deletable` (RF-14).
  5. Tras el commit, borra todas las claves bajo `sets/<id>/` (RNF). Si falla el borrado de una imagen, la colección
     ya está eliminada: se registra con `console.error` y se sigue con las demás.
- `isForeignKeyViolation` en `server/errors.ts`, igual que `isUniqueViolation`.

### Acciones (`app/admin/sets/actions.ts`)
- `setDeletionInfoAction(setId)` devuelve la información con `adminAction` (RF-15). El aviso la pide al abrirse, así
  que siempre está al día.
- `deleteSetAction(setId, typedCode)`:
  - Con `adminAction`, revalida `/admin/sets`, `/admin`, `/drop-rates` y `/`.
  - Devuelve `{ ok, message }`; si la colección no se puede eliminar, `{ ok:false, code:"set_not_deletable", info }`
    con la información nueva (RF-14).

### Interfaz
- `features/admin/sets/DangerZone.tsx` (nuevo): tarjeta con borde de peligro al final de la página (RF-1).
  - Contiene `ArchiveButton`, que es el botón de «Archivar» extraído de `PublishPanel` sin cambios.
  - Contiene «Eliminar colección».
  - En una publicada, `PublishPanel` muestra una nota nueva, «Colección publicada…», en lugar del botón.
- `features/admin/sets/DeleteSetDialog.tsx` (nuevo), un `Modal` del sistema de diseño:
  - **Cargando:** el indicador de la spec 031.
  - **Se puede:** cuántas cartas, imágenes y diseños de sobre se borran, «no se puede deshacer», `TextField` para el
    código y botón `danger` desactivado hasta que coincida (RF-2 a RF-4).
  - **No se puede:** un `Alert` con cada motivo (RF-9, RF-12, RF-13):
    - con dueños, «N usuarios tienen cartas o sobres» y, si está publicada, el botón «Archivar en su lugar» (RF-10);
    - bienvenida, con un enlace a la sección de bienvenida de la misma página;
    - cartas de portada, con un enlace a `/admin/settings`;
    - tier, con un enlace a `/admin/tiers`.
  - **Al eliminar:** `toast` de éxito con el código y `router.push("/admin/sets")` (RF-6).
  - **Si responde `not_found`:** `toast` «ya no existe» y vuelta a «Sets».
  - **Si responde `set_not_deletable`:** el aviso se redibuja con la información nueva (RF-14).
- Textos en `i18n/dictionaries/{es,en}/admin.ts` (`admin.deleteSet`) y los códigos de error nuevos en `i18n/errors`.

## Pruebas
- **Unidad** (`set-deletion.test.ts`): `matchesCode` y `deletionBlockers` / `canOfferArchive` (RF-4, RF-8, RF-10,
  RF-11).
- **Integración** (`tests/integration/set-deletion.test.ts`):
  - Borrador con cartas, capas y diseño de sobre: se elimina todo, en la BD y en el almacén, y queda la auditoría
    (RF-5, RF-7, RNF).
  - Una colección sin cartas se elimina.
  - Código equivocado: no se elimina (RF-4).
  - Con un sobre regalado (también abierto): bloqueada con `owners: 1` (RF-8, RF-9).
  - Bienvenida, cartas de portada y regla de tier: bloqueada con cada uso (RF-11).
  - Info pedida y después un regalo: `deleteSet` falla con `set_not_deletable` (RF-14).
  - Segunda eliminación: `not_found`.
  - Las imágenes de otra colección y de la biblioteca siguen en el almacén.
- **E2E** (`e2e/eliminar-coleccion.spec.ts`):
  - Zona de peligro.
  - Aviso con recuentos, botón desactivado, código en minúsculas que lo activa, eliminar y volver a «Sets» con aviso
    (RF-1 a RF-6).
  - Colección con un sobre regalado: motivo y «Archivar en su lugar» (RF-9, RF-10, RF-13).
  - Colección de bienvenida: enlace (RF-12).
  - Un coleccionista no puede usar la acción (RF-15).

## Riesgos
- Las E2E que archivan desde `PublishPanel` buscan el botón por su texto; sigue igual, pero ahora en la zona de peligro.
