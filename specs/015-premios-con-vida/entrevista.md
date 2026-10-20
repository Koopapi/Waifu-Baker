# Entrevista — Spec 015, premios con vida

Contexto: tras probar la demo kawaii (spec 014), el usuario quiere que recibir algo (galletas, un sobre, la racha)
se sienta como un premio y no como una alerta del sistema. Hoy, al reclamar, salen a la vez un aviso abajo a la
derecha y un mensaje verde dentro de la tarjeta; los contadores cambian de golpe; y los sobres que llegan sin
pedirlos (bienvenida, regalo, suscripción) no se avisan de ninguna forma. La publicación (antes 015) pasa a ser la
016 y el piloto de pago la 017.

1. **Cómo se siente recibir un premio** (18 oct 2026): C — las dos formas según el premio: lo pequeño (galletas) vuela
   hasta su sitio y el contador sube como un marcador, sin interrumpir; lo grande (sobres que llegan sin pedirlos, el
   día 7 de la racha) se celebra en el centro de la pantalla con confeti.
2. **Sobres que llegan sin pedirlos** (18 oct 2026): C — celebración central la primera vez que se entra después de
   recibirlos (una sola si llegan varios, con de dónde vienen) y, además, etiqueta «¡Nuevo!» en «Mis sobres» hasta
   verlos.
3. **Sonido y vibración** (18 oct 2026): A — sonido propio para cada cosa (tintineo al llegar las galletas, «plop» al
   aterrizar el sobre, fanfarria breve en la celebración), por el mismo motor y botón de silencio de la apertura;
   vibración suave solo en la celebración.
4. **Racha diaria** (18 oct 2026): A — la pegatina de hoy se estampa al reclamar y de ella salen las galletas volando;
   el día 7 además celebración central con el sobre; si la racha está en su día de gracia, la pegatina de hoy late
   suavemente para avisar.
5. **Avisos actuales** (18 oct 2026): A — fuera el aviso emergente y el mensaje de la tarjeta para el coleccionista; los
   errores van junto al botón con estilo kawaii; el panel de administración conserva sus avisos.

Supuestos que el usuario revisa en la spec: el sobre gratis de cada 12 h es rutina y vuela (no se celebra en el
centro); el botón de silencio pasa también a la cabecera del coleccionista, porque ahora suenan cosas fuera de la
apertura; completar una colección queda para otra spec.

Entrevista terminada (5 de 5).
