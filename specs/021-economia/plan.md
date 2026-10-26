# Plan — Spec 021, economía

## Resumen técnico
Una marca nueva en la colección (`is_free`), un filtro en el único sitio que decide qué colecciones ofrecen las fuentes
gratis (`claimableSets`), una regla pura `isPatron` reutilizada por la insignia y por los espacios de expedición, y
avisos con enlace a Patreon en las pantallas del coleccionista. Sin cambios en el sorteo ni en las concesiones.

## Datos (migración 0016)
- `sets.is_free boolean not null default false`, con restricción `not (is_free and is_adult)` (RF-2 también en la base).

## Reglas (domain)
- `domain/patreon/membership.ts`: `isPatron(state, rules)` = `isPaidActive(state)` y alguna regla activa de un tier
  del miembro con sobres (> 0). Un tier sin reglas («Free») no cuenta.
- `domain/expeditions/rules.ts`: `slotsFor(patron)` → 3 o 2 (`SLOTS` pasa a ser el valor base).

## Servicios
- `collections.ts`: `setFreeSet(db, actor, setId, free)` con auditoría; rechaza 18+ (`free_adult`). `listSets`,
  `getSet`, `listPublicOdds` y `myCollections`/`listMyPacks` devuelven `isFree`.
- `rewards.ts`: `claimableSets`/`claimableSet` solo `isFree` (publicadas, SFW). Afecta al sobre cada 12 h, al día 7,
  al sobre de expedición (`claimExpedition` y `choosePackSet`) y al selector de «Mis sobres». Mensaje de
  `set_not_claimable` actualizado.
- `services/patron.ts`: `isPatronUser(db, userId)` (enlace de Patreon + reglas) y `patreonPageUrl()` (de
  `PATREON_PAGE_URL`, ya usada por `legal-contact.ts`).
- `expeditions.ts`: `sendExpedition` y `expeditionsHome` usan `slotsFor(await isPatronUser())`; con 3 en curso y sin
  tier, el conteo `>= 2` bloquea solo (RF-14).
- `album.ts`: `publicAlbum` devuelve `patron`. `account.ts`: `accountSummary.isPatron` pasa a la regla común.

## UI
- Panel: `FreeToggle` junto a `WelcomeToggle` en la colección; etiqueta «Gratuita» / «Patreon» en la lista y la
  ficha. `AddRuleForm` propone 8.
- Coleccionista: `PatronBadge` (pegatina pequeña con corazón, `ui/content/Badge` tono nuevo `patron`) en «Mi cuenta» y en
  el álbum público; `PatreonNotice` (texto + enlace) en la tarjeta de colección, en el álbum de la colección y en el
  grupo de «Mis sobres» cuando la colección es de Patreon y el usuario no es patron; en Expediciones, aviso del tercer
  espacio. Probabilidades: «Gratis» / «Con la suscripción» junto a cada colección.
- Textos nuevos en `collection`, `packs`, `account`, `site` y `admin` (en y es) y en `games` (tercer espacio).

## Pruebas
- Unidad: `isPatron` (Free, declinado, reembolsado, activo con regla), `slotsFor`.
- Integración: marcar gratuita (18+ rechazada, auditoría), `claimableSets` filtra, sobre cada 12 h y día 7 rechazan
  colecciones de Patreon, sobre de expedición solo gratuito y pendiente sin gratuitas, bienvenida de cualquier tipo,
  espacios 3 con membresía simulada y vuelta a 2, álbum público y cuenta con `patron`.
- Datos de prueba: `createPublishedSet` (factoría e `/api/dev/seed`) acepta `isFree`; las pruebas que reclaman sobres
  gratis marcan su colección gratuita; la demo marca gratuita su colección de fan art.
- E2E `economia.spec.ts` (4 proyectos) y suite completa.
