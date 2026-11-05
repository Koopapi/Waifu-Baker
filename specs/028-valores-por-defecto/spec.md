# Spec 028 — Valores por defecto, ajustes del panel y cartas de portada

Estado: borrador del 5 nov 2026 con las decisiones del dueño (garantía de EX a 10 sobres gold, sello de imagen sin
cambios, valores configurables y cartas de portada). Pendiente de aprobación.

Origen: el dueño pidió el 5 nov 2026 que el tamaño del sello quede siempre en 15 por defecto y el grosor del borde en
3,0, porque hoy cada carta nueva sale con valores que luego corrige a mano; el mismo día pidió ajustar las
probabilidades iniciales para que sean justas y la EX sea difícil (RF-8 a RF-11).

## Contexto y objetivo
Hoy una carta nueva, o una a la que se le aplica el estilo de su rareza, sale con el sello de texto a 10, 12, 13 o 14
según la rareza, y con el grosor del borde de su marco (2,2 en la mayoría). El dueño arma todas las cartas con 15 y
3,0, así que cada carta le cuesta dos ajustes que no aportan nada. Esta spec fija esos dos valores como los de partida
en todos los sitios donde nace una carta o se le aplica un estilo.

## Usuarios / actores
- **Administrador** (el dueño y Bruno): arma cartas en el panel.

## Historias de usuario
- H1: Como administrador quiero que toda carta nueva salga con el sello a 15 y el borde a 3,0, para no ajustarlos a
  mano en cada carta.
- H2: Como administrador quiero que «Aplicar estilo de la rareza» vuelva a esos valores.

## Vocabulario
- **Sello de texto**: el sello de rareza con letras (C, R, E, LEG, EX); su tamaño va de 4 a 40.
- **Grosor del borde**: ancho del marco de la carta, en % del ancho de la carta, de 0 a 8.
- **Valores por defecto**: sello de texto 15 y borde 3,0.

## Requisitos funcionales (criterios de aceptación en EARS)
- RF-1: CUANDO se cree una carta por capas (al subir a la chica), EL SISTEMA pondrá su sello de texto a tamaño 15 y su
  borde a 3,0, cualquiera que sea su rareza.
- RF-2: CUANDO el administrador aplique el estilo de la rareza a una carta, EL SISTEMA pondrá el sello de texto a 15 y
  el borde a 3,0.
- RF-3: CUANDO cambie la rareza de una carta con estilo automático, EL SISTEMA conservará el sello a 15 y el borde a 3,0.
- RF-4: MIENTRAS una carta no tenga grosor de borde guardado, EL SISTEMA la mostrará con 3,0 en la carta viva, en la
  imagen fija y en el deslizador del editor.
- RF-5: CUANDO se importe una configuración del creador sin tamaño de sello o sin grosor de borde, EL SISTEMA usará 15 y
  3,0 para lo que falte.
- RF-6: EL SISTEMA conservará sin cambios el sello y el borde de las cartas ya guardadas.
- RF-7: EL SISTEMA mostrará la carta igual en la vista previa del editor, en la apertura, en la ficha y en la imagen
  fija con estos valores.

### Probabilidades iniciales (añadido el 5 nov 2026, a petición del dueño: «justas, pero que la EX sea difícil»)
- RF-8: CUANDO se cree una colección, EL SISTEMA le propondrá en el sobre plata estas probabilidades por ranura:
  ranuras normales Común 72, Rara 22, Épica 5, Legendaria 1, EX 0; ranura mejorada Común 35, Rara 48, Épica 14,
  Legendaria 3, EX 0; última ranura Rara 80, Épica 16, Legendaria 3,8, EX 0,2.
- RF-9: CUANDO se cree una colección, EL SISTEMA le propondrá en el sobre gold: ranuras normales Común 40, Rara 38,
  Épica 17, Legendaria 4,5, EX 0,5; ranura mejorada Rara 52, Épica 34, Legendaria 12,5, EX 1,5; última ranura Épica 72,
  Legendaria 25, EX 3.
- RF-10: EL SISTEMA conservará sin cambios las probabilidades de las colecciones ya publicadas (versiones congeladas).
- RF-11: EL SISTEMA mostrará en la página pública de probabilidades, por tipo de sobre, la probabilidad de que un sobre
  traiga al menos una carta de cada rareza.

