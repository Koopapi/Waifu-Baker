# Tareas — Spec 027

- [x] T0 Spec aprobada por el dueño (3 nov 2026: 10 versiones, borrador de 5 días).
- [ ] T0b Maqueta HTML de la ventana (estado, pregunta al cerrar, aviso de borrador, lista de versiones) y aprobación
  del dueño.
- [ ] T1 Dominio y datos: `domain/cards/versions.ts`, `domain/cards/draft.ts`, migración `0020_versiones_de_carta.sql`
  con la siembra de la versión 1, `TEMP_LAYER_TTL_MS` a 5 días. RF-15, RF-18, RF-21, RF-25. Tests de unidad e
  integración.
- [ ] T2 Servicio `saveCard` en una transacción (ficha + capas + imagen fija + versión + auditoría); `updateCard` y
  `saveCardLayers` como envoltorios; `releaseLayerImages` y `deleteCard` con las versiones. RF-1, RF-2, RF-17, RF-22,
  RF-23, RF-24. Tests de integración.
- [ ] T3 Rutas: `PUT /api/admin/cards/[id]`, `GET …/versions`, `GET …/versions/[n]`, `POST …/layers/present`;
  `listVersions` y `getVersion`. RF-16, RF-19, RF-20. Tests de integración.
- [ ] T4 Sistema de diseño: `SaveStatus`, `confirm()` con opción secundaria (`useChoice`), `Modal` con `preventClose`;
  catálogo `/sistema` y `docs/DESIGN.md`. RF-4, RF-6, RF-7. Tests de componentes.
- [ ] T5 `useCardDraft`: estado único de la ventana, borrador en el navegador con retraso, `beforeunload`, caducidad,
  `no-storage`. RF-5, RF-9, RF-10, RF-13. Tests de unidad.
- [ ] T6 Ventana de la carta: ficha controlada, un solo «Guardar», estado visible, cierre con pregunta, descartar;
  `LayersEditor` controlado por props. RF-1, RF-3, RF-5 a RF-8. Tests existentes del editor en verde.
- [ ] T7 Aviso de borrador al abrir (recuperar / descartar, aviso de carta cambiada, capas sin imagen). RF-11, RF-12,
  RF-14, RF-16.
- [ ] T8 `VersionsPanel`: lista plegable con carta mini viva y «Volver a esta versión» (`restoredFrom`). RF-19 a RF-21.
- [ ] T9 Diccionarios en inglés y español, revisión en los dos temas y en teléfono (390 px).
- [ ] T10 E2E `card-save.spec.ts` en 4 proyectos, suite completa, `validation.md`, documentación del panel,
  `docs/roadmap.md`.
- [ ] T11 Demo del dueño en `pruebas` (reproducir el caso «editar capas y guardar la ficha»).
