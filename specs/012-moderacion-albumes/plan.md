# Plan 012 — Moderación de álbumes públicos

Respeta `docs/constitution.md` y `docs/reglas-de-negocio.md`. Reutiliza el álbum de la spec 006, el historial
de administración (`audit_log`), el reloj inyectable (spec 009) y el sistema de diseño (spec 011).

## 1. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `domain/collection/moderation.ts` | Motivos, nota (≤ 300), quién es visible y si se puede pedir revisión (alias distinto, pendiente, 7 días) | RF-4, RF-5, RF-8 a RF-10 |
| `server/services/moderation.ts` | Lista del panel con orden, historial, ocultar, pedir revisión, aprobar y rechazar | RF-1 a RF-4, RF-9 a RF-13 |
| `server/services/album.ts` | Visibilidad pública, activar/desactivar respetando la moderación | RF-5, RF-6, RF-8, RF-14 |
| `server/services/metrics.ts` | Álbumes activos: públicos y no ocultos | RF-5 |
| `app/admin/albumes` (+ `[userId]`) | Lista con buscador y ficha con acciones e historial | RF-1 a RF-4, RF-11, RF-12 |
| `app/album/[slug]/not-found.tsx` | «Este álbum no está disponible» (también para los desactivados) | RF-5 |
| Ajustes del álbum y «Mi cuenta» | Aviso con motivo y nota; pedir revisión con alias nuevo | RF-7 a RF-10 |

## 2. Datos (migración `0008`)

`albums` gana `moderation` (`none`, `hidden`, `review_requested`, `review_rejected`; por defecto `none`),
`hidden_reason`, `hidden_note`, `hidden_at`, `hidden_by`, `review_alias`, `review_requested_at`, `review_note`
y `activated_at` (fecha de la primera activación, para la lista; se rellena con `created_at` en los existentes).

## 3. Decisiones

- **Visible** = `is_public` y `moderation = none`. Lo aplican la página pública, sus imágenes y su vista previa.
- **No disponible**: mismo 404 y mismo texto para un álbum oculto y para uno desactivado; así el visitante no
  sabe si se ocultó.
- **Pedir revisión** no publica nada: guarda el alias propuesto. Aprobar copia ese alias y pone `none`.
- **Concurrencia**: aprobar y rechazar actualizan con `where moderation = 'review_requested'`; si no cambia
  ninguna fila, la revisión ya estaba decidida (caso límite).
- **Activar** un álbum oculto falla con `album_hidden` (hay que pedir revisión); desactivarlo solo toca
  `is_public` (RF-14).
- **Historial**: entradas `album.hide`, `album.review_request`, `album.review_approve` y `album.review_reject`
  en `audit_log` con motivo, nota y alias antes y después.

## 4. Pruebas

- Unidad: motivos y nota, visibilidad, reglas para pedir revisión (alias igual, pendiente, menos de 7 días).
- Integración: ocultar, visibilidad pública e imágenes, métricas, pedir revisión, aprobar (mismo enlace),
  rechazar, carrera entre dos administradores, desactivar y activar un oculto, historial.
- E2E `e2e/moderation.spec.ts`: el recorrido completo de los criterios, con el reloj de pruebas para los 7 días.
