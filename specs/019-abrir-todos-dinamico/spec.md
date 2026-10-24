# Spec 019 — «Abrir todos» dinámico

Estado: propuesta, pendiente de aprobación del dueño.

## Contexto y objetivo
«Abrir todos» (spec 004, RF-18) abre de una vez hasta 50 sobres de una colección y muestra las cartas en una cuadrícula
que aparece con un desvanecido simple. El dueño la ve «simplón» frente a la apertura de un sobre. Esta spec la convierte
en un momento de juego: los sobres se rasgan en una ráfaga rápida, las cartas caen a su sitio, las mejores se presentan
una por una en grande y vivas, y al final todo el lote queda ordenado por rareza con sus totales. No cambia cuántos
sobres se abren, cómo se sortean ni ninguna regla de rarezas, probabilidades o concesiones: los sobres se abren en el
servidor antes de empezar la animación (spec 004, RF-19).

## Usuarios / actores
- **Coleccionista** con dos o más sobres sellados de una colección.

## Historias de usuario
- H1: Como coleccionista quiero que abrir muchos sobres a la vez se sienta emocionante, no una lista.
- H2: Como coleccionista quiero ver en grande lo mejor que me tocó sin repasar cientos de cartas.
- H3: Como coleccionista quiero saltarme la animación si tengo prisa.
- H4: Como coleccionista quiero entender de un vistazo qué me tocó en total.

## Vocabulario
- **Ráfaga**: la animación de los sobres rasgándose uno tras otro.
- **Foco**: la presentación en grande, una por una, de las mejores cartas del lote.
- **Lote**: todas las cartas obtenidas en una misma acción de «Abrir todos».
- **Carta destacada**: épica, legendaria o secreta, o rara que el coleccionista no tenía antes del lote.

## Requisitos funcionales (criterios de aceptación en EARS)

### Ráfaga
- RF-1: CUANDO el coleccionista pulse «Abrir todos», EL SISTEMA mostrará los sobres de la colección rasgándose uno tras
  otro y sus cartas cayendo a su sitio.
- RF-2: EL SISTEMA ajustará el ritmo de la ráfaga para que no dure más de 6 segundos, sea cual sea el número de sobres.
- RF-3: EL SISTEMA sonará al rasgar los sobres de la ráfaga sin superar un sonido cada 120 ms (sustituye a la spec 013,
  RF-5, en «Abrir todos»).

### Foco
- RF-4: CUANDO termine la ráfaga, EL SISTEMA presentará en grande, una por una y de mayor a menor rareza, las cartas
  destacadas del lote.
- RF-5: SI el lote tiene más de 10 cartas destacadas, ENTONCES EL SISTEMA presentará en el foco solo las 10 mejores y
  el resto quedará en el resumen final.
- RF-6: EL SISTEMA mostrará cada carta del foco como carta viva, con el sonido, la vibración y la celebración de su
  rareza que tiene la apertura de un sobre.
- RF-7: CUANDO el coleccionista toque la carta del foco o pulse «Siguiente», EL SISTEMA pasará a la siguiente.
- RF-8: SI el lote no tiene cartas destacadas, ENTONCES EL SISTEMA pasará de la ráfaga al resumen final.

### Saltar
- RF-9: MIENTRAS dure la ráfaga o el foco, EL SISTEMA ofrecerá «Saltar», que llevará directo al resumen final.

### Resumen final
- RF-10: EL SISTEMA mostrará el lote agrupado por rareza, de la más rara a la más común, con el número de cartas de cada
  grupo.
- RF-11: EL SISTEMA mostrará una sola vez cada versión de carta repetida en el lote, con cuántas copias salieron.
- RF-12: EL SISTEMA marcará las cartas nuevas y las holo en el resumen final.
- RF-13: EL SISTEMA mostrará los totales del lote: sobres abiertos, cartas, nuevas y holo.

### Movimiento reducido
- RF-14: MIENTRAS el usuario prefiera menos movimiento, EL SISTEMA no mostrará la ráfaga y presentará el foco con
  imágenes fijas.

## Requisitos no funcionales
- Rendimiento: la ráfaga y el foco a 60 fps en Pixel 6a e iPhone 12 (constitución, principio 9); animaciones solo con
  `transform` y `opacity`; las cartas del resumen con imágenes fijas.
- Peso: la página de «Abrir todos» no pasa de 250 kB de JavaScript en la primera carga.
- Textos nuevos en inglés y español.
- Sistema de diseño: ráfaga, foco y resumen con componentes de `ui/` y su maqueta en Pencil.

## Casos límite
- Dos sobres: la ráfaga va pausada (RF-2).
- 50 sobres: la ráfaga se acelera y no pasa de 6 s (RF-2).
- Lote sin destacadas: directo al resumen (RF-8).
- Más de 10 destacadas: el foco presenta las 10 mejores (RF-5).
- Recargar a mitad de la animación: las cartas ya están en la colección (se abrieron antes de animar).
- Movimiento reducido: sin ráfaga, foco con imágenes fijas (RF-14).

## Fuera de alcance
- Cambiar el máximo de 50 sobres, el sorteo, las probabilidades o la protección de mala suerte.
- Volver a ver un lote anterior tras recargar o salir.
- Compartir el lote o hacer capturas automáticas.

## Criterios de finalización
Cada RF con su test en verde y la suite completa en verde (E2E en 4 proyectos): ráfaga con 2 y con 50 sobres dentro del
tiempo, foco con las destacadas y el tope de 10, «Saltar», resumen agrupado con copias y totales, movimiento reducido;
checklist en teléfono (60 fps); `pnpm budget` dentro del límite; demo manual del dueño.

## Decisiones (23 oct 2026)
- Ráfaga de sobres rasgándose y foco en las mejores, con «Saltar».
- Foco: épicas, legendarias y secretas siempre; raras solo si son nuevas; como mucho 10.
- La ráfaga dura como mucho unos 6 segundos.
- Resumen agrupado por rareza con totales y repetidas apiladas.

## Dudas abiertas
- Ninguna.
