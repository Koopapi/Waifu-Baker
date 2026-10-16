# Tareas 001 — Cuentas y vínculo con Patreon

## Entrega 1 — Reglas puras y datos
- [x] **T1 — Membresía y ciclo** · RF-9 a RF-14, RF-18 · Hecho cuando: pasan los tests de `membership`.
- [x] **T2 — Firma de avisos y ciclo de vida de la cuenta** · RF-16, RF-22 a RF-25 · Hecho cuando: pasan sus tests.
- [x] **T3 — Migración `0004`** · Infraestructura · Hecho cuando: existe en dev y en tests.

## Entrega 2 — Servicios
- [x] **T4 — Cliente de Patreon (real y falso)** · RF-1, RF-3, RF-15, RF-17 · Hecho cuando: los tests del adaptador pasan con respuestas grabadas.
- [x] **T5 — Estado y concesiones** · RF-1 a RF-4, RF-9 a RF-14 · Hecho cuando: pasan los tests de integración de concesión y reembolso.
- [x] **T6 — Bienvenida** · RF-5 a RF-8 · Hecho cuando: un sobre una sola vez, también tras borrado definitivo.
- [x] **T7 — Cuenta: edad, resumen, desactivar, reactivar, purgar** · RF-18 a RF-25 · Hecho cuando: pasan sus tests.
- [x] **T8 — Avisos y revisión periódica** · RF-15 a RF-17 · Hecho cuando: un aviso firmado aplica el estado y uno sin firma no.

## Entrega 3 — Interfaz
- [x] **T9 — Login: sincronizar y reactivar** · RF-1, RF-4, RF-6, RF-23 · Hecho cuando: entrar concede la bienvenida.
- [x] **T10 — «Mi cuenta»** · RF-18, RF-21, RF-22 · Hecho cuando: se declara la edad y se desactiva la cuenta.
- [x] **T11 — Panel: bienvenida y ficha de usuario** · RF-5, RF-26 · Hecho cuando: se marca la bienvenida y se ve el historial.

## Entrega 4 — Cierre
- [x] **T12 — E2E** · Todos · Hecho cuando: pasa en los cuatro proyectos.
- [x] **T13 — Validación RF por RF** · Todos · Hecho cuando: `validation.md` da 26 de 26 y `docs/reglas-de-negocio.md` pasa las reglas de la 001 a «Vigente».

## Notas de implementación
- La revisión manual es un botón en el panel de tiers («Revisar ahora»), no un script.
- Los avisos se procesan en línea; la cola con Redis/BullMQ queda para el despliegue (spec 007).
- En local y en E2E, Patreon se simula con el cliente falso y la ruta `/api/dev/patreon-member`
  (solo con el login de desarrollo); los avisos del E2E van firmados como los de Patreon.
- Para recibir avisos reales hace falta una dirección pública y `PATREON_WEBHOOK_SECRET`.
