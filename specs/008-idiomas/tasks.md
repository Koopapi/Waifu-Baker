# Tareas 008 — Idiomas

## Entrega 1 — Base
- [x] **T1 — Idiomas y diccionarios base** · RF-1, RF-4, RF-10 · Hecho cuando: pasan los tests de `locales` y de claves.
- [x] **T2 — Servidor, cliente, selector y `<html lang>`** · RF-2, RF-3, RF-7 · Hecho cuando: el selector cambia el idioma en una página de prueba.
- [x] **T3 — Errores por código** · RF-5, RF-10 · Hecho cuando: las acciones devuelven el error traducido y el test de cobertura de códigos pasa.

## Entrega 2 — Traducción por área
- [x] **T4 — Páginas públicas, sobres y apertura** · RF-5, RF-6
- [x] **T5 — Colección y álbum público** · RF-5, RF-6, RF-8, RF-9
- [x] **T6 — Panel de administración** · RF-5, RF-6
- [x] **T7 — Mensajes del dominio y de los servicios** · RF-5, RF-10

## Entrega 3 — Cierre
- [x] **T8 — E2E** · Todos · Hecho cuando: pasa en los cuatro proyectos.
- [x] **T9 — Validación RF por RF** · Todos · Hecho cuando: `validation.md` da 10 de 10.

## Notas de implementación
- Diccionarios por área en `apps/web/src/i18n/dictionaries/{en,es}/` (`common`, `site`, `packs`, `collection`, `admin`, `errors`).
- Los errores con varios significados eligen el texto por parámetro (`entity`, `what`, `context`…); `invalid_odds` lleva la lista de problemas codificada.
- Los E2E de las specs 003 a 006 fijan `wb_locale=es`; el de la 008 y el barrido de calidad trabajan en inglés.
- Pendiente de diseño: en móvil, la indicación de la pantalla de apertura roza el selector de idioma.
