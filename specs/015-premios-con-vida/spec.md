# Spec 015 — Premios con vida

## Contexto y objetivo
Recibir algo en la web se siente hoy como una notificación del sistema: al reclamar galletas o un sobre salen a la
vez un aviso gris abajo a la derecha («¡Reclamada!») y un mensaje verde dentro de la tarjeta, los contadores cambian
de golpe y la pegatina del día de la racha cambia sin más. Los sobres que llegan sin pedirlos (el de bienvenida, un
regalo del administrador, los de la suscripción de Patreon) no se avisan de ninguna forma: solo cambia un número en
«Mis sobres». Esta spec convierte esos momentos en premios: lo pequeño vuela hasta su sitio y los marcadores suben;
lo grande se celebra en el centro de la pantalla; la racha se estampa; y todo suena y vibra a juego, con el mismo
botón de silencio de la apertura. Los avisos del sistema desaparecen de las pantallas del coleccionista (los errores
se quedan junto al botón) y el panel de administración no cambia. No cambia ninguna regla de recompensas (spec 009)
ni de sobres (specs 001 y 004).

## Usuarios / actores
- **Coleccionista**: reclama recompensas, recibe sobres y mantiene su racha.
- **Administrador**: no cambia nada para él; sus avisos siguen igual.
- **Quien enseña la demo**: la primera entrada del coleccionista de la demo celebra sus sobres de muestra.

## Historias de usuario
- H1: Como coleccionista quiero que reclamar galletas o un sobre se sienta como un premio: que vuelen hasta su sitio y
  los contadores suban, sin que nada me interrumpa.
- H2: Como coleccionista quiero enterarme con una celebración cuando me llegan sobres sin pedirlos y distinguir en
  «Mis sobres» cuáles son los nuevos.
- H3: Como coleccionista quiero que la racha diaria tenga su momento: estampar el día, celebrar el día 7 y que se me
  avise si estoy a punto de perderla.
- H4: Como coleccionista quiero sonidos y vibración a juego, y que respeten el silencio que elegí.
- H5: Como coleccionista no quiero avisos duplicados; si algo falla quiero verlo junto al botón que pulsé.

## Vocabulario
- **Premio que vuela**: una pegatina (galleta o sobre) que viaja desde donde se ganó hasta donde se guarda (el
  contador de galletas o el acceso a «Mis sobres» de la navegación), que reacciona al recibirla.
- **Celebración central**: tarjeta grande en el centro de la pantalla con el premio, un título, confeti de pegatinas
  y botones; es un diálogo: atrapa el foco y se cierra con Escape.
- **Llegada**: sobre que el coleccionista recibe sin pedirlo: bienvenida (`promo`), regalo del administrador
  (`manual`) o suscripción (`tier_grant`). Los sobres gratis (`free`) y los del día 7 (`daily`) los pide él y no son
  llegadas.
- **Día de gracia**: hoy sin reclamar y ayer tampoco; mañana la racha vuelve al día 1 (spec 009, RF-12).

## Requisitos funcionales (criterios de aceptación en EARS)

### Premios que vuelan
- RF-1: CUANDO el coleccionista reclame una recompensa diaria de galletas, EL SISTEMA hará volar pegatinas de galleta desde la pegatina del día hasta el contador de galletas a la vista, y el contador subirá como un marcador desde el valor anterior al nuevo mientras llegan; nunca cambiará de golpe.
- RF-2: CUANDO el coleccionista reclame un sobre gratis, EL SISTEMA hará volar una pegatina de sobre desde el botón hasta el acceso a «Mis sobres» de la navegación (la pestaña «Sobres» en móvil, «Mis sobres» en escritorio), que rebotará al recibirla y subirá su número; la carga gastada se apagará encogiéndose y el anillo empezará a llenarse.
- RF-3: EL SISTEMA moverá con el mismo marcador todos los contadores del coleccionista a la vista que cambien por un premio (galletas del panel de recompensas, galletas del pie de la barra lateral, número de sobres de la navegación).
- RF-4: MIENTRAS un premio vuela, EL SISTEMA no bloqueará la pantalla ni los botones; SI el destino no está a la vista, ENTONCES el premio volará hacia el borde de la pantalla más cercano al destino y el contador se actualizará igual; SI el coleccionista cambia de página antes de que termine, ENTONCES los contadores mostrarán el valor final.

