# Waifu Baker TCG

Cartas coleccionables digitales de estilo anime con apertura de sobres interactiva y
colección persistente. Patreon cobra y verifica 18+; esta web abre los sobres.

- `docs/constitution.md` — principios innegociables (propuesta pendiente de aprobación).
- `docs/roadmap.md` — specs en orden y estrategia híbrida.
- `docs/architecture.md` — línea base técnica común a todos los planes.
- `specs/NNN-nombre/` — `spec.md` (EARS), `plan.md`, `tasks.md` por funcionalidad.
- `art/` — definiciones del set y pista de arte; el taller está en `ART_DIR`.
- `.claude/skills/spec-generator/` — entrevista y plantilla de specs.

Estado (15 oct 2026):

- **Spec 003 — Panel de administración: terminada.** 29 de 29 tareas, 27 de 27 RF cubiertos
  (`specs/003-panel-admin/validation.md`), 113 tests de Vitest y un E2E de punta a punta en verde.
- Marco de carta diseñado en Pencil (sin textos: marco por rareza, sello WB y número); ver `docs/DESIGN.md`.
- Prototipo de apertura en `/lab`; el panel la reutiliza para simular sobres con cartas reales.
- **Spec 004 — Sobres: concesión y apertura: terminada.** 21 de 21 RF (`specs/004-sobres-apertura/validation.md`).
  El coleccionista entra, ve «Mis sobres», los abre con la animación, recupera aperturas a medias y usa «Abrir todos».
- **Spec 006 — Colección y álbum público: terminada.** 17 de 17 RF (`specs/006-coleccion-album/validation.md`).
  «Mi colección» en `/coleccion`, ajustes del álbum en `/coleccion/album` y álbum público en `/album/<enlace>`.
- Siguiente: spec 001 (Patreon real) cuando la página esté aprobada, y spec 007 (operación y cumplimiento).
