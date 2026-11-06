# Prompt de integración · sobres idénticos al creador

Bruno quiere en el juego **exactamente este sobre y esta apertura**. Eso incluye:
- el mismo creador, con el mismo diseño y los mismos controles;
- el mismo sobre 3D, con plástico, sellos, logo y banda;
- la misma forma de rasgarlo y de despegarlo;
- la misma revelación de cartas.

Para verlos, abre `src/creador-sobres.html` y `src/apertura-sobre.html` con un servidor local (ver README-ENTREGA.md). No hay que rediseñarlos ni adaptarlos al estilo actual del panel.

## Pasos

1. Copia esta carpeta completa al repo como `docs/waifu-baker/sobres/`, junto a `docs/waifu-baker/configurador-cartas/`.
2. Trabaja en una rama nueva desde `pruebas`.
3. Pega en Claude Code el prompt de abajo.

## Prompt

```
Vamos a integrar los sobres por capas: el editor de sobres en el panel de administración y la
pantalla de apertura de sobres del juego.
Referencia: docs/waifu-baker/sobres/ (sobre-capas.js v1). Lee README-ENTREGA.md,
src/sobre-capas-API.md, docs/FORMATO-DE-DATOS.md, docs/EFECTOS-Y-ANIMACIONES.md y
docs/LO-FRAGIL.md, y abre src/creador-sobres.html y src/apertura-sobre.html.

Componentes:
- Usa src/sobre-capas.js y src/sobre-capas.d.ts tal cual.
- Reemplaza carta-capas.js y carta-capas.d.ts del juego por los de este paquete: son la misma
  v7 del configurador de cartas más CartaCapas.motor, que el sobre necesita.
- Usa src/integraciones/react/SobreCapas.tsx como envoltorio.
- Sube a public/ las 3 imágenes del plástico (src/img/plastico-*.webp) y los patrones
  (src/marcos/patrones/). Pásale sus rutas a SobreCapas.recursos y a CartaCapas.texturas.ondas.
- No reescribas los efectos: el aspecto sale del CSS que inyecta sobre-capas.js y de esas imágenes.

Requisito principal: el editor de sobres del panel debe verse y funcionar EXACTAMENTE como
creador-sobres.html. Mismo diseño (el mismo sistema que el editor de cartas), misma
distribución, mismos controles y mismos textos. No quites funciones.

Funciones del editor que deben estar todas:
- Vista previa en vivo con sobre-capas.js:
  - versión 3D o plano, apertura rasgar o sticker, inclinación, brillo del plástico;
  - ver guías, movimiento solo, sonido y fondo de pantalla (rayos, oscuro, claro);
  - "Probar apertura" con cartas de muestra, "Siguiente carta" y "Volver a cerrar".
- Capas (lienzo de 1000 × 1750): subir y arrastrar archivos, acomodo por nombre, ordenar,
  ocultar y quitar.
  - Por capa: modo de mezcla, opacidad, profundidad y margen extra.
  - En capas de imagen, "Brillo solo en el dibujo" (holográfico, destello, dorado, plateado y
    ondas que brillan, con patrón y tamaño).
  - Partículas: los 9 tipos, cantidad, tamaño, velocidad, un solo color y "Otra variación".
  - Las capas que pone el código, bloqueadas en la lista.
- Revisión automática: medidas, fondo con transparencia, lo que cruza la línea de rasgado
  (y = 230), nombre largo y archivos faltantes.
- Sobre: nombre del set, código, cartas por sobre, logo (Waifu Baker, imagen o sin logo),
  insignia con color, holo y foil con su intensidad.
- Sellos: colores de arriba y abajo, colores de la marca, patrón holo (10 incluidos o uno
  propio) y su tamaño.
- Miniatura PNG de 500 × 875 (función miniatura()).

Lo que cambia respecto al archivo independiente:
- En lugar de copiar el registro, el botón lo guarda en el sobre. Al guardar también se
  genera la miniatura y se sube.
- Las imágenes se suben al almacenamiento del proyecto (URL firmadas), no se quedan en el
  navegador.
- Textos en los diccionarios (inglés y español), como pide la constitución.
- Solo administradores, como el resto del panel.

Pantalla de apertura: debe funcionar EXACTAMENTE como apertura-sobre.html.
- La secuencia y sus tiempos: rasgar, cartas subiendo a los 0.38 s, el sobre se oculta a los
  1.25 s y primera carta a los 1.9 s.
- Las cartas siguen ocultas mientras el sobre está cerrado; salen derechas y solo se ve la de
  arriba.
- Se pasan arrastrando a un lado, con un toque o con el botón.
- El presagio, el efecto de SSR y EX (rayos, estrella, campanita, vibración), los puntos de
  avance y el resumen.
- La tirada la decide el servidor: cada carta llega con su configuración de carta-capas.
- El sobre que se abre es el registro guardado de ese sobre.

Antes de tocar código:
1. Revisa cómo se guardan hoy los sobres en la base de datos y propón dónde va el registro
   (JSON) y la miniatura.
2. Escribe o actualiza la spec de sobres con estos requisitos y dime qué RF se agregan.
3. Dime qué archivos, rutas y tablas vas a tocar.
Espera mi visto bueno. Después impleméntalo en partes que pueda probar en el navegador,
empezando por el sobre en la pantalla de apertura con un registro de ejemplo
(docs/waifu-baker/sobres/src/sobres/fa01.json), luego el editor con vista previa, guardar y recargar.
```

## Cómo saber que quedó bien

- Abre `creador-sobres.html` y el editor del panel lado a lado: deben verse iguales.
- Sube las capas del ejemplo (`src/sobres/fa01/`), guarda y recarga: el sobre sigue igual y el registro coincide con `src/sobres/fa01.json`.
- Abre `apertura-sobre.html` y la pantalla de apertura del juego lado a lado: rasga los dos sobres a la vez y compara la secuencia.
- Con el sobre inclinado al máximo, no se asoma ninguna carta por detrás.
- Elige sticker: la tira se dobla y muestra el reverso al despegarla.
- En plano, el sobre sale con dientes y sombra rosa; en 3D, con plástico y silueta de almohada.
