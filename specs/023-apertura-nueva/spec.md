# Spec 023 — Apertura nueva: el sobre se rasga de verdad

Estado: aprobada por el dueño el 28 oct 2026, con las decisiones derivadas.

## Contexto y objetivo
La apertura es el momento central del juego y hoy se siente plana: el sobre es una imagen que se corta y las cartas
salen en abanico. El laboratorio de sobres de Bruno demostró una apertura más física: el sobre tiene volumen, foil y
dientes de rasgado, la tira se arranca siguiendo el dedo y las cartas salen del sobre como un mazo que se va pasando.
Esta spec lleva esa sensación a la apertura real, a «Abrir todos», al simulador del panel y a «Mis sobres», con el
sobre plata y el gold diferenciados (spec 022).

## Usuarios / actores
- **Coleccionista**, que abre sus sobres en el teléfono o en el ordenador.
- **Administrador**, que simula aperturas desde el panel.

## Historias de usuario
- H1: Como coleccionista quiero rasgar el sobre con el dedo y sentir que lo abro de verdad.
- H2: Como coleccionista quiero que cada carta se descubra con suspense, dejando la mejor para el final.
- H3: Como coleccionista quiero distinguir a simple vista un sobre plata de uno gold.
- H4: Como administrador quiero simular la apertura tal como la verá el coleccionista.

## Requisitos funcionales (criterios de aceptación en EARS)

### El sobre
- RF-1: EL SISTEMA mostrará cada sobre con la imagen de su colección (la de hoy: el sobre compuesto con la portada o la
  imagen de sobre subida en el panel), con volumen, textura de foil y una línea de dientes de rasgado en la parte de
  arriba.
- RF-2: EL SISTEMA dará al sobre plata un foil plateado y al sobre gold un foil dorado con destellos.
- RF-3: EL SISTEMA mostrará en el sobre la etiqueta PLATA o GOLD.
- RF-4: MIENTRAS el sobre espera a ser rasgado, EL SISTEMA lo inclinará siguiendo el puntero o la inclinación del
  teléfono y moverá el brillo del foil con él.
- RF-5: EL SISTEMA mostrará el mismo sobre (con su foil plata o gold) en «Mis sobres», en la apertura, en «Abrir todos» y
  en el simulador del panel.

### El rasgado
- RF-6: CUANDO el coleccionista arrastre a lo largo de la línea de dientes, EL SISTEMA irá rasgando la tira de arriba
  siguiendo el dedo o el puntero, con el borde roto visible.
- RF-7: SI el coleccionista suelta antes de rasgar el 60 % de la línea, ENTONCES EL SISTEMA devolverá la tira a su sitio
  y el sobre seguirá cerrado.
- RF-8: CUANDO el rasgado pase del 60 %, EL SISTEMA terminará de arrancar la tira, la dejará caer fuera de la pantalla y
  abrirá el sobre.
- RF-9: EL SISTEMA ofrecerá un botón «Abrir sin deslizar» que abre el sobre con la misma animación de rasgado.
- RF-10: EL SISTEMA pedirá el contenido del sobre al servidor solo cuando el rasgado se confirme; el gesto no cambia el
  contenido.
- RF-11: SI el servidor no responde o devuelve un error al abrir, ENTONCES EL SISTEMA dejará el sobre cerrado, avisará
  del error y permitirá intentarlo de nuevo.

### El mazo
- RF-12: CUANDO el sobre se abra, EL SISTEMA sacará las cartas del sobre como un mazo boca abajo.
- RF-13: EL SISTEMA ordenará el mazo de menor a mayor rareza, de modo que la carta más rara sea la última en revelarse.
- RF-14: CUANDO la carta de arriba sea rara o mejor, EL SISTEMA hará brillar sus bordes con el color de su rareza antes
  de revelarla, más intenso cuanto más rara.
- RF-15: CUANDO el coleccionista toque la carta de arriba o la deslice, EL SISTEMA la volteará y la revelará con los
  efectos de su rareza (destellos, confeti, destello de luz y celebración en legendaria y EX, como hoy).
