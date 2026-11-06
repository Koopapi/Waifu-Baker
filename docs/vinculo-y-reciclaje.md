# Plan: vínculo de personaje y reciclaje de repetidas

Propuesta del 5 de noviembre de 2026 para que el dueño decida. No es una spec: es el descubrimiento previo a las
specs 028 (valores por defecto del armador) y 029 (vínculo de personaje y reciclaje). Cuando se apruebe, cambia la
sección «Cartas repetidas» de `docs/economia.md`.

## 1. De dónde partimos

- **Repetidas**: se acumulan (x2, x3…); la holo cuenta aparte (RN-45). Hoy no sirven para nada.
- **Vínculo**: ya existe por personaje y coleccionista, niveles 1 a 10 con 0, 50, 150, 300, 500, 750, 1000, 1500,
  2000 y 2500 puntos; solo sube con expediciones (4, 12 o 30 puntos según la duración) y da +2 % de poder por nivel a
  todas las cartas de ese personaje (RN-209, RN-214). Es decir, las rarezas de un personaje **ya están «linkeadas»**
  por el vínculo; lo que falta es que las repetidas lo alimenten y que subir de nivel se vea y se sienta.
- **Economía v2** (27 oct): repetidas → subir de nivel **la carta** (+5 % de poder hasta nivel 5, holo aparte) o
  convertirlas en **polvo** para fabricar una carta concreta (no EX ni carta del mes). Sin spec todavía.
- **Constitución, principio 7**: sin intercambio, sin cash-out y **sin premio por completar set**.

## 2. Qué hacen los juegos que funcionan bien

| Juego | Mecánica con repetidas | Tomamos | Dejamos |
|---|---|---|---|
| Genshin Impact / Honkai: Star Rail | Una copia repetida del personaje sube **al personaje** (constelaciones C1-C6), no a una carta; el excedente se vuelve moneda | Que el duplicado alimente al personaje, no a la carta; el excedente a moneda | Saltos de poder enormes entre niveles (empuja a pagar) |
| Fate/Grand Order | Duplicados suben el ataque especial del personaje de 1 a 5; tope corto y claro | Tope corto y visible | Nada más |
| Arknights | Duplicado → «potencial» (6 niveles, bonos pequeños); con moneda de duplicados se compran fichas de potencial | Bonos pequeños; vía alterna con moneda | Los seis niveles por carta |
| Marvel Snap | Cada carta sube de **acabado visual** (marco roto → prisma → foil → tinta → oro) con boosters que se ganan **jugando esa carta**; el nivel de colección da recompensas | Que los niveles **se vean en la carta** y que usarla (expediciones) dé progreso | Créditos comprables |
| Pokémon TCG Pocket | Las repetidas por encima del tope dan «polvo de brillo» (acabados cosméticos) y «puntos de sobre» (fabricar una carta concreta) | Excedente → polvo para fabricar, y cosméticos | Nada más |
| Yu-Gi-Oh! Master Duel, Hearthstone, Shadowverse | Desarmar repetidas en puntos por rareza y fabricar; acabados (glossy, royal) | Tabla de polvo por rareza | Fabricar cualquier carta (aquí no EX ni carta del mes) |
| Pokémon TCG (físico) | Líneas de evolución del mismo personaje (básico → fase 1 → fase 2) | La **línea de personaje**: sus 3-4 rarezas en fila en la colección | Que haga falta tenerlas todas para algo |

Patrón común de los que mejor funcionan: **el progreso es del personaje, no de la carta; tiene tope; se ve; y lo que
sobra se convierte en una moneda sin azar.**

## 3. Propuesta

### 3.1 Una sola barra: el vínculo

Se mantiene el vínculo que ya existe y se le da una segunda fuente de puntos: **reciclar** repetidas de cualquiera de
las cartas del personaje (Común, Rara, Épica, Legendaria, EX y sus holo). Así las 3-4 rarezas quedan linkeadas de
verdad: todas empujan la misma barra y todas reciben lo que la barra da.

