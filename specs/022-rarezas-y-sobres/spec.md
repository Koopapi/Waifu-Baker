# Spec 022 — Rarezas y sobres plata y gold

Estado: aprobada por el dueño el 28 oct 2026, con las decisiones derivadas.

## Contexto y objetivo
La economía versión 2 (`docs/economia.md`, 27 oct 2026) cambia la base de todo lo demás: pasa de seis rarezas a cinco
(común, rara, épica, legendaria y EX), todas con versión holo, con un aspecto que crece con la rareza (la común es plana;
desde la rara, parallax y cada vez más efectos), y crea dos tipos de sobre: **plata**, el básico, y **gold**, con más
probabilidad de legendaria y EX. Esta spec cambia solo las rarezas y los sobres; las monedas, las fuentes de sobres, las
tiendas, las repetidas y los tiers van en las specs 023 a 026.

## Usuarios / actores
- **Coleccionista**, que abre sobres y mira su colección.
- **Administrador**, que arma cartas y publica las probabilidades.
- **Visitante** de la página de Probabilidades.

## Historias de usuario
- H1: Como coleccionista quiero que una carta más rara se vea claramente más especial.
- H2: Como coleccionista quiero saber si un sobre es plata o gold antes de abrirlo.
- H3: Como coleccionista quiero que un sobre gold valga la pena.
- H4: Como administrador quiero fijar y publicar las probabilidades de cada tipo de sobre.

## Requisitos funcionales (criterios de aceptación en EARS)

### Rarezas
- RF-1: EL SISTEMA usará cinco rarezas, de menor a mayor: común, rara, épica, legendaria y EX.
- RF-2: EL SISTEMA convertirá las cartas existentes de rareza poco común en común y las de rareza secreta en EX.
- RF-3: EL SISTEMA permitirá que una carta de cualquier rareza salga en versión holo.
- RF-4: EL SISTEMA mostrará las cartas comunes planas, sin parallax, también al revelarlas y en su ficha.
- RF-5: EL SISTEMA mostrará las cartas raras con parallax.
- RF-6: EL SISTEMA mostrará las cartas épicas con parallax y efectos.
- RF-7: EL SISTEMA mostrará las cartas legendarias con parallax y efectos dorados.
- RF-8: EL SISTEMA mostrará las cartas EX con parallax y los efectos de mayor nivel.
- RF-9: EL SISTEMA dará a cada rareza su propio marco, distinto de los de las demás.
- RF-10: EL SISTEMA mostrará el brillo holo en la versión holo de cualquier rareza.

### Sobres plata y gold
- RF-11: EL SISTEMA tendrá dos tipos de sobre, plata y gold, y cada sobre será de una colección y de un tipo.
- RF-12: EL SISTEMA dará a cada colección una tabla de probabilidades para el sobre plata y otra para el gold.
- RF-13: SI a una colección le falta alguna de sus dos tablas, ENTONCES EL SISTEMA no la publicará e indicará cuál falta.
- RF-14: EL SISTEMA garantizará en cada sobre plata al menos una carta rara o mejor.
- RF-15: EL SISTEMA garantizará en cada sobre gold al menos una carta épica o mejor.
- RF-16: SI la tabla gold de una colección no da más probabilidad de legendaria o de EX que su tabla plata, ENTONCES EL
  SISTEMA no la publicará e informará del motivo.
- RF-17: EL SISTEMA dará el mismo número de cartas a los sobres plata y gold de una colección.
- RF-18: EL SISTEMA aplicará la protección de mala suerte solo a los sobres plata.
- RF-19: EL SISTEMA mostrará si un sobre es plata o gold en «Mis sobres», en la apertura y en «Abrir todos».
- RF-20: EL SISTEMA publicará en la página de Probabilidades las dos tablas de cada colección.

### Panel y fuentes actuales
- RF-21: EL SISTEMA permitirá al administrador editar las dos tablas de una colección y simular aperturas de cada tipo.
- RF-22: EL SISTEMA permitirá al administrador regalar sobres plata o gold.
- RF-23: MIENTRAS no las cambien las specs 023 y 026, EL SISTEMA dará sobres plata en la bienvenida, la suscripción, el
  sobre gratis, el día 7 y las expediciones.

## Requisitos no funcionales
- El sorteo sigue en el servidor con RNG criptográfico, con la tabla publicada de cada tipo y sin depender del navegador.
- Rendimiento: animaciones solo con `transform` y `opacity`; con movimiento reducido, todas las rarezas planas.
- Textos nuevos en inglés y español.
- Maquetas en Pencil aprobadas antes del plan: los 5 marcos nuevos, el sobre plata y el gold, y la tabla doble.

## Casos límite
- Colección sin cartas de alguna rareza: esa rareza no puede tener probabilidad en ninguna tabla (como hoy).
- Colección sin cartas épicas o mejores: no puede tener tabla gold y no se publica hasta tenerlas.
- Una carta holo común: se ve plana con el brillo holo encima.
- Abrir todos con sobres plata y gold de la misma colección: cada uno con su tabla; el resumen indica cuántos de cada tipo.
- Probabilidades ya publicadas antes de esta spec: pasan a ser la tabla plata (no hay datos en producción).

## Fuera de alcance
- Diamantes, el temporizador nuevo, el sobre gold del día 7 y el botín de expedición al azar (spec 023).
- Tiendas (024), repetidas, polvo y fabricar (025), tiers de Patreon (026).
- Contenido explícito: la rareza EX sigue siendo sugerente.

## Criterios de finalización
Cada RF con su test en verde y la suite completa en verde (E2E en 4 proyectos): conversión de rarezas, aspecto de cada
rareza, holo en todas, publicar con las dos tablas y sus comprobaciones, garantías de cada tipo con muchos sorteos,
mala suerte solo en plata, plata y gold visibles en la web, Probabilidades y panel; checklist en teléfono; demo del dueño.

## Decisiones (28 oct 2026)
- Marcos nuevos para las cinco rarezas (no los de Bruno).
- Plata garantiza rara o mejor; gold, épica o mejor.
- Los dos sobres tienen el mismo número de cartas (5 por defecto).
- Protección de mala suerte solo en plata, sin cambios.
- Derivadas, confirmadas por el dueño al aprobar: poco común pasa a común y secreta a EX; los 5 marcos nuevos se
  diseñan en Pencil dentro de esta spec y se aprueban con las maquetas; la probabilidad de holo se fija por tabla y vale
  para todas las rarezas; hasta las specs 023 y 026, todas las fuentes actuales dan sobres plata.

## Dudas abiertas
- Ninguna.
