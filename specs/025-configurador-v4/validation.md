# Validación — Spec 025

Fecha: 29 oct 2026, en local (rama `spec/025-configurador-v4`, sin subir). Pendiente: demo del dueño, checklist en
teléfono (iPhone y Android) y revisión de Bruno.

| RF | Evidencia | Estado |
|---|---|---|
| RF-1 | `layers-v4.test.ts` (esquema del brillo); E2E `configurador-v4` (elegir «Holográfico» e intensidad) | ✅ |
| RF-2 | `carta-capas.test.ts` (brillo dentro de la capa con su imagen como máscara); `flatten.test.ts` (cambia la chica, no el fondo) | ✅ |
| RF-3 | `layers-v4.test.ts` (0 a 1); E2E (`--cc-holo-i` en vivo) | ✅ |
| RF-4 | `live-card.test.ts` (la carta viva recibe brillo, intensidad y marco); misma carta-capas.js en editor, apertura y ficha | ✅ |
| RF-5 | `flatten.test.ts` (brillo en reposo e intensidad del holo en la imagen fija) | ✅ |
| RF-6 | `carta-capas.test.ts` (regla de movimiento reducido) | ✅ |
| RF-7 | `layers-v4.test.ts` (configuración anterior sigue válida); E2E existentes de las specs 016 a 018 en verde | ✅ |
| RF-8, RF-9 | E2E (ajustes bajo la vista previa, «Probar revelado» con `cc-pop` y `cc-entra`) | ✅ |
| RF-10 | Los ajustes de la vista previa van en `view` (estado del editor), no en el borrador que se guarda | ✅ (revisión de código) |
| RF-11 | E2E (`--cc-borde: 4cqw`); arreglo del grosor 0 (`carta-capas.test.ts`, `flatten.test.ts`) | ✅ |
| RF-12, RF-13 | `layers-editing.test.ts`; E2E (usar como sello y recorte) | ✅ |
| RF-14, RF-15 | E2E (un solo color, otra variación cambia la posición) | ✅ |
| RF-16 a RF-19 | `carta-capas.test.ts`, `layers-v4.test.ts`, `flatten.test.ts`; E2E (personalizado, sin marco, se conserva al volver) | ✅ |
| RF-20 | `layers-editing.test.ts`; E2E (`yuki_ssr` pasa a ser el sello) | ✅ |
| RF-21 a RF-26 | `configurator.test.tsx`; E2E (columnas, «Adelante»/«Atrás», fila abierta, fichas, 390 px sin scroll); maqueta `maqueta.html` | ✅ (falta aprobación visual del dueño) |
| RF-27 | E2E `card-layers` y `card-assembly` adaptados, en verde | ✅ |
| RF-28 | E2E `live-cards` (cambio de capas en 18+ publicada queda pendiente), en verde | ✅ |
| RF-29, RF-30 | `layers-v4.test.ts` (importar y exportar v4, `ex`, degradado personalizado) | ✅ |

Pruebas: unitarias 438, integración 318 (40 archivos), tipos, revisión de código, build y peso de las páginas en verde.
E2E de escritorio, suite completa en local: 28 pasaron y 1 se omite por diseño (la del giroscopio, solo en teléfonos), en 58 min.
Las de teléfono (pixel-7, iphone-14) y movimiento reducido no se corrieron.

Hallazgo: desde la spec 022 el marco de las cartas por capas salía con grosor 0 (no se veía) cuando la carta no tenía
grosor guardado. Corregido aquí; las imágenes fijas ya generadas en pruebas se rehacen con «Regenerar» o al guardar.
