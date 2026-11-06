# Tareas — Spec 030

- [x] T0 Spec aprobada por el dueño (6 nov 2026). Paquete de Bruno copiado a `docs/waifu-baker/sobres/` (referencia).
- [ ] T1 `carta-capas.js`: `capaHTMLBase` compartida, `CartaCapas.motor`, `texturas` y brillo `ondas`, sin perder
  `seguro`, `marcoPersonalizado` ni los cambios de la 025, 028 y 029. Tests de unidad.
- [ ] T2 `sobre-capas.js` en `ui/game/sobre-capas/` con los cambios marcados (fuentes, textos, valores seguros,
  estática, gestos, vibración y sonido por nuestro motor); recursos en `public/sobres/`; envoltorio `SobreCapas.tsx`,
  `miniatura.ts` y `PackThumb`. Tests de unidad.
- [ ] T3 Dominio: `domain/packs/design.ts` (esquema, validación, claves, registro, básico) y `domain/packs/editor.ts`
  (valores por nombre, revisión, JSON exportado); `domain/opening/sobre.ts`. RF-4, RF-8, RF-9, RF-12, RF-15, RF-19,
  RF-21 a RF-23. Tests de unidad.
- [ ] T4 Datos y servidor: migración `0023_sobres_por_capas.sql`, `services/pack-designs.ts`, firma de enlaces, rutas
  `POST /api/admin/pack-designs` y `GET /api/sets/[setId]/pack-asset`. RF-10 a RF-14, RNF seguridad, casos límite
  18+, archivada y sobres ya entregados. Tests de integración.
- [ ] T5 Editor del panel `/admin/sets/[id]/pack/[kind]` con la distribución del creador de Bruno y los componentes
  del editor de cartas; enlaces desde la tarjeta «Sobre». RF-1 a RF-11, RF-13.
- [ ] T6 El sobre en el juego: «Mis sobres», apertura, «Abrir todos» y simulador con la misma vista (`PackView`);
  retirar `PackShell`. RF-14 a RF-17.
- [ ] T7 Apertura: `TearPack` con el sobre de Bruno, coreografía, mazo derecho, puntos, botón de la carta, presagio,
  efecto especial y resumen; «Abrir todos» con el sobre nuevo y el efecto en las destacadas. RF-18 a RF-25.
- [ ] T8 Diccionarios en inglés y español (`packs.sobre` y `admin-packs`), `docs/DESIGN.md` y catálogo.
- [ ] T9 Demo: FA01 adaptado en una colección y el sobre básico en otra.
- [ ] T10 E2E `sobres-por-capas.spec.ts` y E2E existentes adaptadas (móvil incluido); `validation.md`, roadmap y
  reglas de negocio.
- [ ] T11 Verificación larga (`pnpm build`, `pnpm budget`, `pnpm e2e`) desacoplada; comparación lado a lado y prueba en
  teléfono real (dueño).
