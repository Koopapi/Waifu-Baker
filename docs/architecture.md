# Arquitectura — Waifu Baker TCG

Línea base técnica común a todos los `plan.md`. Viene del descubrimiento del 14 oct 2026
(`~/.claude/plans/me-acaba-de-surgir-prancy-sunrise.md`). Un plan de spec puede refinarla, pero
no contradecirla sin actualizar este documento.

## 1. Reparto de responsabilidades

- **Patreon**: cobra, gestiona tiers e impuestos, marca la página como Adult y verifica 18+.
  Dos tiers: SFW (3 sobres `WB01`/mes) y 18+ (3 `WB01` + 3 `WB01A`/mes; abre el gate adulto).
- **Esta web**: login con Patreon, concesión y apertura de sobres, colección, álbum público,
  páginas de probabilidades y legales. Cobro directo descartado para 18+ (Stripe y Paddle
  prohíben contenido adulto, incluido el generado por IA).
- **Taller de arte** (`ART_DIR`, fuera del repo): genera el arte; `packages/cards-build` lo
  convierte en cartas.

## 2. Stack

Next.js 15 (App Router, React 19, TypeScript 5), Tailwind 4, GSAP 3.13 (gratis para uso
comercial), `@use-gesture/react` (arrastre), `motion` (transiciones de UI), `howler` (audio),
Auth.js v5 + adaptador Drizzle (proveedor `patreon` con `scope: "identity identity.memberships"`),
Drizzle ORM + PostgreSQL 16, Redis 7 + BullMQ, `rate-limiter-flexible`, `@aws-sdk/client-s3` +
presigner (R2 o MinIO), `sharp` + `blurhash`, Vitest + Playwright, Sentry, GitHub Actions.
Docker Compose en VPS propio detrás de Caddy, con Cloudflare delante (TLS, `CF-IPCountry`, caché).
Hosting 18+ en VPS propio porque no se pudo confirmar que R2/Vercel/Supabase lo permitan;
si R2 no lo permite para el arte, MinIO en el VPS.

## 3. Repositorio

```
waifu-baker-tcg/
  apps/web/
    src/app/(public)/        /, /drop-rates, /album/[slug], /legal/*
    src/app/(app)/           /open, /collection, /settings   (sesión)
    src/app/(adult)/18/      doble gate 18+
    src/app/lab/             prototipo de apertura con datos falsos (solo dev)
    src/app/admin/           panel de administración (rol admin)
    src/app/api/             route handlers finos
    src/db/schema/*.ts       Drizzle
    src/domain/              reglas puras (drop table, grants, rarezas, gate)
    src/server/ports/        Clock, Rng, PatreonClient, CardStore
    src/server/services/     openPack, applyMemberState, grantWelcomePack, signCardUrl
    src/server/adapters/     repos Drizzle, cliente Patreon, presigner, BullMQ
    src/features/opening/    OpeningStage, PackMesh, TearGesture, CardStack, Card3D,
                             HoloLayer, RarityFX, Particles, Summary, hooks
    src/worker.ts            BullMQ (reconcile, grants)
  packages/shared/           zod, enums de rareza, drop tables publicadas (wb01.json)
  packages/cards-build/      build.ts (sharp): arte -> cartas -> manifest.json
  infra/                     docker-compose.yml, Caddyfile, backup.sh, .env.example
  art/                       characters/*.md, sets/<set>/cards.csv, README (pista de arte)
```

Capas: `domain/` no importa nada del resto; `services/` importa `domain/` y `ports/`; los
handlers no contienen reglas; `features/` no calcula resultados ni permisos. Los tests inyectan
`Rng` y `Clock` falsos.

## 4. Modelo de datos (Drizzle/Postgres)

Auth.js aporta `accounts` (tokens Patreon cifrados AES-GCM) y `sessions`. Propias:

