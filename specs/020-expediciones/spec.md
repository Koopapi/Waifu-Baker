# Spec 020 — Espacio de juegos con Expediciones

Estado: aprobada por el dueño el 25 oct 2026, con las decisiones derivadas y la holo a +15 %.

## Contexto y objetivo
Hoy una carta, una vez abierta, solo se mira en la colección: las comunes y las repetidas no sirven para nada y entre
un sobre gratis y el siguiente no hay nada que hacer. Esta spec abre un apartado «Juegos» y su primer juego,
Expediciones: el coleccionista manda equipos de 1 a 3 cartas a explorar zonas de un mapa y, al volver, recibe galletas,
fragmentos de mapa y, muy de vez en cuando, un sobre. El terreno de la personaje pesa más que la rareza, así que todas
las cartas tienen uso. El servidor decide todo con su reloj y su RNG; no hay forma de pagar para avanzar. Parte de la
propuesta de Bruno (versión 1), con el botín rediseñado por el dueño.

## Usuarios / actores
- **Coleccionista** con al menos una carta en su colección.
- **Administrador**, que define zonas, botín y rasgos de las personajes, y prueba el balance con el simulador.

## Historias de usuario
- H1: Como coleccionista quiero darles un uso a todas mis cartas, también a las comunes y repetidas.
- H2: Como coleccionista quiero saber antes de mandar un equipo qué tan bien le va a ir y qué voy a traer.
- H3: Como coleccionista quiero volver a la web varias veces al día a recoger lo que trajeron mis equipos.
- H4: Como coleccionista quiero que mis personajes favoritas se hagan más fuertes cuanto más las uso.
- H5: Como administrador quiero ajustar zonas y botín sin publicar una versión nueva y comprobar el balance antes.

## Vocabulario
- **Zona**: lugar del mapa con un terreno y una dificultad.
- **Niebla**: estado de una zona que el coleccionista aún no ha abierto.
- **Fragmento de mapa**: recurso que solo sale de expediciones y abre zonas con niebla.
- **Terreno**: Ciudad, Bosque, Costa, Ruinas o Montaña; lo tiene cada zona y cada personaje.
- **Rol**: especialidad de una personaje que cambia qué trae la expedición: Recolectora (más galletas), Cartógrafa (más
  fragmentos) o Buscatesoros (más probabilidad de sobre).
- **Equipo**: de 1 a 3 cartas que van juntas a una zona.
- **Espacio**: hueco para una expedición en curso; cada coleccionista tiene 2.
- **Poder**: fuerza del equipo, que depende de la rareza de cada carta, del acierto de terreno y del vínculo.
- **Calificación**: Difícil, Normal, Bien o Excelente, según el poder del equipo frente a la dificultad de la zona.
- **Vínculo**: experiencia y nivel de cada personaje para cada coleccionista, compartidos por todas sus cartas.

## Requisitos funcionales (criterios de aceptación en EARS)

### Espacio de juegos
- RF-1: EL SISTEMA ofrecerá al coleccionista un apartado «Juegos» en la navegación, con Expediciones como su primer juego.
- RF-2: MIENTRAS el coleccionista tenga expediciones listas para reclamar, EL SISTEMA mostrará en «Juegos» un contador
  con cuántas son.

### Mapa y zonas
- RF-3: EL SISTEMA mostrará en un mapa las zonas activas, cada una como abierta, con niebla (con los fragmentos que tiene
  y los que pide) o con una expedición en curso (con el tiempo que falta).
- RF-4: CUANDO un coleccionista entre por primera vez en Expediciones, EL SISTEMA le dejará abiertas las zonas iniciales
  y con niebla las demás.
- RF-5: CUANDO el coleccionista tenga los fragmentos que pide una zona con niebla y pulse «Abrir», EL SISTEMA descontará
  esos fragmentos y abrirá la zona solo para él.
- RF-6: SI el coleccionista no tiene los fragmentos que pide la zona, ENTONCES EL SISTEMA no la abrirá ni descontará
  nada.

