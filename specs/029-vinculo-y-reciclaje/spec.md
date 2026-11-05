# Spec 029 — Vínculo de personaje y reciclaje de repetidas

Estado: **aprobada por el dueño el 5 nov 2026** (plan `docs/vinculo-y-reciclaje.md` y sus decisiones: barra única de
vínculo, reciclar da vínculo y polvo, efectos por nivel más poder, cada versión conserva una copia, la Rara da más que
la Común, fabricar cualquier carta publicada visible salvo EX y carta del mes). El dueño pidió implementarla sin
entrevista adicional.

## Contexto y objetivo
Las cartas repetidas se acumulan (x2, x3…) y no sirven para nada. Cada personaje ya tiene un vínculo con cada
coleccionista (niveles 1 a 10, spec 020) que solo sube con expediciones y da +2 % de poder por nivel a todas sus
cartas. Esta spec deja reciclar las repetidas de cualquier carta de un personaje para subir ese vínculo y ganar polvo,
hace que cada nivel se vea en todas sus cartas, y deja fabricar con polvo una carta concreta que falte. Así las 3-4
rarezas de un personaje quedan «linkeadas» en una sola barra, siguiendo lo que funciona en los juegos de cartas más
populares (el duplicado sube al personaje; los niveles se ven; el excedente se vuelve una moneda sin azar).

## Usuarios / actores
- **Coleccionista**: recicla repetidas, sube vínculos, fabrica cartas.
- **Administrador**: ajusta puntos, polvo, costes y títulos, y simula el ritmo.

## Historias de usuario
- H1: Como coleccionista quiero darle uso a mis repetidas para que mis personajes favoritos mejoren.
- H2: Como coleccionista quiero ver en una página todas las rarezas de un personaje, su vínculo y lo que desbloquea.
- H3: Como coleccionista quiero conseguir una carta concreta que me falta sin depender de la suerte.
- H4: Como administrador quiero ajustar el ritmo sin publicar código y comprobarlo antes.

## Vocabulario
- **Línea de personaje**: todas las cartas de un personaje (sus rarezas y sus versiones holo), en las colecciones que el
  coleccionista puede ver.
- **Reciclar**: entregar copias repetidas de una carta a cambio de puntos de vínculo y polvo; es irreversible.
- **Repetida reciclable**: cualquier copia por encima de la primera de cada versión (normal y holo) de una carta.
- **Polvo**: moneda que solo se gana reciclando; sirve para fabricar.
- **Fabricar**: crear con polvo una copia de una carta concreta.

## Requisitos funcionales (criterios de aceptación en EARS)

### Reciclar
- RF-1: EL SISTEMA permitirá reciclar solo repetidas reciclables; cada versión (normal y holo) de cada carta conservará
  siempre una copia.
- RF-2: CUANDO el coleccionista recicle, EL SISTEMA sumará al vínculo del personaje de esa carta los puntos de su rareza
  (Común 10, Rara 25, Épica 60, Legendaria 150, EX 400; × 1,5 si es holo) y le dará la mitad del polvo de su rareza
  (Común 5, Rara 15, Épica 40, Legendaria 120, EX 300; × 1,5 si es holo).
- RF-3: MIENTRAS el vínculo del personaje esté en el nivel máximo, EL SISTEMA dará al reciclar sus cartas el polvo
  completo y ningún punto de vínculo.
- RF-4: ANTES de reciclar, EL SISTEMA mostrará cuántas copias se reciclan, los puntos y el polvo que darán y el nivel en
  que quedará el personaje, y pedirá confirmación.
- RF-5: EL SISTEMA permitirá reciclar en un paso todas las repetidas reciclables de un personaje.
- RF-6: SI dos peticiones de reciclar la misma carta llegan a la vez, ENTONCES EL SISTEMA solo reciclará las copias que
  existan, sin dejar nunca una versión en cero ni dar puntos o polvo de más.
- RF-7: EL SISTEMA registrará en la auditoría cada reciclaje (cartas, copias, puntos y polvo).

### Lo que da el vínculo
- RF-8: EL SISTEMA mantendrá el +2 % de poder por nivel de vínculo en las expediciones (spec 020), con puntos de
  reciclaje y de expedición en la misma barra.
- RF-9: MIENTRAS el vínculo de un personaje esté en nivel 3 o más, EL SISTEMA mostrará todas sus cartas con el brillo
  de capa «destello» sobre la chica.
