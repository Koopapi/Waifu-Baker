# Plan — Spec 024, despliegue en el VPS

## Servidor (Contabo Cloud VPS 4: Ubuntu 24.04, 4 núcleos, 8 GB, 96 GB; IP 13.140.231.48)
- Actualizaciones de seguridad automáticas (`unattended-upgrades`).
- SSH solo con llave: `PasswordAuthentication no` en un fichero propio que gana al de cloud-init (RF-26).
- Cortafuegos `ufw`: solo 22, 80 y 443 (RF-27). Ojo: Docker publica puertos por encima de `ufw`; ningún servicio
  interno publica puertos (Postgres sin «hacer público» en Coolify) y el panel de Coolify (8000) se cierra con una regla
  en la cadena `DOCKER-USER` en cuanto tenga su dominio.
- Primer acceso al panel de Coolify por un túnel SSH desde el Mac del dueño (así nadie se registra antes que él).

## Coolify v4 (RF-1 a RF-9, RF-10, RF-22, RF-28)
- Proxy Traefik con HTTPS de Let's Encrypt para `waifubaker.com`, `www` (redirección), `deploy.` (panel) y `pruebas.`.
- Dos aplicaciones desde GitHub (`Koopapi/Waifu-Baker`, app de GitHub de Coolify): **producción** con la rama `main` y
  **pruebas** con la rama `pruebas`; despliegue automático al fusionar.
- Una base Postgres 16 por entorno (gestionada por Coolify, sin puerto público) y un volumen por entorno para las
  imágenes (`CARD_STORE_DIR=/data/cards`) y las copias locales.
- Pruebas: autenticación básica de Traefik (etiquetas de la aplicación), cabecera `X-Robots-Tag: noindex` y
  `robots.txt` que lo prohíbe todo (RF-9).
- Secretos solo en las variables de entorno de Coolify. Avisos de despliegue por Telegram (notificaciones de Coolify).

## Imagen de la web (`apps/web/Dockerfile`)
- Next en modo `standalone`, Node 22, `sharp` y la fuente; usuario no root.
- Al arrancar: migraciones (`drizzle-kit migrate` o el migrador de drizzle-orm) y luego el servidor; si las migraciones
  fallan, el contenedor no arranca y Coolify mantiene el anterior (RF-2, RF-3).
- Ruta de salud `GET /api/health` (base de datos y disco) para la comprobación de Coolify.
- Producción y pruebas sin `DEV_LOGIN` ni `DEMO_MODE` (RF-12).

## Administradores con contraseña y Telegram (RF-14 a RF-21)
- Tablas `admin_accounts` (usuario, hash scrypt de la contraseña, chat de Telegram, intentos fallidos, bloqueo,
  cambiar contraseña al entrar) y `admin_login_codes` (hash del código, caducidad, usado, reenvíos).
- Flujo: usuario y contraseña → código de 6 cifras por Telegram (5 min, un uso; hasta 3 reenvíos cada 10 min) →
  sesión de Auth.js como administrador. Primera vez: vincular Telegram con un enlace `t.me/<bot>?start=<código>`; el bot
  recibe el `/start` por un webhook con token secreto (`/api/telegram/webhook`).
- 5 fallos seguidos → bloqueo de 15 min y registro en el historial.
- Comandos en el servidor (en el contenedor): `admin:create`, `admin:reset-password`, `admin:reset-telegram`.
- `ADMIN_PATREON_IDS` sigue funcionando en desarrollo; en producción el panel solo admite estas cuentas.

## Copias (RF-23 a RF-25)
- Tarea programada de Coolify cada noche en producción: `scripts/backup.mts` (ya cifra base e imágenes) + subida a R2
  con el cliente S3 y borrado de las de más de 30 días; si falla, aviso por Telegram.
- `docs/despliegue.md`: cómo restaurar en un servidor nuevo; prueba real restaurando en la base de pruebas.

## DNS (HostGator)
- `A` de `@`, `www`, `deploy` y `pruebas` → 13.140.231.48. Si hay correo en HostGator, el `MX` pasa a
  `mail.waifubaker.com` con su `A` al servidor de HostGator.

## Pruebas
Unidad e integración del inicio de sesión de administrador (contraseña, códigos, bloqueo, reenvíos, vinculación) y de
la subida de copias con un S3 falso. Comprobaciones manuales en el servidor por cada RF de infraestructura
(`validation.md`). Por indicación del dueño, la suite se corre cuando él lo pida y siempre antes del primer paso a
producción.
