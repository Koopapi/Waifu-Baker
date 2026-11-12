# Plan 038 — Nombres nuevos de las rarezas

Plan técnico de `spec.md`. Respeta `docs/constitution.md` y `docs/architecture.md`. Va encima de la spec 037 (usa su
regeneración de imágenes fijas).

## 1. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `i18n/dictionaries/{es,en}/common.ts` | `rarity`: Common, Rare, Ultra Rare, SSR, EX en los dos idiomas | 1, 2 |
| `i18n/dictionaries/{es,en}/*.ts` | textos que nombran rarezas (probabilidades, garantías, protección de mala suerte, grupos, panel, errores) | 3, 4 |
| `domain/catalog/card-rules.ts` | `RARITY_LABEL` (mensajes del servidor) con los nombres nuevos | 3 |
| `domain/catalog/rarity-tier.ts` | `RARITY_SEAL`: C, R, UR, SSR, EX (estrella del efecto especial e insignia de las cartas sin capas) | 5 |
| `domain/cards/layers-rarity.ts` | sellos de los presets: `sr` → UR, `ssr` → SSR | 6 |
| `domain/cards/seal-rename.ts` (nuevo) | `renameSeal(config, rarity)`: E → UR en Ultra Rare y LEG → SSR en SSR, solo si el texto es el de fábrica | 7, 8 |
| `server/services/seal-rename.ts` (nuevo) | al arrancar, aplica `renameSeal` a lo vigente y a lo pendiente de cada carta, deja una versión en el historial y la marca para regenerar | 7, 9, 10, 11 |
| `domain/cards/flat-version.ts` | `FLAT_VERSION = 3`: la regeneración de la spec 037 vuelve a sacar todas las imágenes | 9 |
| `card_versions.changed` | nuevo valor `rareza` («Nombres nuevos de rareza» en el historial) | 10 |

## 2. Modelo de datos

Migración `rareza_en_historial`: la restricción `card_versions_changed_check` acepta también `'rareza'`. Sin columnas
nuevas: lo que se guarda para cada rareza (`common`, `rare`, `epic`, `legendary`, `ex`) no cambia.

## 3. Algoritmos

**Renombrar el sello (RF-7, RF-8, RF-11).** Para cada carta con capas: si su rareza es `epic` y el sello de texto dice
`E`, pasa a `UR`; si es `legendary` y dice `LEG`, pasa a `SSR`. Igual en `layers_pending` (sin tocar la revisión 18+).
Es idempotente: una segunda pasada no encuentra nada. Corre al arrancar, antes de la regeneración.

**Historial (RF-10).** Cada carta renombrada guarda una versión con `changed = 'rareza'`, sin autor (el sistema).

## 4. Contrato de la API

Sin cambios.

## 5. Decisiones técnicas

- Los nombres viven solo en los diccionarios: un nombre por rareza en `common.rarity`, y los textos largos lo
  interpolan donde se puede.
- El cambio de sello va en un paso aparte de la regeneración: la regeneración no modifica configuraciones.

## 6. Dependencias

Ninguna.

## 7. Estrategia de tests

- **Unit**: nombres en los dos idiomas; `RARITY_SEAL`; presets; `renameSeal` (E → UR, LEG → SSR, sello escrito a mano
  intacto, sin sello).
- **Integración**: el paso de arranque renombra lo vigente y lo pendiente, deja versión `rareza`, no pide revisión y
  es idempotente; la regeneración saca las imágenes con el sello nuevo.
- **E2E**: probabilidades públicas, resumen de un sobre y filtro de la colección con los nombres nuevos; el barrido sin
  «Épica» ni «Legendaria».

## 8. Entregas

1. Nombres en toda la web.
2. Sellos nuevos, cambio en las cartas ya armadas y regeneración.
