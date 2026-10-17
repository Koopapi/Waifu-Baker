# Spec 013 — Rendimiento y sonido de la apertura

## Contexto y objetivo
La apertura de sobres (spec 004) es la parte central del producto. Le faltan dos cosas que el plan original
pedía y que quedaron fuera: el sonido (la dependencia `howler` está instalada pero no suena nada) y el
presupuesto de peso (la apertura carga 259 kB de JavaScript frente a los 250 kB acordados). Esta spec añade
sonidos y vibración a la apertura, fija el presupuesto de peso de las páginas del coleccionista con una
comprobación automática y deja una lista para comprobar la fluidez en un teléfono real. No cambia el sorteo,
las animaciones ni el aspecto de la apertura.

## Usuarios / actores
- **Coleccionista**: abre sobres, uno a uno o con «Abrir todos».
- **Integración continua (CI)**: comprueba el peso de cada página en cada PR.

## Historias de usuario
- H1: Como coleccionista quiero oír el sobre y saber por el sonido que me ha tocado algo bueno.
- H2: Como coleccionista quiero silenciar la apertura con un toque si estoy en un sitio público, y que se quede así.
- H3: Como coleccionista con un móvil normal quiero que la apertura cargue rápido y vaya fluida.

## Requisitos funcionales (criterios de aceptación en EARS)

### Sonidos
- RF-1: EL SISTEMA usará solo sonidos con licencia CC0 y guardará en el repositorio, junto a ellos, la lista con el origen, el autor y la licencia de cada uno.
- RF-2: CUANDO el usuario rasga el sobre (o pulsa «Abrir» con movimiento reducido), EL SISTEMA reproducirá el sonido de rasgado; ese primer gesto habilita el audio en todos los navegadores, también en iPhone.
- RF-3: CUANDO el usuario voltea una carta, EL SISTEMA reproducirá el sonido de volteo, igual para todas las rarezas.
- RF-4: CUANDO se revela una carta rara o mejor, EL SISTEMA reproducirá además el sonido de su nivel (rara, épica, legendaria o secreta), cada uno más vistoso que el anterior; las comunes y poco comunes solo suenan al voltearse.
- RF-5: CUANDO termina «Abrir todos», EL SISTEMA reproducirá un solo sonido, el del nivel de la mejor carta obtenida (o el de volteo si ninguna es rara o mejor), sin sonidos por carta.
- RF-6: EL SISTEMA cargará los sonidos solo en las pantallas de apertura y después de mostrarlas, sin retrasar la animación; SI un sonido no carga, ENTONCES la apertura seguirá sin él y sin mostrar errores.

### Silencio
- RF-7: EL SISTEMA tendrá el sonido activado por defecto y mostrará en la apertura y en «Abrir todos» un botón para silenciarlo y volver a activarlo, que indica su estado a los lectores de pantalla.
- RF-8: EL SISTEMA recordará en ese dispositivo la elección de silencio entre visitas y entre las dos pantallas de apertura.

### Vibración
- RF-9: CUANDO se revela una carta rara o mejor en un dispositivo que permite vibrar, EL SISTEMA vibrará brevemente, con un patrón más largo para legendaria y secreta; en «Abrir todos», una sola vez al final, según la mejor carta.
- RF-10: MIENTRAS el sonido esté silenciado, EL SISTEMA no vibrará.

### Peso y fluidez
- RF-11: EL SISTEMA mantendrá el JavaScript de la primera carga en 250 kB comprimidos o menos en cada página del coleccionista y pública: portada, entrada, bienvenida, sobres, apertura, «Abrir todos», colección, ajustes del álbum, álbum público, cuenta, recompensas, probabilidades y páginas legales.
- RF-12: SI una de esas páginas supera los 250 kB, ENTONCES la integración continua fallará e indicará qué página es, cuánto pesa y cuánto se pasa.
- RF-13: EL SISTEMA cargará las piezas pesadas de la apertura (motor de animación, partículas y audio) solo en las pantallas que las usan.
- RF-14: EL SISTEMA animará la apertura solo con transform y opacidad para que vaya a 60 fps en un móvil de gama media; se comprueba en un teléfono real con la lista de esta spec, que el usuario firma antes de cerrarla.

## Requisitos no funcionales
- Los sonidos, en MP3 (lo reproducen todos los navegadores), suman como mucho 200 kB y están igualados de volumen.
- Los sonidos no cuentan en el presupuesto de JavaScript, pero solo se descargan en las pantallas de apertura.
- El movimiento reducido no quita el sonido ni la vibración: son independientes del movimiento.
- Textos del botón en inglés y español (spec 008) y el botón es un componente del sistema de diseño (spec 011).

## Lista de comprobación en un teléfono real (RF-14)
Se hace en un iPhone y, si es posible, en un Android de gama media, con la web servida en la red local:
1. Rasgar, abanico y volteo de las 5 cartas sin tirones visibles; el holo responde al giroscopio.
2. El reveal de una rara o mejor (flash y partículas) no se atasca.
3. El primer rasgado hace sonar el sobre (en iPhone con el interruptor de silencio quitado).
4. El botón de silencio corta sonido y vibración y se mantiene al recargar.
5. En Android, una rara o mejor vibra; una legendaria vibra más.
6. «Abrir todos» suena una sola vez al final.
7. La apertura carga en menos de 3 s en 4G.

## Casos límite
- El navegador bloquea el audio hasta el primer gesto: el rasgado es ese gesto; antes no suena nada.
- iPhone con el interruptor de silencio puesto: no suena (lo decide el sistema) y la apertura sigue igual.
- El usuario silencia a mitad de la apertura: los sonidos que faltan ya no suenan.
- Se recarga la apertura a medias (spec 004 repite el reveal): los sonidos suenan como en la primera vez.

## Fuera de alcance
- Música de fondo y sonidos en el resto de la web (botones, navegación).
- Control de volumen (solo activar o silenciar).
- Prueba automática de fotogramas por segundo (decisión de la entrevista: solo teléfono real).
- Cambios en las animaciones o en el aspecto de la apertura.

## Criterios de finalización
Todos los RF con test en verde; comprobación de peso en la CI con todas las páginas por debajo de 250 kB; E2E:
abrir un sobre → suenan rasgado, volteos y el nivel de la rara → silenciar → al recargar sigue silenciado y no
suena nada → «Abrir todos» suena una vez, en los cuatro proyectos. Lista de comprobación en teléfono real hecha
por el usuario.

## Decisiones de la entrevista (16 oct 2026)
Sonidos CC0 con licencia anotada, sonido activado por defecto con botón de silencio que se recuerda, 250 kB
comprobados en la CI, fluidez comprobada solo en teléfono real, vibración en rara o mejor ligada al silencio, y
sonidos en 4 niveles por rareza con un solo sonido al final de «Abrir todos».

Spec aprobada por el usuario el 16 oct 2026.
