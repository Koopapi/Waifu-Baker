# Spec 040 — Capas con mezcla en iPhone

Estado: **aprobada por el dueño el 13 nov 2026**.

Lo que se sabe:
1. En el iPhone 15 Pro del dueño (Safari), las cartas por capas EX y SSR se ven incompletas en el armador, en el
   simulador y en la apertura. En la computadora se ven bien.
2. Con la carta EX Hanako exportada del armador se encontró la causa. Su capa 5, una textura holo en modo de mezcla
   «aclarar», hace que Safari en iPhone deje de pintar las capas que tiene debajo, salvo la primera. Las capas de encima
   sí se pintan. Al ocultar esa capa en el armador del iPhone, la carta se vio completa.
3. Una página de prueba con capas sintéticas reproduce la falla en el iPhone del dueño. Aislar el arte de la carta como
   un grupo la corrige en el iPhone, sola y dentro de la escena de apertura. En la computadora la carta se ve igual que
   antes.

## Contexto y objetivo
Las cartas especiales suelen llevar capas de luz o de textura en modo de mezcla. En iPhone, esas cartas pierden la chica
y casi todo lo que hay debajo de la capa con mezcla, justo en las cartas que más se quieren lucir. Quien abre un sobre
en el teléfono recibe una carta rota.

El objetivo es que toda carta y todo sobre por capas se vean completos en iPhone, como en la computadora, sin rehacer
ninguna carta.

## Usuarios / actores
- **Coleccionista**: abre sobres y ve sus cartas, muchas veces desde el teléfono.
- **Administrador**: arma cartas y sobres, y simula aperturas, también desde el teléfono.

## Historias de usuario
- H1: Como coleccionista quiero ver completa en mi iPhone la carta EX o SSR que me salió, para disfrutarla como se diseñó.
- H2: Como administrador quiero que el armador del iPhone muestre la carta igual que el de la computadora, para revisar
  una carta desde el teléfono.

## Vocabulario
- **Capa con mezcla**: capa de imagen con un modo de mezcla distinto de «normal» (aclarar, trama, superponer, etc.).
- **Carta por capas** y **sobre por capas**: los de las specs 016, 017 y 030.

## Requisitos funcionales (criterios de aceptación en EARS)
- RF-1: CUANDO una carta por capas con una capa con mezcla se vea en Safari de iPhone, EL SISTEMA mostrará todas sus
  capas visibles, también las que van debajo de la capa con mezcla.
- RF-2: CUANDO un sobre por capas con una capa con mezcla se vea en Safari de iPhone, EL SISTEMA mostrará todas sus
  capas visibles, también las que van debajo de la capa con mezcla.
- RF-3: EL SISTEMA cumplirá RF-1 en cada vista donde se ve una carta por capas: el armador, la apertura del
  coleccionista, el simulador, la ficha de la carta, «Abrir todos» y el diseñador de sobres.
- RF-4: EL SISTEMA mostrará en la computadora cada carta y cada sobre por capas igual que antes de este cambio.
- RF-5: EL SISTEMA corregirá las cartas y los sobres ya guardados sin que el administrador tenga que volver a guardarlos.

## Requisitos no funcionales
- Rendimiento: la carta se sigue moviendo con la misma fluidez; el arreglo no obliga a redibujar las capas en cada
  movimiento.
- Sistema de diseño: el arreglo va en el motor común de capas, no en cada pantalla.

## Casos límite
- Carta con varias capas con mezcla: todas las capas visibles.
- Carta sin capas con mezcla: sin cambios.
- Capa con mezcla que es la primera de la carta: se ve igual que hoy.
- Carta dentro de la escena de apertura, que se voltea en 3D: también completa.

## Fuera de alcance
- Cambiar los modos de mezcla disponibles o cómo se eligen en el armador.
- Otros problemas de rendimiento en teléfonos.
- Navegadores distintos de Safari en iPhone, salvo que deben seguir viéndose como hoy.

## Criterios de finalización
Cada RF con su prueba en verde:
- **Unidad**: el motor de capas aísla el arte de la carta y el de los sobres.
- **E2E** (escritorio, iPhone 14 y Pixel 7 simulados): en cada vista de RF-3, una carta con una capa con mezcla lleva su
  arte aislado. En escritorio, la carta se ve igual que antes (RF-4).
- **Revisión en el iPhone del dueño**, porque el simulador de iPhone no reproduce la falla: Hanako completa en el
  armador, en el simulador y en la apertura, y un sobre por capas con una capa con mezcla.

Además: E2E de escritorio afectadas en verde y la E2E completa en el CI.

## Dudas abiertas
- Ninguna. El 13 nov 2026 el dueño confirmó en su iPhone que el arreglo también funciona dentro de la escena de apertura
  (cartas F y G de la página de prueba).
