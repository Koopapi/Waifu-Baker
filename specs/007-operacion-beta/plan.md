# Plan 007 — Operación y cumplimiento (parte para la beta)

Respeta `docs/constitution.md` y `docs/reglas-de-negocio.md`.

## 1. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `domain/legal/documents.ts` | Versión y fecha de términos, privacidad y contenido; si un usuario debe aceptar | RF-1 a RF-3, RF-8 |
| `app/bienvenida` + acción | Confirmar 16+ y aceptar términos; `requireUser` redirige ahí si falta | RF-1 a RF-3 |
| `app/legal/[doc]` + pie global | Términos, privacidad, contenido e IA en los dos idiomas | RF-4 a RF-8 |
| `server/observability.ts` + `instrumentation*.ts` | Sentry solo con DSN; limpieza de datos personales antes de enviar | RF-9, RF-10 |
| `server/services/metrics.ts` + `app/admin/metricas` | Métricas diarias de 30 días con datos propios | RF-11, RF-12 |
| `server/backup/core.ts` + `scripts/backup*.mts` + tarea diaria | Copia cifrada, rotación, restauración y verificación | RF-13 a RF-17 |
| `.github/workflows/ci.yml` | Lint, tipos, Vitest y E2E de escritorio en cada cambio | RF-18 |

## 2. Modelo de datos (migración `0006`)

- `users`: `age_confirmed_at`, `terms_version`, `terms_accepted_at`.
- `user_days (user_id, day date, pk)`: un registro por usuario y día con actividad (usuarios activos, RF-11).
- `backup_runs (id, started_at, finished_at, ok, file, bytes, error)`: historial de copias (RF-16, RF-17).

## 3. Decisiones

- **Aceptación**: `TERMS_VERSION = 1`. `requireUser` envía a `/bienvenida?next=…` a quien no tenga
  `age_confirmed_at` o tenga `terms_version` menor. El panel no se bloquea (lo usa el operador). Los
  álbumes públicos y las páginas legales no piden nada.
- **Textos legales** en el diccionario `legal` (en/es), con secciones; el contacto es
  `CONTACT_EMAIL` o, si falta, `PATREON_PAGE_URL` (por defecto la página de Patreon del proyecto).
- **Sentry** (`@sentry/nextjs`, dependencia nueva justificada: avisos de errores en servidor y
  navegador con mínimo trabajo). Solo se inicia con `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`;
  `beforeSend` quita cookies, cabeceras, IP y cualquier dato de usuario salvo el identificador interno.
- **Métricas**: consultas agrupadas por día sobre `users`, `user_days`, `pack_openings`, `packs`
  (`free`, `daily`) y `cookie_ledger`; los álbumes públicos activos se muestran como total actual
  (no hay histórico de altas y bajas). `requireUser` registra el día de actividad una vez por día
  y usuario (caché en memoria para no escribir en cada petición).
- **Copias**: `pg_dump -Fc` y `tar` de las imágenes en un archivo, más un manifiesto con el
  recuento de filas por tabla y el número de imágenes; todo cifrado con AES-256-GCM y una clave
  derivada con scrypt de `BACKUP_PASSPHRASE`. Se guardan en `BACKUP_DIR`; se borran las de más de
  30 días. La restauración descifra, crea una BD aparte (`<bd>_restore`), aplica `pg_restore`,
  extrae las imágenes a una carpeta aparte y compara con el manifiesto. Se ejecuta a diario con el
  programador de tareas (`SCHEDULER=1`) y a mano con `pnpm backup` y `pnpm backup:restore`.
- **CI**: GitHub Actions en `ubuntu-24.04` con Postgres 16 como servicio y `PGUSER`/`PGPASSWORD`
  en el entorno (las URLs sin usuario los toman de ahí).

## 4. Variables de entorno nuevas

`CONTACT_EMAIL`, `PATREON_PAGE_URL`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `BACKUP_DIR`,
`BACKUP_PASSPHRASE`, `SCHEDULER` (sustituye a `PATREON_RECONCILE`).

## 5. Pruebas

- Unit: quién debe aceptar, limpieza de eventos de Sentry, cifrado y descifrado de copias, rotación.
- Integración: aceptar términos; métricas con datos sembrados; copia completa, restauración y
  verificación contra el manifiesto; registro de copias fallidas.
- E2E: el criterio de finalización de la spec.
