# Plan 011 — Sistema de diseño

Respeta `docs/constitution.md` (principios 1, 4, 9 y 10) y parte de lo hecho en la spec 010: tokens de la paleta
«Cereza», avisos, esqueletos y la estructura. Aquí todo eso pasa a ser un sistema con API estable.

## 1. Dónde vive

```
apps/web/src/ui/                 el sistema (no importa nada de features/ ni de app/)
  tokens.css                     colores, tipografía, espaciado, radios, sombras, capas y tiempos (RF-1, RF-2)
  variants.ts                    ayudante de variantes y unión de clases (sin dependencia)
  action/        Button, IconButton                                         RF-3
  form/          TextField, TextArea, Checkbox, Switch, RadioGroup, Select   RF-4
  feedback/      Toast (+ useToast, deshacer), Alert, EmptyState, Skeleton  RF-5, RF-11
  overlay/       Modal, ConfirmDialog (+ useConfirm), Menu, Tooltip        RF-6, RF-12
  content/       Card, Badge, Tabs, Progress, Avatar, Table                  RF-7
  game/          Countdown, AnimatedCounter, FocusView                       RF-8
  shell/         AppShell, Rail, NavPanel, Drawer, TabBar, Banner            RF-9 (lo de la spec 010)
  hooks/         useOptimisticAction                                         RF-10, RF-11
  index.ts       exportaciones públicas
apps/web/src/app/sistema/        catálogo (solo desarrollo; 404 en producción)  RF-15
Waifu Baker/waifubaker.pen       lámina «Sistema de diseño» con un componente Pencil por cada uno   RF-16
```

`features/` solo compone piezas de `ui/` con datos; `features/ui/` y `features/shell/` de la spec 010 se mueven a
`src/ui/` (sin copias).

## 2. Dependencias nuevas (principio 1)

| Paquete | Para qué | Por qué no hacerlo a mano |
|---|---|---|
| `radix-ui` (paquete único, se importa por primitiva) | Dialog, Popover, DropdownMenu, Select, Tooltip, Tabs, Switch, Checkbox, RadioGroup | Foco atrapado, teclado, roles ARIA y posicionamiento probados (RF-14); hacerlo a mano es donde suelen fallar los sistemas propios. Sin estilos: el aspecto es nuestro. |
| `cmdk` | Desplegable con buscador (RF-4) | Filtrado y navegación con teclado accesibles; ~4 KB. |

Presupuesto (RNF): menos de 30 KB comprimidos añadidos a las páginas principales; se mide con el análisis del build.

## 3. Decisiones

- **API**: cada componente acepta `variant`, `size` y `className` (solo para colocar, no para recolorear), reenvía
  `ref` y propaga atributos nativos. Los estados (carga, deshabilitado, error) son props, nunca clases sueltas.
- **Tokens** (RF-1, RF-2): `tokens.css` define `--ui-*` en `:root` y los expone a Tailwind con `@theme inline`
  (colores, `--radius-*`, `--shadow-*`, `--z-*`, `--duration-fast|base|slow` = 150/200/250 ms). Un tema futuro
  solo redefine variables bajo `[data-theme="…"]`.
- **Respuesta optimista** (RF-10, RF-11): `useOptimisticAction({ apply, run, undo })` con `useOptimistic` de React 19:
  aplica al instante, llama a la server action y, si falla, revierte y muestra un aviso de error con «Reintentar».
  Si la acción es reversible, el aviso de éxito trae «Deshacer» durante su vida (4 s).
- **Confirmación** (RF-12): `const ok = await confirm({ title, body, confirmLabel, tone: "danger" })` sobre
  `ConfirmDialog`. Se sustituyen los `window.confirm` actuales (cuenta, álbum, publicar, cartas y edad mínima).
- **Movimiento** (RF-13): transiciones con los tokens de duración, solo `transform` y `opacity`; la regla global
  de movimiento reducido de la spec 010 se mantiene.
- **Juego** (RF-8): `Countdown` (sustituye al de recompensas), `AnimatedCounter` (números que suben: galletas,
  progreso) y `FocusView` (pantalla completa con portal, usada por la apertura y el simulador).
- **Catálogo** (RF-15): `/sistema` lista cada componente con todas sus variantes y estados; la página solo importa
  de `@/ui`, así se podrá pasar a Storybook. En producción, `notFound()`.
- **Adopción** (RF-17): migración por zonas (estructura → coleccionista → panel → portada, demo y legales).
  Un test de Vitest prohíbe en `app/` y `features/` los `<button className=`, `<input className=`, los colores de
  la interfaz fuera de tokens y `window.confirm`.

## 4. Pruebas

- Vitest: variantes, cola de avisos con deshacer, reductor de la acción optimista, y el test de adopción (RF-17).
- E2E `e2e/design-system.spec.ts` sobre `/sistema`: teclado y lector (foco visible, foco atrapado y Escape en modal,
  menú y desplegable con buscador), deshacer, confirmación, movimiento reducido y contraste (RF-3 a RF-15).
- El resto del E2E debe seguir verde sin cambiar sus recorridos.
