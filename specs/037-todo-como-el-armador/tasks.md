# Tareas — Spec 037

Tareas de 20 a 30 minutos, en orden de dependencia. Tests antes que el código.

## Entrega 1 — Imágenes holo y regeneración

- [x] **T1 — Migración y versión de imagen**
  - RF: 11, 17, 18
  - Depende de: —
  - Hecho cuando: la migración `flat_holo` añade `key_holo_*`, `flat_version` y `flat_error`; `FLAT_VERSION = 2`.
- [x] **T2 — Dibujo y guardado de la imagen holo**
  - RF: 11, 15, 20
  - Depende de: T1
  - Hecho cuando: `test_s037_rf11_*` (guardar una carta deja tres claves holo) y `test_s037_rf15_*` (holo guardado reutiliza
    las claves) pasan; una carta sin capas queda sin claves holo.
- [x] **T3 — Lo pendiente de revisión 18+ con holo**
  - RF: 11
  - Depende de: T2
  - Hecho cuando: al aprobar lo pendiente, la carta tiene sus claves holo (test de integración).
- [x] **T4 — Regeneración al desplegar**
  - RF: 17, 18
  - Depende de: T2
  - Hecho cuando: `test_s037_rf17_*` y `test_s037_rf18_*` pasan (versión al día; carta que falla con `flat_error` y su
    imagen anterior); el servidor la arranca salvo con `FLAT_REGEN=0`.
- [x] **T5 — Reintentar desde el panel**
  - RF: 18
  - Depende de: T4
  - Hecho cuando: el set del panel lista las cartas con fallo y su motivo; «Regenerar imágenes» las reintenta sin cortar
    la colección.

## Entrega 2 — Las cuadrículas piden la imagen que toca

- [x] **T6 — Tamaños holo en la ruta de imagen**
  - RF: 12, 14, 19
  - Depende de: T2
  - Hecho cuando: `thumb-holo`/`mid-holo` firman y sirven la holo, o la normal si no hay (tests).
- [x] **T7 — `flatImageFor` y las páginas**
  - RF: 7, 8, 9, 12, 13, 14, 19, 20
  - Depende de: T6
  - Hecho cuando: colección, set, personaje, álbum, Expediciones, apertura y «Abrir todos» piden la imagen holo de las
    copias holo y quitan el acabado CSS cuando hay imagen holo.
- [x] **T8 — Álbum público e imagen para compartir**
  - RF: 8, 16
  - Depende de: T2
  - Hecho cuando: `test_s037_rf16_*` pasa (clave holo pública si el dueño tiene la holo; nunca 18+).

## Entrega 3 — El sobre del armador en todas las vistas

- [x] **T9 — La llegada lleva su tipo de sobre**
  - RF: 2, 5
  - Depende de: —
  - Hecho cuando: `test_s037_rf5_*` pasa (`groupArrivals` con tipo).
- [x] **T10 — Recompensas, llegadas y Expediciones con `PackThumb`**
  - RF: 1, 2, 3, 5
  - Depende de: T9
  - Hecho cuando: las tres celebraciones muestran la miniatura del sobre (E2E).
- [x] **T11 — Ajustes del sobre en el panel y retirada de `PackArt`**
  - RF: 4, 6
  - Depende de: T10
  - Hecho cuando: los ajustes muestran plata y gold; `PackArt` y `pack-art.css` borrados; el barrido no encuentra
    `.pack-art`.

## Entrega 4 — Apertura sin letreros de rareza

- [x] **T12 — Quitar insignias de rareza de la carta revelada y del resumen**
  - RF: 21, 22, 23, 24, 25
  - Depende de: —
  - Hecho cuando: el E2E de apertura comprueba que no hay insignia, que la rareza está en el nombre accesible y que una
    carta sin capas la conserva.
- [x] **T13 — Validación**
  - RF: todos
  - Depende de: T1–T12
  - Hecho cuando: `rf-coverage` sin RF descubiertos, `pnpm test` en verde y E2E de escritorio y afectadas en verde.

## Cobertura

| RF | Tareas |
|---|---|
| 1, 3 | T10 |
| 2, 5 | T9, T10 |
| 4, 6 | T11 |
| 7, 9, 10 | T7 |
| 8 | T7, T8 |
| 11 | T2, T3 |
| 12, 13, 14 | T6, T7 |
| 15 | T2 |
| 16 | T8 |
| 17 | T4 |
| 18 | T4, T5 |
| 19 | T6, T7 |
| 20 | T2, T7 |
| 21–25 | T12 |
