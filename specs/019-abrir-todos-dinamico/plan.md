# Plan 019 — «Abrir todos» dinámico

Respeta `docs/constitution.md` y `docs/reglas-de-negocio.md`. Parte de la spec 018 (carta viva, imágenes fijas, enlaces
firmados de capas). Maquetas aprobadas: hoja «"Abrir todos" dinámico (spec 019)» de `waifubaker.pen`.

## 1. Datos
- `openAllPacksAction` ya abre los sobres en el servidor y devuelve cada carta (rareza, holo, nueva, copias). Se le
  añade el número de sobre de cada carta (para la ráfaga) y, solo para las destacadas del foco (como mucho 10), su
  carta viva (`liveCardConfig`, spec 018). Sin cambios en el sorteo ni en la base de datos.

## 2. Dominio puro (`domain/opening/open-all.ts`)
| Función | Qué hace | RF |
|---|---|---|
| `burstPlan(packs)` | Intervalo entre sobres para que la ráfaga no pase de 6 s (pausado con pocos, acelerado con muchos) | RF-2 |
| `throttleSounds(times, 120)` | Qué rasgados suenan sin pasar de uno cada 120 ms | RF-3 |
| `highlights(cards)` | Destacadas: épica+ siempre, rara si es nueva; de mayor a menor rareza (nuevas y holo primero); como mucho 10 | RF-4, RF-5, RF-8 |
| `groupByRarity(cards)` | Grupos de la más rara a la más común con su cuenta; cada versión (número + holo) una vez con sus copias | RF-10 a RF-12 |

## 3. Interfaz (`features/packs/open-all/`)
- `OpenAllView` con fases `idle → burst → focus → summary`; «Saltar» en ráfaga y foco (RF-9).
- `OpenAllBurst`: los sobres (`PackArt`) se rasgan con GSAP (`transform`/`opacity`) y las cartas caen como imágenes
  fijas; sonido `tear` con el limitador (RF-1 a RF-3).
- `OpenAllFocus`: la destacada en grande como `CartaCapas` viva con `entrance`, sonido, vibración y celebración de su
  rareza (reutiliza `domain/opening/feedback` y `Celebration`/`Confetti` de `ui/game`); «Siguiente» o tocar la carta
  (RF-4, RF-6, RF-7).
- `OpenAllSummary`: totales y grupos por rareza con `×N`, «¡Nueva!» y acabado holo (RF-10 a RF-13).
- Movimiento reducido: sin ráfaga y foco con imagen fija (RF-14).
- Textos nuevos en `packs` (inglés y español). `carta-capas.js` y GSAP se cargan con `import()` (peso).

## 4. Pruebas
- Unidad: `burstPlan`, `throttleSounds`, `highlights`, `groupByRarity`.
- E2E en 4 proyectos: 2 sobres y 50 sobres (la ráfaga termina en ≤ 6,5 s medidos), foco con tope de 10 y sin
  destacadas, «Saltar», resumen agrupado con copias y totales, movimiento reducido; `pnpm budget`; checklist en teléfono.