- RF-10: MIENTRAS el vínculo esté en nivel 5 o más, EL SISTEMA mostrará todas sus cartas con holo, sin sumar el poder
  de la versión holo.
- RF-11: MIENTRAS el vínculo esté en nivel 7 o más, EL SISTEMA mostrará todas sus cartas con el marco de vínculo y
  partículas extra.
- RF-12: MIENTRAS el vínculo esté en nivel 10, EL SISTEMA mostrará la insignia de maestría junto al nombre del personaje
  en la ficha y en el álbum público.
- RF-13: EL SISTEMA mostrará los efectos de vínculo solo al coleccionista dueño del vínculo y en su álbum público; las
  imágenes públicas con marca de agua no cambian.
- RF-14: EL SISTEMA mostrará en cada nivel un título (Conocida, Amiga, Cómplice, Inseparable, Alma gemela por defecto)
  que el administrador puede cambiar.

### Línea de personaje
- RF-15: EL SISTEMA mostrará en la colección una página por personaje con su línea (las que tiene y las que faltan), la
  barra de vínculo con nivel, título y puntos, lo que desbloquea el siguiente nivel, sus repetidas reciclables y el
  botón de fabricar.
- RF-16: EL SISTEMA no dará nada por tener completa la línea de un personaje.

### Polvo y fabricar
- RF-17: EL SISTEMA mostrará el polvo del coleccionista junto a sus demás monedas.
- RF-18: CUANDO el coleccionista fabrique una carta, EL SISTEMA le restará el coste de su rareza (Común 100, Rara 300,
  Épica 800, Legendaria 2500) y le dará una copia de su versión normal.
- RF-19: SI la carta es EX, es la carta del mes, es de una colección sin publicar o 18+ sin el doble filtro, o el polvo no
  alcanza, ENTONCES EL SISTEMA no la fabricará e indicará el motivo.
- RF-20: EL SISTEMA no fabricará versiones holo.
- RF-21: EL SISTEMA registrará en la auditoría cada fabricación.

### Panel
- RF-22: EL SISTEMA permitirá al administrador cambiar los puntos y el polvo por rareza, el factor holo, los costes de
  fabricar y los títulos de nivel, con registro en la auditoría.
- RF-23: CUANDO el administrador simule, EL SISTEMA mostrará los días que tarda en llegar al nivel 10 un coleccionista
  gratuito y un patron con el ritmo de sobres y expediciones actual.

## Requisitos no funcionales
- Reciclar y fabricar son transacciones con bloqueo de fila (como abrir un sobre); el servidor decide todo.
- Sin azar en reciclar ni fabricar: no cambian las probabilidades publicadas (constitución, principio 7).
- Rendimiento: los efectos por nivel usan los efectos que ya pinta la carta por capas (brillo, holo, marco, partículas);
  las páginas del coleccionista no crecen más de 4 KB comprimidos (`pnpm budget`).
- Idioma: textos nuevos en inglés y español.
- Sistema de diseño: barra de vínculo, línea de personaje y diálogo de reciclar como componentes reutilizables.

## Casos límite
- Personaje con cartas en varias colecciones: una sola barra.
- Carta sin personaje asignado: no se recicla.
- Colección archivada: sus cartas se pueden reciclar; no se pueden fabricar.
- Reciclar la holo teniendo la normal (o al revés): cada versión conserva su copia (RF-1).
- Cartas 18+: solo con el doble filtro; reciclarlas suma al mismo personaje.
- Baja de cuenta (spec 001): vínculo y polvo se borran con la cuenta.
- Ajustes cambiados con reciclajes en curso: cada reciclaje usa los valores del momento en que se confirma.

## Fuera de alcance
- Intercambio entre coleccionistas, venta de polvo o de cartas por dinero.
- Recompensas por completar línea o colección.
- Arte nuevo por nivel (escenas, voces); fabricar holo o EX.
- Diamantes, botín al azar, tiendas y tiers (specs siguientes).

## Criterios de finalización
Cada RF con su test en verde (unidad para las reglas, integración para reciclar y fabricar con concurrencia, E2E del
flujo: reciclar → subir de nivel → ver el efecto en la carta → fabricar); suite completa en verde; demo con un personaje
que tenga repetidas.

## Dudas abiertas
- Ninguna.
