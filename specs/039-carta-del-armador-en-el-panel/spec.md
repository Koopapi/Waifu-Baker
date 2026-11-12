# Spec 039 — La carta del armador también en el panel

Estado: **aprobada por el dueño el 12 nov 2026**, tras la entrevista del mismo día.

Decisiones del dueño en la entrevista:
1. Ya desplegadas las specs 037 y 038, el simulador de apertura del panel todavía muestra la carta con el marco, la
   insignia y el brillo de la escena anterior. Se ven:
   - el sello de rareza dos veces: el del armador y el de la escena;
   - la letra pequeña de la rareza junto al nombre;
   - un brillo gris que el armador no tiene.

   La carta tiene que verse siempre como la vista final del armador, en todas las vistas donde se vea.
2. Pasa lo mismo en otras dos vistas del panel:
   - la vista previa de la izquierda en el editor de una carta;
   - las cartas de muestra del diseñador de sobres.
3. Editor de una carta: se quita la vista previa anterior, porque el armador ya tiene la suya.
4. Diseñador de sobres: las cartas de muestra salen vivas, como en la apertura real.
5. Añadido al implementar (pendiente de confirmar por el dueño): la escena de apertura recorta la carta viva por sus
   bordes, así que el sello del armador, que sobresale por la esquina, sale cortado. Pasa en el simulador y también en
   la apertura del coleccionista, desde antes de esta spec. Se arregla en la misma escena, para las dos.

## Contexto y objetivo
La spec 037 llevó la vista del armador a todas las pantallas del coleccionista, pero dejó fuera tres vistas del panel.
Esas tres vistas reciben solo la imagen fija de la carta, que ya trae marco y sello, y le ponen encima el marco, la
insignia y el brillo de antes. Quien diseña ve en el panel una carta distinta de la que armó y de la que recibe el
coleccionista.

El objetivo es que, también en el panel, cada carta armada se vea como en el armador.

## Usuarios / actores
- **Administrador** (el dueño y quien colabora en el diseño): arma cartas y sobres, y simula aperturas.

## Historias de usuario
- H1: Como administrador quiero que el simulador muestre las cartas como las recibe el coleccionista, para revisar un
  sobre sin abrir uno de verdad.
- H2: Como administrador quiero ver en el diseñador de sobres las cartas reales de la colección como saldrán, para
  ajustar el sobre con ellas.
- H3: Como administrador quiero una sola vista previa en el editor de una carta, la del armador, para no dudar de cuál
  es la buena.

## Vocabulario
- **Vista del armador**: la de la spec 034. Es la misma que ve el coleccionista al revelar la carta en la apertura.
- **Carta armada**: una carta con configuración de capas.
- **Imagen fija de la carta**: la foto de la carta en reposo, igual a la vista del armador (spec 037).
- **Insignia de rareza de la escena**: la insignia con la letra de la rareza que la escena de apertura pone encima de la
  carta, y la letra pequeña antes del código de la colección.

## Requisitos funcionales (criterios de aceptación en EARS)

### Simulador de apertura
- RF-1: CUANDO el administrador revele una carta armada en el simulador, EL SISTEMA la mostrará con la vista del armador.
- RF-2: MIENTRAS se vea una carta armada en el simulador, EL SISTEMA mostrará su sello de rareza una sola vez: el del
  armador.
- RF-3: CUANDO se revele una carta armada en el simulador, EL SISTEMA no mostrará la insignia de rareza de la escena.
- RF-4: CUANDO una copia holo salga en el simulador, EL SISTEMA la revelará con la vista previa holo del armador.
- RF-5: EL SISTEMA mostrará en el resumen del simulador la imagen fija de cada carta armada, sin insignia de rareza.
- RF-6: CUANDO una copia holo salga en el simulador, EL SISTEMA mostrará en el resumen su imagen fija holo.
- RF-7: EL SISTEMA no aplicará en el simulador los efectos del vínculo con un personaje (spec 029).
- RF-8: MIENTRAS una carta 18+ tenga cambios pendientes de revisión, EL SISTEMA mostrará en el simulador lo último
  aprobado.
- RF-9: SI una carta del simulador no tiene configuración de capas, ENTONCES EL SISTEMA la mostrará con su imagen fija y
  su insignia de rareza (spec 037, RF-25).

### Sello completo en la escena de apertura
- RF-17: MIENTRAS se vea una carta viva en la escena de apertura (simulador o apertura del coleccionista), EL SISTEMA
  mostrará su sello completo, también la parte que sobresale de la carta, como en el armador.

### Editor de una carta
- RF-10: EL SISTEMA no mostrará en el editor de una carta la vista previa anterior, con su casilla de holo y su pista de
  inclinación.
- RF-11: EL SISTEMA seguirá mostrando en el editor de una carta la vista previa del armador.
- RF-12: EL SISTEMA seguirá mostrando en el editor de una carta el cambio de arte y la nota del arte pendiente de
  revisión.

### Diseñador de sobres
- RF-13: CUANDO salga una carta de muestra armada en el diseñador de sobres, EL SISTEMA la mostrará con la vista del
  armador, como en la apertura real.
- RF-14: MIENTRAS se vea una carta de muestra armada, EL SISTEMA mostrará su sello de rareza una sola vez: el del armador.
- RF-15: SI una carta de muestra no tiene configuración de capas, ENTONCES EL SISTEMA la mostrará con su imagen fija.
- RF-16: SI la colección no tiene cartas con rareza, ENTONCES EL SISTEMA seguirá usando la carta de ejemplo del paquete
  de diseño (spec 030).

## Requisitos no funcionales
- Sistema de diseño: el simulador y el diseñador montan la carta viva con el mismo componente que la apertura real y la
  ficha de la carta. Sin copias por pantalla.
- Rendimiento: el diseñador solo monta viva la carta de muestra que está a la vista.
- Seguridad: las capas solo se sirven a administradores, con los mismos enlaces del armador.

## Casos límite
- Colección con cartas armadas y cartas sin capas: cada una se ve según tenga o no capas.
- Copia holo de una carta guardada ya con holo: la misma vista holo.
- Sobre con más cartas que cartas de muestra: las cartas se repiten, como hoy.
- Carta 18+ en el diseñador de sobres: lo último aprobado, como en el simulador.

## Fuera de alcance
- Cambiar el armador, el sobre o la escena de apertura del coleccionista.
- La demo y el laboratorio (siguen con sus cartas de ejemplo).
- Las cuadrículas de cartas del panel (ya usan la imagen fija del armador).

## Criterios de finalización
Cada RF con su test en verde:
- **Unidad**: qué carta recibe el simulador (viva o fija, holo o normal, sin efectos de vínculo, lo aprobado de una carta
  18+); qué carta de muestra recibe el diseñador.
- **E2E**:
  - el simulador revela una carta armada con la vista del armador, el sello una sola vez y sin la insignia de la escena;
  - el sello sobresale sin recortarse en el simulador y en la apertura del coleccionista;
  - el resumen del simulador muestra la imagen fija, también la holo;
  - el editor de una carta sin la vista previa anterior;
  - el diseñador de sobres saca una carta de muestra armada con la vista del armador.

Además: capturas del armador junto al simulador y junto al diseñador, revisadas por el dueño. E2E de escritorio
afectadas en verde y la E2E completa en el CI.

## Dudas abiertas
- Ninguna.
