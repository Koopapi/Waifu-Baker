# Spec 024 — Despliegue en el VPS

Estado: borrador para aprobar (28 oct 2026), con las respuestas del dueño.

## Contexto y objetivo
La web solo corre en el Mac del dueño. Ya hay un VPS en Contabo y un dominio. El objetivo es tenerla publicada en el
dominio con HTTPS, que cada cambio fusionado en `main` se publique solo (como en Vercel), que el dueño y Bruno puedan
subir las cartas desde cero en producción con su propia cuenta de administrador, y que nada de lo subido se pierda.

## Usuarios / actores
- **Dueño**, que fusiona cambios, sube cartas y vigila los despliegues.
- **Bruno**, administrador que sube y arma el arte.
- **Coleccionista**, que entra con Patreon como hasta ahora.

## Historias de usuario
- H1: Como dueño quiero que al fusionar un cambio se publique solo, y poder volver atrás si algo sale mal.
- H2: Como dueño y como Bruno queremos subir las cartas en la web publicada con nuestra propia cuenta.
- H3: Como dueño quiero que las cartas y los datos tengan copia fuera del servidor.

## Requisitos funcionales (criterios de aceptación en EARS)

### Despliegues
- RF-1: CUANDO se fusione un cambio en `main`, EL SISTEMA publicará la nueva versión en producción
  (`waifubaker.com`) sin intervención manual.
- RF-2: EL SISTEMA aplicará las migraciones de la base de datos antes de servir la nueva versión.
- RF-3: SI la compilación, las migraciones o la comprobación de salud fallan, ENTONCES EL SISTEMA mantendrá en línea la
  versión anterior y avisará al dueño.
- RF-4: EL SISTEMA permitirá al dueño volver a una versión anterior desde el panel de despliegues.
- RF-5: EL SISTEMA mostrará en el panel de despliegues el historial de despliegues con sus registros.
- RF-6: EL SISTEMA servirá el panel de despliegues en `deploy.waifubaker.com`, protegido con contraseña y segundo
  factor.

### Servidor de pruebas
- RF-7: CUANDO se fusione un cambio en la rama `pruebas`, EL SISTEMA lo publicará en `pruebas.waifubaker.com` sin
  intervención manual.
- RF-8: EL SISTEMA dará al servidor de pruebas su propia base de datos y sus propias imágenes, separadas de producción.
- RF-9: MIENTRAS sea el servidor de pruebas, EL SISTEMA pedirá una contraseña compartida antes de mostrar cualquier
  página e impedirá que los buscadores lo indexen.

### Web publicada
- RF-10: EL SISTEMA servirá la web solo por HTTPS en `waifubaker.com` (y `www.waifubaker.com` llevará a él), con los
  certificados renovados automáticamente.
- RF-11: EL SISTEMA empezará en producción con la base de datos vacía, sin la demo ni datos de prueba; las cartas y sus
  imágenes se suben desde cero en la web publicada.
- RF-12: MIENTRAS esté publicado (producción o pruebas), EL SISTEMA no ofrecerá el inicio de sesión de desarrollo ni
  las rutas de pruebas.
- RF-13: EL SISTEMA permitirá a los coleccionistas entrar con Patreon en el dominio publicado.

### Administradores con usuario, contraseña y Telegram
- RF-14: EL SISTEMA permitirá a un administrador entrar al panel con usuario, contraseña y un código que le envía por
  Telegram.
- RF-15: EL SISTEMA creará las cuentas de administrador solo con un comando en el servidor; no habrá registro público.
- RF-16: CUANDO un administrador entre por primera vez, EL SISTEMA le pedirá vincular su Telegram con el bot de Waifu
  Baker antes de dejarle usar el panel.
- RF-17: EL SISTEMA enviará códigos de 6 cifras que valen una sola vez y caducan a los 5 minutos.
- RF-18: SI el código no llega, ENTONCES EL SISTEMA permitirá pedir otro, como mucho 3 veces cada 10 minutos.
- RF-19: SI alguien falla 5 veces seguidas la contraseña o el código de un usuario, ENTONCES EL SISTEMA bloqueará ese
  usuario 15 minutos y lo anotará en el historial.
