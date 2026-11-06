# Tareas — Spec 029

- [x] T0 Spec aprobada por el dueño (5 nov 2026, decisiones en `docs/vinculo-y-reciclaje.md`).
- [x] T1 Dominio: `domain/bonds/{settings,recycle,effects,craft,simulate}.ts`. RF-1 a RF-3, RF-9 a RF-12, RF-14, RF-16,
  RF-18 a RF-20, RF-23. Hecho cuando: tests de unidad `test_s029_rfN_*` en verde.
- [x] T2 Migración `0022` (polvo en `user_rewards`) y servicio `bonds.ts`: reciclar (una versión o todas), vista previa,
  fabricar, línea de personaje, ajustes con auditoría, simulador; baja de cuenta borra vínculo y polvo. RF-1 a RF-8,
  RF-15 a RF-23. Hecho cuando: tests de integración (con concurrencia de reciclar y fabricar) en verde.
- [x] T3 Efectos en la carta: carta viva con los efectos del nivel del dueño, holo visual de la común plana, insignia de
  maestría en la ficha y en el álbum público. RF-9 a RF-13. Hecho cuando: integración de la carta viva y del álbum.
- [x] T4 Componentes `BondBar`, `CardLine`, `GainSummary` en `ui/` con su fila en `docs/DESIGN.md` y en `/design-system`.
  Hecho cuando: tests de componentes y `pencil-map` en verde.
- [x] T5 Página `/collection/character/[id]` (línea, barra, siguiente desbloqueo, reciclar con confirmación, fabricar),
  enlace desde la ficha, polvo junto a las galletas; textos en inglés y español. RF-4, RF-5, RF-15, RF-17.
  Hecho cuando: typecheck, lint y tests en verde.
- [x] T6 Panel: tarjeta «Vínculo y reciclaje» en `/admin/settings` con el simulador. RF-22, RF-23.
- [x] T7 E2E `vinculo.spec.ts`, rutas en `e2e/warm.ts`, `validation.md`, `docs/roadmap.md`, `docs/reglas-de-negocio.md`,
  `docs/economia.md`; verificación larga (`build`, `budget`, `e2e`) lanzada una vez en segundo plano.
