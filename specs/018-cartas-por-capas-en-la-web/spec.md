# Spec 018 — Las cartas por capas se ven en toda la web

Estado: aprobada por el dueño el 23 oct 2026.

## Contexto y objetivo
Desde la spec 017 todas las cartas se arman por capas en el panel, pero el coleccionista sigue viendo la imagen
provisional compuesta con el marco de Pencil. Esta spec lleva la carta por capas a toda la web: una **imagen fija** de
la carta armada sustituye a la compuesta en todas partes, y la carta se ve **viva** (parallax, partículas, brillo y sello
flotante) cuando se mira en grande: al revelarla en la apertura y en su ficha. También fija qué ve quien no tiene
cuenta y cómo se revisan los cambios de capas en las colecciones 18+. No cambia ninguna regla de rarezas, sorteo,
probabilidades ni concesiones.

## Usuarios / actores
- **Coleccionista**: abre sobres y mira su colección.
- **Visitante sin cuenta**: ve álbumes públicos y vistas previas de enlaces compartidos.
- **Administrador**: arma las cartas (spec 017) y revisa las de colecciones 18+.

## Historias de usuario
- H1: Como coleccionista quiero ver la carta viva al revelarla y en su ficha, para que se sienta especial.
- H2: Como coleccionista quiero que la colección cargue rápido en el teléfono aunque tenga muchas cartas.
- H3: Como coleccionista con teléfono quiero poder inclinar la carta moviendo el celular, si yo lo activo.
- H4: Como dueño quiero que quien no tiene la carta solo vea una versión fija, reducida y con marca de agua.
- H5: Como dueño quiero que ningún cambio en una carta 18+ publicada llegue a los coleccionistas sin revisión.

## Vocabulario
- **Imagen fija**: una imagen de la carta completa armada (fondo, chica con su encuadre, adornos, partículas en reposo,
  marco y sello de su escalón), sin movimiento.
- **Carta viva**: la carta por capas animada: se inclina con parallax, con partículas, brillo y sello flotante.
- **Ficha de la carta**: la vista en grande de una carta de la colección del coleccionista.
- El resto (capas, escalón, carta armada, revisión 18+) como en las specs 016 y 017.

## Requisitos funcionales (criterios de aceptación en EARS)

### Imagen fija
- RF-1: EL SISTEMA tendrá para cada carta armada una imagen fija de la carta completa.
- RF-2: EL SISTEMA usará la imagen fija en lugar de la imagen compuesta con el marco de Pencil en todas partes donde se
  muestre la carta sin animar.
- RF-3: CUANDO se guarden las capas de una carta o cambie su rareza, EL SISTEMA regenerará su imagen fija.
- RF-4: SI no se puede generar la imagen fija, ENTONCES EL SISTEMA no guardará el cambio e indicará el motivo.
- RF-5: EL SISTEMA dará a la imagen fija de una carta holo un acabado arcoíris visible.

### Carta viva
- RF-6: CUANDO el coleccionista revele una carta al abrir un sobre, EL SISTEMA la mostrará como carta viva, con el sello
  apareciendo en ese momento.
- RF-7: CUANDO el coleccionista abra la ficha de una carta de su colección, EL SISTEMA la mostrará como carta viva.
- RF-8: EL SISTEMA mostrará la imagen fija en la cuadrícula de la colección, el resumen de la apertura, «Abrir todos»,
  la portada del sobre y el resto de miniaturas.
- RF-9: EL SISTEMA mostrará la versión holo de una carta viva con un brillo arcoíris que sigue la inclinación.
- RF-10: EL SISTEMA inclinará la carta viva con el ratón en escritorio y arrastrando el dedo en pantallas táctiles, y la
  balanceará suavemente mientras nadie la toque.
- RF-11: DONDE el dispositivo tenga giroscopio, EL SISTEMA ofrecerá en la ficha de la carta un interruptor «Mover con el
  teléfono».
- RF-12: CUANDO el coleccionista active «Mover con el teléfono», EL SISTEMA pedirá el permiso que exija el dispositivo y,
  si se concede, la carta seguirá la inclinación del teléfono.
