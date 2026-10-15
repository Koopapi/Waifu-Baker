# Tareas — Spec 006

## Entrega 1 — Dominio y datos
- [x] **T1 — Huecos, progreso y filtros** · RF-1, RF-2, RF-3, RF-6, RF-7 · Hecho cuando: pasan los tests de `binder`.
- [x] **T2 — Reglas del álbum** · RF-9, RF-12 · Hecho cuando: pasan los tests de `album-rules`.
- [x] **T3 — Migración `albums`** · Infraestructura · Hecho cuando: la tabla existe en dev y en tests.

## Entrega 2 — Servicios
- [x] **T4 — Colección del usuario y ficha** · RF-1 a RF-6 · Hecho cuando: pasan sus tests de integración, incluido el bloqueo 18+.
- [x] **T5 — Álbum: activar, desactivar, enlace nuevo, destacadas** · RF-8 a RF-12 · Hecho cuando: pasan sus tests.
- [x] **T6 — Vista pública** · RF-13, RF-14 · Hecho cuando: nunca aparecen 18+ ni datos de Patreon y una cuenta borrada no tiene álbum.

## Entrega 3 — Interfaz
- [x] **T7 — «Mi colección» y álbum por colección** · RF-1 a RF-4, RF-7 · Hecho cuando: se ven progreso, siluetas y filtros.
- [x] **T8 — Ficha de carta** · RF-5, RF-6 · Hecho cuando: la ficha muestra carta con holo, datos y cantidades.
- [x] **T9 — Ajustes del álbum público** · RF-8 a RF-12 · Hecho cuando: se activa con alias, se eligen destacadas y se desactiva.
- [x] **T10 — Página pública, imágenes y vista previa** · RF-13 a RF-17 · Hecho cuando: un visitante sin sesión la ve y existe la imagen de vista previa con `noindex`.

## Entrega 4 — Cierre
- [x] **T11 — E2E** · Todos · Hecho cuando: pasa en verde.
- [x] **T12 — Validación RF por RF** · Todos · Hecho cuando: `validation.md` da 17 de 17.

## Notas de implementación
- La ficha permite alternar a la versión holo siempre que se tenga (RF-6), aunque no se tenga la normal.
- La vista previa para redes usa una instancia estática en negrita de Space Grotesk
  (`assets/fonts/SpaceGrotesk-Bold.ttf`): el renderizador de `next/og` no admite fuentes variables.
- El E2E usa una colección con holo al 100 % en Rara para que filtros y ficha holo sean deterministas.
