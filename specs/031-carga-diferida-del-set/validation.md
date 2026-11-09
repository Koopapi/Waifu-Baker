# Validación — Spec 031

Generado por `apps/web/scripts/rf-coverage.mjs` el 2026-11-09. Vitest: 912 de 912 tests en verde. E2E: `pnpm e2e`.

**Veredicto: spec cumplida** (15 de 17 RF con al menos un test en verde; RF-5 y RF-15 se comprueban como se explica
abajo y quedan cumplidos).

**E2E completa (8–9 nov 2026):** `pnpm build` y `pnpm budget` en verde (la colección del panel, 258,6 kB de 260; antes
393 kB). `pnpm e2e` en `chromium-desktop`, `pixel-7`, `iphone-14` y `reduced-motion`: 110 en verde, 3 fallos y 44
omitidas (3,1 h). Los 3 fallos fueron en iPhone y ninguno toca la página de la colección:
- `sobres-por-capas` y `vinculo`: pasaron al repetirlas sin cambios (intermitentes del simulador).
- `collection`: la página de sobres vuelve a navegar a sí misma al quitar la celebración y WebKit corta el `goto`
  siguiente; ahora usa el ayudante `go` (el mismo arreglo de la spec 030) y pasa.

**Producción (T7, 9 nov 2026, demo compilada con la pantalla de carga del PR #43):**
- Entrar desde «Sets» hasta ver las cartas: 818, 817, 815, 820 y 817 ms (5 de 5; sin el PR #43, 1 de 5 y los otros
  4 trabados, como en el servidor de pruebas). RNF de menos de 1 s: cumplido.
- La respuesta de la página (RSC 39 kB, HTML 139 kB) no trae claves de capas ni de la biblioteca (RF-2, RF-3).
- Abrir una carta: la ventana sale a los 32–34 ms y el editor a los 58–82 ms (la primera, 82 ms, con la descarga del
  editor).
- **RF-5** lo cubre el PR #43 (`app/admin/sets/[id]/loading.tsx`), que aún no está en esta rama; queda cumplido al
  mergear los dos.
- **RF-15**: el editor se movió tal cual a su archivo; lo cubre la E2E `card-save` (spec 027: un solo Guardar, cierre
  con pregunta, borrador y versiones), en verde en los cuatro proyectos.

**Pendiente:** medir en el servidor de pruebas con una colección de 30 cartas, tras desplegar.

| RF | Requisito | Tests unitarios / integración | Pasos E2E | Estado |
|---|---|---|---|---|
| RF-1 | CUANDO el administrador entre a una colección, EL SISTEMA mostrará su encabezado, sus datos, la publicación, el | — | RF-1, RF-2 y RF-3: la colección llega sin el editor, sin las capas y sin la biblioteca | Cumplido |
| RF-2 | CUANDO el administrador entre a una colección, EL SISTEMA no enviará al navegador la configuración de capas de | ✓ la_tesela_no_lleva_las_capas_ni_las_imagenes_grandes | RF-1, RF-2 y RF-3: la colección llega sin el editor, sin las capas y sin la biblioteca | Cumplido |
| RF-3 | CUANDO el administrador entre a una colección, EL SISTEMA no enviará al navegador la biblioteca de elementos. | — | RF-1, RF-2 y RF-3: la colección llega sin el editor, sin las capas y sin la biblioteca | Cumplido |
| RF-4 | EL SISTEMA preparará la página de una colección sin leer las cartas de otras colecciones. | ✓ las_entradas_para_el_editor_no_leen_las_cartas_de_ninguna_coleccion | — | Cumplido |
| RF-5 | CUANDO el administrador entre a una colección desde «Sets», EL SISTEMA mostrará al instante la pantalla de carga | — | — | Cumplido (PR #43 y medición en producción) |
| RF-6 | EL SISTEMA descargará la miniatura de cada carta de la cuadrícula solo cuando esté cerca de verse en pantalla. | — | RF-6 y RF-7: todas las cartas en la cuadrícula, con las miniaturas diferidas | Cumplido |
| RF-7 | EL SISTEMA seguirá mostrando todas las cartas de la colección en la cuadrícula, sin páginas. | — | RF-6 y RF-7: todas las cartas en la cuadrícula, con las miniaturas diferidas | Cumplido |
| RF-8 | CUANDO el administrador abra una carta, EL SISTEMA abrirá la ventana de edición al instante con la miniatura de | — | RF-8 y RF-9: la ventana abre al instante con la miniatura y el indicador, y luego el editor | Cumplido |
| RF-9 | CUANDO el editor y los datos de la carta terminen de cargar, EL SISTEMA mostrará el editor con sus capas, la | — | RF-8 y RF-9: la ventana abre al instante con la miniatura y el indicador, y luego el editor | Cumplido |
| RF-10 | CUANDO el administrador abra otra carta en la misma visita, EL SISTEMA no volverá a descargar el editor: solo | — | RF-10: otra carta no vuelve a descargar el editor | Cumplido |
| RF-11 | SI el editor o los datos de la carta no se pueden cargar, ENTONCES EL SISTEMA mostrará en la ventana un aviso | — | RF-11: si la carta no carga, avisa y «Reintentar» la vuelve a pedir | Cumplido |
| RF-12 | SI el administrador cierra la ventana antes de que termine la carga, ENTONCES EL SISTEMA dejará de esperar esa | — | RF-12: cerrar mientras carga no deja avisos | Cumplido |
| RF-13 | EL SISTEMA conservará en la cuadrícula la selección de varias cartas, los cambios en bloque, reordenar, la | ✓ la_tesela_conserva_lo_que_usa_la_cuadricula | RF-13 y RF-14: guardar una carta actualiza su miniatura en la cuadrícula | Cumplido |
| RF-14 | CUANDO el administrador guarde una carta, EL SISTEMA actualizará su miniatura en la cuadrícula, como hoy. | — | RF-13 y RF-14: guardar una carta actualiza su miniatura en la cuadrícula | Cumplido |
| RF-15 | EL SISTEMA conservará en el editor el guardado único, el historial de versiones y el borrador de la spec 027, | — | — | Cumplido (E2E `card-save`) |
| RF-16 | EL SISTEMA mantendrá el JavaScript de primera carga de la página de una colección en 260 kB comprimidos o | ✓ la_pagina_de_una_coleccion_se_vigila_con_260_kB | — | Cumplido |
| RF-17 | SI la página de una colección pasa de 260 kB comprimidos, ENTONCES la CI fallará e indicará cuánto pesa. | ✓ si_la_coleccion_pasa_de_260_kB_falla_y_dice_cuanto_pesa | — | Cumplido |
