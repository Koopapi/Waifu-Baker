# Plan 014 — Demo pulida con estilo kawaii

Respeta `docs/constitution.md` y `docs/reglas-de-negocio.md`. Parte del sistema de diseño (spec 011), la apertura
(specs 004 y 013), recompensas (009), colección (006) y la demo (010). Primero se diseña en Pencil y se aprueba;
después se programa.

## 1. Maquetas (antes de código)

En `waifubaker.pen`, una lámina nueva «Kawaii (spec 014)» con: la paleta y los tokens, las 8 pegatinas, el sobre
compuesto, el dorso de carta y, en móvil y escritorio, «Mis sobres», la apertura (sobre, agitado, abanico, brillo
de rareza, reveal con confeti, celebración y resumen), «Recompensas» y «Mi colección». El usuario las aprueba antes
de la entrega 2.

## 2. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `ui/tokens.css` | Paleta kawaii (`--ui-*`), radios, sombras de color y brillos | RF-1, RF-2 |
| Componentes de `ui/` | Profundidad en superficies y botones (rebote sin movimiento reducido) | RF-2 |
| `ui/icons/stickers/*.tsx` | 8 pegatinas como SVG en línea (sin imágenes) | RF-3 |
| `ui/shell/icons.tsx` | Mapa de iconos a la biblioteca de doble tono (`@phosphor-icons/react`, MIT) en lugar de `lucide-react` en el coleccionista | RF-4 |
| `domain/catalog/pack-cover.ts` | Portada del sobre: la elegida o la carta de mayor rareza | RF-6 |
| Migración `0009` | `sets.cover_card_id` (FK a `cards`, nula) y `sets.pack_image_key` (nula) | RF-6, RF-7 |
| Panel de colección | Elegir portada y subir o quitar la imagen de sobre (misma tubería de imágenes que las cartas) | RF-6, RF-7 |
| `features/packs/PackArt.tsx` | Sobre compuesto (CSS y SVG: bordes dentados, portada, foil, pegatinas) o la imagen subida | RF-5, RF-7, RF-8 |
| `features/opening/*` | Fondo con destellos, dorso, nitidez (`mid` según el ancho), holo sutil, foco solo con teclado, agitado, brillo de rareza, confeti, celebración y resumen | RF-9 a RF-15 |
| `ui/game/RingTimer.tsx` | Temporizador en anillo (SVG, `stroke-dashoffset` por `transform`) sobre `Countdown` | RF-16, RF-17 |
| `features/rewards/*`, «Mis sobres» | Anillo, racha de pegatinas sin desbordes | RF-16, RF-17 |
| `features/collection/*` | Portada, vista previa, progreso y datos; contador sin tapar el símbolo | RF-18, RF-20 |
| `i18n` | Plurales con `Intl.PluralRules` en los diccionarios | RF-19 |
| `domain/catalog/draw.ts` | Sorteo sin repetidas por sobre (`drawPack` v2); `RNG_VERSION` pasa a `hmac-sha256-v2` y la v1 se conserva para aperturas antiguas | RF-21, RF-22 |
| `scripts/demo.mts` | Build optimizado y `next start` para la demo | RF-23 |

## 3. Decisiones

- **Sin repetidas**: en cada ranura se sortea la rareza igual que hoy; la carta se elige entre las de esa rareza que
  aún no están en el sobre. Solo si no queda ninguna distinta se permite repetir (caso límite). El pity elige su
  carta con la misma regla. Las aperturas guardan `rng_version`; reanudar una apertura v1 usa el sorteo v1.
- **Demo optimizada**: hoy `isDemoEnabled` exige `NODE_ENV !== production`. Se añade un permiso explícito para el
  build local de la demo (`DEMO_LOCAL=1`, que solo pone `scripts/demo.mts`, y servidor escuchando solo en la red
  local); la web publicada nunca lo lleva. Un test vigila que el despliegue no pueda activar la demo.
- **Pegatinas**: SVG dibujados a partir de las maquetas, con `currentColor` donde haga falta para reutilizarlas.
- **Phosphor**: se importa cada icono por su ruta (como con lucide) para no inflar el peso; el presupuesto de 250 kB
  de la CI lo vigila.
- **Sobre compuesto**: HTML y CSS (no una imagen generada), para que pese poco y se vea nítido a cualquier tamaño;
  la portada usa la imagen `mid` ya firmada de la carta.

## 4. Pruebas

- Unidad: portada del sobre, plurales, sorteo sin repetidas (100 000 sobres simulados: ninguna repetida salvo el caso
  límite y las tasas por rareza dentro del intervalo publicado), versión del sorteo, permiso de la demo.
- Integración: elegir portada y subir o quitar la imagen de sobre; apertura con v2 y reanudación de una v1.
- E2E en los cuatro proyectos según los criterios de la spec; capturas de antes y después con `pnpm showcase`.
