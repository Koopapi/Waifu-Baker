# Tareas 015 — Premios con vida

## Entrega 1 — Maquetas (aprobación del usuario)
- [x] **T1 — Maquetas en Pencil**: celebración central (llegadas y racha completa), premio que vuela (galletas y sobre),
  pegatina estampada y latiendo, etiqueta «¡Nuevo!», error junto al botón con «Reintentar», botón de silencio en la
  cabecera; móvil y escritorio · RF-1 a RF-16 · Hecho cuando: el usuario las aprueba (aprobadas el 18 oct 2026; lámina «Premios (spec 015)»).

## Entrega 2 — Base
- [x] **T2 — Motor de sonido compartido**: mover el motor a `features/sound`, lista de sonidos en `domain/feedback`,
  carga perezosa al primer `play`, tres sonidos CC0 con su licencia · RF-12 · Hecho cuando: pasan los tests del motor
  y de los ficheros, y la apertura suena igual.
- [x] **T3 — Botón de silencio en la cabecera** · RF-14 · Depende de T2 · Hecho cuando: el botón de la cabecera y el
  de la apertura comparten estado (test).
- [x] **T4 — Vuelo de premios**: `domain/rewards/flight.ts`, `ui/game/flight.ts` y `FlightLayer`, destinos en el
  shell y `Badge` con marcador · RF-2, RF-3, RF-4 · Hecho cuando: pasan los tests del dominio y del motor (con
  `animate` falso y con movimiento reducido).
- [x] **T5 — Celebración**: `Confetti` a `ui/game`, `Celebration` sobre `Modal`, cola de celebraciones, fanfarria y
  vibración; en `/sistema` · RF-5, RF-6, RF-9, RF-12, RF-13 · Depende de T2 · Hecho cuando: pasan sus tests (diálogo
  accesible, confeti, una a la vez, sonido y vibración solo al abrirse).

## Entrega 3 — Recompensas
- [x] **T6 — Reclamar galletas**: la acción devuelve el premio; estampado, vuelo al contador, marcador, anuncio para
  lectores de pantalla; fuera el aviso emergente y el mensaje de la tarjeta; error junto al botón con «Reintentar»
  cuando procede · RF-1, RF-10, RF-15, RF-16 · Depende de T4 · Hecho cuando: pasan los tests del panel.
- [x] **T7 — Reclamar un sobre gratis**: vuelo hasta la navegación con rebote, carga que se apaga, anillo que empieza
  · RF-2 · Depende de T4 · Hecho cuando: pasa su test.
- [x] **T8 — Día 7**: estampado, celebración «¡Racha completa!» y vuelo al cerrarla · RF-5 · Depende de T5 y T6.
- [x] **T9 — Día de gracia**: `dailyAtRisk`, dato en el resumen, latido y texto · RF-11 · Hecho cuando: pasan los
  tests del dominio y de la fila.

## Entrega 4 — Llegadas
- [x] **T10 — Datos de llegadas**: migración `0010`, `domain/rewards/arrivals.ts` y `server/services/arrivals.ts` ·
  RF-6, RF-7, RF-8 · Hecho cuando: pasan los tests de dominio e integración.
- [x] **T11 — Celebración de llegadas al entrar**: en el shell, nunca en la apertura, una sola vez, marcada al
  mostrarse · RF-6, RF-7, RF-9 · Depende de T5 y T10.
- [x] **T12 — Etiqueta «¡Nuevo!» en «Mis sobres»** y marcar vistos al visitar · RF-8 · Depende de T10.

## Entrega 5 — Cierre
- [x] **T13 — El panel conserva sus avisos; textos, reglas de negocio y `DESIGN.md`** · RF-17 y todos · Hecho
  cuando: test de que el panel sigue usando avisos emergentes; `docs/reglas-de-negocio.md` y `docs/DESIGN.md` al día.
- [ ] **T14 — E2E `premios.spec.ts` en los cuatro proyectos y presupuesto** · Todos · Depende de T6 a T12.
- [ ] **T15 — Validación RF por RF y prueba del usuario en el teléfono** · Todos · Hecho cuando: `validation.md` da
  17 de 17 y el usuario aprueba la prueba.

## Cobertura
RF-1 T6 · RF-2 T4, T7 · RF-3 T4 · RF-4 T4 · RF-5 T5, T8 · RF-6 T5, T10, T11 · RF-7 T10, T11 · RF-8 T10, T12 ·
RF-9 T5, T11 · RF-10 T6 · RF-11 T9 · RF-12 T2, T5 · RF-13 T5 · RF-14 T3 · RF-15 T6 · RF-16 T6 · RF-17 T13.
