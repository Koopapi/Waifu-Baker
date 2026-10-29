# Plan 016 — Cartas por capas: editor en el panel

Respeta `docs/constitution.md` y `docs/reglas-de-negocio.md`. Parte de la base ya fusionada en `pruebas` (#15:
`ui/game/carta-capas/` v3, el envoltorio `ui/game/CartaCapas.tsx` y `domain/catalog/rarity-tier.ts`), de la limpieza
del #18 (listas cerradas en el componente) y del código de Bruno del PR #17, que se trae a esta rama tal cual con los
tests renumerados a esta spec. Su plan completo (rama `spec/016-cartas-por-capas`) sigue siendo la referencia técnica
para las specs 017 y 018.

## 1. Modelo de datos

Migración `0011_card_layers` (de Bruno): en `cards`, `layers` (jsonb, configuración vigente; `null` = sin capas),
`layers_pending` y `pending_keys` (jsonb). Las dos últimas no se usan hasta la spec 017 (revisión 18+ de capas), pero
se crean ya para no partir la migración. La configuración guarda claves del almacén
(`sets/<setId>/layers/<sha256>.webp`), nunca URL; `cards.version` sube con cada guardado y es el control de edición
simultánea.

## 2. Módulos

| Módulo | Qué hace | RF | Estado |
|---|---|---|---|
| `domain/cards/layers.ts` | Esquema zod con listas cerradas, límites (8 capas de imagen, partículas aparte), capa visible, proporción y ancho, imágenes repetidas | RF-7, RF-13, RF-20, RF-22 a RF-24 | Bruno |
| `domain/cards/layers-rarity.ts` | `applyTierStyle`: marco, partículas y sello del escalón | RF-9, RF-25 | Bruno (falta conectarlo al cambio de rareza) |
| `server/cards/layer-images.ts` | Valida, escala a 1400 × 1982 y guarda en WebP en el área temporal `tmp/layers/` | RF-19 a RF-21, RF-23 | Bruno |
| `server/services/card-layers.ts` | Guardar (versión y forzado), quitar capas, mover del área temporal a la colección, auditoría | RF-2, RF-12 a RF-18 | Bruno |
| `app/api/admin/layer-uploads`, `app/api/admin/cards/[id]/layers` | Subida y `GET/PUT/DELETE`; 404 a quien no es administrador | RF-1, RF-4 | Bruno (faltan tests de acceso) |
| `features/admin/cards/LayersEditor.tsx` + `CardWorkspace` | Sección «Carta por capas» con vista previa en vivo (`CartaCapas` sobre fondo oscuro) | RF-3, RF-5 a RF-11, RF-17, RF-18 | Bruno (corregir etiquetas de subir y bajar) |
| `server/services/cards.ts` | `updateCard` y `bulkUpdateCards`: al cambiar la rareza de una carta con capas, `applyTierStyle` con el escalón nuevo; sello de imagen intacto con aviso | RF-25 | Nuevo |
| `server/scheduler.ts` + `server/cards/layer-images.ts` | `purgeTempLayers`: borra del área temporal lo que tenga más de 24 h, una vez al día | RNF | Nuevo |
| Pencil (`waifubaker.pen`) + `docs/DESIGN.md` | Componente «Carta por capas» en la lámina del sistema de diseño; la tabla deja de decir «Sin versión en Pencil» | RNF | Nuevo |

## 3. Decisiones

- **Se trae el código de Bruno sin reescribirlo**: está bien hecho (validación en el servidor con zod y listas
  cerradas, solo administradores, auditoría, control por versión, componentes del sistema de diseño, textos en los
  dos idiomas). Sus tests se renumeran a los RF de esta spec; la tabla de la spec relaciona la numeración.
- **RF-4 (nada sale del panel)**: las imágenes de capa solo se sirven por `/api/admin/assets` y la configuración solo
  por `/api/admin/cards/[id]/layers`; ninguna consulta del coleccionista lee `layers`. Un test lo vigila.
- **El fallo de CI del #17** eran tiempos de espera del E2E en el servidor de GitHub (en local pasan); el PR #16 de
  Bruno sube el calentamiento a 10 minutos.

## 4. Pruebas

- Unidad: las de Bruno (dominio de capas y escalones) y el cambio de rareza con sello de imagen.
- Integración: las de Bruno (guardar, conflicto, forzar, quitar, auditoría, validación de imágenes) y nuevas para
  acceso de no administradores (RF-1, RF-4), número y nombre intactos (RF-15), colecciones publicadas (RF-16), cambio
  de rareza (RF-25) y limpieza del área temporal.
- E2E: `card-layers.spec.ts` de Bruno en escritorio, más el paso de cambio de rareza y que la carta no lleva texto
  encima (RF-11).
- `pnpm budget`: sin cambios en las páginas del coleccionista.