- `users` (id, display_name, avatar_url, is_adult_declared, adult_declared_at, adult_verified_at, last_country, created_at, deleted_at)
- `patreon_links` (user_id unique, patreon_user_id, member_id, patron_status, entitled_tier_ids[], last_charge_date, last_charge_status, source_ts, synced_at)
- `tier_rules` (patreon_tier_id, name, packs_per_month, is_adult, set_code, active) — `unique(patreon_tier_id, set_code)`
- `sets` (code, name, slug, is_adult, total_cards, released_at)
- `characters` (slug, name, bio, identity_tags, ref_image_id)
- `cards` (set_id, number, character_id, name, rarity enum[common, uncommon, rare, epic, legendary, secret], variant enum[normal, holo, alt], base_card_id, is_adult, key_full, key_mid, key_thumb, key_public, blurhash, seed, prompt_sha256, source_job) — `unique(set_id, number, variant)`
- `drop_tables` (set_id, version, slots jsonb, holo_chance, published_at, is_public) — versiones publicadas inmutables
- `packs` (user_id, set_id, source enum[tier_grant, manual, promo], grant_key unique, status enum[sealed, opened, void], granted_at, opened_at)
- `pack_openings` (pack_id unique, user_id, drop_table_id, server_seed, rng_version, rolls jsonb, card_ids[], opened_at, client_ack_at)
- `user_cards` (pk user_id + card_id, qty, first_obtained_at, last_obtained_at)
- `albums` (user_id unique, slug unique, visibility, title, featured_card_ids[])
- `webhook_events` (event_type, dedupe_key unique, member_id, payload, received_at, processed_at, error)
- `audit_log` (actor_user_id, action, entity_type, entity_id, meta, ip_hash, created_at)

Invariantes: un pack se abre exactamente una vez (`SELECT … FOR UPDATE` +
`pack_openings.pack_id UNIQUE`). La apertura es una transacción: bloqueo → `randomBytes(32)` →
HMAC-SHA256(seed, ranura) → elección ponderada → insert `pack_openings` → upsert `user_cards` →
update `packs` → `audit_log` → commit. Solo entonces se responde; el cliente solo anima.

## 5. Flujo Patreon

1. Login OAuth sin email. En `signIn` se consulta
   `/identity?include=memberships&fields[member]=currently_entitled_tiers,patron_status,last_charge_date,last_charge_status`
   y se hace upsert de `patreon_links`.
2. Grants: si `patron_status=active_patron` y `last_charge_status=Paid`, por cada regla del tier
   se insertan `packs_per_month` filas con `grant_key = member:tier:last_charge_date:n` y
   `ON CONFLICT DO NOTHING`. Idempotente y alineado con la fecha real de cobro.
3. Webhooks como señal, API como verdad: `POST /api/webhooks/patreon` verifica HMAC-MD5
   (`X-Patreon-Signature`) sobre el raw body, guarda en `webhook_events` (duplicado → 200) y
   encola `reconcile-member` (jobId = member_id, delay 5 s). El worker consulta
   `/members/{id}?include=currently_entitled_tiers` con el token de creador; `source_ts` solo
   avanza, así un evento viejo no pisa nada.
4. Reconcile cron cada 6 h pagina `/campaigns/{id}/members`. `/api/me` refresca si `synced_at` > 15 min.
5. Gate 18+: `adult_verified_at` se fija al ver un tier adulto activo; servir 18+ exige
   `is_adult_declared AND adult_verified_at IS NOT NULL`.
6. Bajas: los packs `sealed` se conservan; sin nuevos grants sin cobro `Paid`.
7. Bienvenida: en el primer login, 1 pack `source=promo`, `set=WB01`, `grant_key = welcome:<user_id>`.

`tier_rules` del piloto: SFW → 3 `WB01`; 18+ → 3 `WB01` + 3 `WB01A` (`is_adult`).

## 6. API

| Ruta | Límite | Qué hace |
|---|---|---|
| `GET /api/me` | 60/min | usuario, tiers, packs sellados, flags 18+ |
| `GET /api/packs` | 60/min | packs del usuario |
| `POST /api/packs/[id]/open` | 10/min | transacción de apertura; 451 si `x-country=BE` |
| `POST /api/packs/[id]/ack` | — | marca `client_ack_at` |
| `GET /api/collection?set=` | 60/min | `user_cards ⋈ cards` con `withAdultScope(user)` |
| `POST /api/assets/sign` | 60/min | URL firmada 10 min solo de cartas poseídas; `adult/` exige gate |
| `GET /drop-rates` | ISR 1 h | tablas `is_public` |
| `GET /album/[slug]` | ISR 5 min + tag | renders `key_public`; nunca 18+; `opengraph-image.tsx` |
| `POST /api/webhooks/patreon` | 120/min/IP | firma, dedupe, encolar |
| server actions | — | `declareAdult`, `updateAlbum`, `deleteAccount` |
| admin (`ADMIN_USER_IDS`) | — | `packs/grant`, `reconcile` |

Errores con `code` y `message` en español. `middleware.ts` copia `CF-IPCountry` a `x-country` y
protege `(app)` y `(adult)`.

## 7. Experiencia de apertura (2.5D)

