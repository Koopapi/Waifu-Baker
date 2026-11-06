# Lo que no es nuestro o es frágil

## Servicios externos, claves y entorno

- **Sin servicios de pago, claves de API ni variables de entorno.** Nada se conecta a un servidor.
- **Google Fonts.** El creador, la apertura y el propio sobre (logo y banda) cargan Dela Gothic One y Archivo desde `fonts.googleapis.com`. Sin internet, el logo y la banda salen con otra fuente. En producción, sírvanlas con `next/font` (también evita mandar a los jugadores a Google).
- **Descarga de la miniatura.** El creador primero intenta `window.claude.use('downloads')`, que solo existe cuando la página se abre como artifact en Claude. En cualquier otro sitio usa un enlace `<a download>` normal. En el panel del juego, esa línea sobra: la miniatura se sube al almacenamiento al guardar.
- **Mi entorno.** Las pruebas y capturas se hicieron con Chromium 141 (Playwright 1.56.1) y Node 22 en Linux, con las fuentes servidas en local porque el entorno no tenía internet. **No se probó en Safari, Firefox ni en celulares reales**: el rasgado y el despegado se probaron con ratón, y en celular solo se comprobó que el creador no se desborde a 390 px. La vibración no se probó.

## Abrir con doble clic (`file://`)

Abierto desde el disco, el navegador trata cada archivo como si viniera de otro origen. Eso rompe:

- La **silueta del plástico** (es una `mask-image`). Una máscara que no carga oculta todo, así que **el sobre 3D desaparece**: solo queda la línea punteada (comprobado). El sobre plano sí se ve.
- El **patrón de los sellos**, las **ondas que brillan** y el **brillo por capa**: todos son máscaras y desaparecen.
- La **revisión automática**, porque lee los píxeles de las imágenes con `getImageData`. En ese caso avisa "No se pudo revisar…".
- La **apertura**, que lee `sobres/fa01.json` con `fetch`. En ese caso lo dice en la indicación.

El creador detecta que está abierto así y lo avisa debajo de la vista previa.

Hay que servirlo por HTTP: `node pruebas/servidor.mjs`, `npx serve src` o el servidor de Next.

## CORS del arte y de los recursos

Si las capas, el plástico, los patrones o los logos se sirven desde **otro dominio** (un *bucket* o una CDN), ese dominio debe responder con `Access-Control-Allow-Origin` para el dominio del juego. Si no, pasa lo mismo que con `file://`: el sobre 3D desaparece, y tampoco hay patrones, brillo por capa ni revisión. Desde el mismo dominio no hace falta nada.

## Navegador

- **`color-mix()`** (luces y sombras de los sellos): Chrome y Edge 111+, Safari 16.2+ y Firefox 113+. En navegadores más viejos, los sellos 3D salen sin degradado.
- **Unidades `cqw`** (*container queries*): todo el sobre se mide así. En navegadores sin soporte, el sobre se descompone.
- **`mask-image` con imágenes** y **`mix-blend-mode`**: la parte con más probabilidad de verse distinta en Safari o Firefox. Revísenlo a mano.
- **Sonido.** Los navegadores solo dejan sonar audio después de un gesto del jugador. El sobre crea el audio en el primer toque, así que el primer sonido puede perderse en algunos navegadores.
- **Vibración.** `navigator.vibrate` existe en Android; iOS lo ignora.

## Geometría del sticker

- La apertura de sticker calcula el pliegue en píxeles con el tamaño del sobre al dibujarse. Al cambiar el tamaño de la ventana se recalcula, pero solo con el sobre cerrado.
- Si el sobre cambia de tamaño mientras se está despegando (por ejemplo, al girar el celular), el pliegue puede quedar descuadrado hasta que se reinicie.

## Rendimiento

- **Cada sobre dibuja su pila dos veces** (cuerpo y tira), con el plástico, los sellos y el arte, varias máscaras y modos de mezcla. Muestren **un sobre animado a la vez**. Para listas de sobres (tienda, inventario) usen la **miniatura PNG**, no el componente.
- **Partículas.** Cada una es un elemento del DOM, y se dibujan dos veces. Mantengan pocas: el ejemplo usa 18.
- **Celulares modestos.** La constitución del proyecto pide 60 fps en Pixel 6a e iPhone 12. Mídanlo con el sobre 3D y "ondas que brillan" en el fondo, que es lo más pesado.
- **Peso.** El plástico pesa 458 KB entre las tres imágenes, y se descarga una vez para todos los sobres. Las capas del ejemplo pesan 607 KB. Sirvan todo con caché larga.

## Datos del creador

- **Ajustes.** Se guardan en `localStorage` con la clave `wb-creador-sobre-v1`. Las **imágenes no**: son URL `blob:` que desaparecen al recargar, y hay que volver a arrastrar los archivos. En el panel esto se sustituye por subirlas al almacenamiento del proyecto.
- **Sin compilación.** `creador-sobres.html` es un archivo con HTML, CSS y JS juntos, con IDs globales y sin módulos. Para pasarlo a React hay que separar el marcado, el CSS y la lógica. La lógica del estado (`state`, `opciones()`, `renderJSON()`, `renderRevision()`, `miniatura()`) se puede trasladar casi tal cual.
- **Rutas del registro.** El creador escribe rutas relativas: "carpeta en el sitio" + nombre del archivo. En el juego deben sustituirse por las claves del almacenamiento, que el servidor convierte en URL al servir el sobre.
- **La revisión no ve caras.** Avisa si *algo* opaco de una capa (que no sea el fondo) cruza la línea de rasgado. No sabe si es una cara, pelo o un brillo. Es un aviso para revisar a ojo, no una regla.

## Dependencia entre los dos componentes

`sobre-capas.js` necesita `CartaCapas.motor`, que solo trae la copia de `carta-capas.js` de **este** paquete. Si en el juego queda la copia del paquete de cartas sin el motor, `SobreCapas.montar` lanza el error "sobre-capas.js necesita carta-capas.js v7 o posterior (con CartaCapas.motor) cargado antes".

## Contenido

El paquete no incluye claves, tokens, contraseñas, archivos `.env`, datos personales ni imágenes con contenido explícito. El único arte es el de Yuki (personaje adulto, uniformado) y el render gris del plástico.
