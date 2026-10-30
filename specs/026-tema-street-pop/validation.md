# Validación — Spec 026

Fecha: 30 oct 2026, en local (rama `spec/026-tema-street-pop`, sale de la 025). El dueño pidió subirla a pruebas el 30 oct.
Pendiente: demo del dueño en escritorio y teléfono en el servidor de pruebas.

| RF | Evidencia | Estado |
|---|---|---|
| RF-1 | `domain/ui/theme.test.ts` (dos temas) | ✅ |
| RF-2, RF-3 | `theme.test.ts` (unidad e integración: sin sesión o sin elegir, kawaii); E2E `theme.spec` (visitante sin sesión) | ✅ |
| RF-4 | E2E (la tarjeta «Tema» va primero en Mi cuenta; `OptionCards` con miniatura de cada tema) | ✅ |
| RF-5 | E2E (`<html data-theme>` cambia en menos de 1 s y la página no se recarga) | ✅ |
| RF-6 | Integración (`setTheme`, valores fuera de la lista rechazados también por la base de datos); E2E (se guarda) | ✅ |
| RF-7 | Integración (volver a entrar no lo pisa); E2E (otro navegador con la misma cuenta) | ✅ |
| RF-8 | E2E (el HTML que manda el servidor ya trae `data-theme="street"`) | ✅ |
| RF-9 | E2E (si falla el guardado, vuelve el kawaii y sale «No se pudo guardar el tema») | ✅ |
| RF-10 | E2E (sin la sesión, kawaii) | ✅ |
| RF-11 | Barrido `qa-sweep` en Street pop (inicio, sobres, apertura, abrir todos, colección, binder, juegos, expediciones, álbum, probabilidades, 404 y panel) en escritorio, tableta y teléfono: sin errores, sin desbordes y sin avisos de hidratación | ✅ |
| RF-12 | E2E (la mesa de apertura vuelve a las variables oscuras; la página alrededor no) | ✅ |
| RF-13 | `PreviewStage` con `data-theme="kawaii"`; la piel de Street pop se detiene ahí (`@scope … to`) | ✅ (revisión de código y capturas) |
| RF-14, RF-15 | El tema no toca `carta-capas.js` ni los colores de rareza; E2E (el escenario conserva las variables del kawaii) | ✅ |
| RF-16 | E2E (el álbum de un usuario con Street pop sale en kawaii para un visitante sin sesión) | ✅ |
| RF-17, RF-18 | `ui/themes/street.test.ts` (paleta de Bruno); E2E (fondo lila y títulos en Dela Gothic) | ✅ |
| RF-19 a RF-21 | `street.css` (botones y etiquetas en Archivo itálica gruesa, bordes de 3 px, sombras duras, inclinados; los botones de varias líneas rectos); E2E (botón inclinado) | ✅ |
| RF-22 | Franja índigo y trama en el pie, en la zona sin texto | ✅ (capturas) |
| RF-23 | Pegatinas con contorno del tema (`icons.test.tsx`) y paleta plana de Street pop | ✅ |
| RF-24, RF-25 | `street.test.ts` (texto ≥ 4,5:1 sobre todos los fondos, también en las zonas de tinta; bordes y foco ≥ 3:1; rosa y lima nunca como texto) | ✅ |
| RF-26 | Catálogo `/sistema` con interruptor de tema | ✅ (capturas) |
| RF-27 | Textos del selector en `es` y `en` | ✅ |

RNF: quien usa kawaii no descarga las fuentes de Street pop (E2E con `document.fonts`; las miniaturas del selector usan la
fuente del sistema para cumplirlo); 390 px sin scroll horizontal (E2E); animaciones y movimiento reducido sin cambios.

Pruebas en local: unitarias e integración 768 (137 archivos), tipos, lint, build y peso de las páginas en verde. E2E:
`theme.spec` en escritorio (4 de 4) y el barrido en los dos temas (kawaii y Street pop) en verde. El barrido Street pop
encontró dos desbordes por las mayúsculas anchas (título de «Abrir todos» en el teléfono y un botón del panel en tableta),
corregidos: en Street pop un botón parte línea si no cabe y un título puede cortar una palabra larga. La suite completa de
escritorio y los proyectos de teléfono los corre la CI.
