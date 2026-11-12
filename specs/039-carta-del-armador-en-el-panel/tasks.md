# Tareas — Spec 039

Tareas de 20 a 30 minutos, en orden de dependencia. Tests antes que el código.

## Entrega 1 — Simulador

- [x] **T1 — `adminCardView`**
  - RF: 1, 4, 6, 7, 8, 9
  - Depende de: —
  - Hecho cuando: `test_s039_rf*` de `admin-card.test.ts` pasan (carta viva con enlaces del panel, sin vínculo, lo
    vigente, holo con y sin imagen holo, sin capas).
- [x] **T2 — El simulador manda la carta del armador**
  - RF: 1–9
  - Depende de: T1
  - Hecho cuando: `simulatePackAction` devuelve `live` y `holoFinish`; `LayersEditor` usa `adminAssetUrl`.

- [x] **T2b — Sello completo en la escena de apertura**
  - RF: 17
  - Depende de: T2
  - Hecho cuando: con la carta viva cargada, la cara de `Card3D` no recorta el sello (E2E en el simulador y en la
    apertura del coleccionista).

## Entrega 2 — Editor de una carta

- [x] **T3 — Quitar la vista previa anterior**
  - RF: 10, 11, 12
  - Depende de: —
  - Hecho cuando: `CardPreview` y sus textos borrados; el cambio de arte y la nota del arte pendiente siguen en el editor.

## Entrega 3 — Diseñador de sobres

- [x] **T4 — `designerSamples`**
  - RF: 13, 15, 16
  - Depende de: T1
  - Hecho cuando: `test_s039_rf13_*`, `rf15_*` y `rf16_*` pasan.
- [x] **T5 — `DesignerStage` con la carta viva**
  - RF: 13, 14
  - Depende de: T4
  - Hecho cuando: la carta a la vista monta su configuración viva; las demás, la imagen fija.
- [x] **T6 — E2E y validación**
  - RF: todos
  - Depende de: T1–T5
  - Hecho cuando: el E2E de la 039 y las afectadas pasan en escritorio, `rf-coverage` sin RF descubiertos, `pnpm test`
    en verde y capturas del armador junto al simulador y al diseñador.

## Cobertura

| RF | Tareas |
|---|---|
| 1, 4, 6, 7, 8, 9 | T1, T2 |
| 2, 3, 5 | T2 |
| 10, 11, 12 | T3 |
| 13 | T4, T5 |
| 14 | T5 |
| 15, 16 | T4 |
| 17 | T2b |
