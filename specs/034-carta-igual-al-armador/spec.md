# Spec 034 — La carta se ve igual que en el armador

Estado: **aprobada por el dueño el 9 nov 2026**, tras la entrevista del mismo día.

Decisiones del dueño en la entrevista:
1. El colaborador de diseño y el dueño ven cuatro diferencias entre el armador y la apertura:
   - el brillo y el holo;
   - el movimiento;
   - el encuadre y el tamaño;
   - las comunes, que salen planas.
2. **Lo que se ve en el armador al pulsar «Guardar» es la carta final**, con sus efectos, partículas, profundidades y
   parallax. Esa vista se usa en la apertura de un sobre, en «Abrir todos» y en la ficha de la carta de «Mi colección».
3. Las comunes también se ven vivas. Ya no hay comunes planas fuera del armador: se deja la decisión de la spec 022,
   RF-4. Quien arma la carta decide qué tan «plana» se ve (por ejemplo, con poca profundidad o sin partículas).
4. Los efectos del vínculo (spec 029) se mantienen, sumados encima de la vista del armador.
5. La profundidad del parallax, la inclinación, el movimiento solo y la «Vista previa holo» se guardan con cada carta.
   Hoy son solo de la vista previa del armador. Si la carta se guarda con el holo activado, todas sus copias se ven
   holo.

## Contexto y objetivo
El colaborador de diseño arma cada carta en el armador hasta que se ve como quiere, pero el coleccionista la ve distinta al abrir el sobre.
Las pantallas usan la misma carta por capas, pero cada una la monta a su manera:
- La apertura la pone encima de la imagen fija, le añade su propio brillo y su propia inclinación, y la estira a otra
  proporción.
- La profundidad, la inclinación y el movimiento que se ajustan en el armador no se guardan, así que fuera de él se usan
  los valores de fábrica.

El objetivo es que el coleccionista vea la carta tal como quedó en el armador, en la apertura, en «Abrir todos» y en
su ficha, con una sola forma de mostrarla.

## Usuarios / actores
- **Administrador** (el dueño y quien colabora en el diseño): arma la carta y ajusta cómo se mueve.
- **Coleccionista**: abre sobres y mira sus cartas.

## Historias de usuario
- H1: Como administrador quiero que la carta que armo sea la que ve el coleccionista, para no tener que adivinar cómo
  quedará.
- H2: Como administrador quiero guardar cuánto se mueve cada carta, para ajustar el parallax de cada ilustración.
- H3: Como coleccionista quiero ver mi carta con todo su efecto al abrirla y al mirarla en mi colección.

## Requisitos funcionales (criterios de aceptación en EARS)

En esta spec, «la vista del armador» es la carta tal como la muestra la vista previa del armador en el momento de
guardarla. Incluye:
- sus capas con su encuadre;
- el marco, el sello y las partículas;
- el brillo, el holo y su intensidad;
- la profundidad del parallax, la inclinación y el movimiento solo.

Todo lo que cambia la vista previa se guarda con la carta.

### La misma vista
- RF-1: CUANDO el coleccionista voltee una carta en la apertura de un sobre, EL SISTEMA la mostrará con la vista del
  armador.
- RF-2: CUANDO «Abrir todos» muestre una carta destacada, EL SISTEMA la mostrará con la vista del armador.
- RF-3: CUANDO el coleccionista abra la ficha de una carta en «Mi colección», EL SISTEMA la mostrará con la vista del
  armador.
- RF-4: EL SISTEMA mostrará la carta en esas tres pantallas con la proporción del armador (700 × 991), sin estirarla ni
  recortarla, a cualquier tamaño.
- RF-5: EL SISTEMA no añadirá a la carta en esas pantallas otro brillo, otro holo, otra inclinación ni otro marco que
  los de la vista del armador.
- RF-6: EL SISTEMA conservará en la apertura el volteo de la carta y su entrada (el brillo que barre y el sello que
  salta).
- RF-7: CUANDO una copia sea holo (porque así salió en el sobre), EL SISTEMA la mostrará como el armador con la vista
  previa holo activada.