- RF-16: CUANDO el coleccionista toque o deslice una carta ya revelada, EL SISTEMA la apartará hacia el lado del gesto y
  dejará a la vista la siguiente.
- RF-17: EL SISTEMA revelará viva la carta rara o mejor y plana la común (spec 022).
- RF-18: CUANDO se aparte la última carta, EL SISTEMA mostrará el resumen del sobre (miniaturas, rareza, «¡Nueva!»).
- RF-19: EL SISTEMA permitirá revelar y apartar la carta de arriba con la tecla Intro o Espacio.

### «Abrir todos», simulador y reanudar
- RF-20: CUANDO empiece «Abrir todos», EL SISTEMA mostrará en la ráfaga los sobres del lote rasgándose con el sobre
  nuevo de su tipo.
- RF-21: EL SISTEMA usará en el simulador del panel la misma apertura que ve el coleccionista, con el tipo de sobre
  elegido.
- RF-22: SI el coleccionista sale o recarga después de rasgar y antes de ver todas las cartas, ENTONCES EL SISTEMA, al
  volver, retomará la apertura en el mazo sin pedir rasgar de nuevo.

### Movimiento reducido, sonido y vibración
- RF-23: MIENTRAS el sistema tenga activado el movimiento reducido, EL SISTEMA abrirá el sobre con el botón, sin
  rasgado animado ni inclinación, y revelará cada carta con un fundido.
- RF-24: EL SISTEMA sonará al rasgar, al arrancar la tira y al revelar cada carta, y vibrará en las raras o mejores,
  como hoy.

## Requisitos no funcionales
- El servidor decide el contenido; la apertura solo lo anima (constitución).
- Rendimiento: menos del 5 % de fotogramas largos durante el rasgado y el revelado en un Pixel 6a y un iPhone 12; la
  página de apertura no supera los 250 KB comprimidos (spec 004).
- Funciona igual en teléfono (táctil) y ordenador (ratón y teclado), en vertical y apaisado, sin salirse de la pantalla.
- Textos nuevos en inglés y español.
- Maquetas en Pencil aprobadas antes del plan: el sobre plata y el gold con sus dientes, el rasgado a medias y el mazo.

## Casos límite
- Sobre de una colección sin imagen de sobre ni portada: el sobre genérico de hoy, con su foil plata o gold.
- Soltar el dedo justo en el 60 %: cuenta como rasgado.
- Rasgar en sentido contrario (de derecha a izquierda): también rasga.
- Dos toques rápidos sobre la carta de arriba: la revela y no se salta ninguna sin verla.
- Un sobre de una sola carta: el mazo tiene una carta y el resumen sale al apartarla.
- Girar el teléfono durante la apertura: el sobre y el mazo se recolocan sin perder el progreso.
- Sobre 18+ sin la verificación de edad: no se abre (como hoy).

## Fuera de alcance
- Un arte distinto para el sobre plata y el gold (más adelante, en otra spec).
- Sobres armados por capas en el panel.
- Sonidos nuevos (se reutilizan los de hoy).
- Cambios en las probabilidades, las fuentes de sobres o la economía.

## Criterios de finalización
Cada RF con su test en verde y la suite completa en verde (E2E en 4 proyectos): rasgado con dedo y ratón, umbral del
60 %, botón «Abrir sin deslizar», error al abrir, mazo en orden de rareza, revelado y apartado por toque, deslizamiento
y teclado, resumen, reanudar, «Abrir todos», simulador y «Mis sobres» con plata y gold, movimiento reducido;
checklist en teléfono (`dispositivo.md`); demo del dueño.

## Decisiones (28 oct 2026)
- Imagen única por colección, la de hoy; el código pone los dientes, el foil y el volumen.
- Plata y gold con el mismo arte por ahora; se distinguen por el foil y la etiqueta.
- Mazo de Bruno con los efectos de revelado de hoy (propuesta, al pedir el dueño «la que se vea más sorprendente»).
- Alcance: abrir un sobre, «Abrir todos», simulador y «Mis sobres».
- Derivadas, confirmadas por el dueño al aprobar: la más rara al final (RF-13); umbral del 60 % y botón «Abrir sin deslizar».

## Dudas abiertas
- Ninguna.