| Fuente | Puntos (propuesta inicial, el panel los ajusta) |
|---|---|
| Expedición (como hoy) | 4 / 12 / 30 por 30 min, 2 h y 8 h |
| Reciclar una Común | 10 |
| Reciclar una Rara | 25 |
| Reciclar una Épica | 60 |
| Reciclar una Legendaria | 150 |
| Reciclar una EX | 400 |
| Versión holo | × 1,5 |

Reglas:
- Nunca se recicla la **última copia** de una carta ni de cada versión (normal y holo): la colección no se rompe.
- Reciclar es irreversible y se confirma; muestra antes cuántos puntos da y a qué nivel deja al personaje.
- «Reciclar todas las repetidas» del personaje en un paso (elige qué hacer, ver 3.3).
- Queda en la auditoría (qué carta, cuántas, qué dio).

### 3.2 Lo que da subir de nivel (a todas las cartas del personaje)

| Nivel | Título (ejemplo) | Qué pasa |
|---|---|---|
| 2 | Conocida | +2 % poder (como hoy, cada nivel) |
| 3 | Amiga | **Brillo de capa** sobre la chica en todas sus cartas (acabado «destello») |
| 5 | Cómplice | **Holo** en todas sus cartas, incluso la Común; frase propia en los reportes de expedición |
| 7 | Inseparable | **Marco de vínculo** (borde con un acabado propio, por encima del marco de rareza) y partículas extra |
| 10 | Alma gemela | Insignia de maestría en la ficha y en el álbum público; fondo alterno de la ficha; el nivel 10 se muestra junto al nombre |

Es la escalera de Marvel Snap aplicada a nuestras cartas por capas: todo son efectos que el motor ya sabe pintar
(brillo de capa, holo, marco, partículas), no arte nuevo por carta. Los títulos y el aspecto exacto se maquetan en la
spec; el administrador podrá cambiar los títulos.

### 3.3 Polvo: la vía sin azar

Al reciclar se elige, por personaje: **Vincular** (puntos de vínculo, opción por defecto) o **Convertir en polvo**.
El polvo es una moneda solo ganable (como galletas y diamantes) con la que se **fabrica una carta concreta que falte**.

| Rareza | Polvo que da una repetida | Coste de fabricar |
|---|---|---|
| Común | 5 | 100 |
| Rara | 15 | 300 |
| Épica | 40 | 800 |
| Legendaria | 120 | 2500 |
| EX | 300 | no se fabrica |
| Holo | × 1,5 | la holo no se fabrica |

Carta del mes: no se fabrica (sigue siendo exclusiva de Premium 3). Al llegar un personaje al nivel 10, lo que se
recicle de él da polvo sin preguntar (excedente, como en Genshin).

### 3.4 La línea de personaje (dónde se ve todo)

En la colección, cada personaje tiene su página: sus rarezas en fila (línea), con las que tienes y las que faltan, la
barra de vínculo con nivel, título y lo que desbloquea el siguiente, el botón de reciclar y el de fabricar con polvo.
La línea es solo presentación: **tener todas las rarezas no da nada** (principio 7 de la constitución), lo que da es
reciclar y jugar.

### 3.5 Cumplimiento y economía

- Reciclar y fabricar no tienen azar; no cambian las probabilidades publicadas; nada se compra con dinero.
- No hay premio por completar set ni por completar la línea.
- EX y carta del mes siguen fuera de la fabricación: se mantiene el valor del tier Premium 3.
- Cambios a `docs/economia.md`: el nivel pasa de **la carta** al **personaje** (vínculo); la holo deja de tener su
  propio nivel y en cambio da más puntos; el +5 % por nivel de carta se sustituye por el +2 % por nivel de vínculo que
  ya existe (10 niveles: hasta +18 %).
- El panel ajusta puntos por rareza, umbrales, polvo y costes, y el simulador de expediciones añade «días para
  llegar al nivel 10» de un coleccionista gratuito y de un patron.

