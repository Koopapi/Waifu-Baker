# Plan 009 — Sobres gratis con espera y recompensa diaria

Respeta `docs/constitution.md` y `docs/reglas-de-negocio.md`. Reutiliza `packs` (con dos orígenes
nuevos), la apertura de la spec 004, el reloj inyectable y la i18n de la spec 008.

## 1. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `domain/rewards/free-packs.ts` | Cargas que se recargan cada 12 h hasta 2; gastar una | RF-1 a RF-3, RF-6 |
| `domain/rewards/daily.ts` | Día local por zona horaria, racha con un día de gracia, premio de cada día, cambio de zona | RF-9 a RF-14 |
| `server/clock.ts` | Hora actual con desfase ajustable solo en desarrollo y E2E | pruebas |
| `server/services/rewards.ts` | Estado, reclamar sobre gratis, reclamar diaria, galletas, ajustes del panel | RF-1 a RF-21 |
| `app/sobres` | Tarjetas de sobre gratis (cuenta atrás, elegir colección) y de racha | RF-4, RF-5, RF-15 |
| `app/cuenta` | Saldo e historial de galletas | RF-16 |
| Panel, ficha de usuario | Estado y ajuste de galletas con motivo | RF-20, RF-21 |

## 2. Modelo de datos (migración `0005`)

- `user_rewards (user_id pk → users, free_charges int default 1, free_anchor timestamptz, streak_day int default 0, last_daily_day text, last_daily_at timestamptz, last_time_zone text, cookies int default 0 check >= 0, updated_at)`.
  Se crea al primer acceso, así un usuario nuevo empieza con 1 carga (RF-3).
- `cookie_ledger (id bigserial, user_id, amount int, reason text, actor_user_id null, created_at)`: solo inserciones (RF-18).
- `pack_source` gana `free` y `daily`.

## 3. Decisiones

- **Cargas** (modelo de energía): se guardan `free_charges` y `free_anchor`. Al leer, se suman las
  cargas completas desde el ancla (máximo 2) y el ancla avanza lo consumido. Gastar desde el
  máximo reinicia el ancla en ese momento (RF-2). Todo en una transacción con `FOR UPDATE` (RF-6).
- **Día local**: el navegador manda su zona IANA (`Intl…timeZone`); el servidor la valida con `Intl`
  y calcula el día con ella; si es inválida, UTC. Para mostrar el estado se guarda en una cookie
  `wb_tz`. Diferencia de días entre el último reclamo y hoy: 0 → ya reclamado; 1 o 2 → la racha
  avanza (2 = el día de gracia); 3 o más → vuelve al día 1 (RF-12, RF-13). Tras el día 7, el
  siguiente es el 1 (RF-14).
- **Cambio de zona** (RF-11): si la zona del reclamo difiere de la del último y han pasado menos de
  20 h, se rechaza.
- **Premios**: `[10, 10, 15, 15, 20, 20, sobre]`. El día 7 exige elegir colección SFW publicada.
- **Galletas**: saldo en `user_rewards.cookies` y cada movimiento en `cookie_ledger`, en la misma
  transacción; la restricción `>= 0` impide saldos negativos (RF-19).
- **Sobres concedidos**: `grant_key = free:<userId>:<uuid>` / `daily:<userId>:<día>`; el de la diaria
  es único por día, así que un doble clic no duplica.
- **Reloj de pruebas**: `server/clock.ts` suma un desfase guardado en memoria; la ruta
  `/api/dev/clock` lo cambia solo con el login de desarrollo. El E2E lo reinicia en cada test.
- **Borrado definitivo** (spec 001): también borra `user_rewards` y `cookie_ledger`.

## 4. Pruebas

- Unit: recarga y tope de cargas, gastar desde el máximo, día local en varias zonas, racha con
  gracia y reinicio, premio del día 7, cambio de zona.
- Integración: reclamar con y sin cargas, concurrencia, colección no válida, diaria una vez al día,
  racha completa hasta el sobre, reinicio, galletas y ajustes, borrado.
- E2E: el criterio de finalización de la spec con el reloj de pruebas.
