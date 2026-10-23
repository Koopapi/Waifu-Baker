# Tareas 016 — Cartas por capas: editor en el panel

## Entrega 1 — Código de Bruno (PR #17), traído y renumerado
- [x] **T1 — Migración `0011_card_layers`** · RF-12 · Hecho: columnas en `cards`; migra sin romper nada.
- [x] **T2 — Dominio de la configuración** (`domain/cards/layers.ts`, `layers-rarity.ts`) · RF-7, RF-9, RF-10, RF-13,
  RF-20, RF-22 a RF-24 · Hecho: tests de unidad en verde.
- [x] **T3 — Subida de capas** (`layer-images.ts`, `POST /api/admin/layer-uploads`) · RF-19 a RF-21, RF-23.
- [x] **T4 — Guardar, quitar y conflicto** (`card-layers.ts`, `/api/admin/cards/[id]/layers`) · RF-2, RF-12 a RF-14,
  RF-17, RF-18 · Hecho: tests de integración en verde.
- [x] **T5 — Editor con vista previa** (`LayersEditor`, `CardWorkspace`) · RF-3, RF-5 a RF-11 · Hecho: E2E
  `card-layers.spec.ts` en verde en escritorio (23 oct 2026).

## Entrega 2 — Lo que falta de la spec
- [ ] **T6 — Etiquetas de subir y bajar capa** (estaban intercambiadas) · RF-6 · Hecho cuando: un test comprueba que
  la flecha arriba se llama «subir».
- [ ] **T7 — Acceso** · RF-1, RF-4 · Hecho cuando: tests de que un no administrador recibe 404 en las rutas de capas
  y de que ninguna consulta del coleccionista devuelve `layers`.
- [ ] **T8 — Cambio de rareza** (`updateCard` y `bulkUpdateCards`) · RF-25 · Hecho cuando: test de integración:
  marco y sello de texto del escalón nuevo, partículas intactas, sello de imagen intacto con aviso.
- [ ] **T9 — Número, nombre y colecciones publicadas** · RF-15, RF-16 · Hecho cuando: tests de integración.
- [ ] **T10 — Limpieza del área temporal** (`purgeTempLayers` en el planificador) · RNF · Hecho cuando: test de que
  borra lo de más de 24 h y deja lo reciente.
- [ ] **T11 — Sin texto encima y cambio de rareza en el E2E** · RF-11, RF-25 · Hecho cuando: pasos nuevos en
  `card-layers.spec.ts` en verde.
- [ ] **T12 — Carta por capas en Pencil** y fila de `docs/DESIGN.md` · RNF · Hecho cuando: el componente está en la
  lámina del sistema de diseño.

## Entrega 3 — Cierre
- [ ] **T13 — Reglas de negocio, presupuesto y validación** · Todos · Hecho cuando: reglas nuevas en
  `docs/reglas-de-negocio.md` (adaptadas de las RN-190 a RN-198 de Bruno que tocan el editor), `pnpm budget` sin
  cambios en el coleccionista, `validation.md` 25 de 25 y demo manual del dueño.

## Cobertura
RF-1 T7 · RF-2 T4 · RF-3 T5 · RF-4 T7 · RF-5 T5 · RF-6 T5, T6 · RF-7 T2 · RF-8 T5 · RF-9 T2 · RF-10 T2 · RF-11 T11 ·
RF-12 T1, T4 · RF-13 T2, T4 · RF-14 T4 · RF-15 T9 · RF-16 T9 · RF-17 T4 · RF-18 T4 · RF-19 T3 · RF-20 T2, T3 ·
RF-21 T3 · RF-22 T2 · RF-23 T3 · RF-24 T2 · RF-25 T8, T11.
