# Spec 024 — Despliegue en el VPS

Estado: borrador para aprobar (28 oct 2026).

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
- RF-1: CUANDO se fusione un cambio en `main`, EL SISTEMA publicará la nueva versión en el VPS sin intervención manual.
- RF-2: EL SISTEMA aplicará las migraciones de la base de datos antes de servir la nueva versión.
- RF-3: SI la compilación, las migraciones o la comprobación de salud fallan, ENTONCES EL SISTEMA mantendrá en línea la
  versión anterior y avisará al dueño.
- RF-4: EL SISTEMA permitirá al dueño volver a una versión anterior desde el panel de despliegues.
- RF-5: EL SISTEMA mostrará en el panel de despliegues el historial de despliegues con sus registros.
- RF-6: EL SISTEMA servirá el panel de despliegues en un subdominio propio, protegido con contraseña y segundo factor.

### Web publicada
- RF-7: EL SISTEMA servirá la web solo por HTTPS en el dominio, con el certificado renovado automáticamente.
- RF-8: EL SISTEMA empezará en producción con la base de datos vacía, sin la demo ni datos de prueba.
- RF-9: MIENTRAS esté en producción, EL SISTEMA no ofrecerá el inicio de sesión de desarrollo ni las rutas de pruebas.
- RF-10: EL SISTEMA permitirá a los coleccionistas entrar con Patreon en el dominio publicado.

### Administradores con usuario y contraseña
- RF-11: EL SISTEMA permitirá a un administrador entrar al panel con usuario, contraseña y un código de una app
  autenticadora.
- RF-12: EL SISTEMA creará las cuentas de administrador solo con un comando en el servidor; no habrá registro público.
- RF-13: CUANDO un administrador entre por primera vez, EL SISTEMA le pedirá configurar su app autenticadora con un
  código QR antes de dejarle usar el panel.
- RF-14: SI alguien falla 5 veces seguidas la contraseña o el código de un usuario, ENTONCES EL SISTEMA bloqueará ese
  usuario 15 minutos y lo anotará en el historial.
- RF-15: EL SISTEMA nunca guardará las contraseñas ni los secretos del segundo factor en claro.
- RF-16: EL SISTEMA permitirá al dueño restablecer la contraseña o el segundo factor de un administrador con un comando
  en el servidor.

### Datos y copias
- RF-17: EL SISTEMA guardará las imágenes de las cartas y la base de datos en volúmenes del VPS que sobreviven a los
  despliegues y a los reinicios.
- RF-18: EL SISTEMA hará cada noche una copia cifrada de la base de datos y de las imágenes en Cloudflare R2 y
  conservará las de los últimos 30 días.
- RF-19: SI una copia nocturna falla, ENTONCES EL SISTEMA avisará al dueño.
- RF-20: EL SISTEMA tendrá un procedimiento documentado para restaurar una copia en un servidor nuevo, probado al
  menos una vez.

### Seguridad del servidor
- RF-21: EL SISTEMA solo dejará entrar al servidor por SSH con llave, nunca con contraseña.
- RF-22: EL SISTEMA solo expondrá a internet la web (HTTPS) y el SSH; la base de datos y los servicios internos no.
- RF-23: EL SISTEMA guardará los secretos (Patreon, firmas, R2) en el gestor del panel de despliegues, nunca en el
  repositorio.

## Requisitos no funcionales
- Coste extra mensual previsto: $0 (Coolify es libre; R2 gratis hasta 10 GB).
- Antes del primer despliegue a producción: la suite completa de pruebas en verde y los PR pendientes fusionados.
- Textos nuevos (inicio de sesión de administrador) en inglés y español.
- Contenido 18+: confirmar por escrito con Contabo que lo admite antes de subir cartas 18+ (pendiente del dueño).

## Casos límite
- Un despliegue a medias (se corta la conexión): sigue la versión anterior.
- Dos fusiones seguidas: se publica la última; la anterior se cancela o termina antes.
- El disco se llena: aviso al dueño antes de llegar al 85 %.
- Se pierde el teléfono con la app autenticadora: el dueño lo restablece por comando (RF-16).
- El VPS se pierde entero: nuevo VPS + restauración desde R2 (RF-20).

## Fuera de alcance
- Webs de prueba por cada PR (más adelante).
- Imágenes servidas desde R2 o una CDN (siguen en el disco del VPS).
- Redis y colas de tareas; las tareas periódicas siguen dentro de la web.
- Registro de administradores desde la web y recuperación de contraseña por correo.
- Tiers de pago y piloto (spec siguiente).

## Criterios de finalización
Cada RF comprobado: fusión de prueba que se publica sola, despliegue que falla y deja la anterior, vuelta atrás desde
el panel, HTTPS en el dominio, entrada de administrador con contraseña y código, bloqueo tras 5 fallos, copia nocturna
en R2 y restauración probada en una base aparte, SSH solo con llave y puertos cerrados; el dueño y Bruno suben una
carta en producción.

## Decisiones (28 oct 2026)
- Coolify en el VPS; copias en Cloudflare R2; administradores con usuario y contraseña.
- Derivadas, a confirmar al aprobar: segundo factor obligatorio para administradores; producción empieza vacía; las
  webs de prueba por PR quedan fuera.

## Dudas abiertas
- [NECESITA ACLARACIÓN: nombre del dominio.]
