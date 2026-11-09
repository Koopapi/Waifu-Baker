# Tareas — Spec 034

| T | Qué | RF | Depende de | Hecho cuando |
|---|---|---|---|---|
| T1 | `final-card.ts` (`finalCardConfig`, valores de fábrica y firma) y esquema con `profundidad`, `inclinacion` y `reposo`, con sus tests | RF-1 a RF-5, RF-12, RF-14, RF-15 | — | Vitest en verde |
| T2 | Armador: controles de la vista previa guardados en la carta y vista previa con `finalCardConfig`; versiones igual | RF-12, RF-13, RF-15, RF-16 | T1 | tipos, lint y Vitest en verde |
| T3 | `liveCardConfig` con `finalCardConfig` y comunes vivas, con tests de integración | RF-8, RF-9 | T1 | Vitest en verde |
| T4 | Apertura, «Abrir todos» y ficha: `zone`, holo de la copia o guardado y firma en `CartaCapas` | RF-1 a RF-7 | T3 | tipos y lint en verde |
| T5 | Imagen fija con el mismo encuadre (test del aplanado) | RF-10, RF-11 | T1 | Vitest en verde |
| T6 | E2E `carta-igual-al-armador.spec.ts` y capturas lado a lado | RF-1 a RF-16 | T2–T5 | en verde en `chromium-desktop` |
| T7 | Reglas de negocio (la común se ve viva: cambia la regla de la spec 022), roadmap, `validation.md`, presupuesto y suite completa | todos | T1–T6 | suite en verde |

## Cobertura
RF-1 T1, T4, T6 · RF-2 T4, T6 · RF-3 T4, T6 · RF-4 T6 · RF-5 T1, T6 · RF-6 T6 · RF-7 T4, T6 · RF-8 T3 · RF-9 T3, T6 ·
RF-10 T5 · RF-11 T5 · RF-12 T1, T2, T6 · RF-13 T2, T6 · RF-14 T1 · RF-15 T1, T2, T6 · RF-16 T2
