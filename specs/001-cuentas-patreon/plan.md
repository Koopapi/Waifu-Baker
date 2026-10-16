# Plan 001 — Cuentas y vínculo con Patreon

Respeta `docs/constitution.md`, `docs/architecture.md` (sección «Flujo Patreon») y
`docs/reglas-de-negocio.md`. Reutiliza `packs.grant_key` (único) para que toda concesión sea
idempotente, `tier_rules` (spec 003), el gate 18+ de las specs 004 y 006, y el login con Patreon v2.

## 1. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `domain/patreon/membership.ts` | Estado de miembro, ciclo de cobro, sobres a los que da derecho, tiers adultos, cobros anulables | RF-9 a RF-14, RF-18 |
| `domain/patreon/webhook-signature.ts` | Firma HMAC-MD5 de los avisos, comparación en tiempo constante | RF-16 |
| `domain/accounts/lifecycle.ts` | Activa / desactivada / pendiente de borrado (30 días) | RF-22 a RF-25 |
| `server/ports/patreon.ts` | + `getMember`, `listMembers`, `membershipFromIdentity` | RF-1, RF-3, RF-15, RF-17 |
| `server/adapters/http-patreon.ts` | API v2: identidad con membresías (token del usuario al entrar), miembros (token de creador) | RF-1, RF-3, RF-15, RF-17 |
| `server/adapters/fake-patreon.ts` | Miembros en memoria para desarrollo y E2E, ajustables desde una ruta solo de desarrollo | pruebas |
| `server/services/membership.ts` | Guardar estado, conceder sobres por ciclo, anular por reembolso, historial | RF-1 a RF-4, RF-9 a RF-15, RF-17 |
| `server/services/welcome.ts` | Colección de bienvenida y sobre de bienvenida | RF-5 a RF-8 |
| `server/services/account.ts` | Declarar edad, resumen de «Mi cuenta», desactivar, reactivar, borrar definitivamente | RF-18 a RF-25 |
| `app/api/webhooks/patreon` | Recibe, verifica, guarda y aplica avisos | RF-15, RF-16 |
| `instrumentation.ts` + `server/scheduler.ts` + botón en el panel de tiers | Revisión cada 6 h (y a mano desde el panel) y borrado diario de cuentas vencidas | RF-17, RF-24 |
| `app/cuenta` | «Mi cuenta»: suscripción, edad, borrar cuenta | RF-18, RF-21, RF-22 |
| Panel: colecciones y ficha de usuario | Marcar bienvenida; estado de Patreon e historial | RF-5, RF-26 |

## 2. Modelo de datos (migración `0004`)

- `patreon_links (user_id pk → users, member_id unique null, patron_status, last_charge_date, last_charge_status, next_charge_date, entitled_tier_ids text[], synced_at, source_ts)`.
- `sets.is_welcome bool default false` con índice único parcial (`where is_welcome`): solo una.
- `packs.cycle_key text null`: ciclo de cobro que concedió el sobre (para anular por reembolso).
- `users.purged_at timestamptz null`: borrado definitivo hecho. `deleted_at` pasa a significar «desactivada».
- `webhook_events (id, event_type, dedupe_key unique, member_id, payload jsonb, received_at, processed_at, error)`.

## 3. Decisiones

- **Ciclo de cobro**: se identifica por `next_charge_date` del miembro (estable si sube de tier a
  mitad de ciclo); si falta, por `last_charge_date`. Solo se concede con `patron_status =
  active_patron` y `last_charge_status = Paid`.
- **Concesión idempotente**: para cada colección, el total al que da derecho el ciclo es la suma de
  las reglas activas de sus tiers. Se insertan los sobres `1..total` con
  `grant_key = tier:<patreonUserId>:<ciclo>:<setId>:<n>` y `ON CONFLICT DO NOTHING`. Subir de tier
  aumenta el total y solo entran los que faltan (RF-10); bajar y volver a subir repite claves (RF-11);
  el estado es siempre el del último ciclo, así que vincular tarde no recupera meses (RF-12).
