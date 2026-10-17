# Tareas 013 — Rendimiento y sonido de la apertura

## Entrega 1 — Peso
- [x] **T1 — Medida del peso por página** · RF-11, RF-12 · Hecho cuando: pasan los tests de `bundle-budget` y el script lista las 14 páginas.
- [x] **T2 — Comprobación en la CI** · RF-12 · Depende de: T1 · Hecho cuando: la CI tiene el paso «Peso de las páginas».
- [x] **T3 — Recortes: Sentry diferido y escena con carga dinámica** · RF-11, RF-13 · Depende de: T1 · Hecho cuando: las 14 páginas ≤ 250 kB y los E2E de apertura siguen en verde.

## Entrega 2 — Sonido y vibración
- [x] **T4 — Sonidos CC0 y licencias** · RF-1 · Hecho cuando: 6 MP3 ≤ 200 kB con `LICENSES.md` y su test.
- [x] **T5 — Reglas de sonido y vibración** · RF-3 a RF-5, RF-9 · Hecho cuando: pasan los tests de `feedback`.
- [x] **T6 — Motor de sonido con silencio** · RF-2, RF-6 a RF-8, RF-10 · Depende de: T5 · Hecho cuando: pasan sus tests con `howler` falso.
- [x] **T7 — Botón de silencio en el sistema de diseño (y Pencil)** · RF-7 · Hecho cuando: está en `/sistema`, en Pencil y en `DESIGN.md`.
- [x] **T8 — Conexión con la apertura y «Abrir todos»** · RF-2 a RF-5, RF-7, RF-9 · Depende de: T4 a T7.

## Entrega 3 — Cierre
- [x] **T9 — E2E** · Todos · Hecho cuando: pasa en los cuatro proyectos.
- [x] **T10 — Solo `transform` y `opacity` y lista para el teléfono** · RF-14 · Hecho cuando: pasa su test y el usuario firma `dispositivo.md` (firmada el 16 oct 2026; giroscopio, vibración en Android y carga en 4G se comprueban en la web publicada).
- [x] **T11 — Validación RF por RF y reglas de negocio** · Todos · Hecho cuando: `validation.md` da 14 de 14.

## Cobertura
RF-1 T4 · RF-2 T6, T8 · RF-3 a RF-5 T5, T8 · RF-6 T6 · RF-7 T6 a T8 · RF-8 T6 · RF-9 T5, T8 · RF-10 T6 ·
RF-11 T1, T3 · RF-12 T1, T2 · RF-13 T3 · RF-14 T10.
