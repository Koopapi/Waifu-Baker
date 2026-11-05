# Spec 028 — Valores por defecto del armador

Estado: borrador del 5 nov 2026, pendiente de aprobación del dueño.

Origen: el dueño pidió el 5 nov 2026 que el tamaño del sello quede siempre en 15 por defecto y el grosor del borde en
3,0, porque hoy cada carta nueva sale con valores que luego corrige a mano.

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

## Requisitos no funcionales
- Los valores viven en un solo sitio del dominio (hoy están repartidos entre el dominio, el editor y la carta viva).
- Sin cambios en las cartas del coleccionista salvo las que se creen o se re-estilen a partir de ahora.

## Casos límite
- Carta con marco personalizado o «Sin marco»: el borde por defecto es 3,0 para el personalizado; «Sin marco» no usa
  borde.
- Sello de imagen: no cambia (su tamaño sigue en 36 %). [NECESITA ACLARACIÓN: ¿también debe cambiar?]
- Carta antigua que nunca se tocó a mano (estilo automático): se queda como está hasta que se le aplique el estilo
  otra vez (RF-6). [NECESITA ACLARACIÓN: ¿o prefieres que «Regenerar imágenes» las actualice a 15 y 3,0?]
- Demo (`pnpm demo`) y colecciones de prueba: las cartas que se arman solas salen con 15 y 3,0.

## Fuera de alcance
- Hacer los valores configurables desde el panel (`/admin/ajustes`). [NECESITA ACLARACIÓN: ¿lo quieres ahora?]
- Cambiar otros valores por defecto (partículas, holo, brillo).

## Criterios de finalización
Cada RF con su test en verde (unidad para el dominio, integración para crear y re-estilar, E2E de crear una carta y ver
15 y 3,0 en los deslizadores); suite completa en verde; comprobar en la demo que una carta nueva sale con esos valores.

## Dudas abiertas
- [NECESITA ACLARACIÓN: ¿cambia también el sello de imagen?]
- [NECESITA ACLARACIÓN: ¿las cartas antiguas con estilo automático se actualizan al regenerar?]
- [NECESITA ACLARACIÓN: ¿configurable desde el panel ahora o después?]