### Armar el equipo
- RF-7: EL SISTEMA dejará armar un equipo de 1 a 3 cartas de la colección del coleccionista para una zona abierta.
- RF-8: SI una carta (en su versión normal u holo) ya está en una expedición en curso, ENTONCES EL SISTEMA no dejará
  elegirla para otra.
- RF-9: MIENTRAS el coleccionista no tenga desbloqueado el contenido 18+, EL SISTEMA no mostrará ni aceptará cartas 18+
  en el equipo.
- RF-10: EL SISTEMA mostrará primero las cartas cuyo terreno coincide con el de la zona y dejará filtrarlas por terreno,
  rol y rareza.
- RF-11: EL SISTEMA dará a una carta en el terreno de su zona más poder que a una carta dos rarezas por encima fuera de
  su terreno.
- RF-12: EL SISTEMA sumará al poder de cada carta un 2 % por cada nivel de vínculo de su personaje.
- RF-13: EL SISTEMA dará a la versión holo de una carta un 15 % más de poder que a su versión normal.
- RF-14: MIENTRAS el coleccionista arma el equipo, EL SISTEMA mostrará el poder del equipo frente a la dificultad de la
  zona, la calificación esperada y el botín fijo que traería en cada duración.

### Enviar, esperar y cancelar
- RF-15: CUANDO el coleccionista envíe el equipo eligiendo 30 min, 2 h u 8 h, EL SISTEMA guardará, con la hora del
  servidor, cuándo vuelve, el poder y la calificación.
- RF-16: SI el coleccionista ya usa sus 2 espacios, ENTONCES EL SISTEMA no enviará el equipo e informará del motivo.
- RF-17: SI después de enviar cambian el vínculo, el terreno o el rol de una personaje, o la configuración de la zona,
  ENTONCES EL SISTEMA mantendrá para esa expedición la calificación y el botín guardados al enviar.
- RF-18: CUANDO el coleccionista cancele una expedición en curso y lo confirme, EL SISTEMA devolverá las cartas sin
  botín ni experiencia de vínculo.

### Reclamar y reporte
- RF-19: SI el coleccionista intenta reclamar antes de la hora de vuelta, ENTONCES EL SISTEMA no entregará nada.
- RF-20: CUANDO el coleccionista reclame una expedición que ya volvió, EL SISTEMA entregará en una sola operación el
  botín fijo que mostró al enviar y la experiencia de vínculo de las personajes del equipo.
- RF-21: CUANDO el coleccionista reclame una expedición que ya volvió, EL SISTEMA decidirá en el servidor, con la
  probabilidad publicada para esa zona y duración, si además gana un sobre.
- RF-22: CUANDO el coleccionista gane un sobre en una expedición, EL SISTEMA le dejará elegir de qué colección SFW
  publicada es y lo celebrará como los sobres que llegan sin pedirlos (spec 015).
- RF-23: SI la misma expedición se reclama dos veces (doble toque, dos pestañas), ENTONCES EL SISTEMA entregará el
  botín una sola vez y mostrará el mismo reporte.
- RF-24: EL SISTEMA mostrará al reclamar un reporte con la zona, el equipo, la calificación, de 1 a 3 frases entre las
  personajes del equipo, el botín y la experiencia de vínculo ganada.

### Vínculo
- RF-25: EL SISTEMA mostrará en la ficha de cada carta el nivel de vínculo de su personaje y, si la carta está en una
  expedición, la hora a la que vuelve.

### Probabilidades
- RF-26: EL SISTEMA publicará en la página de Probabilidades la probabilidad de ganar un sobre en cada zona y duración.

### Panel de administración
- RF-27: EL SISTEMA permitirá al administrador asignar a cada personaje un terreno y un rol.
- RF-28: EL SISTEMA permitirá al administrador crear y editar zonas con nombre, terreno, dificultad, fragmentos para
  abrirla, orden en el mapa, imagen y si está activa.
- RF-29: EL SISTEMA permitirá al administrador fijar, por zona y duración, el botín fijo de cada calificación y la
  probabilidad de sobre.
- RF-30: CUANDO el administrador simule una zona con un equipo y una duración, EL SISTEMA mostrará la calificación, el
  botín medio y los sobres esperados por día de un coleccionista que use sus 2 espacios.

