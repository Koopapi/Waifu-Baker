# Tareas 007 — Operación y cumplimiento (parte para la beta)

## Entrega 1 — Edad y legales
- [x] **T1 — Migración `0006` y reglas de aceptación** · RF-1 a RF-3 · Hecho cuando: pasan sus tests.
- [x] **T2 — Página de bienvenida y bloqueo** · RF-1 a RF-3 · Hecho cuando: un usuario nuevo no ve sus sobres sin aceptar.
- [x] **T3 — Páginas legales y pie** · RF-4 a RF-8 · Hecho cuando: se leen sin sesión en los dos idiomas.

## Entrega 2 — Operación
- [x] **T4 — Sentry sin datos personales** · RF-9, RF-10 · Hecho cuando: pasa el test de limpieza y sin DSN no se envía nada.
- [x] **T5 — Métricas** · RF-11, RF-12 · Hecho cuando: el panel muestra los 30 días.
- [x] **T6 — Copias, rotación y restauración** · RF-13 a RF-17 · Hecho cuando: una copia se restaura y verifica.

## Entrega 3 — Cierre
- [x] **T7 — Integración continua** · RF-18 · Hecho cuando: el flujo de GitHub pasa en verde.
- [x] **T8 — E2E** · Todos · Hecho cuando: pasa en los cuatro proyectos.
- [x] **T9 — Validación RF por RF** · Todos · Hecho cuando: `validation.md` da 18 de 18 y las reglas de negocio están al día.

## Notas de implementación
- Los álbumes públicos activos se muestran como total actual (no hay histórico de altas y bajas por día).
- `PATREON_RECONCILE` pasa a llamarse `SCHEDULER` (se sigue aceptando el nombre antiguo).
- La clave de las copias está en `.env.local`: hay que guardarla también fuera del Mac, o las copias no sirven.
