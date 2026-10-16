# Tareas 010 — Acabado premium (estilo Discord) y demo local

## Entrega 0 — Diseño
- [x] **T0 — Maquetas en Pencil** · RF-1 a RF-6, RF-13, RF-14 · Hecho cuando: el usuario elige paleta (B «Cereza»).

## Entrega 1 — Base visual
- [x] **T1 — Tokens de la paleta elegida** · RF-6, RF-11 · Hecho cuando: `globals.css` solo usa tokens y el contraste pasa en axe.
- [x] **T2 — Primitivas: botón, tarjeta, esqueleto** · RF-7, RF-9 · Hecho cuando: tienen estados hover/pulsado/foco.
- [x] **T3 — Avisos emergentes** · RF-8 · Hecho cuando: pasan los tests de la cola y se anuncian con `aria-live`.

## Entrega 2 — Estructura
- [x] **T4 — `AppShell`, barra de colecciones y panel** · RF-1 a RF-3 · Hecho cuando: las secciones cambian sin recargar.
- [x] **T5 — Cajón móvil con gesto y barra de pestañas** · RF-4, RF-16 · Hecho cuando: se abre con botón y con gesto en pixel-7 e iphone-14 y las pestañas navegan.
- [x] **T6 — Panel de administración con la misma estructura** · RF-5
- [x] **T7 — Pasar las pantallas al nuevo acabado** · RF-6 a RF-10 · Hecho cuando: el barrido `qa-sweep` sigue en verde.

## Entrega 3 — Edad mínima configurable
- [x] **T14 — Migración `0007` y reglas de edad** · RF-17, RF-18 · Hecho cuando: pasan los tests de `needsAcceptance` y del servicio de ajustes.
- [x] **T15 — Ajuste en el panel y textos con la edad vigente** · RF-17, RF-19 · Hecho cuando: cambiar a 18 vuelve a pedir la bienvenida.

## Entrega 4 — Demo
- [x] **T8 — `isDemoEnabled` y protección en producción** · RF-15 · Hecho cuando: pasan sus tests.
- [x] **T9 — Manifiesto y siembra de la demo** · RF-12 · Hecho cuando: pasa su test de integración (dos ejecuciones, mismo estado).
- [x] **T10 — `pnpm demo`** · RF-12 · Hecho cuando: recrea la BD y arranca en el puerto 3300.
- [x] **T11 — Portada, franja y cambio de papel** · RF-13, RF-14

## Entrega 5 — Cierre
- [x] **T12 — E2E de estructura y demo** · Todos · Hecho cuando: pasa en los cuatro proyectos.
- [x] **T13 — Validación RF por RF** · Todos · Hecho cuando: `validation.md` da 19 de 19.
