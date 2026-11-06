# Plan — Spec 028: valores por defecto, ajustes del panel y cartas de portada

Estado: spec aprobada por el dueño el 5 nov 2026. Rama `spec/028-valores-por-defecto` (sale de `pruebas`, con la 027
fusionada). Sin maqueta: el dueño está fuera y pidió terminarla de principio a fin; los formularios nuevos usan solo
componentes del sistema y el abanico de la portada reutiliza el de la demo (spec 010). Sin dependencias nuevas.

## Decisiones (tomadas sin el dueño; ver «Supuestos» al final)

1. **Un solo sitio para los valores.** `domain/cards/card-defaults.ts` guarda el sello de texto (15, rango 4 a 40) y el
   borde (3,0, rango 0 a 8) de fábrica; `domain/catalog/default-odds.ts`, las probabilidades iniciales de RF-8 y RF-9 y
   las garantías de fábrica (épica 10 sobres plata, EX 20 sobres gold). Los ajustes del panel (RF-15 a RF-17) se guardan
   en `app_settings` y, si faltan o no son válidos, valen los de fábrica.
2. **Las funciones del dominio reciben los valores.** `applyTierStyle`, `retierLayers`, `settleAutoStyle`,
   `configFromCharacter` y `parseCreatorConfig` aceptan `defaults: CardDefaults` (por omisión los de fábrica); el
   servidor los lee de los ajustes y el editor los recibe por props desde la página del panel.
3. **El estilo de la rareza pone sello y borde.** `TIER_PRESETS` deja de llevar tamaño de sello; `applyTierStyle`
   pone `sello.tamano = defaults.sealSize` y `borde = defaults.border` (RF-1 a RF-3). El borde pasa a formar parte del
   «estilo» que vigila el estilo automático (mover el deslizador del borde lo apaga, como tocar el sello). Sin estilo
   automático, al cambiar la rareza el sello de texto sigue al escalón (texto y color) pero **conserva su tamaño**, y el
   borde no cambia: ya no hay tamaño por escalón que seguir.
4. **RF-4 sin tocar las cartas guardadas (RF-6).** La carta viva y la imagen fija salen de `carta-capas.js`; sin borde
   guardado, hoy usa el del escalón (1,9 a 4,8; 2,2 el personalizado). Pasa a usar 3,0. Para que ninguna carta ya
   guardada cambie de aspecto, la migración `0021` escribe en `cards.layers`, `cards.layers_pending` y
   `card_versions.layers` que no tengan `borde` (y cuyo marco no sea «Sin marco») el grosor con el que se ven hoy. Las
   imágenes fijas guardadas no se regeneran y siguen siendo iguales a la carta viva. El deslizador del editor muestra
   `draft.borde ?? 3`.
5. **Importar (RF-5).** `parseCreatorConfig` rellena `borde` y el `tamano` de un sello de texto que falten con los
   valores por defecto vigentes.
6. **Garantía de EX (RF-12 a RF-14).** Columna nueva `drop_tables.ex_pity_threshold` (0 = sin garantía; versionada y
   congelada con la tabla, como `pity_threshold`) y contador nuevo `pity_counters.packs_since_ex`. En un sobre gold con
   `packs_since_ex ≥ umbral − 1`, si no salió EX, la última ranura se vuelve a sortear solo entre las EX
   (`drawPackWithGuarantee(…, "ex")`, la misma mecánica que la de épica). El contador solo cuenta sobres gold y vuelve a
   0 con cualquier EX. Las tablas ya publicadas quedan con 0 (RF-10): la garantía solo nace con las colecciones nuevas.
   El editor de probabilidades del gold de una colección en borrador muestra y guarda ese umbral.
7. **Probabilidad por sobre (RF-11).** `domain/catalog/pack-chances.ts`: `1 − Π(1 − pᵣ)` por rareza con los pesos
   publicados de cada ranura (sin la garantía, que se explica aparte). La página pública añade una fila por tipo de
   sobre con «al menos una» de cada rareza y la frase de la garantía de EX.
8. **Ajustes (RF-15 a RF-19).** Cuatro claves en `app_settings`: `card_defaults`, `odds_defaults`, `pity_defaults` y
   `cover_cards`. Cada `set…` valida en el servidor, guarda y registra en la auditoría `before`/`after`
   (`settings.card_defaults`, `settings.odds_defaults`, `settings.pity_defaults`, `settings.cover_cards`). Las tablas que
   no suman 100 (o cuya última ranura no respeta la garantía del sobre) no se guardan y el error dice tipo de sobre y
   ranura (RF-16). `createSet` y el cambio de cartas por sobre leen los ajustes (RF-18: lo ya creado no cambia).
9. **Cartas de portada (RF-20 a RF-23).** `cover_cards` guarda de 3 a 5 ids en orden (de izquierda a derecha en el
   abanico). Al guardar se exige que cada una sea de una colección publicada no 18+ y tenga imagen pública. Al mostrar,
   `publicCoverCards` vuelve a filtrar (colección publicada —no archivada— y no 18+, carta existente con `key_public`):
   las que dejan de valer desaparecen sin error (RF-22) y, sin ninguna, la portada es la de hoy (RF-23). La imagen sale
   de `GET /api/cover/[id]`, que solo sirve `key_public` de una carta que esté en la lista y siga valiendo (nunca datos
   de usuario). La portada no depende de la sesión.
