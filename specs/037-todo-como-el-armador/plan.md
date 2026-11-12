# Plan 037 — El sobre y la carta del armador en todas las vistas

Plan técnico de `spec.md`. Respeta `docs/constitution.md` y `docs/architecture.md`.

## 1. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `server/cards/flatten.ts` | `renderFlatCard` dibuja también la carta con holo (si la configuración no lo trae ya) y devuelve `holo: { mid, thumb, public }` | 11, 15 |
| `server/cards/flat-store.ts` | `storeFlat` guarda las tres imágenes holo y devuelve `keyHoloMid/Thumb/Public` y `flatVersion` | 11, 17 |
| `server/services/card-shared.ts` | `composeAndStore` devuelve las claves holo (`null` en cartas sin capas); `deleteKeys`/`composedKeys`/`pendingFlatKeys` cuentan las holo | 11, 20 |
| `server/services/card-save.ts`, `cards.ts` (`reviewCard`) | lo pendiente de revisión 18+ lleva sus claves holo; al aprobar, pasan a la carta | 11, RNF 18+ |
| `server/services/flat-regen.ts` (nuevo) | `regenerateOutdated(db, store)`: regenera, una a una, las cartas con capas y `flat_version` atrasada (también lo pendiente); si falla, guarda `flat_error` y conserva sus imágenes | 17, 18 |
| `server/flat-regen-runner.ts` (nuevo) | lo arranca al iniciar el servidor (salvo `FLAT_REGEN=0`) y lo repite cada 10 min | 17 |
| `domain/signed-url.ts`, `server/cards/image-urls.ts`, `api/cards/img` | tamaños `thumb-holo` y `mid-holo`; la ruta sirve la clave holo y, si no existe, la normal | 12–14, 19 |
| `domain/cards/flat-image.ts` (nuevo) | `flatImageFor({ holoCopy, holoImage })` → tamaño a pedir y si hace falta la insignia/acabado holo de CSS | 12, 13, 19, 20 |
| `server/services/album.ts` | `publicCardImageKey` devuelve la clave holo pública si el dueño del álbum tiene la holo | 16 |
| Páginas de colección, álbum, Expediciones, apertura y «Abrir todos» | piden la imagen con `flatImageFor`; el acabado `holo-finish` solo cuando no hay imagen holo | 7–9, 12–14, 19 |
| `features/rewards/*`, `features/games/ExpeditionsView`, `features/admin/sets/PackSettings` | el sobre con `PackThumb` y `packViewsFor` (plata o gold) | 1–6 |
| `domain/rewards/arrivals.ts`, `server/services/arrivals.ts` | la llegada lleva el tipo de sobre | 2, 5 |
| `features/packs/PackArt.tsx`, `pack-art.css` | se borran | 6 |
| `features/opening/OpeningStage.tsx` | sin insignia ni letra pequeña de rareza en la carta revelada ni en el resumen; la rareza queda en el texto accesible; las cartas sin capas conservan su insignia | 21–25 |
| `app/admin/sets/[id]` | aviso con las cartas cuya regeneración falló, el motivo y «Regenerar imágenes» para reintentar | 18 |

## 2. Modelo de datos

Migración `flat_holo`:
- `cards.key_holo_mid`, `cards.key_holo_thumb`, `cards.key_holo_public` (`text`, null = sin imagen holo).
- `cards.flat_version` (`integer not null default 0`): versión de la receta de imagen fija con que se generó.
- `cards.flat_error` (`text`, null): motivo del último fallo de regeneración.
- `PendingFlatKeys` suma `holoMid`, `holoThumb` y `holoPublic` opcionales (jsonb, sin migración).

`FLAT_VERSION = 2` en `domain/cards/flat-version.ts` (la spec 038 la subirá a 3).

## 3. Algoritmos

**Imagen holo (RF-11, RF-15).** Si `config.holo` ya es `true`, la imagen normal ya es holo: las claves holo apuntan a las
mismas imágenes (sin segundo dibujo). Si no, se dibuja otra vez con `holo: true` y se guardan `mid`, `thumb` y `public`
(no `full`: ninguna vista la usa con holo).

**Regeneración (RF-17, RF-18).** `regenerateOutdated` toma hasta 20 cartas con `layers` no nulo, `flat_version <
FLAT_VERSION` y `flat_error` nulo; por cada una, `composeAndStore` (y lo pendiente, si hay) y actualiza claves, versión y
borra las imágenes viejas que nadie use. Si falla, guarda `flat_error` con el motivo y sigue. Repite hasta no quedar
ninguna. «Regenerar imágenes» del panel (spec 017) limpia `flat_error` de su colección y la regenera; si una carta falla,
la guarda con su motivo en vez de cortar la colección entera.

**Qué imagen pedir (RF-12, RF-13, RF-19).** `flatImageFor({ holoCopy, holoImage })`: copia holo con imagen holo →
tamaño `*-holo` y sin acabado CSS; copia holo sin imagen holo → tamaño normal con acabado/insignia holo; copia normal →
tamaño normal.

## 4. Contrato de la API

- `GET /api/cards/img?s=thumb-holo|mid-holo` (además de `thumb`, `mid`, `full`): mismas reglas de firma y posesión.

## 5. Decisiones técnicas

- Tamaño `*-holo` en vez de un parámetro aparte: la firma y la caché no cambian de forma.
- La ruta no decide sola si sirve holo según lo que posee el usuario: un resumen con una copia normal y otra holo de
  la misma carta mostraría las dos holo.
- La regeneración corre en el propio servidor y no depende de `SCHEDULER`, para que también pase en local y en
  pruebas. Las pruebas la apagan (`FLAT_REGEN=0`).

## 6. Dependencias

Ninguna.

## 7. Estrategia de tests

- **Unit**: `flatImageFor`; `groupArrivals` con tipo; firma de `thumb-holo`.
- **Integración**: guardar una carta genera las tres holo; carta con `holo` guardado reutiliza las claves; aprobar lo
  pendiente pasa las holo; `regenerateOutdated` actualiza versión y deja `flat_error` en una carta que falla;
  `publicCardImageKey` con holo; la ruta de imagen sirve la holo o la normal.
- **E2E**: sobre diseñado en recompensa, regalo y Expediciones; copia holo con imagen holo en colección, álbum y
  resumen; apertura sin insignias de rareza; barrido sin `pack-art`.

## 8. Entregas

1. Imágenes holo y regeneración (motor).
2. Las cuadrículas piden la imagen que toca.
3. El sobre del armador en las cuatro vistas.
4. Apertura sin letreros de rareza.
