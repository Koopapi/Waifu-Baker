# Tareas — Spec 038

Tareas de 20 a 30 minutos, en orden de dependencia. Tests antes que el código.

## Entrega 1 — Nombres en toda la web

- [ ] **T1 — Nombres de rareza en los diccionarios**
  - RF: 1, 2, 4
  - Depende de: —
  - Hecho cuando: `test_s038_rf1_*` y `test_s038_rf2_*` pasan (los cinco nombres, iguales en español e inglés) y los
    grupos dicen Commons, Rares, Ultra Rares, SSR y EX.
- [ ] **T2 — Textos que nombran rarezas**
  - RF: 3
  - Depende de: T1
  - Hecho cuando: ningún diccionario ni mensaje del servidor dice Común, Rara, Épica, Legendaria, Epic o Legendary
    (`test_s038_rf3_*`).
- [ ] **T3 — Sellos C, R, UR, SSR y EX**
  - RF: 5, 6
  - Depende de: —
  - Hecho cuando: `RARITY_SEAL` y los presets dan C, R, UR, SSR y EX (tests).

## Entrega 2 — Cartas ya armadas

- [ ] **T4 — `renameSeal`**
  - RF: 7, 8
  - Depende de: T3
  - Hecho cuando: `test_s038_rf7_*` y `test_s038_rf8_*` pasan.
- [ ] **T5 — Paso de arranque, historial y regeneración**
  - RF: 7, 9, 10, 11
  - Depende de: T4
  - Hecho cuando: los tests de integración pasan (vigente y pendiente renombrados, versión `rareza`, sin revisión nueva,
    idempotente) y `FLAT_VERSION = 3`.
- [ ] **T6 — E2E y validación**
  - RF: todos
  - Depende de: T1–T5
  - Hecho cuando: el E2E de la 038 pasa en escritorio, `rf-coverage` sin RF descubiertos y `pnpm test` en verde.

## Cobertura

| RF | Tareas |
|---|---|
| 1, 2, 4 | T1 |
| 3 | T2 |
| 5, 6 | T3 |
| 7, 8 | T4, T5 |
| 9, 10, 11 | T5 |
