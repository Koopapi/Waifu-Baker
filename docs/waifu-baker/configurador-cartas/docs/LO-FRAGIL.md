# Lo que no es nuestro o es frágil

## Servicios externos, claves y entorno

- **Sin servicios de pago, claves de API ni variables de entorno.** Nada se conecta a un servidor.
- **Google Fonts.** El configurador carga sus fuentes desde `fonts.googleapis.com`. Sin internet se ve con fuentes de respaldo. En producción, mejor servirlas con `next/font` (también evita mandar a los usuarios a Google).
- **Mi entorno.** Las pruebas y capturas se hicieron con Chromium 141 (Playwright 1.56.1) en Linux. **No se probó en Safari ni en Firefox.** Las capturas se tomaron con las mismas fuentes servidas en local, porque el entorno no tenía internet.

## Abrir con doble clic (`file://`)

Abierto desde el disco, el navegador trata cada archivo como si viniera de otro origen. Eso rompe:

- El **brillo por capa**, porque necesita usar la imagen como `mask-image`. Se comprobó: con `file://` el brillo no aparece.
- El **recorte automático del sello**, porque `getImageData` falla con una imagen "de otro origen".

Hay que servirlo por HTTP: `node pruebas/servidor.mjs`, `npx serve src` o el servidor de Next.

## CORS del arte

En el juego, las imágenes se sirven con URL firmadas. Si vienen de **otro dominio** (un *bucket* o CDN), ese dominio debe responder con `Access-Control-Allow-Origin` para el dominio del juego. Si no, el brillo por capa no se ve y el recorte automático del sello del editor no funciona. Desde el mismo dominio no hace falta nada.

## Diferencias entre la pantalla y la imagen plana

- **Modos de mezcla.** `sharp` no reproduce `hue`, `saturation`, `color` ni `luminosity`. La spec 016 decidió quitarlos del editor del juego. El configurador independiente todavía ofrece los 16 modos.
- **Fuente del sello de texto.** Hoy es la del sistema ("Arial Black" o la que haya), así que cambia según el dispositivo. La spec 016 pide Archivo Black en los dos lados (ver `RECURSOS-Y-LICENCIAS.md`).
- **Partículas y destello.** Están animados; la imagen plana solo puede mostrar un instante.

## Rendimiento

- **Partículas.** Cada una es un elemento del DOM con animación CSS: hasta 200 por capa de partículas. En rejillas con muchas cartas, usa `estatica: true`, que reduce las partículas al 40 % y quita el bucle.
- **Mezclas y 3D.** `mix-blend-mode`, máscaras y 3D cuestan en celulares modestos. La constitución del proyecto pide 60 fps en Pixel 6a e iPhone 12: mídelo con cartas EX (holo, 65 partículas y brillo por capa).
- **Pausa fuera de pantalla.** Las cartas que no se ven se pausan solas (`IntersectionObserver`).

## Navegador

- **Unidades `cqw`** (*container queries*): Chrome y Edge 105+, Safari 16+ y Firefox 110+. En navegadores más viejos la carta se descompone.
- **Marco con `mask-composite`.** Usa `-webkit-mask-composite: xor` y `mask-composite: exclude`. Es la parte con más probabilidad de verse distinta en Safari o Firefox; revísalo a mano.
- **Giroscopio en iOS.** Pide permiso y solo se puede pedir desde un toque del jugador (`habilitarGiroscopio()`).

## Datos del configurador

- **Ajustes.** Se guardan en `localStorage` con la clave `wb-creador-carta-v1`. Las **imágenes no**: son URL `blob:` que desaparecen al recargar, y hay que volver a arrastrar los archivos. En el editor del panel esto se sustituye por subirlas al almacenamiento del proyecto.
- **Sin compilación.** `creador-cartas.html` es un archivo con HTML, CSS y JS juntos, con IDs globales y sin módulos. Para pasarlo a React hay que separar el marcado, el CSS y la lógica. La lógica del estado (`state`, `opciones()`, `renderJSON()`) se puede trasladar casi tal cual.
- **Rutas del JSON.** El configurador escribe rutas relativas: "carpeta en el sitio" + nombre del archivo. En el juego deben sustituirse por las claves del almacenamiento, que el servidor convierte en URL firmadas al servir la carta.

## Contenido

El paquete no incluye claves, tokens, contraseñas, archivos `.env`, datos personales ni imágenes con contenido explícito. El único arte es la carta de ejemplo de Yuki.
