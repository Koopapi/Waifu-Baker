# Plan — Spec 022, rarezas y sobres plata y gold

## Resumen técnico
Cambiar el enum de rarezas a cinco valores (`common`, `rare`, `epic`, `legendary`, `ex`), añadir el tipo de sobre
(`silver`, `gold`) a los sobres y a las tablas de probabilidad, y extender el sorteo, la publicación y la mala suerte
para que trabajen por tipo. En la web, el tipo se ve en «Mis sobres», la apertura y «Abrir todos»; las comunes se ven
planas; los cinco marcos nuevos se dibujan en `carta-capas.js` (escalones `n`, `r`, `sr`, `ssr`, `ur`, uno por
rareza). El aspecto de los sobres plata y gold queda para la spec 023 (apertura nueva): aquí basta con la etiqueta.

## Datos (migración 0017, SQL a mano)
- Enum `rarity`: `uncommon` → `common` y `secret` → `ex` en `cards.rarity`; se recrea el tipo con los cinco valores.
- `drop_tables.slots` (jsonb): en cada ranura, el peso de `uncommon` se suma a `common` y `secret` pasa a `ex`.
- Enum nuevo `pack_kind` (`silver`, `gold`): `packs.kind` (por defecto `silver`) y `drop_tables.kind` (por defecto
  `silver`); el índice único de tablas pasa a (`set_id`, `kind`, `version`).
- Cada colección existente recibe su tabla gold en borrador con las probabilidades gold por defecto.

## Reglas (domain)
- `card-rules.ts`: `RARITIES` de cinco; etiquetas.
- `default-odds.ts`: `defaultSlots(packSize, kind)`; plata con la última ranura rara o mejor, gold con épica o mejor y más
  legendaria y EX en las ranuras normales.
- `odds.ts`: `validateOdds(slots, packSize, holoChance, kind)` exige en la última ranura de plata solo rara+ y en la de
  gold solo épica+; `goldBeatsSilver(silver, gold)` (RF-16).
- `publish-check.ts`: problemas por tabla que falta (RF-13) y por gold que no mejora (RF-16).
- `draw.ts`: la holo vale para cualquier rareza (RF-3). `pity.ts` sin cambios; el servicio solo la aplica en plata.
- `rarity-tier.ts`: una rareza por escalón (`common`→`n`, `rare`→`r`, `epic`→`sr`, `legendary`→`ssr`, `ex`→`ur`) y
  `isFlat(rarity)` para la común.

## Servicios
- `collections.ts`: crear colección crea las dos tablas; `saveOdds(…, kind)`; `publishSet` publica las dos o ninguna;
  `listPublicOdds` devuelve las dos por colección.
- `packs.ts`: `openPack` usa la tabla del tipo del sobre y la mala suerte solo en plata; `listMyPacks` agrupa por
  colección y tipo; «Abrir todos» por colección y tipo.
- `users-admin.ts` (regalo): tipo de sobre. Las demás fuentes siguen dando plata (RF-23).
- Simulador del panel por tipo.

## UI
- Panel: editor de probabilidades con pestañas Plata / Gold; regalo con tipo; simulador con tipo.
- «Mis sobres»: un grupo por colección y tipo con la etiqueta PLATA o GOLD; la apertura y «Abrir todos» la muestran.
- Probabilidades: dos tablas por colección.
- Carta viva: las comunes no se montan vivas (imagen fija con el brillo holo si toca); `carta-capas.js` con los cinco
  marcos nuevos de la maqueta.
- Textos en inglés y español: `rarity.ex`, tipos de sobre.

## Pruebas
- Unidad: rarezas, conversión de tablas, tablas por defecto, validación por tipo, gold mejor que plata, holo en común,
  escalones y comunes planas.
- Integración: migración de datos, dos tablas al crear, publicar con una sola tabla falla, gold que no mejora falla,
  garantías con 2000 sorteos por tipo, mala suerte solo en plata, regalo por tipo, probabilidades públicas dobles.
- E2E: panel (pestañas, publicar), «Mis sobres» con plata y gold, apertura, Probabilidades; adaptar las pruebas que
  usan `uncommon` y `secret`. Suite completa en 4 proyectos.
