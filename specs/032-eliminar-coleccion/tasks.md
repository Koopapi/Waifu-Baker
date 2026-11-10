# Tareas — Spec 032

| T | Qué | RF | Depende de | Hecho cuando |
|---|---|---|---|---|
| T1 | Dominio `set-deletion.ts` con sus tests | RF-4, RF-8, RF-10, RF-11 | — | Vitest en verde |
| T2 | Servicio `getSetDeletionInfo` y `deleteSet`, `isForeignKeyViolation`, con tests de integración | RF-5, RF-7 a RF-9, RF-11, RF-14 | T1 | Vitest en verde |
| T3 | Acciones `setDeletionInfoAction` y `deleteSetAction`, textos y errores | RF-6, RF-15 | T2 | tipos y lint en verde |
| T4 | `DangerZone`, `ArchiveButton` fuera de `PublishPanel` y `DeleteSetDialog` | RF-1 a RF-4, RF-6, RF-9, RF-10, RF-12, RF-13 | T3 | tipos, lint y Vitest en verde |
| T5 | E2E `eliminar-coleccion.spec.ts` | RF-1 a RF-6, RF-9, RF-10, RF-12, RF-13, RF-15 | T4 | en verde en `chromium-desktop` |
| T6 | Documentación (reglas, roadmap) y `validation.md` | todos | T1–T5 | suite en verde |

## Cobertura
RF-1 T4, T5 · RF-2 T4, T5 · RF-3 T4, T5 · RF-4 T1, T5 · RF-5 T2, T5 · RF-6 T3, T5 · RF-7 T2 · RF-8 T1, T2 ·
RF-9 T2, T5 · RF-10 T1, T5 · RF-11 T1, T2 · RF-12 T4, T5 · RF-13 T4, T5 · RF-14 T2 · RF-15 T3, T5