## Requisitos no funcionales
- El servidor decide: la hora de vuelta, la calificación, el botín y el sobre al azar salen del servidor (reloj del
  servidor y RNG criptográfico) y se guardan antes de responder; el navegador solo muestra.
- Concurrencia: reclamar, cancelar y enviar la misma carta en dos expediciones a la vez tienen test de concurrencia.
- Rendimiento: animaciones del mapa y del reporte a 60 fps en Pixel 6a e iPhone 12, solo con `transform` y `opacity`;
  movimiento reducido respetado. La página de Expediciones no pasa de 250 kB de JavaScript en la primera carga.
- Textos nuevos, frases del reporte incluidas, en inglés y español.
- Sistema de diseño: pantallas con componentes de `ui/` y su maqueta en Pencil aprobada antes del plan.

## Casos límite
- Coleccionista sin cartas: Expediciones explica que necesita cartas y enlaza a «Mis sobres».
- Solo cartas 18+ sin el contenido 18+ desbloqueado: igual que sin cartas (RF-9).
- Varias copias de la misma carta: cuentan como una sola por versión; la holo es otra versión (RF-8).
- Una zona se desactiva con expediciones en curso: esas expediciones terminan y se reclaman con lo guardado (RF-17).
- La zona cambia de dificultad o de botín con expediciones en curso: se respeta lo guardado al enviar (RF-17).
- Reloj del teléfono adelantado: no cambia nada, manda la hora del servidor (RF-15, RF-19).
- Cuenta borrada con expediciones en curso: se conservan con la cuenta durante los 30 días de recuperación.
- Bélgica: el sobre ganado llega como cualquier sobre gratis; abrirlo sigue bloqueado allí (spec 004, RF-8).

## Fuera de alcance
- Cartas exclusivas por zona y la colección «Expedición · Vol. 1».
- Entrenar cartas con repetidas y niveles de carta.
- Recompensas de vínculo (frase en la ficha, marco, fondo alterno), dúos y escenas propias.
- Eventos con efecto en el botín, roles Guardiana y Carismática.
- Editar las frases del reporte desde el panel.
- Acelerar expediciones o tener más espacios, con galletas o con dinero; ventajas por tier de Patreon.
- Más de 4 zonas, zonas temporales y expediciones comunitarias.
- Otros juegos del espacio de juegos.
- Gastar galletas en algo nuevo (tienda, spec 021).

## Criterios de finalización
Cada RF con su test en verde y la suite completa en verde (E2E en 4 proyectos): abrir una zona con fragmentos, armar un
equipo con la calificación en vivo, enviar, cancelar, reclamar con reloj simulado, sobre ganado con RNG forzado, doble
reclamo, carta ocupada, filtro 18+ y simulador del panel; test de concurrencia; checklist en teléfono (60 fps, mapa y
reporte); `pnpm budget` dentro del límite; demo manual del dueño.

## Decisiones (25 oct 2026)
- Versión 1 de Bruno: «Juegos» con Expediciones, 4 zonas (2 abiertas, 2 con niebla), terreno y rol, calificación previa,
  3 duraciones, reporte con frases y vínculo; en el panel zonas, botín y simulador.
- Botín fijo y conocido antes de enviar, más un sobre al azar difícil de conseguir con probabilidad publicada.
- Sin cartas exclusivas por zona en esta versión.
- Todas las cartas pueden ir; las 18+ con el doble filtro.
- Frases fijas escritas por el equipo en los dos idiomas.
- Vínculo con niveles y +2 % de poder por nivel; sin recompensas todavía.
- La versión holo da +15 % de poder.
- Derivadas, confirmadas por el dueño al aprobar: el sobre ganado es de una colección SFW publicada que elige el
  coleccionista, como el del día 7 (spec 009); solo los roles que cambian el botín (Recolectora, Cartógrafa,
  Buscatesoros), porque Guardiana y Carismática dependen de eventos que quedan fuera; los valores iniciales de poder,
  dificultad y botín salen de la propuesta de Bruno y se fijan en el plan.

## Dudas abiertas
- Ninguna.
