# Tareas — Spec 031

| T | Qué | RF | Depende de | Hecho cuando |
|---|---|---|---|---|
| T1 | `toCardTile` y `CardTileDTO` (dominio) con sus tests | RF-2, RF-13 | — | Vitest en verde |
| T2 | `listLibraryEntries` y `GET /api/admin/library` con sus tests | RF-3, RF-4, RF-9 | — | Vitest en verde |
| T3 | Mover `CardEditor` a su archivo y crear `CardEditorLoader` (ventana al instante, indicador, reintentar, cancelar al cerrar, código y biblioteca una vez por visita) | RF-8 a RF-12, RF-15 | T1, T2 | tipos y lint en verde |
| T4 | `CardWorkspace` y la página con teselas, sin biblioteca, miniaturas diferidas | RF-1 a RF-7, RF-13, RF-14 | T1–T3 | tipos, lint y Vitest en verde |
| T5 | Presupuesto por página con 260 kB para la colección; medir tras el build | RF-16, RF-17 | T4 | `pnpm build && pnpm budget` en verde |
| T6 | E2E `carga-diferida.spec.ts` | RF-1 a RF-14 | T4 | en verde en `chromium-desktop` |
| T7 ✓ | Comprobar en producción (demo compilada) el clic desde «Sets» y abrir cartas | RF-5, RNF | T4 | medición anotada en `validation.md` |
| T8 | Documentación (reglas, roadmap) y `validation.md`; suite completa en los cuatro proyectos | todos | T1–T7 | suite en verde |

## Cobertura
RF-1 T4, T6 · RF-2 T1, T6 · RF-3 T2, T6 · RF-4 T2 · RF-5 T7 (PR #43) · RF-6 T4, T6 · RF-7 T4, T6 · RF-8 T3, T6 ·
RF-9 T3, T6 · RF-10 T3, T6 · RF-11 T3, T6 · RF-12 T3, T6 · RF-13 T1, T4, T6 · RF-14 T6 · RF-15 suite existente ·
RF-16 T5 · RF-17 T5
