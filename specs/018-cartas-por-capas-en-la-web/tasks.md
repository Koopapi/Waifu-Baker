# Tareas 018 — Las cartas por capas se ven en toda la web

## Entrega 1 — Maquetas (aprobación del dueño)
- [x] **T1 — Maquetas en Pencil**: revelación con la carta viva, ficha con la carta viva y el interruptor «Mover con el
  teléfono» (activado, negado y sin giroscopio), colección con imágenes fijas (normal y holo), álbum público con marca y
  aviso del panel de cambios 18+ pendientes · RF-6 a RF-15, RF-21 · Hecho: aprobadas por el dueño el 23 oct 2026 (hoja
  «Cartas por capas en la web (spec 018)» de `waifubaker.pen`).

## Entrega 2 — Imagen fija
- [x] **T2 — Renderizador** (`flatten.ts` con `playwright-core` y `carta-capas.js`): foto de la carta en reposo a 2×,
  tamaños y marca de agua · RF-1.
- [x] **T3 — Acabado holo** en CSS sobre la imagen fija donde se marca la holo · RF-5.
- [x] **T4 — Generación al crear, guardar capas, cambiar rareza y regenerar**; fallo que no guarda · RF-2 a RF-4 ·
  Hecho: el dibujo es un puerto (`setFlattener`): los tests que no miran la imagen usan uno rápido con sharp; los de la
  imagen fija, Chromium. La CI instala Chromium antes de Vitest. Al aprobar una chica pendiente en una 18+ publicada,
  ahora ocupa su capa de personaje (spec 017, RF-4).

## Entrega 3 — Carta viva
- [x] **T5 — Capas firmadas** (`/api/cards/[id]/live` y `/api/cards/layer`) con dueño y doble control 18+ · RF-16, RF-17.
- [x] **T6 — Revelación viva** en la apertura · RF-6, RF-9, RF-14.
- [x] **T7 — Ficha viva** con el interruptor del giroscopio · RF-7, RF-10 a RF-13.
- [ ] **T8 — Imágenes fijas** en colección, resumen, «Abrir todos», portada del sobre y zonas públicas · RF-8, RF-15.

## Entrega 4 — Revisión 18+
- [ ] **T9 — Cambios pendientes** (guardar, aprobar, descartar) y aviso en el panel · RF-18 a RF-21.

## Entrega 5 — Cierre
- [ ] **T10 — E2E en 4 proyectos, comparación visual, presupuesto, reglas de negocio, `DESIGN.md`, validación y
  checklist en teléfono** · Todos · Hecho cuando: `validation.md` 21 de 21 y demo manual del dueño.

## Cobertura
RF-1 T2, T3 · RF-2 T4, T8 · RF-3 T4 · RF-4 T4 · RF-5 T2, T3 · RF-6 T6 · RF-7 T7 · RF-8 T8 · RF-9 T6 · RF-10 T7 ·
RF-11 T7 · RF-12 T7 · RF-13 T7 · RF-14 T6, T7 · RF-15 T8 · RF-16 T5 · RF-17 T5 · RF-18 T9 · RF-19 T9 · RF-20 T9 ·
RF-21 T9.