- RF-13: SI el permiso se niega, ENTONCES EL SISTEMA dejará el interruptor apagado, lo indicará y la carta seguirá
  inclinándose con el dedo.
- RF-14: MIENTRAS el usuario prefiera menos movimiento (ajuste del sistema), EL SISTEMA mostrará la imagen fija en lugar
  de la carta viva.

### Quién ve qué
- RF-15: EL SISTEMA mostrará en el álbum público y en las vistas previas de enlaces compartidos una versión reducida de la
  imagen fija con marca de agua.
- RF-16: EL SISTEMA solo entregará las capas de una carta (para verla viva) y su imagen fija completa a quien la tenga en
  su colección, con enlaces que caducan.
- RF-17: EL SISTEMA solo entregará las capas y la imagen fija de una carta 18+ a quien cumpla el doble control de edad.

### Revisión 18+
- RF-18: SI se cambian las capas de una carta de una colección 18+ publicada, ENTONCES EL SISTEMA dejará el cambio
  pendiente de revisión y los coleccionistas seguirán viendo la versión ya revisada.
- RF-19: CUANDO un administrador apruebe el cambio pendiente («personaje claramente adulto»), EL SISTEMA mostrará a los
  coleccionistas la nueva versión.
- RF-20: CUANDO un administrador descarte el cambio pendiente, EL SISTEMA lo quitará y la carta seguirá como estaba.
- RF-21: EL SISTEMA indicará en el panel qué cartas tienen cambios de capas pendientes de revisión, con enlace a cada una.

## Requisitos no funcionales
- Rendimiento: la revelación y la ficha con la carta viva a 60 fps en Pixel 6a e iPhone 12 (constitución, principio 9);
  animaciones solo con `transform` y `opacity`.
- Peso: ninguna página del coleccionista pasa de 250 kB de JavaScript en la primera carga; la carta viva se descarga
  solo donde se usa.
- La imagen fija se ve igual que la carta viva en reposo (mismo encuadre, marco y sello).
- Textos nuevos en inglés y español.
- Sistema de diseño: la ficha con la carta viva, el interruptor del giroscopio y el aviso de cambios pendientes tienen su
  maqueta en Pencil.

## Casos límite
- Colección con cientos de cartas: la cuadrícula solo usa imágenes fijas (RF-8).
- Teléfono sin giroscopio o navegador que no lo permite: no se ofrece el interruptor (RF-11).
- Permiso del giroscopio negado: la carta sigue con el dedo (RF-13).
- Usuario con «reducir movimiento»: imagen fija (RF-14).
- Varios cambios seguidos en una carta 18+ publicada: queda pendiente solo el último (RF-18).
- Carta holo vista en miniatura: el acabado arcoíris se ve en la imagen fija (RF-5).
- Fallo al generar la imagen fija: el cambio no se guarda (RF-4).

## Fuera de alcance
- «Abrir todos» dinámico (spec 019): aquí solo cambia a la imagen fija.
- Carta viva en el álbum público o en zonas sin sesión.
- Cambios en el editor del panel o en cómo se arman las cartas (spec 017).
- Tema Street pop (spec 022).
- Cambios en rarezas, sorteo, probabilidades o concesiones.

## Criterios de finalización
Cada RF con su test en verde y la suite completa en verde; E2E en los 4 proyectos: abrir un sobre y ver la carta viva al
revelarla, ficha con carta viva, colección con imágenes fijas, álbum público con marca de agua, imagen fija con acabado
holo, «reducir movimiento» con imagen fija, cambio en carta 18+ publicada pendiente hasta aprobarlo; checklist manual en
un teléfono (giroscopio con permiso y 60 fps); `pnpm budget` dentro del límite; demo manual del dueño.

## Decisiones (23 oct 2026)
- Carta viva al verla en grande (revelación y ficha); imagen fija en cuadrículas, resúmenes y miniaturas.
- Zonas públicas: imagen fija reducida con marca de agua.
- Giroscopio con un interruptor en la ficha que pide el permiso solo si se activa.
- 18+: los cambios de capas en publicadas quedan pendientes; se ve la versión revisada hasta aprobarlos.
- Holo: brillo arcoíris encima de la carta (viva y fija).

## Dudas abiertas
- Ninguna.
