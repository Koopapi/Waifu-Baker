# Tareas — Spec 003

Tareas de 20 a 30 minutos, en orden de dependencia. Tests antes que el código. Comandos desde
`apps/web`.

## Entrega 1 — Base

- [x] **T1 — Vitest y primer test de dominio**
  - RF: Infraestructura
  - Depende de: —
  - Hecho cuando: `pnpm test` ejecuta `domain/catalog/upload-rules.test.ts` (RF-12) en verde.
- [x] **T2 — Drizzle, conexión y BD de pruebas**
  - RF: Infraestructura
  - Depende de: T1
  - Hecho cuando: un test de integración aplica migraciones en `waifu_baker_test`, abre una transacción y la revierte.
- [x] **T3 — Esquema del catálogo y migración**
  - RF: Infraestructura
  - Depende de: T2
  - Hecho cuando: la migración crea `users`, `characters`, `sets`, `cards`, `drop_tables`, `tier_rules`, `packs` y `audit_log`, y un test inserta y lee una carta.
- [x] **T4 — Auth.js con Patreon y login de desarrollo**
  - RF: RF-1
  - Depende de: T3
  - Hecho cuando: `test_rf1_*` comprueba que el login de desarrollo solo existe con `DEV_LOGIN=1` fuera de producción y que el rol admin se asigna por lista.
- [x] **T5 — Guardia del panel e historial de intentos**
  - RF: RF-1, RF-2
  - Depende de: T4
  - Hecho cuando: `test_rf2_*` comprueba 404 y registro para no administradores, y `/admin` muestra el layout a un administrador.

## Entrega 2 — Colecciones, personajes e historial

- [x] **T6 — Reglas de estado y edición** · RF-5, RF-8, RF-9 · Depende de: T1 · Hecho cuando: pasan `test_rf5_*`, `test_rf8_*`, `test_rf9_*` sobre `collection-rules`.
- [x] **T7 — Servicio de historial** · RF-3 · Depende de: T3 · Hecho cuando: `test_rf3_*` registra autor, entidad, antes y después.
- [x] **T8 — Crear, listar y editar colecciones** · RF-4 · Depende de: T5, T6, T7 · Hecho cuando: `test_rf4_*` pasa y la página `/admin/sets` crea una colección en borrador.
- [x] **T9 — Personajes** · RF-10 · Depende de: T7 · Hecho cuando: `test_rf10_*` pasa, incluido el bloqueo de borrado con cartas.

## Entrega 3 — Subida, composición y cuadrícula

- [x] **T10 — Puerto de almacenamiento y adaptador local** · RF-11 · Depende de: T3 · Hecho cuando: un test guarda, lee y borra un archivo fuera de `public/`.
- [x] **T11 — Composición con marco provisional** · RF-16 · Depende de: T10 · Hecho cuando: `test_rf16_*` genera los 4 tamaños y el blurhash de una imagen de prueba.
- [x] **T12 — Subida: validación, duplicados y carta en borrador** · RF-11, RF-12, RF-13 · Depende de: T10, T11 · Hecho cuando: pasan `test_rf11_*`, `test_rf12_*`, `test_rf13_*` contra la ruta de subida.
- [x] **T13 — Zona de arrastre con progreso por archivo** · RF-11 · Depende de: T12 · Hecho cuando: subir 10 imágenes en la página de la colección muestra progreso y resultado de cada una.
- [x] **T14 — Cuadrícula y edición en lote** · RF-14 · Depende de: T12, T9 · Hecho cuando: `test_rf14_*` pasa y en la UI se asigna personaje y rareza a varias cartas a la vez.
- [x] **T15 — Numeración y reordenación** · RF-15 · Depende de: T14 · Hecho cuando: `test_rf15_*` pasa y se reordena arrastrando.
- [x] **T16 — Regeneración y concurrencia** · RF-16 · Depende de: T14 · Hecho cuando: cambiar rareza regenera la compuesta y editar con versión vieja devuelve el aviso.
- [x] **T17 — Recuento por rareza y huecos** · RF-17 · Depende de: T14 · Hecho cuando: `test_rf17_*` pasa y la página muestra los avisos.

## Entrega 4 — 18+, probabilidades y publicación

- [x] **T18 — Revisión 18+** · RF-18, RF-19 · Depende de: T16 · Hecho cuando: pasan `test_rf18_*` y `test_rf19_*`, incluido el arte pendiente en colección publicada.
- [x] **T19 — Cálculo de probabilidades** · RF-20 · Depende de: T1 · Hecho cuando: `test_rf20_*` comprueba porcentajes por rareza, ranura y carta.
- [x] **T20 — Editor de probabilidades** · RF-20 · Depende de: T19, T8 · Hecho cuando: guardar pesos actualiza los porcentajes mostrados.
- [x] **T21 — Comprobaciones y publicación** · RF-6, RF-7, RF-21 · Depende de: T17, T18, T20 · Hecho cuando: pasan `test_rf6_*`, `test_rf7_*`, `test_rf21_*`.
- [x] **T22 — Bloqueo en servidor y archivo** · RF-8, RF-9 · Depende de: T21 · Hecho cuando: los servicios rechazan cambios bloqueados y archivar conserva sobres.

## Entrega 5 — Vista previa

- [x] **T23 — Vista previa de carta con holo** · RF-22 · Depende de: T16 · Hecho cuando: la ficha de carta muestra `Card3D` con la imagen compuesta.
- [x] **T24 — Simulación de sobre** · RF-23 · Depende de: T20, T23 · Hecho cuando: `test_rf23_*` comprueba que no se escribe nada y la UI abre un sobre con cartas reales.

## Entrega 6 — Tiers y usuarios

- [x] **T25 — Reglas de tiers** · RF-24 · Depende de: T21 · Hecho cuando: `test_rf24_*` pasa con un cliente de Patreon falso.
- [x] **T26 — Búsqueda y ficha de usuario** · RF-27 · Depende de: T5 · Hecho cuando: `test_rf27_*` pasa.
- [x] **T27 — Regalo de sobres** · RF-25, RF-26 · Depende de: T26, T21 · Hecho cuando: pasan `test_rf25_*` y `test_rf26_*`.

## Entrega 7 — Cierre

- [x] **T28 — E2E del flujo completo** · Todos · Depende de: T1 a T27 · Hecho cuando: el test de Playwright de los criterios de finalización pasa.
- [x] **T29 — Validación RF por RF** · Todos · Depende de: T28 · Hecho cuando: la tabla de cobertura tiene un test en verde por RF.

## Cobertura

| RF | Tareas |
|---|---|
| RF-1 | T4, T5 |
| RF-2 | T5 |
| RF-3 | T7 |
| RF-4 | T8 |
| RF-5 | T6 |
| RF-6, RF-7 | T21 |
| RF-8 | T6, T22 |
| RF-9 | T6, T22 |
| RF-10 | T9 |
| RF-11 | T10, T12, T13 |
| RF-12, RF-13 | T12 |
| RF-14 | T14 |
| RF-15 | T15 |
| RF-16 | T11, T16 |
| RF-17 | T17 |
| RF-18, RF-19 | T18 |
| RF-20 | T19, T20 |
| RF-21 | T21 |
| RF-22 | T23 |
| RF-23 | T24 |
| RF-24 | T25 |
| RF-25, RF-26 | T27 |
| RF-27 | T26 |
