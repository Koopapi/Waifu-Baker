# Plan 010 — Acabado premium (estilo Discord) y demo local

Respeta `docs/constitution.md` y `docs/reglas-de-negocio.md`. No cambia reglas de negocio ni el
esquema de datos: es una capa de presentación sobre las rutas actuales, más un guion de demo que usa
los mismos servicios que el panel. Maquetas: `Waifu Baker/waifubaker.pen` (pantallas «Paleta A/B/C —
Mis sobres», «Mi colección», «Panel de administración», «Móvil · …» y «Portada de la demo»;
componentes «Carta mini» e «Item de navegación»).

## 1. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `app/globals.css` | Tokens `--ui-*` (fondos de barra, panel y contenido, texto 1/2/3, acento, éxito, peligro) de la paleta elegida, expuestos a Tailwind con `@theme inline`; radios y sombras | RF-6, RF-11 |
| `features/shell/AppShell.tsx` | Estructura de tres zonas: barra de colecciones, panel de navegación y contenido; recibe las secciones por props | RF-1 a RF-3, RF-5 |
| `features/shell/CollectionRail.tsx` | Inicio + un icono por colección del usuario (portada de la colección), indicador de la activa, desplazamiento con la activa siempre visible | RF-1, casos límite |
| `features/shell/NavPanel.tsx` | Cabecera de la colección, secciones agrupadas con la actual resaltada y contadores, panel de usuario (galletas, idioma) | RF-2 |
| `features/shell/MobileDrawer.tsx` | Menú deslizable con botón y gesto desde el borde (`@use-gesture`, ya instalado), velo, foco atrapado y cierre con Escape | RF-4, RF-11 |
| `features/ui/{Button,Card,Skeleton,Toast}.tsx` | Primitivas con estados hover/pulsado/foco; avisos emergentes con cola, cierre automático y `aria-live` | RF-7 a RF-9 |
| `app/(app)/layout.tsx` y `app/admin/layout.tsx` | Montan el `AppShell` con las secciones de coleccionista o de administración | RF-3, RF-5 |
| `app/**/loading.tsx` | Esqueletos por sección | RF-9 |
| `domain/demo/mode.ts` | `isDemoEnabled(env)`: `DEMO_MODE=1` y nunca con `NODE_ENV=production` | RF-13 a RF-15 |
| `scripts/demo.mts` (`pnpm demo`) | Recrea la BD `waifu_baker_demo`, migra, siembra y arranca `next dev` en modo demo | RF-12 |
| `server/services/demo-seed.ts` | Colección de fan art, probabilidades, coleccionista y administrador, con los servicios reales | RF-12 |
| `app/page.tsx` + `features/demo/*` | Portada con los dos papeles, franja de demo y cambio de papel | RF-13, RF-14 |

## 2. Decisiones

- **Rutas**: las URLs no cambian. Las secciones del coleccionista pasan a un grupo `(app)` con un
  layout común; así el `AppShell` persiste entre secciones y la navegación con `<Link>` solo cambia
  el contenido (RF-3).
- **Paleta**: una sola, la que elija el usuario entre A Noche, B Cereza y C Oro (RF-6). Los colores
  viven solo en los tokens; ningún componente usa un color fijo. Contrastes verificados en las
  maquetas: el acento de cada paleta se ajustó para que el texto del botón llegue a 4,5:1 (RF-11) y
  los enlaces usan una variante clara del acento.
- **Animación** (RF-10): CSS con `transform`/`opacity` para hover, avisos, cajón y aparición de
  tarjetas; `motion` (ya instalado) para la transición de sección. `@media (prefers-reduced-motion:
  reduce)` las quita y `MotionConfig reducedMotion="user"` hace lo mismo en `motion`.
- **Avisos** (RF-8): proveedor propio de ~80 líneas, sin dependencia nueva. Las server actions ya
  devuelven `{ ok | error }`; los formularios llaman a `toast()` con el texto traducido.
- **Demo** (RF-12 a RF-15):
  - Entorno: `DEMO_MODE=1`, `DEV_LOGIN=1`, BD `waifu_baker_demo`, puerto 3300 y carpeta de cartas
    propia, para no tocar los datos de desarrollo.
  - Arte: el guion lee `demo/fanart.json` (archivo, personaje, rareza) y toma las imágenes de
    `ART_DIR` (el taller de arte). Las imágenes no se suben a git.
  - Reparto de rarezas de las 30: por personaje, 2 comunes, 1 infrecuente, 1 rara y 1 épica o
    legendaria (3 y 3).
  - Datos: coleccionista `dev:demo-collector` con 3 sobres sellados, unas 18 cartas abiertas con la
    apertura real, 240 galletas y racha en el día 4 (con el reloj de desarrollo); administrador
    `dev:demo-admin`.
  - Entrar como un papel: una server action inicia sesión con el login de desarrollo (sin Patreon).
    La franja y la portada solo existen si `isDemoEnabled`.
  - Producción (RF-15): en producción el modo demo se ignora y `/api/demo/*` responde 404.
- **Pendiente del usuario** (no bloquea el plan): la paleta, la barra inferior de pestañas en móvil
  (está en la maqueta, pero no en la spec), y el nivel 16/18 de la colección de fan art, que decide si
  la demo la marca como SFW.

## 3. Pruebas

- Unidad: `isDemoEnabled`, cola de avisos, reparto de rarezas del manifiesto de la demo.
- Integración: `demo-seed` crea la colección publicada con 30 cartas, el coleccionista con sus datos
  y el administrador; ejecutarlo dos veces deja el mismo estado.
- E2E (`e2e/shell.spec.ts`, `e2e/demo.spec.ts`): barra y panel en escritorio, cajón en pixel-7 e
  iphone-14 (botón y gesto), avisos y esqueletos, movimiento reducido, contraste con axe en las
  pantallas principales, portada con los dos papeles y cambio de papel.
