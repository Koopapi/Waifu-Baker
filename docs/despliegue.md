# Despliegue y operación (spec 024)

Cómo está montado Waifu Baker en internet y qué hacer en el día a día. Los secretos **nunca** se escriben aquí ni en el
repositorio: viven en las variables de entorno de Coolify y en el gestor de contraseñas del dueño.

## Piezas

| Pieza | Dónde | Para qué |
|---|---|---|
| Dominio `waifubaker.com` | Comprado en HostGator Brasil | El nombre |
| DNS | Cloudflare (nameservers `jasper` y `olga`) | `@`, `www`, `deploy` y `pruebas` → `13.140.231.48`, sin proxy (nube gris) |
| Correo | Cloudflare Email Routing (+ envío por Brevo desde Gmail) | `hola@`, `redes@`, `soporte@` |
| VPS | Contabo Cloud VPS 4 (Ubuntu 24.04, 4 núcleos, 8 GB, 96 GB), US-east | Todo lo demás |
| Coolify | En el VPS; panel en `https://deploy.waifubaker.com` | Publica, guarda registros, vuelve atrás |
| Producción | `https://waifubaker.com`, rama `main` | La web real |
| Pruebas | `https://pruebas.waifubaker.com`, rama `pruebas`, con contraseña | Probar antes de producción |
| Copias | Cloudflare R2, bucket `waifubaker-backups` (regla de ciclo de vida: borrar a los 30 días) | Copia cifrada de cada noche |
| Bot de Telegram | BotFather | Códigos de acceso del equipo y avisos |

## Flujo de trabajo

1. Cada spec o arreglo en su rama → PR a `pruebas`.
2. Al fusionar, Coolify publica en `pruebas.waifubaker.com`. Se prueba ahí.
3. PR de `pruebas` a `main` → al fusionar, Coolify publica en producción.
4. Si algo va mal en producción: Coolify → la aplicación → **Deployments** → la versión anterior → **Redeploy**.

Antes del primer paso a producción y de cada cambio grande: suite completa de pruebas en verde.

## Servidor

- SSH solo con llave (`/etc/ssh/sshd_config.d/00-waifubaker.conf`); la llave del Mac del dueño es
  `~/.ssh/waifubaker_vps`. Si se pierde, se entra por la consola web de Contabo (VNC) y se añade otra.
- Cortafuegos `ufw`: solo 22, 80 y 443. Docker publica puertos por encima de `ufw`, así que los internos de Coolify
  (8000, 6001 y 6002) se bloquean desde internet con `waifubaker-docker-firewall.service` (cadena `DOCKER-USER`).
  Para entrar al panel sin dominio: `ssh -i ~/.ssh/waifubaker_vps -L 8000:localhost:8000 root@13.140.231.48` y abrir
  `http://localhost:8000`.
- Actualizaciones de seguridad automáticas (`unattended-upgrades`).
- Guardar fuera del servidor (gestor de contraseñas) el fichero `/data/coolify/source/.env` de Coolify.

## Aplicaciones en Coolify

Las dos se crean igual (Build pack: **Dockerfile**; Base directory: `/`; Dockerfile: `/apps/web/Dockerfile`; puerto
3000; comprobación de salud `GET /api/health`), cada una con su base de datos **PostgreSQL 16** de Coolify (sin
«Make it publicly available») y un volumen persistente montado en `/data`.

Variables de entorno (las marcadas con † también como variables de compilación):

| Variable | Producción | Pruebas |
|---|---|---|
| `DATABASE_URL` | la URL interna de su Postgres | la de su Postgres |
| `AUTH_SECRET` | aleatoria de 32+ caracteres | otra distinta |
| `AUTH_TRUST_HOST` | `true` | `true` |
| `SITE_URL` | `https://waifubaker.com` | `https://pruebas.waifubaker.com` |
| `CARD_STORE_DIR` | `/data/cards` | `/data/cards` |
| `BACKUP_DIR` | `/data/backups` | `/data/backups` |
| `BACKUP_PASSPHRASE` | aleatoria (¡guardarla! sin ella no se restaura) | otra |
| `SCHEDULER` | `1` | `1` |
| `AUTH_PATREON_ID`, `AUTH_PATREON_SECRET` | los del cliente de Patreon | los mismos o un cliente aparte |
| `PATREON_*` (token de creador, campaña, webhook) | los de la campaña | — |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` | los del bot | los mismos |
| `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | los de R2 | vacías (pruebas no copia fuera) |
| `SITE_NOINDEX` † | — | `1` |
| `SITE_BASIC_AUTH` | — | `usuario:contraseña` compartidos (en el gestor) |
| `CONTACT_EMAIL` | `hola@waifubaker.com` | igual |
| `DEV_LOGIN`, `DEMO_MODE` | **nunca** | **nunca** |

Pruebas pide además una contraseña compartida (autenticación básica de la propia web con `SITE_BASIC_AUTH`); la
comprobación de salud `/api/health` queda libre.

Patreon: en el portal de clientes de Patreon, añadir `https://waifubaker.com/api/auth/callback/patreon` (y la de
pruebas) como URL de redirección.

## Equipo (administradores)

Se gestionan desde la **Terminal** de la aplicación en Coolify (o `docker exec` en el contenedor):

```
pnpm admin create <usuario>          # muestra una contraseña temporal una sola vez
pnpm admin reset-password <usuario>  # nueva temporal y desbloqueo
pnpm admin reset-telegram <usuario>  # desvincula Telegram (se vuelve a vincular al entrar)
```

Al entrar en `https://waifubaker.com/login/team` la primera vez: contraseña temporal → contraseña propia → vincular
Telegram con el bot (abrir el enlace y pulsar «Iniciar») → código de 6 cifras. Las siguientes veces: contraseña y
código. Cinco fallos seguidos bloquean la cuenta 15 minutos (queda en el historial).

## Copias y restauración

- Cada noche a las 09:00 UTC la web hace una copia cifrada (base de datos + imágenes) en `/data/backups`, guarda 30
  días en el disco y la sube a R2 (`copias/wb-backup-*.wbk`). Si falla, avisa por Telegram a los administradores y lo
  muestra el panel (Operación).
- **Restaurar en un servidor nuevo:**
  1. VPS nuevo + Coolify (como arriba) + la aplicación de producción con las mismas variables (sobre todo
     `BACKUP_PASSPHRASE`).
  2. Descargar de R2 la última `copias/wb-backup-*.wbk` y copiarla al volumen, en `/data/backups/`.
  3. En la Terminal de la aplicación: `pnpm backup:restore /data/backups/<archivo>.wbk`. Restaura en una base aparte
     (`<bd>_restore`) y en `var/restore/cards`, y comprueba el manifiesto.
  4. Si dice «Completa»: parar la aplicación, cambiar `DATABASE_URL` a la base restaurada (o renombrarla) y mover las
     imágenes a `/data/cards`; arrancar y comprobar `https://waifubaker.com/api/health`.
- La restauración se prueba al menos una vez restaurando la copia de producción en la base de pruebas (RF-25).

## Contenido 18+

No se sube nada 18+ hasta tener por escrito la confirmación de Contabo de que lo admite.
