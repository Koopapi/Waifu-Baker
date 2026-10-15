# AGENTS.md — Waifu Baker TCG

## Proyecto
Cartas coleccionables digitales de estilo anime (no jugables) con apertura de sobres
interactiva y colección persistente por usuario. Patreon cobra, gestiona tiers y verifica
18+; esta web abre los sobres, guarda la colección y publica el álbum. Monorepo pnpm:
`apps/web` (Next.js 15 + TypeScript + Tailwind + GSAP), `packages/shared` (tipos, drop
tables), `packages/cards-build` (arte → cartas), `infra/` (Docker Compose, Caddy).
PostgreSQL 16 y Redis 7. El taller de arte vive fuera del repo, en `ART_DIR`
(`/Users/koopa/Documents/Waifu Baker`), y `cards-build` lo lee.

## Comandos
Desde `apps/web` (pnpm 10 por corepack; Postgres 16 local de Homebrew, sin Docker por ahora):
- Ejecutar: `pnpm dev --port 3100` (prototipo de apertura en `/lab`)
- Tipos y lint: `pnpm typecheck` y `pnpm lint`
- Tests: `pnpm test` (Vitest: proyecto `unit` en `src/**/*.test.ts` y `integration` en
  `tests/integration`, que recrea la BD `waifu_baker_test` y aplica migraciones en cada ejecución)
- Migraciones: `pnpm db:generate --name <nombre>` y `DATABASE_URL=… pnpm db:migrate`
- Login de desarrollo: `/login` con `DEV_LOGIN=1`; marca "Entrar como administrador" para el panel
- Recorridos manuales del panel en navegador (servidor de desarrollo en marcha): `node scripts/admin-smoke.mjs`,
  `scripts/admin-e2-smoke.mjs <out>`, `scripts/admin-e3-smoke.mjs <out> public/lab`,
  `scripts/upload-order-check.mjs`, `scripts/editor-check.mjs <png>`, `scripts/admin-e4-smoke.mjs <out>`,
  `scripts/regenerate-check.mjs <png>`, `scripts/admin-e5-smoke.mjs <out>`, `scripts/admin-e6-smoke.mjs <out>`, `scripts/tablet-check.mjs <out>`; carta de muestra: `pnpm exec tsx scripts/sample-card.mts <arte> <png> <rareza> "<nombre>" <n>`
- En pruebas de la revisión 18+ usar solo arte de personajes adultos; nunca umamusume ni estudiantes
- Imágenes de cartas en desarrollo: `apps/web/var/cards/` (ignorado por git; `CARD_STORE_DIR` lo cambia)
- E2E: `pnpm e2e` (Playwright; levanta su propio servidor en el puerto 3200 con la BD `waifu_baker_e2e`,
  que recrea en cada ejecución, y `.next-e2e`; no toca la BD de desarrollo)
- Validación RF por RF: `node scripts/rf-coverage.mjs ../../specs/<spec>` (escribe `validation.md`; los tests
  se nombran `test_s<NNN>_rfN_*` —la 003 puede omitir `s003_`— y cada E2E declara su spec en la
  primera línea y nombra sus pasos con «RF-N»)
- Capturas del flujo de `/lab` en escritorio e iPhone: `node scripts/lab-shots.mjs <carpeta>`
  (en móvil emulado el rasgado se envía como toques reales por CDP; use-gesture ignora el ratón ahí)
- Base de datos: `pg_ctl -D /opt/homebrew/var/postgresql@16 start`; BD `waifu_baker_dev`; `.env.local` ya apunta a ella

## Estilo y convenciones
- TypeScript estricto. Server Components por defecto; `"use client"` solo donde hay interacción.
- Identificadores en inglés; textos al usuario y documentación en español.
- Capas: `domain/` no importa nada del resto; `services/` solo `domain/` y `ports/`; los
  handlers de `app/api` traducen HTTP y no contienen reglas; `features/` no calcula
  resultados ni permisos, solo muestra lo que devuelve la API.

## Reglas
- Lee `docs/constitution.md`, `docs/architecture.md` y la spec activa en `specs/` antes de
  tocar el motor (Patreon, concesiones, sorteo, gate 18+, cumplimiento).
- La experiencia de apertura se itera en la ruta `/lab` con datos falsos y se prueba en
  móvil; su spec se escribe después de validarla, no antes.
- No añadas dependencias sin justificarlas antes en el plan de la spec.
- No cambies el esquema de la base de datos fuera de una migración de Drizzle.
- Nunca generes, cargues ni enlaces arte sugerente de personajes no adultos, ni arte de
  personajes con licencia en contenido de pago.
- No modifiques archivos dentro de `specs/` salvo petición explícita.
- Cualquier cambio de comportamiento del motor entra primero por la spec.

## Al terminar cualquier tarea
- Ejecuta `pnpm test` (y `pnpm e2e` si tocaste la interfaz) y confirma en tu respuesta que
  todo pasa.
