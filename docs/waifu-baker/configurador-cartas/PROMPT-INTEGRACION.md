# Prompt de integración · editor de cartas idéntico al configurador

Bruno quiere en el juego **exactamente este creador**: el mismo diseño, los mismos controles y la misma carta que se ven al abrir `src/creador-cartas.html` (con un servidor local, ver README-ENTREGA.md). No hay que rediseñarlo ni adaptarlo al estilo actual del panel.

## Pasos

1. Copia esta carpeta completa al repo como `docs/waifu-baker/configurador-cartas/` y borra la versión anterior en `docs/waifu-baker/waifu-baker/codigo/carta-capas/`, para que no haya dos.
2. Trabaja en una rama nueva desde `pruebas`.
3. Pega en Claude Code el prompt de abajo.

## Prompt

```
Vamos a integrar el creador de cartas por capas en el panel de administración (spec 016).
Referencia: docs/waifu-baker/configurador-cartas/ (versión 4). Lee README-ENTREGA.md,
src/carta-capas-API.md (sección "Novedades de la versión 4"), docs/FORMATO-DE-DATOS.md,
docs/EFECTOS-Y-ANIMACIONES.md y docs/LO-FRAGIL.md, y abre src/creador-cartas.html.
Usa src/carta-capas.js y src/carta-capas.d.ts tal cual (reemplazan la v3 de apps/web/src/ui/game/carta-capas/)
y src/integraciones/react/CartaCapas.tsx como referencia del envoltorio.

Requisito principal: el editor de capas del panel debe verse y funcionar EXACTAMENTE como
creador-cartas.html v4. Mismo diseño (colores, tipografías, bordes, botones, escena oscura de
la vista previa), misma distribución, mismos controles y mismos textos. No lo adaptes al
estilo actual del panel ni quites funciones. Esto sustituye la decisión anterior de la
spec 016 de usar el estilo actual del panel para el editor.

Funciones que deben estar todas:
- Vista previa en vivo con carta-capas.js v4, profundidad del parallax, inclinación máxima,
  versión holo, intensidad del holo, movimiento solo y "Probar revelado".
- Capas: subir y arrastrar archivos, ordenar, ocultar, quitar; por capa: modo de mezcla,
  opacidad, profundidad y margen extra; en capas de imagen: "Brillo solo en el dibujo"
  (holográfico, destello, dorado, plateado) con intensidad, y "Usar como sello".
- Partículas: los 9 tipos, cantidad, tamaño, velocidad, un solo color y "Otra variación".
- Rareza: EX, SSR, SR, R, N, personalizado (color y brillo) y sin marco; grosor del borde;
  "Aplicar estilo de la rareza".
- Sello: ninguno, texto (con estilo) o imagen; esquina y tamaño.
- Proporción de la carta.

Lo que cambia respecto al archivo independiente:
- En lugar de copiar el JSON, el botón guarda la configuración en capas_json de la carta.
- Las imágenes se suben al almacenamiento de cartas del proyecto (URL firmadas), no se quedan
  en el navegador.
- Textos en los diccionarios (inglés y español), como pide la constitución.
- La rareza más alta se llama EX en toda la interfaz; en código el escalón es 'ex'
  (carta-capas acepta 'ur' como sinónimo para lo ya guardado).
- Solo administradores, como el resto del panel.

Antes de tocar código:
1. Actualiza la spec 016 con estos cambios (editor idéntico al creador v4, rareza EX, brillo
   por capa, intensidad del holo, imagen plana con brillo) y dime qué RF cambian o se agregan.
2. Dime qué archivos, rutas y tablas vas a tocar.
Espera mi visto bueno. Después impleméntalo en partes que pueda probar en el navegador,
empezando por el editor con vista previa, guardar y recargar.
```

## Cómo saber que quedó bien

- Abre `creador-cartas.html` y el editor del panel lado a lado: deben verse iguales.
- Sube las capas de Yuki (`src/cartas/yuki/`), guarda y recarga: la carta sigue igual.
- Ponle "Holográfico" a la capa del personaje: el brillo aparece solo sobre ella.
- Elige EX y "Aplicar estilo de la rareza": sello "EX", marco arcoíris y holo.
- La carta se ve igual en la ficha y en la apertura de sobres del sitio.
