# Tareas 017 — Armado de cartas por capas

## Entrega 1 — Maquetas (aprobación del dueño)
- [x] **T1 — Maquetas en Pencil**: editor con encuadre (arrastrar, escala, giro, restablecer), selector de fondo
  (biblioteca o propio), biblioteca de fondos de la colección, aviso de imagen sin recortar y publicación bloqueada con
  la lista de cartas sin armar · RF-3, RF-6 a RF-11, RF-15 · Hecho: aprobadas por el dueño el 23 oct 2026 (hoja
  «Armado de cartas por capas (spec 017)» de `waifubaker.pen`).

## Entrega 2 — Base
- [x] **T2 — Dominio**: `rol`, `encuadre`, `estiloAuto`, `isAssembled`, no quitar el personaje · RF-5, RF-10, RF-11,
  RF-15 · Hecho: tests de unidad en verde; el servicio de guardado rechaza quitar u ocultar a la chica y
  dos personajes (tests de integración).
- [x] **T3 — Encuadre en `carta-capas.js`** (en la imagen, con `ajuste`) y tipos · RF-12 · Hecho cuando: test de que el
  HTML lleva el `transform` en la imagen y la capa conserva el parallax; configuraciones antiguas sin cambios.
- [x] **T4 — Imagen de la chica**: validación y detección de «sin recortar» · RF-2, RF-3.
- [x] **T5 — Estilo automático** en `retierLayers` · RF-13, RF-14.

## Entrega 3 — Crear y armar
- [x] **T6 — Crear carta desde la chica** (subida del panel) y sustituirla conservando el encuadre · RF-1, RF-4 ·
  Depende de T2 y T4.
- [x] **T7 — Biblioteca de fondos**: migración `0012`, servicio, API y sección en la colección · RF-6, RF-7, RF-9.
- [x] **T8 — Editor**: elegir fondo, encuadre (arrastrar, numérico, teclado, restablecer), no quitar el personaje,
  estilo automático al tocar marco/partículas/sello · RF-5, RF-8, RF-10, RF-11, RF-14 · Depende de T3 y T7. Incluye
  adaptar `e2e/card-layers.spec.ts` (la carta ya nace con la chica como capa).
- [x] **T9 — Crear desde capas** · Se junta con la T11: ningún RF pide otra forma de crear cartas (la RF-1 las crea
  desde la chica) y la importación (RF-18) pone todas las capas de una vez.

## Entrega 4 — Publicar, importar y demo
- [x] **T10 — Publicar solo con cartas armadas** · RF-15, RF-16 · Hecho: comprobación al publicar con enlace a
  cada carta, aviso en la página de la colección y colecciones de prueba armadas con un fondo de su biblioteca.
- [x] **T11 — Exportar e importar** el formato del creador · RF-17 a RF-19.
- [x] **T12 — Demo y colecciones de prueba armadas** · RF-20.

## Entrega 5 — Cierre
- [ ] **T13 — E2E del panel, presupuesto, reglas de negocio, `DESIGN.md` y validación** (hecho todo menos la demo
  manual del dueño) · Todos · Hecho cuando:
  `validation.md` 20 de 20, `pnpm budget` sin cambios en el coleccionista y demo manual del dueño.

## Entrega 6 — Ampliación: biblioteca general de elementos
- [x] **T14 — Maquetas en Pencil** de la página «Biblioteca» y del editor con la biblioteca · RF-6, RF-8, RF-9, RF-21 ·
  Hecho: aprobadas por el dueño el 23 oct 2026.
- [ ] **T15 — Dominio, migración `0013` y servicio** de la biblioteca · RF-6, RF-7, RF-9, RF-21 · Hecho cuando: tests de
  unidad e integración en verde (subir por tipo, duplicados, uso por cartas y colecciones, quitar, renombrar, partículas
  copiadas, guardar desde una carta, la carta acepta claves de la biblioteca y no las borra).
- [ ] **T16 — Página «Biblioteca»** (ruta de subida, acciones, menú) y la colección sin su sección de fondos · RF-6, RF-9.
- [ ] **T17 — Editor**: fondo y sello de la biblioteca, ventana «Añadir de la biblioteca», «Guardar en la biblioteca» ·
  RF-8, RF-21.
- [ ] **T18 — Siembra, E2E, reglas de negocio, `DESIGN.md`, peso y validación** · Todos · Hecho cuando: `validation.md`
  21 de 21 y demo manual del dueño.

## Cobertura
RF-1 T6 · RF-2 T4 · RF-3 T4 · RF-4 T6 · RF-5 T2, T8 · RF-6 T7, T15, T16 · RF-7 T7, T15 · RF-8 T8, T17 · RF-9 T7, T15, T16 · RF-10 T2, T8 ·
RF-11 T2, T8 · RF-12 T3 · RF-13 T5 · RF-14 T5, T8 · RF-15 T2, T10 · RF-16 T10 · RF-17 T11 · RF-18 T11 ·
RF-19 T11 · RF-20 T12, T18 · RF-21 T15, T17.