Máquina de estados `idle → tearing → torn → fanned → revealing(i) → summary`.
Sobre con `preserve-3d` y foil por gradientes → rasgado con `useDrag` que hace scrub de un
timeline GSAP (soltar ≥ 0.6 → `play()` y `open`) → la tira sale y 5 `Card3D` emergen en abanico
mientras se precargan las imágenes → tap voltea (`rotateY 180`, 0.7 s) y dispara el reveal →
holo con vars CSS (`--px --py --rx --ry`) vía `gsap.quickTo`, capas `.shine`/`.glare`/`.foil`;
puntero en desktop, `DeviceOrientation` en móvil (iOS: `requestPermission()` dentro del primer
tap, mismo gesto para `Howler.ctx.resume()`; sin permiso → auto-sway) → reveal por rareza con
partículas en un `<canvas>` (rare 40, epic 80, legendary 150, secret 200), flash en epic+, sprite
de audio, `navigator.vibrate` → resumen con NUEVA / x3 y `ack`. Recarga a medias → se repite el
reveal desde el resultado guardado.

Rendimiento: solo `transform`/`opacity`; carta ≤ 360 px en móvil con `contain: layout paint`;
`will-change` solo durante la animación; `prefers-reduced-motion` → botón, crossfade, sin
partículas; `/open` ≤ 250 KB gz; 60 fps en Pixel 6a / iPhone 12. Referencias:
simeydotme/pokemon-cards-css, codeweb-dev/holo-card, selop/pokebox (GLSL, v2).

## 8. Pipeline de arte y cartas

- OCs sin LoRA: bloque de identidad fijo por OC + `mature female, adult`, negativos
  `loli, child, petite, young`; referencia con seed; poses por img2img `--strength 0.4`.
- Rarezas por set: por OC 2 common, 1 uncommon, 1 rare, 1 epic, 1 legendary → 30 + 2 secret
  alt-art = 32. Holo = variante de cada Rare+ (mismo arte, foil en runtime).
- Drop table `WB01` v1: ranuras 1–3 C70/U25/R5; ranura 4 U60/R30/E8/L2; ranura 5 garantizada
  R75/E18/L6/S1; `holo_chance` 0.2 sobre Rare+.
- Marco 750×1050 (63×88 mm) en Pencil; arte 832×1216 en `cover`; overlay por rareza.
- `cards-build`: lee `art/sets/<set>/cards.csv` (`number, slug, character, name, rarity,
  is_adult, bw_label, lote`), resuelve en `log.jsonl` de `ART_DIR`, produce `full@2x.webp`
  1500×2100, `mid.webp` 750×1050, `thumb.webp` 300×420, `public.webp` 600×840 con marca de agua,
  blurhash y `manifest.json`; `cards:upload` a bucket privado (`sfw/`, `adult/`) y público;
  `db:seed --manifest`.

## 8b. Panel de administración (spec 003)

Ruta `/admin` dentro de la misma app, solo para cuentas con rol de administrador. Es la vía
principal para crear colecciones, personajes y cartas, subir imágenes, asignar rarezas, editar
probabilidades y publicar. El procesado de imágenes que hacía `cards-build` (tamaños, marca de
agua, blurhash) se ejecuta en el servidor al subir cada imagen, de modo que CLI y panel
comparten el mismo código en `packages/cards-build`. El detalle sale de la entrevista de la
spec 003; la elección entre panel propio o CMS embebido se decide en su `plan.md`.

## 9. Seguridad y cumplimiento

RNG en servidor y drop table versionada; apertura idempotente; URLs firmadas 10 min; álbum
público con renders marcados; arte adulto solo con doble gate; CSP con nonce, HSTS,
`Permissions-Policy: gyroscope=(self), accelerometer=(self)`, `X-Frame-Options: DENY`; webhook
con `timingSafeEqual`; rate limits por usuario e IP; tokens cifrados; PII mínima y borrado que
anonimiza; backups `pg_dump` nocturnos cifrados con restore mensual; `x-country=BE` bloquea
apertura; páginas de probabilidades, divulgación IA, ToS (licencia digital, sin valor monetario,
sin intercambio) y privacidad.

## 10. Verificación transversal

Unit: muestreo de 100k sobres con chi-cuadrado contra las tasas publicadas y Rare+ siempre en
ranura 5; reglas de grant; orden de webhooks. Integración: dos `open` paralelos → una sola
`pack_openings`. E2E Playwright en `chromium-desktop`, `iphone-14`, `pixel-7` (+ reduced motion).
Manual: giroscopio iOS, audio tras gesto, vibración Android, apaisado, safe-area. Presupuesto:
LCP < 2.5 s en 4G, < 5 % frames largos en el flip, partículas ≤ 4 ms/frame; Lighthouse CI.
Patreon real: pledge de prueba por tier, cancelación, tier adulto.
