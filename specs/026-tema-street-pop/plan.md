# Plan — Spec 026: tema Street pop seleccionable

Estado: borrador. Pendiente de que el dueño apruebe las maquetas (`maqueta.html`); hasta entonces no se escribe código.
Todo en local, en la rama `spec/026-tema-street-pop` (sale de la 025, porque los componentes del configurador también
llevan el tema).

## Decisión principal: un tema = variables bajo `[data-theme="street"]`

`ui/tokens.css` ya concentra todos los colores (spec 011). Street pop se escribe como un bloque
`:root[data-theme="street"] { … }` que redefine esas variables, más un puñado de **variables de forma** nuevas que hoy
valen lo mismo que el kawaii (así el kawaii no cambia ni un píxel):

| Variable nueva | Kawaii | Street pop |
|---|---|---|
| `--ui-stroke` / `--ui-stroke-color` | `1px` / `--ui-line` | `3px` / tinta |
| `--ui-shadow-card`, `--ui-shadow-control` | sombras suaves actuales | `6px 6px 0` y `4px 4px 0` tinta |
| `--ui-skew` | `0deg` | `-10deg` |
| `--ui-label-case`, `--ui-label-style`, `--ui-label-weight` | `none`, `normal`, `700` | `uppercase`, `italic`, `900` |
| `--ui-radius-*` | 8/12/20/28 | 6/8/10/12 |
| `--font-body`, `--font-display` | Nunito, Fredoka | Archivo, Dela Gothic One |
| `--ui-k-contorno`, `--shadow-sticker` | blanco, sombra suave | tinta, `3px 3px 0` tinta |

Los componentes de `src/ui` dejan de usar sombras, bordes y radios fijos y pasan a estas variables. Los botones y las
etiquetas inclinan la caja con `--ui-skew` y enderezan el texto con un `span` interior (como en las maquetas). Ninguna
pantalla tiene estilos propios por tema: si un componente se ve bien en `/sistema` en los dos temas, se ve bien en todas.

Las pegatinas (`ui/icons/Sticker.tsx`) ya pintan con variables; se cambia el contorno blanco fijo por `--ui-k-contorno`
y Street pop redefine la paleta `--ui-k-*` (RF-23).

## Datos

- Migración `0019_tema.sql`: `users.theme` (`text`, `'kawaii' | 'street'`, por defecto `'kawaii'`, con `check`).
- `domain/ui/theme.ts`: `THEMES`, `Theme`, `DEFAULT_THEME`, `parseTheme()` (cualquier valor raro → kawaii).
- La purga de cuentas (spec 001) devuelve `theme` al valor por defecto.

## Servidor

- `server/services/theme.ts`: `getThemeFor(db, userId)` y `setTheme(db, userId, theme)`.
- `app/layout.tsx`: lee la sesión (`auth()`, ya es dinámica por la cookie de idioma), consulta el tema por clave
  primaria y pinta `<html data-theme="…">` (RF-2, RF-3, RF-7, RF-8, RF-10). `generateViewport` devuelve
  `colorScheme` y `themeColor` del tema (controles nativos claros u oscuros).
- Acción de servidor `setThemeAction(theme)` en `features/account/actions`: valida con zod, exige sesión, guarda
  (RF-6). Límite de peticiones como las demás acciones de la cuenta.

## Cliente

- `ui/form/OptionCards.tsx` (nuevo componente del sistema, fila en `docs/DESIGN.md`): grupo de opciones con radix
  RadioGroup, cada una con miniatura, nombre y descripción. Lo usa el selector de tema.
- `features/account/ThemePicker.tsx`: al elegir, cambia `document.documentElement.dataset.theme` al instante (RF-5),
  llama a la acción y, si falla, vuelve al tema anterior y muestra el aviso (RF-9). No recarga ni toca formularios.
- Tarjeta «Tema» primero en `/account` (RF-4), con textos en los diccionarios `es` y `en` (RF-27).

## Fuentes

`next/font/google` con `Archivo` y `Dela_Gothic_One`, `preload: false` y `display: swap`. Las `@font-face` existen
siempre, pero el navegador solo descarga un archivo de fuente cuando algo visible la usa: quien está en kawaii no las
descarga (RNF). Si fallan, quedan las de sistema de la pila (caso límite).

## Lo que se queda oscuro

- La mesa de apertura (`features/opening`) y el escenario de la carta (`ui/game/PreviewStage`) llevan
  `data-theme="kawaii"` en su contenedor: dentro de ellos las variables vuelven a las del kawaii (RF-12 y RF-13).
- Ventanas, avisos y menús se montan en `body` (portales), así que toman el tema del usuario (caso límite).
- Las cartas (`carta-capas.js`) y los colores de rareza tienen variables propias que el tema no toca (RF-14 y RF-15).

## Adornos de Street pop

Franjas índigo y trama de puntos como componentes decorativos (`ui/content/Stripe`, `ui/content/Halftone`), que no
pintan nada en kawaii y siempre van con `aria-hidden` y fuera de las cajas de texto (RF-22). Título de página con la
sombra doble rosa y turquesa vía `--ui-title-shadow` (`none` en kawaii).

## Catálogo `/sistema`

Un interruptor local (no se guarda) arriba del catálogo pone `data-theme` en el contenedor, para ver cada componente en
los dos temas (RF-26).

## Pruebas

| Tipo | Qué |
|---|---|
| Unidad | `theme.ts` (`parseTheme`); contraste de la paleta Street pop con las mismas parejas del kawaii (RF-24, RF-25); el kawaii no cambia (las variables de forma por defecto reproducen los valores actuales); `OptionCards` y `ThemePicker` (aplica al instante y revierte si falla) |
| Integración | `setTheme`/`getThemeFor`; la purga borra la elección; la acción rechaza valores fuera de la lista y sin sesión |
| E2E (`e2e/theme.spec.ts`) | elegir Street pop cambia `<html>` sin recargar; recargar y otro navegador con la misma cuenta lo mantienen; sin sesión y tras cerrar sesión, kawaii; la mesa de apertura sigue oscura; el álbum de otro usuario sale en el tema del visitante; una página kawaii no pide las fuentes de Street pop; 390 px sin scroll horizontal |
| Barrido | `qa-sweep` recorre las páginas en los dos temas (sin avisos de hidratación ni errores en consola) |

## Riesgos

- **Cantidad de componentes**: cada uno que use sombras o bordes fijos hay que pasarlo a variables. Se revisan con el
  catálogo y con capturas de cada página en los dos temas antes de la demo.
- **Contraste en claro**: varios textos de estado (`--ui-*-text`) están pensados para fondo oscuro; en Street pop se
  redefinen en tonos oscuros y el test de contraste lo comprueba.
- **Hidratación**: el tema llega del servidor en `<html>`; el cliente no lo recalcula al cargar, solo al elegir.
