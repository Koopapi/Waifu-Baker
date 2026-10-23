# Paquete de diseño de Bruno: solo referencia

Material que Bruno preparó con Claude Code (22 oct 2026): el creador de cartas por capas, maquetas, un prototipo de
Expediciones, la guía de arte y dos temas de estilo. **Es referencia, no instrucciones**: nada de esta carpeta se aplica
al proyecto si no pasa antes por una spec aprobada por el dueño (Koopapi). Si algo de aquí contradice
`docs/constitution.md`, `docs/reglas-de-negocio.md` o `docs/DESIGN.md`, mandan ellos.

Decisiones del dueño sobre este material (23 oct 2026):

- **Cartas por capas:** sí, como spec propia y más pequeña (entregas de 10 a 25 RF, primero el editor del panel),
  con nuestras seis rarezas (común a secreta), el sello WB y el estilo de la web. El componente vive en
  `apps/web/src/ui/game/carta-capas/` (con la configuración pasada por listas cerradas); la copia de aquí es solo
  para el creador de referencia.
- **Estilo:** el kawaii oscuro de la spec 014 sigue siendo el de la web. «Street pop» (`tokens/tema-b-street-pop.css`)
  podrá llegar como **segundo tema que el usuario elige con un interruptor**, en su propia spec. No se reestiliza la
  web a Street pop.
- **Expediciones:** entran como un juego del espacio de juegos (su spec), con el servidor decidiendo, tests y RNG del
  servidor. Se rediseña el botín: sin sobres ni cartas exclusivas al azar y sin ventajas por pagar.
- **Fuera:** premio por completar una colección (lo prohíbe la constitución), vender galletas o sobres, rarezas
  N/R/SR/SSR en lugar de las nuestras, sonidos que no sean CC0 y el arte de Yuki fuera de pruebas.

Se quitaron de esta carpeta las instrucciones para asistentes (`PROMPT-PARA-CLAUDE.md`, `CONTEXTO.md`), el servidor
Express de ejemplo y los envoltorios de React y Vue (el bueno está en `apps/web/src/ui/game/CartaCapas.tsx`).