10. **Componente `CardFan`** (`ui/game/CardFan.tsx`): el abanico de la demo convertido en componente del sistema (de 1 a
    5 cartas, posiciones calculadas, entrada animada con `card-in` y escalado en teléfono). Lo usan la demo y la
    portada. Fila en `docs/DESIGN.md` como pendiente de Pencil.

## Datos

- Migración `0021_valores_por_defecto.sql` (drizzle-kit: primero las columnas, luego el SQL de relleno añadido a mano,
  en otra sección con `--> statement-breakpoint`): `drop_tables.ex_pity_threshold integer not null default 0`,
  `pity_counters.packs_since_ex integer not null default 0` y el relleno de `borde` de RF-6 (n 1,9; r 2,9; sr 3,3;
  ssr 4,3; ur 4,8; personalizado 2,2), idempotente.

## Servidor

- `services/settings.ts`: `getCardDefaults`/`setCardDefaults`, `getOddsDefaults`/`setOddsDefaults`,
  `getPityDefaults`/`setPityDefaults`, `getCoverCards`/`setCoverCards`, `listCoverCandidates`, `publicCoverCards`,
  `coverCardImageKey`.
- `collections.ts`: `createSet` con tablas y garantías de los ajustes (épica en la plata, EX en la gold); `updateSet`
  (cartas por sobre) con las tablas de los ajustes; `saveOdds` guarda el umbral de EX en la gold.
- `packs.ts`: garantía de EX en los gold, contador `packs_since_ex`.
- `cards.ts`, `card-shared.ts`, `card-save.ts`: los valores por defecto vigentes al crear, al cambiar la chica de una
  carta sin capas, al cambiar la rareza y al asentar el estilo automático. `demo-seed.ts` y `dev-seed.ts`, igual.
- Errores nuevos del panel (solo servidor) en `panel-errors.ts`: `invalid_card_defaults`, `invalid_odds_defaults`,
  `invalid_pity_defaults`, `invalid_cover_cards`.
- Ruta pública `GET /api/cover/[id]` (en `e2e/warm.ts`).

## Cliente

- `/admin/settings`: tarjetas «Cartas nuevas» (sello y borde), «Probabilidades de colecciones nuevas» (plata y gold,
  tres filas por tabla con su suma, la fila que falla marcada), «Garantías» (épica y EX) y «Cartas de portada»
  (buscador para añadir, lista ordenada con subir/bajar/quitar y miniatura). Textos en el diccionario del panel nuevo
  `i18n/admin-defaults.ts` (inglés y español), no en el general.
- `LayersEditor`/`CardWorkspace`: prop `cardDefaults` para «Aplicar estilo de la rareza», el sello de texto nuevo, el
  importador y el criterio del estilo automático.
- Portada pública (`app/page.tsx`): `CardFan` con las cartas de portada válidas encima del título.
- `/drop-rates`: «al menos una por sobre» y la garantía de EX (textos públicos en `site.ts`, mínimos).

## Tests

- Unidad: `card-defaults`, `layers-rarity` (RF-1 a RF-3 con valores de fábrica y con otros), `layers-io` (RF-5),
  `carta-capas` (RF-4: 3,0 sin borde guardado), `default-odds` (RF-8, RF-9, validación de RF-16), `pack-chances`
  (RF-11: plata EX 0,20 % y legendaria 9,5 %, gold EX 5,9 % y legendaria 43 %), `draw` (garantía de EX), `cover-cards`
  (3 a 5, sin repetir), `CardFan` (posiciones y número de cartas), diccionario del panel en dos idiomas.
- Integración: crear carta → 15/3,0 (RF-1) y con ajustes cambiados (RF-15, RF-18); cambiar rareza con estilo automático
  (RF-3); relleno de la migración (RF-6); colección nueva con tablas y garantías de los ajustes y publicadas intactas
  (RF-8 a RF-10, RF-16 a RF-18); garantía de EX a los 20 gold y reinicio (RF-12, RF-13); auditoría (RF-19); cartas de
  portada válidas, inválidas y vacías (RF-20 a RF-23).
- E2E `defaults.spec.ts` (4 proyectos): el administrador cambia y vuelve los ajustes, sube una chica y ve 15 y 3,0 en
  los deslizadores, aplica el estilo de la rareza, elige 3 cartas de portada y la portada pública las muestra (con y
  sin sesión); `/drop-rates` muestra «al menos una» y la garantía de EX.
- Ajustes de tests antiguos que dependían de valores concretos: se fijan a mano en el test, sin cambiar el
  comportamiento.

## Riesgos

- El relleno de la migración debe usar exactamente los grosores de `carta-capas.js` (test que los compara).
- Cambiar `TIER_PRESETS` mueve tests de las specs 016, 017, 022 y 025 que esperaban 10/12/13/14: se ajustan.
- El editor sigue con el deslizador del sello de texto de 8 a 26 y el del borde de 0,8 a 5; el rango se amplía para
  incluir el valor por defecto si el administrador elige uno fuera (los ajustes admiten 4 a 40 y 0 a 8).

## Supuestos

- «Publicada» para la portada = estado `published` (una archivada deja de valer, RF-22).
- El orden de las cartas de portada es de izquierda a derecha del abanico.
- Las colecciones en borrador que ya existían no reciben la garantía de EX ni las tablas nuevas (RF-18); el
  administrador puede ponerlas a mano en su editor de probabilidades.
- La probabilidad «al menos una» se calcula con los pesos publicados por ranura e ignora la garantía (que se explica
  en su frase) y la sustitución por rareza inferior cuando una rareza no tiene cartas.
