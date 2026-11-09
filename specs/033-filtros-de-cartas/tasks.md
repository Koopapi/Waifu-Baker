# Tareas — Spec 033

| T | Qué | RF | Depende de | Hecho cuando |
|---|---|---|---|---|
| T1 | Tesela con `characterId` y `assembled`, con sus tests | RF-1, RF-3 | — | Vitest en verde |
| T2 | Dominio `card-filters.ts` (filtrar, buscar, ordenar, recuentos y dirección) con sus tests | RF-1 a RF-11, RF-16 a RF-19 | T1 | Vitest en verde |
| T3 | `ToggleChips` en el sistema de diseño, con su test y en el catálogo | RF-1 a RF-4 | — | Vitest en verde |
| T4 | `CardFilters` y `CardWorkspace` (filtros, contador, vacío, selección visible, reordenar, dirección) | RF-1 a RF-19 | T2, T3 | tipos, lint y Vitest en verde |
| T5 | E2E `filtros-de-cartas.spec.ts` | RF-1 a RF-19 | T4 | en verde en `chromium-desktop` |
| T6 | Build y presupuesto; documentación (reglas, roadmap) y `validation.md`; suite completa de las dos specs | todos | T1–T5 | suite en verde |

## Cobertura
RF-1 T2, T4, T5 · RF-2 T2, T5 · RF-3 T1, T2, T5 · RF-4 T2, T5 · RF-5 T2 · RF-6 T2, T5 · RF-7 T2, T5 · RF-8 T4, T5 ·
RF-9 T4, T5 · RF-10 T2, T5 · RF-11 T2 · RF-12 T4, T5 · RF-13 T4, T5 · RF-14 T4, T5 · RF-15 T4, T5 · RF-16 T2, T5 ·
RF-17 T2, T5 · RF-18 T2 · RF-19 T2, T5