- RF-20: EL SISTEMA nunca guardará las contraseñas en claro.
- RF-21: EL SISTEMA permitirá al dueño restablecer la contraseña o el Telegram vinculado de un administrador con un
  comando en el servidor.

### Datos y copias
- RF-22: EL SISTEMA guardará las imágenes de las cartas y la base de datos en volúmenes del VPS que sobreviven a los
  despliegues y a los reinicios.
- RF-23: EL SISTEMA hará cada noche una copia cifrada de la base de datos y de las imágenes de producción en Cloudflare
  R2 y conservará las de los últimos 30 días.
- RF-24: SI una copia nocturna falla, ENTONCES EL SISTEMA avisará al dueño por Telegram.
- RF-25: EL SISTEMA tendrá un procedimiento documentado para restaurar una copia en un servidor nuevo, probado al
  menos una vez.

### Seguridad del servidor
- RF-26: EL SISTEMA solo dejará entrar al servidor por SSH con llave, nunca con contraseña.
- RF-27: EL SISTEMA solo expondrá a internet la web (HTTPS) y el SSH; la base de datos y los servicios internos no.
- RF-28: EL SISTEMA guardará los secretos (Patreon, Telegram, firmas, R2) en el gestor del panel de despliegues, nunca
  en el repositorio.

## Requisitos no funcionales
- Coste extra mensual previsto: $0 (Coolify es libre; R2 gratis hasta 10 GB).
- Antes del primer despliegue a producción: la suite completa de pruebas en verde y los PR pendientes fusionados.
- Textos nuevos (inicio de sesión de administrador) en inglés y español.
- Flujo de trabajo: cada spec o arreglo va en su rama → PR a `pruebas` → se prueba en `pruebas.waifubaker.com` → PR de
  `pruebas` a `main` → producción.
- Contenido 18+: no se sube nada 18+ hasta tener por escrito la confirmación de Contabo (pendiente del dueño).

## Casos límite
- Un despliegue a medias (se corta la conexión): sigue la versión anterior.
- Dos fusiones seguidas: se publica la última; la anterior se cancela o termina antes.
- El disco se llena: aviso al dueño antes de llegar al 85 %.
- Se pierde el teléfono o el Telegram: el dueño lo restablece por comando (RF-21).
- Telegram caído: no se puede entrar al panel hasta que vuelva (los coleccionistas no se ven afectados).
- Correo del dominio: si se usa correo @waifubaker.com en HostGator, se conserva al cambiar los DNS.
- El VPS se pierde entero: nuevo VPS + restauración desde R2 (RF-25).

## Fuera de alcance
- Webs de prueba por cada PR (hay un servidor de pruebas fijo con la rama `pruebas`).
- Subir cartas 18+ (hasta la confirmación de Contabo).
- Imágenes servidas desde R2 o una CDN (siguen en el disco del VPS).
- Redis y colas de tareas; las tareas periódicas siguen dentro de la web.
- Registro de administradores desde la web y recuperación de contraseña por correo.
- Tiers de pago y piloto (spec siguiente).

## Criterios de finalización
Cada RF comprobado: fusión de prueba en `pruebas` que se publica sola en el servidor de pruebas con su contraseña, PR de
`pruebas` a `main` que llega a producción, despliegue que falla y deja la anterior, vuelta atrás desde el panel, HTTPS
en el dominio, entrada de administrador con contraseña y código de Telegram, bloqueo tras 5 fallos, copia nocturna en
R2 y restauración probada en una base aparte, SSH solo con llave y puertos cerrados; el dueño y Bruno suben una carta
en producción.

## Decisiones (28 oct 2026)
- Coolify en el VPS; copias en Cloudflare R2; dominio `waifubaker.com` (panel en `deploy.`, pruebas en `pruebas.`).
- Administradores con usuario, contraseña y segundo factor obligatorio por Telegram.
- Producción empieza vacía; las cartas e imágenes se suben desde cero allí.
- Servidor de pruebas fijo con la rama `pruebas`, antes de producción.
- Nada 18+ hasta la confirmación de Contabo.
- Derivadas, a confirmar al aprobar: el servidor de pruebas pide una contraseña compartida y no se indexa; el panel de
  Coolify usa su propio segundo factor con app autenticadora (Coolify no admite Telegram); avisos de despliegues y
  copias por Telegram.

## Dudas abiertas
- Ninguna.