- RF-12: MIENTRAS un coleccionista lleve 9 sobres gold seguidos de una colección sin ninguna EX, EL SISTEMA le
  garantizará una EX en el siguiente sobre gold de esa colección (como la garantía de Épica del plata, por coleccionista
  y colección).
- RF-13: CUANDO un sobre gold traiga una EX, EL SISTEMA pondrá a cero ese contador.
- RF-14: EL SISTEMA publicará la garantía de EX en la página de probabilidades.

Resultado esperado (sobres de 5 cartas): plata, al menos una EX 0,20 % y una Legendaria 9,5 %; gold, EX 5,9 % y
Legendaria 43 %. Un coleccionista gratuito (unos 60 plata y 4 gold al mes) saca una EX cada 2,7 meses y 7-8
Legendarias al mes; un patron Premium, una EX cada 1,6 meses. Hoy es una EX cada 1,3 meses (gratuito).
Con la garantía a 10 sobres gold (RF-12), el sobre gold trae EX en el 12,9 % de los casos en promedio: una EX cada
1,5 meses (gratuito) y cada 0,9 meses (Premium). Con 20 sobres serían 2,1 y 1,2 meses; el número se cambia en el panel
(RF-17).

### Ajustes del panel (decisión del dueño)
- RF-15: EL SISTEMA permitirá al administrador cambiar en `/admin/ajustes` el tamaño por defecto del sello de texto
  (4 a 40) y el grosor por defecto del borde (0 a 8).
- RF-16: EL SISTEMA permitirá al administrador cambiar en `/admin/ajustes` las probabilidades iniciales por ranura de
  los sobres plata y gold; SI no suman 100 por ranura, ENTONCES EL SISTEMA no las guardará e indicará cuál falla.
- RF-17: EL SISTEMA permitirá al administrador cambiar los sobres de la garantía de Épica (plata) y de EX (gold) que se
  proponen a una colección nueva.
- RF-18: EL SISTEMA aplicará los ajustes solo a lo que se cree o re-estile después de guardarlos (RF-6 y RF-10).
- RF-19: EL SISTEMA registrará en la auditoría cada cambio de ajustes con el valor anterior y el nuevo.

### Cartas de portada (decisión del dueño)
- RF-20: EL SISTEMA permitirá al administrador elegir en `/admin/ajustes` de 3 a 5 cartas de portada, solo de
  colecciones publicadas que no sean 18+, y su orden.
- RF-21: MIENTRAS haya cartas de portada elegidas, EL SISTEMA las mostrará en abanico en la portada pública, con su
  imagen pública con marca de agua, a quien tenga sesión y a quien no.
- RF-22: SI una carta de portada deja de ser válida (su colección se archiva o pasa a 18+, o la carta se borra),
  ENTONCES EL SISTEMA dejará de mostrarla sin romper la portada.
- RF-23: MIENTRAS no haya cartas de portada válidas, EL SISTEMA mostrará la portada como hoy, sin abanico.

## Requisitos no funcionales
- Los valores viven en un solo sitio del dominio (hoy están repartidos entre el dominio, el editor y la carta viva).
- Sin cambios en las cartas del coleccionista salvo las que se creen o se re-estilen a partir de ahora.

## Casos límite
- Carta con marco personalizado o «Sin marco»: el borde por defecto es 3,0 para el personalizado; «Sin marco» no usa
  borde.
- Sello de imagen: no cambia (su tamaño sigue en 36 %), decisión del dueño.
- Carta antigua con estilo automático: se queda como está hasta que se le aplique el estilo otra vez (RF-6);
  «Regenerar imágenes» no la cambia.
- Demo (`pnpm demo`) y colecciones de prueba: las cartas que se arman solas salen con 15 y 3,0.

## Fuera de alcance
- Cambiar las probabilidades de colecciones ya publicadas (siguen congeladas).
- Cartas de portada de colecciones 18+ o sin publicar.
- Cambiar otros valores por defecto (partículas, holo, brillo).

## Criterios de finalización
Cada RF con su test en verde (unidad para el dominio, integración para crear y re-estilar, E2E de crear una carta y ver
15 y 3,0 en los deslizadores); suite completa en verde; comprobar en la demo que una carta nueva sale con esos valores.

## Dudas abiertas
- Ninguna. Supuesto mío, no preguntado: las cartas antiguas con estilo automático no se actualizan al regenerar.