- RF-8: DONDE el coleccionista tenga nivel de vínculo con el personaje, EL SISTEMA sumará los efectos del vínculo
  (spec 029) a la vista del armador.

### Todas las rarezas
- RF-9: EL SISTEMA mostrará las cartas Comunes con la vista del armador en la apertura, en «Abrir todos» y en la ficha,
  igual que las demás rarezas.
- RF-10: EL SISTEMA generará la imagen fija de una carta (miniaturas y álbum) con el mismo encuadre, marco y sello que la
  vista del armador en reposo.
- RF-11: SI una carta no tiene configuración de capas, ENTONCES EL SISTEMA mostrará su imagen fija con la proporción
  del armador, sin estirarla ni recortarla.

### Movimiento guardado
- RF-12: CUANDO el administrador guarde una carta, EL SISTEMA guardará con ella la profundidad del parallax, la
  inclinación, el movimiento solo y la vista previa holo que tenga el armador.
- RF-13: CUANDO el administrador abra una carta en el armador, EL SISTEMA mostrará esos controles con los valores
  guardados de la carta.
- RF-14: SI una carta se guardó antes de esta spec, ENTONCES EL SISTEMA usará los valores de fábrica (profundidad 14,
  inclinación 14, movimiento solo activado y sin holo).
- RF-15: MIENTRAS una carta esté guardada con el holo activado, EL SISTEMA mostrará holo todas sus copias, las normales
  y las holo.
- RF-16: EL SISTEMA guardará esos valores en el historial de versiones de la carta (spec 027), como el resto de lo que
  se guarda.

## Requisitos no funcionales
- Sistema de diseño: el armador, la apertura, «Abrir todos» y la ficha muestran la carta con un único componente
  reutilizable, sin copias que se puedan separar con el tiempo.
- Rendimiento: la apertura sigue a 60 fps en un Pixel 6a y un iPhone 12 durante el volteo (spec 004), también con un
  sobre de cinco cartas vivas (ahora también las comunes). La página de apertura no sube de su límite de 250 kB.
- Movimiento reducido: sin inclinación, parallax ni movimiento solo, como hoy, aunque la carta los tenga guardados.
- Seguridad: las capas siguen llegando solo a quien tiene la carta, con enlaces firmados y el doble filtro 18+ (spec
  018).

## Casos límite
- Carta sin configuración de capas (cartas antiguas con solo imagen): se ve su imagen fija con la proporción del
  armador.
- Común con profundidad 0 y sin partículas: se ve quieta, como la armó el administrador.
- Carta 18+ con cambios pendientes de revisión: el coleccionista ve lo último aprobado, con sus valores de movimiento.
- Teléfono con giroscopio: la inclinación del teléfono usa la inclinación guardada de la carta.
- Apertura con varias cartas en el mazo: solo se mueve la de arriba; las de abajo no se ven hasta su turno.
- Cambiar solo la profundidad o la inclinación en el armador cuenta como un cambio sin guardar (aviso al cerrar,
  borrador; spec 027).

## Fuera de alcance
- Las miniaturas de la cuadrícula de «Mi colección», el álbum público, la portada y la demo (siguen con imágenes
  fijas).
- Cambiar los controles o la distribución del armador.
- Cambiar los efectos del vínculo o el diseño del sobre.

## Criterios de finalización
Cada RF con su test en verde:
- **Unidad:** los valores de movimiento en la configuración guardada, los valores de fábrica para las cartas antiguas y
  la vista que reciben las tres pantallas.
- **Integración:** guardar y volver a cargar el movimiento, en el historial de versiones.
- **E2E:**
  - una carta guardada con un movimiento propio se ve con la misma configuración en el armador, la apertura, «Abrir
    todos» y la ficha;
  - la proporción en las tres pantallas, sin capas de brillo extra;
  - una Común viva igual que en el armador;
  - una carta guardada con el holo activado se ve holo en una copia normal.

Además: comparación lado a lado (capturas del armador y de la apertura) revisada por el dueño y quien colabora en el diseño, y suite completa
en verde en los cuatro proyectos.

## Dudas abiertas
- Ninguna.