- **Reembolso o fraude** (`Refunded`, `Refunded by Patreon`, `Fraud`, `Partially Refunded`): los
  sobres sellados con ese `cycle_key` pasan a `void` y se anota en `audit_log` (RF-14).
- **Bienvenida**: `grant_key = welcome:<hash>` con `hash = SHA-256(ACCOUNT_HASH_SECRET + patreonUserId)`.
  Los sobres no se borran nunca (al borrar se anulan), así que la clave sigue existiendo tras un
  borrado definitivo y no se repite el regalo (RF-8) sin guardar el identificador en claro.
- **Al entrar** (callback de Auth.js): con el token del usuario se lee `identity?include=memberships`
  filtrando por nuestra campaña; se guarda el estado, se conceden sobres y bienvenida. Si Patreon
  falla, se entra con lo guardado (RF-4). Con el login de desarrollo se usa el cliente falso.
- **Refresco** (RF-3): `requireUser` llama a `refreshIfStale` (más de 15 min) con el token de
  creador y `member_id`; los fallos no bloquean la página.
- **Avisos**: `POST /api/webhooks/patreon` verifica `X-Patreon-Signature` (HMAC-MD5 del cuerpo con
  `PATREON_WEBHOOK_SECRET`), guarda el evento (duplicado → 200 sin más), consulta el miembro con el
  token de creador y aplica ese estado (RF-15). Se procesa en línea; la cola con BullMQ queda para
  el despliegue (spec 007), cuando haya Redis. Desviación anotada respecto a `architecture.md`.
- **Revisión periódica**: `instrumentation.ts` programa cada 6 h `reconcileAll` (paginando
  `/campaigns/{id}/members`) y cada día `purgeExpiredAccounts`, solo si `PATREON_RECONCILE=1`.
  También se puede lanzar a mano con el botón «Revisar ahora» del panel de tiers (en vez de un script).
- **Tier adulto**: un tier es adulto si tiene alguna regla activa con una colección 18+ (como ya dice
  el panel de tiers). Declarar la edad solo se permite con un tier adulto activo; la verificación no
  se revoca después (RF-20).
- **Desactivar** pone `deleted_at`, oculta el álbum y cierra la sesión. Entrar antes de 30 días
  limpia `deleted_at` (RF-23). `purgeExpiredAccounts` borra `user_cards`, `albums`,
  `pity_counters` y `patreon_links`, anula los sobres sellados, anonimiza `users` (nombre vacío,
  avatar y `patreon_user_id` a null, `purged_at`) y conserva `packs` abiertos y `pack_openings`
  (RF-24). Un nuevo login con ese Patreon ya no encuentra fila y crea una cuenta nueva (RF-25).
- **Sin tokens en BD**: no se guardan tokens de usuario; el de creador sigue en el entorno. Su
  renovación automática queda para el despliegue.

## 4. Variables de entorno nuevas

`PATREON_WEBHOOK_SECRET`, `ACCOUNT_HASH_SECRET` (por defecto `AUTH_SECRET`), `PATREON_RECONCILE`.

## 5. Pruebas

- Unit: ciclo, derecho por tiers (varios tiers, Free, pendiente, rechazado), claves, reembolso,
  firma, ciclo de vida de la cuenta.
- Integración: conceder una vez por cobro; repetir el estado no duplica; subir de tier da la
  diferencia; bajar y subir no; reembolso anula solo los sellados de ese ciclo; cancelar conserva;
  bienvenida una vez incluso tras borrado definitivo; declarar edad con y sin tier adulto;
  desactivar, reactivar y purgar.
- E2E (cliente falso + aviso firmado): el criterio de finalización de la spec.

## 6. Riesgos

- El formato exacto de los avisos y de `next_charge_date` en campañas con cobro por adelantado solo
  se confirma con un pledge real; la lógica consulta siempre el estado a Patreon, así que un aviso
  mal interpretado no concede nada por sí mismo.
- El token de creador caduca: si la API responde 401, el panel lo avisa y se renueva a mano.
