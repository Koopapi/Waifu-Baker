# Contexto del proyecto · Waifu Baker

Resumen para cualquier persona o asistente de IA que trabaje en el código. Si usan Claude Code, pueden copiar este archivo como `CLAUDE.md` en la raíz del proyecto; con GitHub Copilot, como `.github/copilot-instructions.md`.

## Qué es

Juego web de coleccionar cartas de waifus, para mayores de 18 años, financiado con Patreon. Los jugadores abren sobres, completan colecciones (álbum, álbum público), reclaman recompensas diarias y mandan cartas de **expedición** por un mapa. Interfaz en español e inglés. Las cartas son digitales, sin valor monetario y **no se pueden intercambiar**.

## Estilo visual

La dirección elegida es **Street pop** (fondo lila, tinta, neón rosa, lima, índigo, turquesa). Las reglas están en el skill `.claude/skills/waifu-baker-street-pop/`. Las cartas conservan su marco metálico por rareza y se muestran siempre con `carta-capas.js` v3.

## Glosario

- **Sobre:** paquete de cartas al azar. Se reciben por tier de Patreon, sobre gratis y racha diaria.
- **Galletas:** moneda del juego.
- **Rarezas:** N, R, SR, SSR (UR más adelante). **Holo** es una variante, no una rareza.
- **Carta por capas:** carta con parallax, partículas, modos de mezcla, marco de rareza y sello flotante (`codigo/carta-capas/`).
- **Expedición:** de 1 a 3 cartas exploran una zona durante 30 min, 2 h u 8 h y vuelven con botín.
- **Terreno** (Ciudad, Bosque, Costa, Ruinas, Montaña) y **rol** (Recolectora, Buscatesoros, Cartógrafa, Guardiana, Carismática): se definen por personaje.
- **Vínculo:** experiencia por personaje que sube con expediciones y desbloquea recompensas.
- **Nivel de carta:** sube gastando copias repetidas de esa carta (tope 5).
- **Fragmentos de mapa:** abren zonas nuevas, en orden.

## Reglas que el código debe respetar

1. **El servidor decide todo** lo que da premios: tiradas de sobres, resultados de expediciones, entrega de botín. El navegador solo muestra.
2. Hora del servidor para temporizadores. Semilla guardada al enviar una expedición. Reclamar dos veces no entrega dos veces.
3. Probabilidades públicas y garantía de SSR iguales para todos. Pagar da más sobres, no mejor suerte.
4. Edad mínima 18+. Nada con desnudos en zonas públicas (portada, álbum público, probabilidades): usar versión censurada.
5. Patreon se vincula por OAuth y se mantiene al día con webhooks. Quien cancela conserva sus cartas.

## Dónde está cada cosa

| Tema | Archivo |
|---|---|
| Diseño completo de Expediciones (reglas, fórmulas, botín, API, fases) | `docs/expediciones-diseno.md` |
| Rarezas, cartas raras, vínculo, monetización, contenido adulto, Patreon, marketing | `docs/decisiones-y-estrategia.md` |
| Tamaños, formatos y capas del arte | `docs/guia-de-arte.md` |
| Paletas, tipografías y reglas visuales | `docs/estilo-visual.md`, `tokens/` |
| Pantallas de referencia | `disenos/` |
| Componente de carta por capas, creador, integraciones React y Vue | `codigo/carta-capas/` |
| Lógica de expediciones, datos de ejemplo, prototipo y servidor Express | `codigo/expediciones/` |