## 4. Specs y orden

| Spec | Qué | Tamaño |
|---|---|---|
| 028 Valores por defecto del armador | sello de texto a 15 y grosor del borde a 3,0 por defecto (borrador en `specs/028-valores-por-defecto/`) | pequeña |
| 029 Vínculo de personaje y reciclaje | reciclar, puntos, niveles y sus efectos, línea de personaje, polvo y fabricar, panel y simulador, auditoría | motor, 1 a 2 semanas |
| 030 Monedas y botín al azar | diamantes, botín de expedición al azar (economía v2) | motor |
| 031 Tiendas | galletas (cosméticos, relojes) y diamantes (sobres) | motor |
| 032 Tiers de Patreon | booster y premium 1 a 3, escudos, carta del mes | motor |

## 5. Decisiones del dueño (5 nov 2026)

1. **Barra única de vínculo** por personaje (confirmado tras la explicación).
2. **Reciclar da las dos cosas** (vínculo y polvo), sin romper el balance. Propuesta: 100 % de los puntos de vínculo
   de la tabla 3.1 y **la mitad** del polvo de la tabla 3.3; en nivel 10, el polvo completo.
3. **Efectos por nivel y poder: sí, los dos.** El holo que da el nivel 5 es solo visual y **no** suma el +15 % de poder
   de la versión holo.
4. **Cada versión (normal y holo) conserva siempre una copia** (confirmado; ver 6).
5. **La Rara da más** puntos que la Común (25 contra 10).
6. **Fabricar cualquier carta publicada** que el coleccionista pueda ver (EX y carta del mes, no).

## 6. Balance y abusos

- **Poder:** el vínculo tiene tope (nivel 10 = +18 %). Una EX holo en su terreno pasa de 34,5 a 40,7; un equipo de 3,
  de 103,5 a 122,1. Además la calificación tope es Excelente (poder ÷ dificultad ≥ 1,4) y el botín está fijado por
  calificación: el poder de más **no da más botín**, así que no hay excedente que rompa el juego.
- **Ciclo fabricar → reciclar:** fabricar cuesta 20 veces el polvo que devuelve reciclar la misma carta (2,5 %). No
  hay forma de ganar polvo o vínculo dando vueltas. Además, una carta fabricada recién no se puede reciclar si es la
  única copia.
- **Holo visual del nivel 5:** cosmético; el poder de holo solo lo da la carta holo real (si no, se contaría dos veces).
- **Última copia:** cada versión (normal y holo) conserva siempre una copia. Si se permitiera reciclar la normal
  teniendo la holo, la ganancia sería una copia más de puntos (pequeña), pero el coleccionista perdería esa carta del
  álbum y, sin intercambio, solo la recuperaría fabricándola: se protege su colección, no se gana balance.
- **Cuentas múltiples:** sin intercambio entre cuentas, no se puede pasar vínculo, polvo ni cartas de una a otra.
- **Sobres de regalo diarios:** el ritmo de repetidas lo marca el sorteo publicado; el simulador mostrará «días para
  llegar al nivel 10» para ajustar los puntos antes de publicar.

## 7. Preguntas originales

1. ¿Una sola barra (vínculo, como aquí) o nivel aparte por carta (economía v2)? Recomiendo la barra única.
2. ¿Al reciclar se elige vínculo o polvo (como aquí), o siempre da las dos cosas en menor cantidad?
3. ¿Los efectos por nivel (3.2) van bien, o prefieres que el vínculo solo dé poder y cosméticos de tienda?
4. ¿Se puede reciclar la última copia si tienes la holo (o al revés)? Aquí: no, cada versión conserva una.
5. ¿La Común y la Rara, que comparten arte, dan los mismos puntos o la Rara más? Aquí: la Rara más.
6. Fabricar: ¿solo cartas de colecciones que ya te salieron en sobres, o cualquiera publicada? Aquí: cualquiera
   publicada que puedas ver.
