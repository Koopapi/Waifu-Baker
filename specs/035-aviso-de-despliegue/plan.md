# Plan — Spec 035: aviso en Telegram al terminar un despliegue

## Punto de partida (9 nov 2026)
- Coolify publica pruebas (rama `pruebas`) y producción (rama `main`), cada una con su base de datos y comprobación de
  salud `GET /api/health`.
- Ya hay un bot de Telegram (`server/adapters/telegram.ts`, `getTelegram()`):
  - el token va en `TELEGRAM_BOT_TOKEN`;
  - el grupo del equipo, en `TELEGRAM_ALERTS_CHAT_ID`;
  - hoy se usa para los códigos de acceso y los avisos (spec 024).
- `instrumentation.ts` arranca el programador (`scheduler.ts`) una vez por proceso.
- El repositorio `Koopapi/Waifu-Baker` es público: la API de GitHub compara dos commits sin token (60 peticiones por
  hora y por IP, sobra).
- La imagen de Docker no sabe de qué commit sale. Coolify lo pasa como `SOURCE_COMMIT` si se activa «Include Source
  Commit in Build».

## Diseño

### Dominio (`domain/ops/deploy-notice.ts`, puro)
- `changesFromCommits(commits, head)` recorre la línea principal (el primer padre) desde `head` hasta salir de la
  comparación:
  - un merge de PR («Merge pull request #N from dueño/rama», con el título en la segunda línea) da `{ number, title }`;
  - un commit con «(#N)» al final (squash) da el título sin «(#N)»;
  - un commit directo da su primera línea, sin número;
  - un merge desde la rama `pruebas` (el paso a producción) no cuenta: se recorren los PR de su segundo padre (caso
    límite de producción).
  - Devuelve los cambios del más reciente al más antiguo.
- `deployMessage({ env, at, changes, siteUrl, first, listFailed })` arma el texto (RF-3 a RF-7, RF-11):
  - `✅ Pruebas actualizada · 9 nov 2026, 14:32`, con `Intl` en `America/Mexico_City`;
  - un renglón por cambio, `• Título (#N)`, de hasta 90 caracteres, cortado con «…»;
  - como mucho 15 renglones y «… y N más»;
  - si es el primer aviso, «Primer aviso de este entorno.» sin lista;
  - si falló la lista, «No se pudo leer la lista de cambios.»;
  - al final, la dirección sin `https://`.
- `envLabel(siteUrl)`: «Pruebas» si el host empieza por `pruebas.`, «Producción» si no.

### Servicio (`server/services/deploy-notice.ts`)
- `notifyDeploy({ db, telegram, compare, commit, siteUrl, now })`:
  1. Sin `commit`, sin bot o sin grupo, lo anota en el registro y termina (RF-10).
  2. En una transacción, bloquea `app_settings.deploy_notice` (`SELECT … FOR UPDATE`; si no existe, lo crea).
     - Si guarda el mismo commit, termina: es un reinicio o un redespliegue de la misma versión (RF-6, RF-8).
     - Si no, guarda el commit nuevo antes de enviar, para que dos arranques a la vez no avisen dos veces (RF-8).
  3. Con el commit anterior, `compare(anterior, nuevo)` pide la comparación a GitHub. Si falla, el mensaje dice que no
     se pudo leer la lista (RF-11).
  4. Si no hay cambios y no es el primer aviso, no envía nada (RF-6).
  5. Envía con `telegram.sendMessage(teamChatId, texto)`. Si Telegram falla, lo anota y sigue (RF-10).
- `githubCompare(base, head)` (adaptador, `server/adapters/github.ts`):
  - `fetch` a `https://api.github.com/repos/Koopapi/Waifu-Baker/compare/base...head` con 10 s de límite;
  - devuelve `{ sha, parents, message }[]`.

### Arranque
- `instrumentation.ts` llama, si `DEPLOY_NOTICE=1` y `NODE_ENV=production`, a `startDeployNotice()`
  (`server/deploy-notice-start.ts`):
  - pide la propia salud (`http://127.0.0.1:$PORT/api/health`) cada 5 s, hasta 2 minutos (RF-1, RF-2, RNF de
    puntualidad);
  - en cuanto responde `ok`, llama a `notifyDeploy` con `SOURCE_COMMIT` y `SITE_URL`;
  - todo dentro de `try`: nada de esto puede tumbar el arranque (RF-10).
- `Dockerfile`: `ARG SOURCE_COMMIT` y `ENV SOURCE_COMMIT=$SOURCE_COMMIT` en la imagen final.

### Despliegue fallido (RF-9)
- Si una versión no arranca, la app nueva no puede avisar. Coolify sí: sus notificaciones de Telegram, solo con
  «Deployment failed» activado, mandan al mismo grupo el nombre de la aplicación (pruebas o producción), el fallo y la
  hora. La versión anterior sigue publicada.
- Se configura una vez en Coolify (Notifications → Telegram, con el mismo bot y el mismo grupo) y se documenta en
  `docs/despliegue.md`. El mensaje de Coolify viene en inglés; se anota en la validación.

### Pasos del dueño en Coolify (una vez, en las dos aplicaciones)
1. General → Build: activar «Include Source Commit in Build».
2. Environment Variables: `DEPLOY_NOTICE=1`.
3. Notifications → Telegram:
   - el token del bot y el ID del grupo, los mismos de `TELEGRAM_*`;
   - solo «Deployment failed».
4. Redesplegar.

## Pruebas
- **Unidad** (`deploy-notice.test.ts`):
  - merges de PR, squash y commit directo;
  - el paso de `pruebas` a `main` lista los PR de dentro;
  - mensaje con hora de Ciudad de México;
  - 15 renglones y «y N más»;
  - títulos de más de 90 caracteres;
  - primer aviso;
  - lista que no se pudo leer;
  - etiqueta del entorno (RF-3 a RF-7, RF-11).
- **Integración** (`deploy-notice.test.ts`, BD de test, Telegram y GitHub falsos):
  - el primer arranque avisa;
  - el segundo con el mismo commit no;
  - otro commit avisa con su lista;
  - sin cambios, no avisa;
  - Telegram falla y no rompe;
  - GitHub falla y avisa sin lista;
  - dos llamadas a la vez dan un solo aviso (RF-1, RF-2, RF-6, RF-8, RF-10, RF-11).
- **Prueba real** en pruebas tras configurar Coolify: mergear un PR y que llegue su aviso; provocar un fallo de build en
  una rama de prueba y que llegue el de Coolify.

## Riesgos
- Si «Include Source Commit in Build» está apagado, no hay commit y no se avisa. Queda anotado en el registro y en
  `docs/despliegue.md`.
- Límite de GitHub sin token: 60 por hora por IP. Se pide una comparación por despliegue.
