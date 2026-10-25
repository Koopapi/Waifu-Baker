# Tareas — Spec 020

## Entrega 1: reglas y datos
- [x] T1 Reglas puras de poder, calificación y botín (`domain/expeditions/rules.ts`) con tests. RF: 11, 12, 13, 14.
  Hecho cuando: los tests de RF-11 recorren todas las rarezas.
- [x] T2 Vínculo, frases y simulador (`domain/expeditions/`) con tests. RF: 12, 24, 30.
- [x] T3 Migración 0015 y esquema (zonas, perfiles, aperturas de zona, expediciones, cartas, vínculo, terreno y rol,
  origen `expedition`). Depende de: T1.
- [x] T4 Servicio: enviar, cancelar, reclamar, elegir colección, abrir zona y contador, con tests de integración y de
  concurrencia. RF: 3 a 10, 15 a 24. Depende de: T3.
- [x] T5 Servicio del panel: zonas, botín, terreno y rol, simulador y probabilidades públicas, con tests. RF: 26 a 30.

## Entrega 2: pantallas
- [ ] T6 Maquetas en Pencil (mapa, preparar, reporte, panel).
- [ ] T7 Navegación «Juegos» con contador y `/juegos`. RF: 1, 2.
- [ ] T8 `/juegos/expediciones`: mapa, espacios, preparar, enviar, cancelar, reclamar y reporte. RF: 3 a 24.
- [ ] T9 Ficha de carta con vínculo y vuelta; Probabilidades. RF: 25, 26.
- [ ] T10 Panel: terreno y rol en Personajes y `/admin/expediciones`. RF: 27 a 30.

## Entrega 3: cierre
- [ ] T11 Semillas de demo y desarrollo con zonas; rutas del calentamiento del E2E.
- [ ] T12 E2E de la spec en los 4 proyectos y suite completa; `pnpm budget`.
- [ ] T13 `validation.md`, `dispositivo.md`, reglas de negocio y roadmap.