### Celebración central
- RF-5: CUANDO el coleccionista reclame el día 7 de la racha, EL SISTEMA estampará la pegatina del día y mostrará la celebración central con el sobre de la colección elegida, el título «¡Racha completa!», confeti y un botón para cerrarla; al cerrarla, el sobre volará hasta la navegación como en RF-2 y la racha empezará de nuevo en la fila.
- RF-6: CUANDO el coleccionista entre en una página del coleccionista y tenga llegadas sin celebrar, EL SISTEMA mostrará una sola celebración central que las junte: cuántos sobres son, el sobre de cada colección y de dónde vienen («¡Bienvenida!», «Un regalo para ti», «Tu suscripción de este mes»), con un botón para ir a «Mis sobres» y otro para cerrarla.
- RF-7: EL SISTEMA celebrará cada llegada una sola vez, también si el coleccionista entra desde varios dispositivos; SI la celebración no llega a mostrarse (cierra la pestaña antes), ENTONCES se mostrará la próxima vez; un sobre anulado antes de celebrarse no se celebra.
- RF-8: EL SISTEMA mostrará en «Mis sobres», en cada colección con llegadas aún no vistas, una etiqueta «¡Nuevo!» con cuántas son; dejará de mostrarla cuando el coleccionista haya visitado «Mis sobres» con ellas o las haya abierto.
- RF-9: EL SISTEMA no mostrará la celebración de llegadas encima de la apertura de un sobre ni de «Abrir todos», ni mientras otra celebración esté abierta: esperará a la siguiente página o a que se cierre la anterior; las celebraciones salen de una en una y en el orden en que se ganaron.

### Racha
- RF-10: CUANDO el coleccionista reclame la recompensa diaria, EL SISTEMA estampará la pegatina de hoy (crece, cae en su sitio con un destello) antes de que vuelen las galletas o salga la celebración.
- RF-11: MIENTRAS la racha esté en su día de gracia, EL SISTEMA hará latir suavemente la pegatina de hoy y mostrará «¡Reclama hoy o pierdes la racha!» en lugar del texto habitual sobre el día de gracia; con la racha a salvo, ya reclamada o sin empezar no habrá latido.

### Sonido y vibración
- RF-12: EL SISTEMA reproducirá un tintineo cuando las galletas lleguen al contador, un «plop» cuando el sobre aterrice en la navegación y una fanfarria breve al abrirse una celebración central; los tres sonidos serán de dominio público (CC0), con su origen en `LICENSES.md`, y pasarán por el mismo motor y botón de silencio de la apertura (spec 013): silenciado, no suena nada.
- RF-13: CUANDO se abra una celebración central en un dispositivo con vibración y el sonido no esté silenciado, EL SISTEMA vibrará suavemente una vez; los premios que vuelan no vibran.
- RF-14: EL SISTEMA mostrará el botón de silencio también en la cabecera del coleccionista, en todas sus páginas, con el mismo estado que el de la apertura.

### Avisos
- RF-15: EL SISTEMA no mostrará avisos emergentes ni mensajes de éxito dentro de la tarjeta por reclamar recompensas; el premio se comunica solo con el vuelo o la celebración y, a los lectores de pantalla, con un anuncio de texto equivalente («Has recibido 10 galletas. Tienes 30.»).
- RF-16: SI reclamar falla (sin conexión, sesión caducada, ya reclamada), ENTONCES EL SISTEMA mostrará el error junto al botón con el estilo kawaii y, cuando tenga sentido reintentar, un botón «Reintentar»; no volará ni sonará nada.
- RF-17: EL SISTEMA conservará los avisos emergentes del panel de administración tal como están.

