# Tareas — Spec 040

Tareas de 20 a 30 minutos, en orden de dependencia. Tests antes que el código.

## Entrega 1 — Motor común

- [x] **T1 — Carta: arte aislado**
  - RF: 1, 3, 4, 5
  - Depende de: —
  - Hecho cuando: `test_s040_rf1_*` de `carta-capas.test.ts` pasa (`.cc-art` aislado y CSS en versión nueva).
- [x] **T2 — Sobre: capas aisladas**
  - RF: 2, 4, 5
  - Depende de: —
  - Hecho cuando: `test_s040_rf2_*` de `sobre-capas.test.ts` pasa (`.sc-pila` aislado, marcado «spec 040», CSS en
    versión nueva).

## Entrega 2 — E2E y validación

- [ ] **T3 — E2E**
  - RF: todos
  - Depende de: T1, T2
  - Hecho cuando: `mezcla-en-iphone.spec.ts` pasa en escritorio, iPhone 14 y Pixel 7; las E2E afectadas en escritorio,
    `rf-coverage` sin RF descubiertos y `pnpm test` en verde.
- [ ] **T4 — Revisión en el iPhone del dueño**
  - RF: 1, 2, 3
  - Depende de: T3 desplegada en pruebas
  - Hecho cuando: el dueño ve Hanako completa en el armador, el simulador y la apertura, y un sobre con una capa con
    mezcla completo.

## Cobertura

| RF | Tareas |
|---|---|
| 1 | T1, T3, T4 |
| 2 | T2, T3, T4 |
| 3 | T1, T3, T4 |
| 4 | T1, T2, T3 |
| 5 | T1, T2 |
