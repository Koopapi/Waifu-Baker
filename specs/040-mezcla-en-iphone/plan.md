# Plan 040 — Capas con mezcla en iPhone

Plan técnico de `spec.md`. Respeta `docs/constitution.md` y `docs/architecture.md`.

## 1. Causa

Cada capa (`.cc-capa`) tiene su propia capa de composición (`will-change: transform` y `translate3d` del parallax). En
Safari de iPhone, una capa con `mix-blend-mode` mezcla mal con sus hermanas compuestas: las de debajo, salvo la primera,
dejan de pintarse. Si el contenedor de las capas es un grupo aislado (`isolation: isolate`), Safari arma la mezcla
dentro del grupo y pinta todas. Lo confirmó el dueño en su iPhone 15 Pro con una página de prueba: la carta sola y
dentro de una réplica de `Card3D` (variantes B y G). Quitar solo `will-change` no basta (variante E).

## 2. Módulos

| Módulo | Cambio | RF |
|---|---|---|
| `ui/game/carta-capas/carta-capas.js` | `.cc-art` con `isolation: isolate`; versión del CSS inyectado `4m` → `4n` | 1, 3, 4, 5 |
| `ui/game/sobre-capas/sobre-capas.js` | `.sc-pila` con `isolation: isolate` (cambio marcado «spec 040»); versión del CSS `2m` → `2n` | 2, 4, 5 |

Las dos librerías son el motor común: todas las vistas montan la carta con `CartaCapas` y el sobre con `SobreCapas`, así
que el arreglo llega a todas sin tocarlas (RF-3). No cambian los datos guardados (RF-5).

## 3. Por qué la computadora se ve igual (RF-4)

`.cc-art` y `.sc-pila` ya tienen fondo opaco y recortan (`overflow: hidden`): lo que hay detrás del grupo nunca se veía
a través de las capas. Aislar el grupo solo cambia con qué se mezcla una capa, que ya era el contenido del grupo.

## 4. Modelo de datos y API

Sin cambios ni migración.

## 5. Dependencias

Ninguna.

## 6. Estrategia de tests

- **Unit**: el CSS de `carta-capas.js` aísla `.cc-art` y el de `sobre-capas.js` aísla `.sc-pila`, con la versión del
  CSS nueva para que reemplace al ya inyectado.
- **E2E** (`e2e/mezcla-en-iphone.spec.ts`):
  - una carta con una capa en «aclarar» se pinta igual con el grupo aislado que sin él (RF-4), en los tres motores;
  - el arte está aislado en el armador, el simulador, la apertura del coleccionista, el sobre de la apertura, la ficha,
    «Abrir todos» y el diseñador de sobres (RF-1, RF-2, RF-3).
- **Manual**: el dueño revisa en su iPhone, ya desplegado, Hanako en el armador, el simulador y la apertura, y un sobre
  con una capa con mezcla. El iPhone simulado no reproduce la falla.

## 7. Entregas

1. Motor común (las dos librerías) con sus pruebas.
2. E2E, validación y revisión en el iPhone del dueño.
