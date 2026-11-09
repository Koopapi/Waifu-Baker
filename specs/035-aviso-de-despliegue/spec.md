# Spec 035 — Aviso en Telegram al terminar un despliegue

Estado: **borrador**, pendiente de aprobación del dueño (entrevista del 9 nov 2026).

Decisiones del dueño en la entrevista:
1. Se avisa de los despliegues de pruebas y de producción, diciendo cuál fue.
2. El mensaje lista, en un renglón cada uno, los PR que entraron desde el despliegue anterior, con su título y su número.
3. También se avisa cuando un despliegue falla.

## Contexto y objetivo
Hoy, al mergear un PR, Coolify publica la versión nueva en pruebas o en producción sin avisar a nadie. Para saber si
ya está y qué entró hay que entrar a Coolify o probar la web. El objetivo es que el equipo reciba en su grupo de
Telegram un mensaje corto cuando una versión nueva ya está funcionando, o cuando falló, con la lista de lo que entró.

## Usuarios / actores
- **Equipo** (el dueño y quien colabora en el diseño): recibe los avisos en el grupo de Telegram del equipo.

## Historias de usuario
- H1: Como dueño quiero saber cuándo terminó de publicarse una versión, para probarla sin esperar a ciegas.
- H2: Como equipo queremos ver de un vistazo qué cambios entraron, para saber qué revisar.
- H3: Como dueño quiero enterarme si un despliegue falló, para revisarlo en Coolify.

## Requisitos funcionales (criterios de aceptación en EARS)

### Despliegue terminado
- RF-1: CUANDO una versión nueva de pruebas empiece a responder bien en su comprobación de salud, EL SISTEMA enviará un
  mensaje al grupo de Telegram del equipo.
- RF-2: CUANDO una versión nueva de producción empiece a responder bien en su comprobación de salud, EL SISTEMA enviará
  un mensaje al grupo de Telegram del equipo.
- RF-3: EL SISTEMA dirá en la primera línea del mensaje el entorno («Pruebas» o «Producción»), la fecha y la hora.
- RF-4: EL SISTEMA listará en el mensaje, en un renglón cada uno, los PR que entraron desde el último despliegue
  avisado de ese entorno, con su título y su número.
- RF-5: EL SISTEMA terminará el mensaje con la dirección del entorno.
- RF-6: SI entre dos despliegues no entró ningún PR (por ejemplo, un redespliegue de la misma versión), ENTONCES EL
  SISTEMA no enviará mensaje.
- RF-7: SI entraron más de 15 PR, ENTONCES EL SISTEMA listará los 15 más recientes y dirá cuántos más hubo.
- RF-8: EL SISTEMA enviará un solo mensaje por versión y entorno, aunque la aplicación se reinicie.

### Despliegue fallido
- RF-9: SI un despliegue de pruebas o de producción falla, ENTONCES EL SISTEMA enviará al grupo del equipo un mensaje
  con el entorno, la fecha y la hora, y que la versión anterior sigue publicada.

### Errores
- RF-10: SI no se puede enviar el mensaje (Telegram caído o sin configurar), ENTONCES EL SISTEMA dejará la versión
  funcionando igual y lo anotará en el registro del servidor.
- RF-11: SI no se puede saber qué PR entraron, ENTONCES EL SISTEMA enviará el mensaje igual, diciendo que no se pudo
  leer la lista.

## Requisitos no funcionales
- Seguridad:
  - el token del bot y cualquier otra credencial viven solo en las variables de Coolify, nunca en el repositorio ni en
    el mensaje;
  - el mensaje no incluye datos de usuarios.
- Brevedad: el mensaje con 15 PR cabe en una pantalla de teléfono (renglones de menos de 90 caracteres; los títulos más
  largos se cortan con «…»).
- Idioma: el mensaje, en español.
- Puntualidad: el aviso llega menos de 2 minutos después de que la versión nueva responde bien.

## Casos límite
- Primer despliegue tras activar el aviso: no hay despliegue anterior avisado; se avisa sin lista, con «primer aviso de
  este entorno».
- Dos merges seguidos que Coolify junta en un solo despliegue: un mensaje con los dos PR.
- Commit directo sin PR (no debería pasar, ver las reglas de ramas): sale como un renglón con el mensaje del commit.
- La versión nueva arranca y se cae enseguida: el aviso de éxito ya salió; el fallo se ve en Coolify. El equipo puede
  volver a la versión anterior con «Redeploy».
- Producción recibe de golpe todo lo de pruebas (PR de `pruebas` a `main`): la lista son los PR de las specs que
  entraron, no solo el PR de `pruebas` a `main`.

## Fuera de alcance
- Avisos por correo u otros canales.
- Avisos de cada PR mergeado antes de desplegarse.
- Botones en Telegram para volver a la versión anterior o redesplegar.
- Avisos de las copias de seguridad u otras tareas del servidor (ya existen o van aparte).

## Criterios de finalización
Cada RF con su test en verde:
- **Unidad:** armar el mensaje (entorno, hora, lista, límite de 15, títulos largos, sin cambios, sin lista).
- **Integración:** un solo aviso por versión y entorno aunque se reinicie, y error de Telegram sin romper el arranque.

Además, prueba real en pruebas con el merge de un PR (llega el mensaje con su título) y un despliegue fallido provocado
a propósito (llega el aviso de fallo). Suite completa en verde.

## Dudas abiertas
- [NECESITA ACLARACIÓN] Zona horaria de la fecha y la hora del mensaje. Propuesta: la hora de Ciudad de México.
