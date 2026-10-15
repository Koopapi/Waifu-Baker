# Tareas — Spec 004

Tests antes que el código. Comandos desde `apps/web`.

## Entrega 1 — Dominio
- [x] **T1 — Contador y activación de la protección** · RF-13, RF-14 · Hecho cuando: pasan `test_rf13_*` y `test_rf14_*` de `pity.test.ts`.
- [x] **T2 — Sorteo con protección** · RF-5, RF-13 · Depende de: T1 · Hecho cuando: con semilla fija, la protección garantiza épica o superior y sin ella el sorteo no cambia.
- [x] **T3 — RNG reproducible con semilla** · RF-9 · Hecho cuando: misma semilla → misma secuencia; semillas distintas → secuencias distintas.
- [x] **T4 — Límite por minuto** · RF-21 · Hecho cuando: pasa `test_rf21_*` con reloj falso.
- [x] **T5 — Enlaces firmados** · RF-20 · Hecho cuando: pasa `test_rf20_*` (válido, caducado, otro usuario, manipulado).

## Entrega 2 — Datos y apertura
- [x] **T6 — Migración 0002** · Infraestructura · Hecho cuando: existen `pity_threshold`, `user_cards.holo`, `pity_counters`, `pity_applied`.
- [x] **T7 — Abrir un sobre** · RF-5, RF-9, RF-10, RF-11 · Hecho cuando: pasan sus tests de integración, incluida la reproducción con la semilla guardada.
- [x] **T8 — Una sola vez y concurrencia** · RF-6 · Hecho cuando: dos aperturas en paralelo del mismo sobre dejan una sola apertura.
- [x] **T9 — Accesos denegados** · RF-3, RF-4, RF-7, RF-8 · Hecho cuando: pasan sus tests (otro usuario, anulado, 18+ sin verificar, Bélgica, colección archivada).
- [x] **T10 — Protección en la apertura** · RF-13, RF-14 · Hecho cuando: con N=3, el tercer sobre sin épica la trae y el contador se reinicia.
- [x] **T11 — Abrir todos** · RF-18, RF-19 · Hecho cuando: abre todos los sellados de la colección (máx. 50) con las mismas reglas.

## Entrega 3 — Panel y probabilidades públicas
- [x] **T12 — N de protección en el panel** · RF-12 · Hecho cuando: se guarda en borrador, se valida 0–100 y queda bloqueado al publicar.
- [x] **T13 — Regla publicada** · RF-15 · Hecho cuando: /drop-rates muestra la protección de cada colección.

## Entrega 4 — Experiencia
- [x] **T14 — «Mis sobres»** · RF-1, RF-2, RF-3 · Hecho cuando: lista por colección, redirige sin sesión y bloquea 18+ sin verificar.
- [x] **T15 — Apertura real con la escena del laboratorio** · RF-16, RF-11 · Hecho cuando: el usuario abre un sobre y ve sus cartas con «Nueva / Tienes N».
- [x] **T16 — Reanudar una apertura** · RF-17 · Hecho cuando: recargar a mitad vuelve a mostrar el mismo resultado.
- [x] **T17 — Abrir todos en la interfaz** · RF-18 · Hecho cuando: la cuadrícula muestra todas las cartas con nuevas y rarezas altas destacadas.
- [x] **T18 — Imágenes firmadas para el usuario** · RF-20 · Hecho cuando: la imagen carga con su enlace y falla caducada o con otra sesión.
- [x] **T19 — Límite en las acciones** · RF-21 · Hecho cuando: la acción responde con el aviso al pasar de 10 por minuto.

## Entrega 5 — Cierre
- [x] **T20 — E2E del flujo del coleccionista** · Todos · Hecho cuando: pasa en verde.
- [x] **T21 — Validación RF por RF** · Todos · Hecho cuando: `validation.md` da 21 de 21.

## Cobertura
| RF | Tareas |
|---|---|
| RF-1, RF-2 | T14 |
| RF-3, RF-4 | T9, T14 |
| RF-5 | T2, T7 |
| RF-6 | T8 |
| RF-7, RF-8 | T9 |
| RF-9 | T3, T7 |
| RF-10, RF-11 | T7, T15 |
| RF-12 | T12 |
| RF-13, RF-14 | T1, T2, T10 |
| RF-15 | T13 |
| RF-16 | T15 |
| RF-17 | T16 |
| RF-18, RF-19 | T11, T17 |
| RF-20 | T5, T18 |
| RF-21 | T4, T19 |