## Requisitos no funcionales
- Antes de programar, maquetas en Pencil en la lámina kawaii (celebración central en sus dos variantes, premio que
  vuela, pegatina estampada, latido, etiqueta «¡Nuevo!», error junto al botón, botón de silencio en la cabecera; en
  móvil y escritorio) aprobadas por el usuario.
- Todo con componentes del sistema de diseño: las piezas nuevas (celebración, premio que vuela, pegatina estampada)
  viven en `src/ui/game`, salen en `/sistema`, en `docs/DESIGN.md` y en el mapa de Pencil.
- Animaciones solo con `transform` y `opacity`; los vuelos no reservan sitio ni mueven nada alrededor. Presupuesto de
  250 kB por página (spec 013); los sonidos nuevos se cargan solo al sonar por primera vez.
- Con movimiento reducido: sin vuelos, estampado, latido ni confeti; los contadores cambian directamente y la
  celebración aparece sin animación. El sonido no depende del movimiento reducido, solo del botón de silencio.
- La celebración es un diálogo accesible (foco atrapado, Escape la cierra, el foco vuelve a donde estaba).
- Textos en inglés y español, con los plurales correctos (spec 014, RF-19).

## Casos límite
- Dos reclamos seguidos (dos sobres gratis): los vuelos se solapan y cada marcador sigue desde el valor que muestra.
- Llegada mientras el coleccionista navega (webhook de Patreon): se celebra en la siguiente página que cargue.
- Varias celebraciones pendientes (día 7 y una llegada): de una en una, la de la racha primero.
- Primer inicio de sesión: el sobre de bienvenida se celebra en la primera página tras entrar.
- Sobre llegado y anulado (reembolso) antes de celebrarse: no se celebra ni cuenta como nuevo.
- Colección de una llegada que ya no está publicada: la celebración la muestra igual; «Mis sobres» la trata como hoy.
- Pie de la barra lateral y panel de recompensas a la vez en escritorio: los dos marcadores suben.
- Día de gracia y día 7 posible mañana: el latido avisa igual; el texto es el mismo.
- Zona horaria cambiada (spec 009, RF-11): el error «todavía no» va junto al botón, sin vuelo.
- Demo: el coleccionista de la demo entra por primera vez con 3 sobres de muestra (`manual`); se celebran como regalo.

## Fuera de alcance
- Celebrar completar una colección o conseguir todas las holo (spec futura).
- Cambios en la apertura de sobres (confeti y celebración de rareza siguen como en la 014).
- Avisos fuera de la web (correo, notificaciones del navegador).
- Rediseño de los avisos del panel de administración.
- Sonidos nuevos más allá de los tres de RF-12.

## Criterios de finalización
Maquetas aprobadas; todos los RF con test en verde; E2E en los cuatro proyectos: reclamar la diaria (estampado, vuelo
y marcador) → reclamar un sobre gratis (vuelo hasta la navegación y rebote) → día 7 con el reloj de pruebas
(celebración y vuelo al cerrar) → entrar con llegadas (una celebración, una sola vez; etiqueta «¡Nuevo!» que
desaparece en la siguiente visita) → día de gracia con el reloj de pruebas (latido y texto) → error junto al botón
sin vuelo → ningún aviso emergente en las páginas del coleccionista → en movimiento reducido nada vuela ni late y la
celebración aparece igual; `pnpm budget` en verde; prueba del usuario en su teléfono.

## Decisiones de la entrevista (18 oct 2026)
Lo pequeño vuela y lo grande se celebra en el centro; las llegadas se celebran al entrar, una sola vez, y llevan
etiqueta «¡Nuevo!»; sonido propio para cada cosa por el motor de la apertura, vibración solo en la celebración;
la racha se estampa y late en el día de gracia, el día 7 se celebra; fuera los avisos del coleccionista, errores junto
al botón, el panel conserva los suyos. Supuestos a revisar: el sobre gratis de cada 12 h vuela y no se celebra; el
botón de silencio pasa también a la cabecera; completar una colección queda para otra spec.

Spec aprobada por el usuario el 18 oct 2026.
