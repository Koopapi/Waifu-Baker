# Plan 006 — Colección y álbum público

Respeta `docs/constitution.md` y `docs/architecture.md`. Reutiliza `user_cards` (spec 004), los
enlaces firmados de imagen (RF-20 de la 004), `Card3D` y la imagen `public` con marca de agua que el
compositor ya genera.

## 1. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `domain/collection/binder.ts` | Huecos por número, progreso, ocultar lo que falta, filtros | RF-1 a RF-3, RF-6, RF-7 |
| `domain/collection/album-rules.ts` | Alias (2–30), destacadas (≤ 5, propias, SFW, sin repetir) | RF-9, RF-12 |
| `server/services/collection.ts` | Colecciones del usuario, álbum de una colección, ficha de carta | RF-1 a RF-6 |
| `server/services/album.ts` | Activar, desactivar, nuevo enlace, destacadas, vista pública | RF-8 a RF-14 |
| `app/coleccion/**` | «Mi colección», álbum de cada colección, ficha y ajustes del álbum público | RF-1 a RF-12 |
| `app/album/[slug]` | Página pública, imagen de vista previa (`opengraph-image`) y metadatos `noindex` | RF-13 a RF-17 |
| `app/api/album/[slug]/img` | Imagen con marca de agua de una carta de un álbum público | RF-15 |

## 2. Modelo de datos (migración `0003`)

`albums (user_id pk → users, slug unique, is_public bool default false, alias text, featured_card_ids uuid[] default '{}', created_at, updated_at)`.

## 3. Algoritmos

- **Huecos y progreso**: todas las cartas de la colección por número; una carta cuenta como
  obtenida si el usuario tiene la normal o la holo; progreso = obtenidas distintas / total. Las que
  faltan solo exponen su número (ni nombre, ni imagen, ni rareza).
- **Enlace**: 12 caracteres base62 de `crypto.randomBytes` (≈ 71 bits); regenerar sustituye el slug.
- **Vista pública**: solo si el álbum está activo y la cuenta no está borrada; colecciones no 18+
  publicadas o archivadas con al menos una carta; destacadas filtradas otra vez (propias y SFW) por si
  cambió algo (caso límite).
- **Imágenes públicas**: `key_public` (600 × 840 con marca de agua), solo si el álbum está activo,
  el usuario tiene la carta y la colección no es 18+.
- **Vista previa en redes**: `ImageResponse` 1200 × 630 con alias, progreso y hasta 3 destacadas.

## 4. Decisiones técnicas

- **Slug aleatorio** frente a nombre elegido: no adivinable, sin colisiones ni moderación de nombres.
- **Imágenes públicas sin firma**: el álbum ya es público por decisión del usuario; se sirve solo la
  versión con marca de agua y se comprueba en cada petición que el álbum siga activo.

## 5. Dependencias nuevas

Ninguna (`next/og` viene con Next).

## 6. Tests

Unit: `binder`, `album-rules`. Integración: `collection`, `album` (incluidas 18+, borrado, enlaces
viejos). E2E: el flujo de los criterios de finalización.
